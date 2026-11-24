import { fileURLToPath } from "node:url";
const plugin = fileURLToPath(
  new URL("./phone-breakpoint.mjs", import.meta.url),
);
const config = { plugins: { [plugin]: {}, "@tailwindcss/postcss": {} } };
export default config;
