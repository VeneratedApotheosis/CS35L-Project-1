import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: z.string().min(1).default("http://localhost:5173"),
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
