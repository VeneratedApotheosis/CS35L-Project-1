import "dotenv/config";
import { z } from "zod";

export const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  // [PLACEHOLDER] Local dev default. Set to the deployed frontend address once
  // hosting is decided.
  // A browser sends its origin with no trailing slash, and CORS compares it
  // exactly, so slashes at the end of the setting are dropped.
  FRONTEND_ORIGIN: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.replace(/\/+$/, ""))
    .default("http://localhost:5173"),
  SUPABASE_URL: z.string().min(1, "is required"),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1, "is required"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment in backend/.env: ${problems}`);
}

export const env = parsed.data;
