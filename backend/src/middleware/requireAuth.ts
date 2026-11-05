import type { NextFunction, Request, Response } from "express";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { unauthorized } from "../lib/errors.js";
import { createUserClient } from "../lib/supabase.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      user: User;
      supabase: SupabaseClient;
    }
  }
}

// Verifies the token, then attaches the user and a client that acts as them.
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw unauthorized("Missing token");
  }

  const token = header.slice("Bearer ".length);
  const supabase = createUserClient(token);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw unauthorized("Invalid token");
  }

  res.locals.user = data.user;
  res.locals.supabase = supabase;
  next();
}
