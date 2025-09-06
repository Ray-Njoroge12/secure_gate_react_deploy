import pool from '../../../database/db.js';
import qrcode from 'qrcode';
import { randomUUID } from 'crypto';

const respond = (res, { success = true, data = null, error = null, code = 200 }) => {
  res.status(code).json({ success, data, error, code });
};

const createVisitor = async (req, res) => {
  try {
    const { name, phone, email, dateOfVisit, time, purpose } = req.body;
    if (!dateOfVisit || !time) return respond(res, { success: false, error: 'dateOfVisit and time required', code: 400 });
    const visitDate = new Date(dateOfVisit);
    const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    if (visitDate < today) return respond(res, { success: false, error: 'dateOfVisit cannot be in the past', code: 422 });
    const inviteCode = `INVITE-${randomUUID()}`;
    const insertRes = await pool.query(`INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id, name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status, check_in`,
      [name || null, phone || null, email || null, purpose, dateOfVisit, time, inviteCode, 'PENDING']);
    const visitor = insertRes.rows[0];
    const inviteLink = `${req.protocol}://${req.get('host')}/invite/${inviteCode}`;
    respond(res, { data: { ...visitor, inviteLink }, code: 201 });
  } catch (error) {
    console.error('Error creating visitor:', error);
    respond(res, { success: false, error: 'Failed to create visitor', code: 500 });
  }
};

const getMyVisitors = async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, status, check_in, check_out FROM visitors ORDER BY check_in DESC`);
    respond(res, { data: result.rows });
  } catch (error) {
    console.error('Error fetching visitors:', error);
    respond(res, { success: false, error: 'Failed to fetch visitors', code: 500 });
  }
};

const createPass = async (req, res) => {
  try {
    const { visitorId } = req.params;
    const vRes = await pool.query('SELECT id, date_of_visit FROM visitors WHERE id = $1', [visitorId]);
    const visitor = vRes.rows[0];
    if (!visitor) return respond(res, { success: false, error: 'Visitor not found', code: 404 });
    const passId = `PASS-${visitorId}-${Date.now()}`;
    const expiresAt = new Date(new Date(visitor.date_of_visit).setHours(23,59,59,999));
    let qrCodeData;
    try { qrCodeData = await qrcode.toDataURL(passId); } catch (qrErr) {
      console.error('QR generation failed:', qrErr); return respond(res, { success: false, error: 'Failed to generate QR', code: 500 }); }
    const passRes = await pool.query(`INSERT INTO passes (pass_id, visitor_id, expires_at, status, qr_code)
      VALUES ($1,$2,$3,$4,$5) RETURNING id, pass_id, visitor_id, expires_at, status, qr_code`,
      [passId, visitorId, expiresAt.toISOString(), 'ACTIVE', qrCodeData]);
    respond(res, { data: passRes.rows[0], code: 201 });
  } catch (error) {
    console.error('Error creating pass:', error);
    respond(res, { success: false, error: 'Failed to create pass', code: 500 });
  }
};

const bulkInvite = async (req, res) => {
  try {
    const { eventName, date, time, numGuests } = req.body;
    const residentId = req.user && req.user.id ? req.user.id : null;
    if (!eventName || !date || !time || !numGuests) return respond(res, { success: false, error: 'Missing required fields', code: 400 });
    if (numGuests < 1 || numGuests > 50) return respond(res, { success: false, error: 'Number of guests must be 1-50', code: 422 });
    const inviteCode = `BULK-${randomUUID()}`;
    const bulkRes = await pool.query(`INSERT INTO bulk_invites (event_name, date, time, num_guests, invite_code, created_by)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, event_name, date, time, num_guests, invite_code, remaining_slots, expires_at, created_by`,
      [eventName, date, time, numGuests, inviteCode, residentId]);
    const inviteLink = `${req.protocol}://${req.get('host')}/bulk-register/${inviteCode}`;
    respond(res, { data: { ...bulkRes.rows[0], inviteLink }, code: 201 });
  } catch (error) {
    console.error('Error creating bulk invite:', error);
    respond(res, { success: false, error: 'Failed to create bulk invitation', code: 500 });
  }
};

const getBulkInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const query = await pool.query(`SELECT id, event_name, date, time, num_guests, invite_code, expires_at, remaining_slots, created_by FROM bulk_invites WHERE invite_code = $1 AND expires_at > NOW()`, [inviteCode]);
    if (!query.rows[0]) return respond(res, { success: false, error: 'Bulk invitation not found or expired', code: 404 });
    respond(res, { data: query.rows[0] });
  } catch (error) {
    console.error('Error fetching bulk invite:', error);
    respond(res, { success: false, error: 'Failed to fetch bulk invitation', code: 500 });
  }
};

const completeInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const { name, phone, email, idNumber, vehiclePlate, expectedTime } = req.body;
    if (!name || !phone) return respond(res, { success: false, error: 'Name and phone required', code: 400 });
    const vRes = await pool.query('SELECT id, status FROM visitors WHERE invite_code = $1', [inviteCode]);
    let visitor = vRes.rows[0];
    if (!visitor) {
      const bRes = await pool.query('SELECT id, date, time, remaining_slots FROM bulk_invites WHERE invite_code = $1 AND expires_at > NOW()', [inviteCode]);
      const bulk = bRes.rows[0];
      if (!bulk) return respond(res, { success: false, error: 'Invitation not found', code: 404 });
      if (bulk.remaining_slots <= 0) return respond(res, { success: false, error: 'No remaining slots for this bulk invite', code: 409 });
      const created = await pool.query(`INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, bulk_invite_id, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, status`,
        [name || null, phone || null, email || null, null, bulk.date, bulk.time, bulk.id, 'PENDING']);
      visitor = created.rows[0];
      await pool.query('UPDATE bulk_invites SET remaining_slots = remaining_slots - 1 WHERE id = $1', [bulk.id]);
    }
    if (visitor.status !== 'PENDING') return respond(res, { success: false, error: 'Invitation already completed', code: 422 });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const passId = `PASS-${visitor.id}-${Date.now()}`;
    const qrCodeData = await qrcode.toDataURL(passId);
    await pool.query(`UPDATE visitors SET name=$1, phone=$2, email=$3, id_number=$4, vehicle_plate=$5, expected_time=$6, otp=$7, qr_code=$8, status='CONFIRMED' WHERE id=$9`,
      [name, phone, email || null, idNumber || null, vehiclePlate || null, expectedTime || null, otp, qrCodeData, visitor.id]);
    const updatedVisitor = (await pool.query('SELECT * FROM visitors WHERE id=$1', [visitor.id])).rows[0];
    respond(res, { data: updatedVisitor });
  } catch (error) {
    console.error('Error completing invite:', error);
    respond(res, { success: false, error: 'Failed to complete invitation', code: 500 });
  }
};

export { createVisitor, getMyVisitors, createPass, bulkInvite, getBulkInvite, completeInvite };
