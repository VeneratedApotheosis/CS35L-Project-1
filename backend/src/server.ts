import "dotenv/config";
import express from "express";
import cors from "cors";
import { requireUser } from "./auth.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

app.use(cors({ origin: frontendOrigin }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/me", requireUser, (_req, res) => {
  res
    .status(200)
    .json({ id: res.locals.user.id, email: res.locals.user.email });
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
