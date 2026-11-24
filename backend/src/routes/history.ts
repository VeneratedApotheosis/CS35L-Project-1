import { Router } from "express";
import { z } from "zod";
import { paginationQuery } from "../lib/pagination.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { getHistory } from "../services/history.js";

export const historyRouter = Router();

export const historyQuery = paginationQuery.extend({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  level: z.enum(["gold", "silver", "bronze", "none"]).optional(),
  sort: z.enum(["newest", "oldest", "best"]).default("newest"),
});

// Finished habits for the History tab, with a summary across all of them.
historyRouter.get(
  "/me/history",
  requireAuth,
  validate({ query: historyQuery }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    res.json(
      await getHistory(
        supabase,
        user.id,
        valid.query as z.infer<typeof historyQuery>,
      ),
    );
  },
);
