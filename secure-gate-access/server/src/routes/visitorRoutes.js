import express from "express";
import { createVisitor, getMyVisitors, createPass } from "../controllers/visitorController.js";

const router = express.Router();

// POST /api/visitors - Create a new visitor
router.post("/", createVisitor);

// GET /api/visitors - Get all visitors
router.get("/", getMyVisitors);

// POST /api/visitors/:visitorId/pass - Create a pass for a visitor
router.post("/:visitorId/pass", createPass);

export default router;
