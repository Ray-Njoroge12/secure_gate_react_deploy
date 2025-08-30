const express = require("express");
const router = express.Router();
const { login } = require("../controllers/authController");

router.post("/login", (req, res) => login(req, res, "admin"));

module.exports = router;
