import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";

// --------------------------------
// --- Server Setup ---
// --------------------------------

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: config.frontendUrl,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

// --------------------------------
// --- Routes ---
// --------------------------------

await app.register(healthRoutes);
await app.register(authRoutes);

// --------------------------------
// --- Start ---
// --------------------------------

app.listen({ port: config.port, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`Backend listening on ${address}`);
});
