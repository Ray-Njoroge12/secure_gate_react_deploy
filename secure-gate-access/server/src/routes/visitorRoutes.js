import express from "express";
import { createVisitor, getMyVisitors, createPass, bulkInvite, getBulkInvite, completeInvite } from "../controllers/visitorController.js";

const router = express.Router();

// POST /api/visitors - Create a new visitor
router.post("/", createVisitor);

// GET /api/visitors - Get all visitors
router.get("/", getMyVisitors);

// POST /api/visitors/:visitorId/pass - Create a pass for a visitor
router.post("/:visitorId/pass", createPass);

// POST /api/visitors/bulk-invite - Create a bulk invitation
router.post("/bulk-invite", bulkInvite);

// GET /api/visitors/bulk-invite/:inviteCode - Get bulk invitation details
router.get("/bulk-invite/:inviteCode", getBulkInvite);

// POST /api/visitors/complete/:inviteCode - Complete guest self-registration
router.post("/complete/:inviteCode", completeInvite);

export default router;
