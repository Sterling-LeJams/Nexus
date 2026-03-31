import type { FastifyInstance } from "fastify";

// --------------------------------
// --- Health Routes ---
// --------------------------------

export const healthRoutes = async (app: FastifyInstance) => {
  app.get("/api/health", async () => ({
    status: "ok",
    version: "0.1.0",
  }));
};
