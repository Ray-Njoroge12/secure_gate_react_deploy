// server/src/routes/userRoutes.js
import express from "express";
import userController from "../controllers/userController.js";

const router = express.Router();

// Update user profile
router.put("/profile", userController.updateProfile);

export default router;   // ✅ default export
