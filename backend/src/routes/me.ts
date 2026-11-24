import { Router } from "express";
import { IANAZone } from "luxon";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { awardNewBadges } from "../services/achievements.js";
import {
  deleteAccount,
  getProfile,
  updateProfile,
  type Profile,
} from "../services/profile.js";

export const meRouter = Router();

// `timezone: null` clears the timezone, so the backend uses UTC.
export const updateMeBody = z
  .strictObject({
    display_name: z.string().trim().min(1).max(50).optional(),
    timezone: z
      .string()
      .refine((value) => IANAZone.isValidZone(value), {
        message: "not a valid IANA timezone",
      })
      .nullable()
      .optional(),
  })
  .refine(
    (body) => body.display_name !== undefined || body.timezone !== undefined,
    { message: "provide display_name or timezone" },
  );

const meResponse = (
  user: { id: string; email?: string },
  profile: Profile,
) => ({
  id: user.id,
  email: user.email,
  display_name: profile.display_name,
  avatar_url: profile.avatar_url,
  timezone: profile.timezone,
});

meRouter.get("/me", requireAuth, async (_req, res) => {
  const { user, supabase } = res.locals;
  const profile = await getProfile(supabase, user.id);
  res.status(200).json(meResponse(user, profile));
});

meRouter.patch(
  "/me",
  requireAuth,
  validate({ body: updateMeBody }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    const patch = valid.body as z.infer<typeof updateMeBody>;
    const profile = await updateProfile(supabase, user.id, patch);
    // Personal Touch is earned by setting the name, which stored data cannot
    // show later, so this request says so. Never fails the update.
    const new_badges = await awardNewBadges(supabase, user.id, {
      displayNameSet: patch.display_name !== undefined,
    });
    res.status(200).json({ ...meResponse(user, profile), new_badges });
  },
);

meRouter.delete("/me", requireAuth, async (_req, res) => {
  const { user, supabase } = res.locals;
  await deleteAccount(supabase, user.id);
  res.status(204).send();
});
