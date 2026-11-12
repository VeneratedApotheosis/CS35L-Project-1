import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getDashboard } from "../services/dashboard.js";

export const dashboardRouter = Router();

dashboardRouter.get("/dashboard", requireAuth, async (_req, res) => {
  const { user, supabase } = res.locals;
  res.json(await getDashboard(supabase, user.id));
});
