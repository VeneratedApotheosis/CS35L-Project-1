import express from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { habitsRouter } from "./routes/habits.js";
import { healthRouter } from "./routes/health.js";
import { logsRouter } from "./routes/logs.js";
import { meRouter } from "./routes/me.js";

export const app = express();

app.use(pinoHttp({ logger }));
app.use(cors({ origin: env.FRONTEND_ORIGIN }));
app.use(express.json());

app.use(healthRouter);
app.use(meRouter);
app.use(habitsRouter);
app.use(logsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
