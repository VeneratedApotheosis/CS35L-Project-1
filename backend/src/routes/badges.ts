import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import {
  getBadgeBook,
  getUnseenBadges,
  markBadgesSeen,
} from "../services/achievements.js";

export const badgesRouter = Router();

export const seenBody = z.strictObject({
  ids: z
    .array(z.string().regex(/^[a-z0-9-]{1,64}$/, "not a badge id"))
    .min(1)
    .max(100),
});

// The whole badge book. Runs a check first, so this may store new badges.
badgesRouter.get("/me/badges", requireAuth, async (_req, res) => {
  const { user, supabase } = res.locals;
  res.json(await getBadgeBook(supabase, user.id));
});

// Earned badges not shown yet. The app calls this once on load.
badgesRouter.get("/me/badges/unseen", requireAuth, async (_req, res) => {
  const { user, supabase } = res.locals;
  res.json({ badges: await getUnseenBadges(supabase, user.id) });
});

badgesRouter.post(
  "/me/badges/seen",
  requireAuth,
  validate({ body: seenBody }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    const { ids } = valid.body as z.infer<typeof seenBody>;
    await markBadgesSeen(supabase, user.id, ids);
    res.status(204).end();
  },
);
