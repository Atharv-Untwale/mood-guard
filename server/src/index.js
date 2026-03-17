import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import entriesRouter from "./routes/entries.js";
import chatRouter from "./routes/chat.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json({ limit: "10kb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

app.get("/health", (_, res) => res.json({ status: "ok" }));
app.use("/api/entries", entriesRouter);
app.use("/api/chat", chatRouter);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));