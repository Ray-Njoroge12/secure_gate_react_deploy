const express = require("express");
const pool = require("../database/db"); // your existing DB connection

const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Server is working");
});

// Login route with role handling
app.post("/api/login", async (req, res) => {
  const { email, password, role } = req.body; // include role

  try {
    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND password = $2 AND role = $3",
      [email, password, role] // use role in query
    );

    if (user.rows.length > 0) {
      res.json({ success: true, token: "fake-jwt-token", role });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
