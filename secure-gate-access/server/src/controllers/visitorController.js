import dbPromise from "../../../database/db.js";

const createVisitor = async (req, res) => {
  try {
    const { name, phone, email, idNumber, vehiclePlate, purpose, estimatedTime } = req.body;

    if (!name || !phone || !email || !purpose) {
      return res.status(400).json({ message: "Name, phone, email, and purpose are required" });
    }

    // Validate phone format
    if (!/^0\d{9}$/.test(phone)) {
      return res.status(422).json({ message: "Phone must be in format 0xxxxxxxxx (10 digits starting with 0)" });
    }

    // Validate email format
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(422).json({ message: "Valid email address is required" });
    }

    const db = await dbPromise;
    const result = await db.run(
      `INSERT INTO visitors (name, phone, email, id_number, vehicle_plate, purpose, estimated_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, email, idNumber || '', vehiclePlate || '', purpose, estimatedTime || '1 hour']
    );

    // Get the inserted visitor
    const visitor = await db.get(
      `SELECT id, name, phone, email, id_number, vehicle_plate, purpose, estimated_time, check_in
       FROM visitors WHERE id = ?`,
      [result.lastID]
    );

    res.status(201).json({
      id: visitor.id,
      name: visitor.name,
      phone: visitor.phone,
      email: visitor.email,
      idNumber: visitor.id_number,
      vehiclePlate: visitor.vehicle_plate,
      purpose: visitor.purpose,
      estimatedTime: visitor.estimated_time,
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
      `SELECT id, name, phone, email, id_number, vehicle_plate, purpose, estimated_time, check_in, check_out
       FROM visitors
       ORDER BY check_in DESC`
    );

    const formattedVisitors = visitors.map(visitor => ({
      id: visitor.id,
      name: visitor.name,
      phone: visitor.phone,
      email: visitor.email,
      idNumber: visitor.id_number,
      vehiclePlate: visitor.vehicle_plate,
      purpose: visitor.purpose,
      estimatedTime: visitor.estimated_time,
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
      status: pass.status
    });
  } catch (error) {
    console.error("Error creating pass:", error);
    res.status(500).json({ message: "Failed to create pass" });
  }
};

export { createVisitor, getMyVisitors, createPass };
