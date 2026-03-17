import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getProfile, saveProfile, getHistory, sendMessage, clearHistory } from "../controllers/chat.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/profile", getProfile);
router.post("/profile", saveProfile);
router.get("/history", getHistory);
router.post("/message", sendMessage);
router.delete("/history", clearHistory);

export default router;