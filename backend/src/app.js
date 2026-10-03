import express from "express";
import cors from "cors";
import { corsOptions } from "./config/cors.js";
import cookieParser from "cookie-parser";

import { errorMiddleware } from "./middlewares/errorMiddleware.js";
import { notFoundMiddleware } from "./middlewares/notFoundMiddleware.js";
import { sendSuccess } from "./utils/apiResponse.js";

import authRoutes from "./modules/auth/auth.routes.js";

const app = express();

app.disable("x-powered-by");
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

app.get("/api/health", (_req, res) =>
  sendSuccess(res, {
    message: "UnSlouch API is healthy",
    data: { status: "ok" },
  }),
);

app.use("/api/auth", authRoutes);


app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
