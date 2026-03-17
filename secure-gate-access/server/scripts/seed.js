import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import argon2 from 'argon2';
import { dbManager } from '../src/database/db.enhanced.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env files in the same priority order as server.js
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

async function columnExists(tableName, columnName) {
  const res = await dbManager.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  );
  return res.rows.length > 0;
}

async function tableExists(tableName) {
  const res = await dbManager.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_name = $1
     LIMIT 1`,
    [tableName]
  );
  return res.rows.length > 0;
}

async function getUniqueConstraints(tableName) {
  const res = await dbManager.query(
    `SELECT tc.constraint_name,
  array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS columns
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
     WHERE tc.table_schema = 'public'
       AND tc.table_name = $1
       AND tc.constraint_type = 'UNIQUE'
     GROUP BY tc.constraint_name`,
    [tableName]
  );

  return res.rows.map(row => row.columns);
}

async function getDefaultEstateId() {
  const hasEstatesTable = await tableExists('estates');
  if (!hasEstatesTable) return null;

  const result = await dbManager.query(
    `SELECT id
     FROM estates
     ORDER BY id ASC
     LIMIT 1`
  );

  return result.rows[0]?.id ?? null;
}

let cachedUserConflictTarget = null;

async function resolveUserConflictTarget(hasEstateId) {
  if (cachedUserConflictTarget !== null) {
    return cachedUserConflictTarget;
  }

  const uniqueConstraints = await getUniqueConstraints('users');
  const hasEstateEmailUnique = uniqueConstraints.some(columns =>
    columns?.length === 2 && columns.includes('estate_id') && columns.includes('email')
  );
  const hasEmailUnique = uniqueConstraints.some(columns =>
    columns?.length === 1 && columns[0] === 'email'
  );

  if (hasEstateId && hasEstateEmailUnique) {
    cachedUserConflictTarget = '(estate_id, email)';
  } else if (hasEmailUnique) {
    cachedUserConflictTarget = '(email)';
  } else {
    cachedUserConflictTarget = null;
  }

  return cachedUserConflictTarget;
}

async function upsertUser(user) {
  const passwordHash = await argon2.hash(user.password);

  const hasVerificationToken = await columnExists('users', 'verification_token');
  const hasVerificationExpires = await columnExists('users', 'verification_expires');
  const hasEstateId = await columnExists('users', 'estate_id');
  const hasMfaEnabled = await columnExists('users', 'mfa_enabled');
  const hasMfaSecret = await columnExists('users', 'mfa_secret');
  const hasBackupCodes = await columnExists('users', 'backup_codes');
  const defaultEstateId = hasEstateId ? await getDefaultEstateId() : null;
  const conflictTarget = await resolveUserConflictTarget(hasEstateId);

  const columns = [
    'username',
    'email',
    'password_hash',
    'role',
    'verified',
    'phone',
    'house',
    'area',
    'notify_email',
    'notify_sms'
  ];

  const values = [
    user.username,
    user.email,
    passwordHash,
    user.role,
    user.verified ?? true,
    user.phone || null,
    user.house || null,
    user.area || null,
    user.notifyEmail ?? true,
    user.notifySms ?? false
  ];

  if (hasEstateId) {
    columns.push('estate_id');
    values.push(user.estate_id ?? defaultEstateId);
  }

  if (hasVerificationToken) {
    columns.push('verification_token');
    values.push(null);
  }

  if (hasVerificationExpires) {
    columns.push('verification_expires');
    values.push(null);
  }

  // MFA-001 FIX: Add MFA columns if they exist
  // For admin/guard roles, set mfa_enabled to false (they must set it up on first login)
  // For other roles, also set to false as it's optional
  if (hasMfaEnabled) {
    columns.push('mfa_enabled');
    values.push(false);
  }

  if (hasMfaSecret) {
    columns.push('mfa_secret');
    values.push(null);
  }

  if (hasBackupCodes) {
    columns.push('backup_codes');
    values.push(null);
  }

  const insertColsSql = columns.join(', ');
  const insertPlaceholders = columns
    .map((_, idx) => `$${idx + 1} `)
    .join(', ');

  const updateSetSql = [
    'username = EXCLUDED.username',
    'password_hash = EXCLUDED.password_hash',
    'role = EXCLUDED.role',
    'verified = EXCLUDED.verified',
    'phone = EXCLUDED.phone',
    'house = EXCLUDED.house',
    'area = EXCLUDED.area',
    'notify_email = EXCLUDED.notify_email',
    'notify_sms = EXCLUDED.notify_sms',
    ...(hasEstateId ? ['estate_id = EXCLUDED.estate_id'] : []),
    'updated_at = NOW()'
  ].join(', ');

  if (conflictTarget) {
    const res = await dbManager.query(
      `INSERT INTO users(${insertColsSql}, created_at, updated_at)
VALUES(${insertPlaceholders}, NOW(), NOW())
       ON CONFLICT ${conflictTarget} DO UPDATE SET ${updateSetSql}
       RETURNING id, username, email, role, verified, estate_id`,
      values
    );

    return res.rows[0];
  }

  const lookupParams = hasEstateId
    ? [user.email, defaultEstateId]
    : [user.email];
  const lookupQuery = hasEstateId
    ? 'SELECT id FROM users WHERE email = $1 AND estate_id = $2 LIMIT 1'
    : 'SELECT id FROM users WHERE email = $1 LIMIT 1';
  const lookupRes = await dbManager.query(lookupQuery, lookupParams);

  if (lookupRes.rows.length > 0) {
    const updateParams = [
      user.username,
      passwordHash,
      user.role,
      user.verified ?? true,
      user.phone || null,
      user.house || null,
      user.area || null,
      user.notifyEmail ?? true,
      user.notifySms ?? false
    ];

    let updateQuery = `
      UPDATE users SET
username = $1,
  password_hash = $2,
  role = $3,
  verified = $4,
  phone = $5,
  house = $6,
  area = $7,
  notify_email = $8,
  notify_sms = $9,
  mfa_enabled = COALESCE(mfa_enabled, $10),
  updated_at = NOW()
      WHERE id = $11
      RETURNING id, username, email, role, verified, estate_id
  `;

    updateParams.push(false); // mfa_enabled default
    updateParams.push(lookupRes.rows[0].id);
    const updateRes = await dbManager.query(updateQuery, updateParams);
    return updateRes.rows[0];
  }

  const insertRes = await dbManager.query(
    `INSERT INTO users(${insertColsSql}, created_at, updated_at)
VALUES(${insertPlaceholders}, NOW(), NOW())
     RETURNING id, username, email, role, verified, estate_id`,
    values
  );

  return insertRes.rows[0];
}


// Helper to generate random data
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomPhone = () => `+ 2547${randomInt(10000000, 99999999)} `;
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

async function run() {
  await dbManager.initializeAsync();

  console.log('[db:seed] Starting comprehensive seed...');

  // 0. Ensure an Estate Exists First
  let estateId = await getDefaultEstateId();
  if (!estateId) {
    // Create a default estate if none exists
    const estateRes = await dbManager.query(`
    INSERT INTO estates(name, slug, timezone, created_at, updated_at)
  VALUES('Secure Gate Estate', 'secure-gate-estate', 'UTC', NOW(), NOW())
        RETURNING id
  `);
    estateId = estateRes.rows[0].id;
    console.log(`[db:seed] Created new default estate: ${estateId} `);
  } else {
    console.log(`[db:seed] Using existing default estate: ${estateId} `);
  }

  // 1. Core Users
  const superAdmin = await upsertUser({
    username: 'superadmin',
    email: 'superadmin@securegate.com',
    password: 'SuperAdmin123!',
    role: 'super_admin',
    verified: true,
    phone: '+254799999999',
    area: 'HQ',
    house: 'ADMIN',
    notifyEmail: true,
    notifySms: false
  });

  const admin = await upsertUser({
    username: 'admin',
    email: 'admin@securegate.com',
    password: 'AdminPass123!', // Explicit reset to ensure known credential
    role: 'admin',
    verified: true,
    phone: '+254700000000',
    area: 'Management',
    house: 'OFFICE',
    notifyEmail: true,
    notifySms: false,
    estate_id: estateId // Explicitly link to estate
  });

  const guard = await upsertUser({
    username: 'guard1',
    email: 'guard1@securegate.com',
    password: 'GuardPass123!',
    role: 'guard',
    verified: true,
    phone: '+254722222222',
    area: 'Gate A',
    house: 'SECURITY',
    notifyEmail: true,
    notifySms: true,
    estate_id: estateId // Explicitly link to estate
  });

  // 2. Residents (Create 15)
  const residents = [];
  const areas = ['Phase 1', 'Phase 2', 'Phase 3', 'Appartments'];

  // Ensure we have our main resident for manual testing
  const mainResident = await upsertUser({
    username: 'resident1',
    email: 'resident1@securegate.com',
    password: 'ResidentPass123!',
    role: 'resident',
    verified: true,
    phone: '+254711111111',
    area: 'Phase 1',
    house: 'A-101',
    notifyEmail: true,
    notifySms: true,
    estate_id: estateId // Explicitly link to estate
  });
  residents.push(mainResident);

  for (let i = 2; i <= 15; i++) {
    const res = await upsertUser({
      username: `resident${i} `,
      email: `resident${i} @securegate.com`,
      password: 'ResidentPass123!',
      role: 'resident',
      verified: true,
      phone: randomPhone(),
      area: randomItem(areas),
      house: `${randomItem(['A', 'B', 'C'])} -${randomInt(100, 999)} `,
      notifyEmail: Math.random() > 0.3,
      notifySms: Math.random() > 0.5,
      estate_id: estateId // Explicitly link to estate
    });
    residents.push(res);
  }
  console.log(`[db:seed] Created ${residents.length} residents in Estate ${estateId} `);



  // 3. Visitors
  if (await tableExists('visitors')) {
    const visitorStatuses = ['PENDING', 'APPROVED', 'DECLINED', 'CHECKED_IN', 'CHECKED_OUT', 'EXPIRED'];
    const visitPurposes = ['Visit', 'Delivery', 'Maintenance', 'Official', 'Other'];

    // Create a specific visitor for manual testing with known OTP/QR
    // Generate random history features
    for (let i = 0; i < 40; i++) {
      const host = randomItem(residents);
      const status = randomItem(visitorStatuses);
      let visitDate = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      const vehicle = Math.random() > 0.7 ? `KBT ${randomInt(100, 999)}${randomItem(['A', 'B', 'C'])} ` : null;

      // Fix dates for history
      let checkInTime = null;
      let checkOutTime = null;

      if (status === 'CHECKED_OUT') {
        visitDate = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)); // Past date
        checkInTime = new Date(visitDate.getTime() + 10 * 60 * 60 * 1000); // 10 AM
        checkOutTime = new Date(visitDate.getTime() + 14 * 60 * 60 * 1000); // 2 PM
      } else if (status === 'CHECKED_IN') {
        visitDate = new Date(); // Today
        checkInTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      }

      const query = `
        INSERT INTO visitors(
    name, phone, email, vehicle_plate, purpose,
    date_of_visit, status, host_id, estate_id,
    check_in_time, check_out_time, invite_code,
    created_at, updated_at
  ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    ON CONFLICT DO NOTHING
      `;

      await dbManager.query(query, [
        `Visitor ${i + 1} `,
        randomPhone(),
        `visitor${i + 1} @test.com`,
        vehicle,
        randomItem(visitPurposes),
        visitDate,
        status,
        host.id,
        estateId,
        checkInTime,
        checkOutTime,
        `inv_hist_${i + 1}`
      ]);
    }
    console.log('[db:seed] Created 40 historical/future visitors');

    // Create CHECKED_OUT visitors for guard history testing (10 visitors)
    console.log('[db:seed] Creating CHECKED_OUT visitors for history...');
    const checkedOutStatuses = ['CHECKED_OUT'];
    for (let i = 0; i < 10; i++) {
      const host = randomItem(residents);
      const daysAgo = randomInt(1, 30); // 1-30 days ago
      const visitDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      // Check-in between 8 AM and 2 PM
      const checkInHour = randomInt(8, 14);
      const checkInTime = new Date(visitDate);
      checkInTime.setHours(checkInHour, randomInt(0, 59), 0, 0);

      // Check-out 2-6 hours after check-in
      const durationHours = randomInt(2, 6);
      const checkOutTime = new Date(checkInTime.getTime() + durationHours * 60 * 60 * 1000);

      await dbManager.query(`
        INSERT INTO visitors(
          name, phone, purpose, date_of_visit,
          status, check_in_time, check_out_time,
          host_id, estate_id, created_at, updated_at
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `, [
        `History Visitor ${i + 1}`,
        `+25470${randomInt(1000000, 9999999)}`,
        randomItem(['Visit', 'Delivery Pickup', 'Maintenance', 'Social Visit']),
        visitDate,
        'CHECKED_OUT',
        checkInTime,
        checkOutTime,
        host.id,
        estateId,
        visitDate // created_at = visit date for realistic history
      ]);
    }
    console.log('[db:seed] Created 10 CHECKED_OUT visitors for history');

    // IMPORTANT: Create test visitor AFTER all others so it has the newest timestamp
    // This ensures it appears first in the API response (sorted by created_at DESC)
    const testHost = residents[0]; // resident1
    const testVisitorName = 'Test Visitor (Active)';

    // Insert the visitor record
    const testVisitorRes = await dbManager.query(`
      INSERT INTO visitors(
        name, phone, email, vehicle_plate, purpose,
        date_of_visit, status, host_id, estate_id, 
        invite_code, created_at, updated_at
      ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      ON CONFLICT DO NOTHING
      RETURNING id, name, estate_id, date_of_visit, created_by
    `, [
      testVisitorName,
      '+254700123456',
      'testvisitor@securegate.com',
      'KAA 123A',
      'Visit',
      new Date(), // Today
      'otp_sent', // Status required for OTP search
      testHost.id,
      estateId,
      'inv_test_active_2026'
    ]);

    let testVisitor = testVisitorRes.rows[0];
    if (!testVisitor) {
      const existingTestVisitorRes = await dbManager.query(
        `SELECT id, name, estate_id, date_of_visit, created_by
         FROM visitors
         WHERE estate_id = $1 AND invite_code = $2
         ORDER BY id DESC
         LIMIT 1`,
        [estateId, 'inv_test_active_2026']
      );
      testVisitor = existingTestVisitorRes.rows[0];
    }

    // Generate valid QR and OTP using the service
    try {
      const qrServiceModule = await import('../src/services/qrCodeService.js');
      const qrCodeService = qrServiceModule.default;

      const qrResult = await qrCodeService.generateVisitorQR(
        { ...testVisitor, createdBy: testHost.id },
        { generateOtp: true }
      );

      console.log('\n=============================================');
      console.log('✅ TEST VISITOR CREDENTIALS GENERATED');
      console.log(`👤 Name: ${testVisitorName}`);
      console.log(`🔐 OTP: ${qrResult.data.otp} (Use this for manual check-in)`);
      console.log(`📱 QR Token: ${qrResult.data.token}`);
      console.log('=============================================\n');

    } catch (e) {
      console.error('Failed to generate test visitor QR/OTP:', e);
    }
  }

  // 4. Deliveries
  // Check for delivery_logs table (standard in init.js) or deliveries (legacy/migration)
  const deliveryTable = (await tableExists('delivery_logs')) ? 'delivery_logs' : (await tableExists('deliveries') ? 'deliveries' : null);

  if (deliveryTable) {
    const carriers = ['DHL', 'FedEx', 'Uber Eats', 'Glovo', 'Jumia', 'Sendy', 'G4S'];
    const packages = ['Electronics', 'Documents', 'Food', 'Groceries', 'Furniture'];
    const statuses = ['PENDING', 'COLLECTED'];

    for (let i = 0; i < 20; i++) {
      const recipient = randomItem(residents);
      const status = randomItem(statuses);
      const collectedAt = status === 'COLLECTED' ? new Date() : null;
      const description = randomItem(packages);
      const tracking = `TRK - ${randomInt(100000, 999999)} `;
      const carrier = randomItem(carriers);

      // Adjust query based on table schema (handling delivery_logs vs deliveries differences)
      let query;
      let params;

      if (deliveryTable === 'delivery_logs') {
        query = `
                INSERT INTO delivery_logs(
    recipient_id, carrier, tracking_number, recipient_name,
    status, picked_up_at, created_at, updated_at
  ) VALUES($1, $2, $3, $4, $5, $6, NOW(), NOW())
            `;
        // Note: estate_id might not be in delivery_logs in init.js schema, checking...
        // init.js: recipient_id, resident_id, carrier, tracking_number, recipient_name, status, received_at, picked_up_at
        // No estate_id in init.js schema for delivery_logs.
        params = [
          recipient.id,
          carrier,
          `${tracking} (${description})`, // Embed description in tracking or just omit if no column
          recipient.username,
          status,
          collectedAt
        ];
      } else {
        query = `
                INSERT INTO deliveries(
    recipient_id, carrier_name, tracking_number, package_description,
    status, collected_at, estate_id, created_at, updated_at
  ) VALUES($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    `;
        params = [
          recipient.id,
          carrier,
          tracking,
          description,
          status,
          collectedAt,
          estateId
        ];
      }

      await dbManager.query(query, params);
    }
    console.log(`[db:seed] Created 20 deliveries in ${deliveryTable} `);
  }

  // 5. Incidents
  if (await tableExists('incidents')) {
    const categories = ['Theft', 'Noise', 'Parking', 'Vandalism', 'Other'];
    const severities = ['low', 'medium', 'high', 'critical']; // Schema uses text default 'medium'
    const incidentStatuses = ['open', 'in_progress', 'resolved', 'closed']; // Schema use text default 'open'

    for (let i = 0; i < 10; i++) {
      const reporter = randomItem(residents);
      const category = randomItem(categories);

      const query = `
            INSERT INTO incidents(
      description, category, severity, status,
      reported_by, estate_id, created_at, updated_at
    ) VALUES($1, $2, $3, $4, $5, $6, NOW(), NOW())
        `;

      await dbManager.query(query, [
        `${category} Issue at ${reporter.house}. This is a generated test incident description.`,
        category,
        randomItem(severities),
        randomItem(incidentStatuses),
        reporter.id,
        estateId
      ]);
    }
    console.log('[db:seed] Created 10 incidents');
  }

  console.log('[db:seed] Comprehensive seed complete!');
  console.log('[db:seed] Super Admin:', superAdmin);
  console.log('[db:seed] Admin:', admin);
  console.log('[db:seed] Resident:', mainResident); // use existing variable from loop or mainResident
  console.log('[db:seed] Guard:', guard);

  await dbManager.disconnect();
}

run().catch(async (error) => {
  console.error('[db:seed] Failed:', error);
  try {
    await dbManager.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
