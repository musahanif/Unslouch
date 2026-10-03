import app from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { env } from "./config/env.js";

let server;
let shuttingDown = false;

const closeServer = () =>
  new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }

    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const shutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully.`);

  const forceExitTimer = setTimeout(() => {
    console.error("Graceful shutdown timed out");
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  try {
    await closeServer();
    await disconnectDB();
  } catch (error) {
    console.error("Shutdown failed:", error);
    exitCode = 1;
  } finally {
    clearTimeout(forceExitTimer);
    process.exit(exitCode);
  }
};

const startServer = async () => {
  try {
    await connectDB();

    server = app.listen(env.PORT, () => {
      console.log(`TEKSID API listening on port ${env.PORT}`);
    });

    server.on("error", (error) => {
      console.error("HTTP server error:", error);
      void shutdown("HTTP server error", 1);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    await disconnectDB().catch(() => undefined);
    process.exit(1);
  }
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  void shutdown("Unhandled rejection", 1);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  void shutdown("Uncaught exception", 1);
});

void startServer();
