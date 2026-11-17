import "dotenv/config";
import { z } from "zod";

export const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  // Allowed CORS origins: one, or several separated by commas, for example
  // "http://localhost:5173,https://name.github.io". Set it on the host to the
  // deployed frontend address.
  // A browser sends its origin with no trailing slash, and CORS compares it
  // exactly, so slashes at the end of each origin are dropped.
  FRONTEND_ORIGIN: z
    .string()
    .trim()
    .min(1)
    .default("http://localhost:5173")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter((origin) => origin.length > 0),
    )
    .refine((origins) => origins.length > 0, "needs at least one origin"),
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
