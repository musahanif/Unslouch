import express from "express";
import cors from "cors";
import { corsOptions } from "./config/cors.js";
import cookieParser from "cookie-parser";

//swagger
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

import { errorMiddleware } from "./middlewares/errorMiddleware.js";
import { notFoundMiddleware } from "./middlewares/notFoundMiddleware.js";
import { protectUserRoutesFromCsrf } from "./middlewares/csrfMiddleware.js";
import { sendSuccess } from "./utils/apiResponse.js";

//routes
import authRoutes from "./modules/auth/auth.routes.js";
import {
  firmwareDeviceRoutes,
  userDeviceRoutes,
} from "./modules/devices/device.routes.js";
import {
  firmwareCalibrationRoutes,
  userCalibrationRoutes,
} from "./modules/calibrations/calibration.routes.js";
import {
  firmwareSessionRoutes,
  userSessionRoutes,
} from "./modules/sessions/session.routes.js";
import telemetryRoutes from "./modules/telemetry/telemetry.routes.js";

const app = express();

//swagger opt
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "UnSlouch API",
      version: "1.0.0",
      description: "API documentation for UnSlouch backend",
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "unslouch_token",
          description:
            "HTTP-only session cookie set by /api/auth/login or /api/auth/register.",
        },
        deviceAuth: {
          type: "apiKey",
          in: "header",
          name: "Authorization",
          description: "Use: Device <deviceId>.<deviceSecret>",
        },
      },
    },
  },

  apis: [
    "./src/modules/auth/auth.routes.js",
    "./src/modules/devices/device.routes.js",
    "./src/modules/calibrations/calibration.routes.js",
    "./src/modules/sessions/session.routes.js",
    "./src/modules/telemetry/telemetry.routes.js",
  ],
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

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

//routes
app.use("/api/auth", protectUserRoutesFromCsrf ,authRoutes);
app.use("/api/devices", protectUserRoutesFromCsrf, userDeviceRoutes);
app.use("/api/device", firmwareDeviceRoutes);
app.use("/api/devices",protectUserRoutesFromCsrf, userCalibrationRoutes);
app.use("/api/device",firmwareCalibrationRoutes);
app.use("/api/sessions", protectUserRoutesFromCsrf, userSessionRoutes);
app.use("/api/device", firmwareSessionRoutes);
app.use("/api/telemetry", telemetryRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
