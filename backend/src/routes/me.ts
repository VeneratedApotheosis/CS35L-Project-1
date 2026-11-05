import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";

export const meRouter = Router();

meRouter.get("/me", requireAuth, (_req, res) => {
  const { user } = res.locals;
  res.status(200).json({ id: user.id, email: user.email });
});
