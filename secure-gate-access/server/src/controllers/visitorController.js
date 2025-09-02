import dbPromise from "../../../database/db.js";
import qrcode from "qrcode";

const createVisitor = async (req, res) => {
  try {
    const { name, phone, email, dateOfVisit, time, purpose } = req.body;

    if (!name || !phone || !purpose) {
      return res.status(400).json({ message: "Name, phone, and purpose are required" });
    }

    // Validate phone format
    if (!/^0\d{9}$/.test(phone)) {
      return res.status(422).json({ message: "Phone must be in format 0xxxxxxxxx (10 digits starting with 0)" });
    }

    // Validate email format if provided
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      return res.status(422).json({ message: "Valid email address is required" });
    }

    const db = await dbPromise;
    const result = await db.run(
      `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, phone, email || null, purpose, dateOfVisit, time]
    );

    // Get the inserted visitor
    const visitor = await db.get(
      `SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, check_in
       FROM visitors WHERE id = ?`,
      [result.lastID]
    );

    res.status(201).json({
      id: visitor.id,
      name: visitor.name,
      phone: visitor.phone,
      email: visitor.email,
      purpose: visitor.purpose,
      dateOfVisit: visitor.date_of_visit,
      time: visitor.time_of_visit,
      status: "approved",
      checkIn: visitor.check_in
    });
  } catch (error) {
    console.error("Error creating visitor:", error);
    res.status(500).json({ message: "Failed to create visitor" });
  }
};

const getMyVisitors = async (req, res) => {
  try {
    const db = await dbPromise;
    const visitors = await db.all(
      `SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, check_in, check_out
       FROM visitors
       ORDER BY check_in DESC`
    );

    const formattedVisitors = visitors.map(visitor => ({
      id: visitor.id,
      name: visitor.name,
      phone: visitor.phone,
      email: visitor.email,
      purpose: visitor.purpose,
      dateOfVisit: visitor.date_of_visit,
      time: visitor.time_of_visit,
      status: visitor.check_out ? "checked_out" : "checked_in",
      checkIn: visitor.check_in,
      checkOut: visitor.check_out
    }));

    res.json(formattedVisitors);
  } catch (error) {
    console.error("Error fetching visitors:", error);
    res.status(500).json({ message: "Failed to fetch visitors" });
  }
};

const createPass = async (req, res) => {
  try {
    const { visitorId } = req.params;
    const db = await dbPromise;

    // Check if visitor exists
    const visitor = await db.get(`SELECT id FROM visitors WHERE id = ?`, [visitorId]);

    if (!visitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    // Generate a simple pass ID and expiration
    const passId = `PASS-${visitorId}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Generate QR code data URL
    const qrCodeData = await qrcode.toDataURL(passId);

    // Insert pass into database
    const result = await db.run(
      `INSERT INTO passes (pass_id, visitor_id, expires_at, status)
       VALUES (?, ?, ?, ?)`,
      [passId, visitorId, expiresAt.toISOString(), 'active']
    );

    // Get the inserted pass
    const pass = await db.get(
      `SELECT id, pass_id, visitor_id, expires_at, status FROM passes WHERE id = ?`,
      [result.lastID]
    );

    res.status(201).json({
      id: pass.id,
      passId: pass.pass_id,
      visitorId: parseInt(visitorId),
      expiresAt: pass.expires_at,
      status: pass.status,
      qrCode: qrCodeData
    });
  } catch (error) {
    console.error("Error creating pass:", error);
    res.status(500).json({ message: "Failed to create pass" });
  }
};

const bulkInvite = async (req, res) => {
  try {
    const { eventName, date, time, numGuests } = req.body;
    const residentEmail = req.headers['x-resident-email'] || 'demo@resident.local';

    if (!eventName || !date || !time || !numGuests) {
      return res.status(400).json({ message: "Event name, date, time, and number of guests are required" });
    }

    if (numGuests < 1 || numGuests > 50) {
      return res.status(422).json({ message: "Number of guests must be between 1 and 50" });
    }

    // Generate unique invite code
    const inviteCode = `BULK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const db = await dbPromise;
    const result = await db.run(
      `INSERT INTO bulk_invites (event_name, date, time, num_guests, invite_code, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [eventName, date, time, numGuests, inviteCode, expiresAt.toISOString(), residentEmail]
    );

    // Get the inserted bulk invite
    const bulkInvite = await db.get(
      `SELECT id, event_name, date, time, num_guests, invite_code, expires_at, created_by
       FROM bulk_invites WHERE id = ?`,
      [result.lastID]
    );

    // Generate invite link (assuming frontend will handle the route)
    const inviteLink = `${req.protocol}://${req.get('host')}/bulk-register/${inviteCode}`;

    res.status(201).json({
      id: bulkInvite.id,
      eventName: bulkInvite.event_name,
      date: bulkInvite.date,
      time: bulkInvite.time,
      numGuests: bulkInvite.num_guests,
      inviteCode: bulkInvite.invite_code,
      inviteLink: inviteLink,
      expiresAt: bulkInvite.expires_at,
      createdBy: bulkInvite.created_by
    });
  } catch (error) {
    console.error("Error creating bulk invite:", error);
    res.status(500).json({ message: "Failed to create bulk invitation" });
  }
};

const getBulkInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const db = await dbPromise;

    const bulkInvite = await db.get(
      `SELECT id, event_name, date, time, num_guests, invite_code, expires_at, created_by
       FROM bulk_invites WHERE invite_code = ? AND expires_at > datetime('now')`,
      [inviteCode]
    );

    if (!bulkInvite) {
      return res.status(404).json({ message: "Bulk invitation not found or expired" });
    }

    res.json({
      id: bulkInvite.id,
      eventName: bulkInvite.event_name,
      date: bulkInvite.date,
      time: bulkInvite.time,
      numGuests: bulkInvite.num_guests,
      inviteCode: bulkInvite.invite_code,
      expiresAt: bulkInvite.expires_at,
      createdBy: bulkInvite.created_by
    });
  } catch (error) {
    console.error("Error fetching bulk invite:", error);
    res.status(500).json({ message: "Failed to fetch bulk invitation" });
  }
};

export { createVisitor, getMyVisitors, createPass, bulkInvite, getBulkInvite };
