import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createEntry, getEntries, getStats, deleteEntry } from "../controllers/entries.controller.js";

const router = Router();
router.use(requireAuth);
router.post("/", createEntry);
router.get("/", getEntries);
router.get("/stats", getStats);
router.delete("/:id", deleteEntry);

export default router;