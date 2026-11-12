import { Router } from "express";
import { DateTime } from "luxon";
import { z } from "zod";
import { PLANT_TYPES } from "../domain/plants.js";
import { paginationQuery, type Pagination } from "../lib/pagination.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import {
  createHabit,
  getHabitDetail,
  listHabits,
  type CreateHabitInput,
} from "../services/habits.js";

export const habitsRouter = Router();

// [PLACEHOLDER] The numeric limits below are provisional. They must stay in
// step with the check constraints on the `habits` table.
export const createHabitBody = z.strictObject({
  name: z.string().trim().min(1).max(100),
  // `null` is treated the same as leaving the description out.
  description: z
    .string()
    .max(500)
    .nullish()
    .transform((value) => value ?? undefined),
  plant_type: z.enum(PLANT_TYPES),
  target_count: z.number().int().min(1).max(50),
  interval_count: z.number().int().min(1).max(365),
  interval_unit: z.enum(["day", "week", "month"]),
  num_periods: z.number().int().min(1).max(52),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date like 2026-11-05")
    .refine((value) => DateTime.fromISO(value).isValid, {
      message: "not a real calendar date",
    })
    .optional(),
});

export const habitParams = z.strictObject({ id: z.string().uuid() });

habitsRouter.post(
  "/habits",
  requireAuth,
  validate({ body: createHabitBody }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    const input = valid.body as CreateHabitInput;
    const habit = await createHabit(supabase, user.id, input);
    res.status(201).json(habit);
  },
);

habitsRouter.get(
  "/habits",
  requireAuth,
  validate({ query: paginationQuery }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    const page = await listHabits(supabase, user.id, valid.query as Pagination);
    res.json({
      habits: page.items,
      total: page.total,
      limit: page.limit,
      offset: page.offset,
    });
  },
);

habitsRouter.get(
  "/habits/:id",
  requireAuth,
  validate({ params: habitParams }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    const { id } = valid.params as z.infer<typeof habitParams>;
    res.json(await getHabitDetail(supabase, user.id, id));
  },
);
