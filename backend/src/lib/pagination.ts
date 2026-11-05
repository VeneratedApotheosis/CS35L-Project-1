import { z } from "zod";

// [PLACEHOLDER] Offset pagination with provisional defaults (limit 50, max 100). Switch to cursors if lists get large.
export const paginationQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type Pagination = { limit: number; offset: number };

export type Page<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};
