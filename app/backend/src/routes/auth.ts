import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  getThreeLeggedAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
} from "../autodesk/auth.js";
import {
  upsertToken,
  getStoredToken,
  isTokenExpired,
} from "../supabase/tokens.js";
import { config } from "../config.js";

// --------------------------------
// --- Auth Routes ---
// --------------------------------

export const authRoutes = async (app: FastifyInstance) => {
  // GET /api/acc/login — redirect to Autodesk OAuth consent page
  app.get("/api/acc/login", async (_req: FastifyRequest, reply: FastifyReply) => {
    const url = getThreeLeggedAuthUrl();
    return reply.redirect(url);
  });

  // GET /api/acc/callback — Autodesk redirects here after consent
  app.get(
    "/api/acc/callback",
    async (
      req: FastifyRequest<{ Querystring: { code: string } }>,
      reply: FastifyReply
    ) => {
      const { code } = req.query;

      if (!code) {
        return reply.status(400).send({ error: "Missing authorization code" });
      }

      const tokens = await exchangeCodeForToken(code);

      await upsertToken(
        tokens.access_token,
        tokens.refresh_token,
        tokens.expires_in,
        "data:read account:read"
      );

      // Redirect back to the frontend
      return reply.redirect(config.frontendUrl);
    }
  );

  // GET /api/acc/token — return current access token (auto-refresh if expired)
  app.get("/api/acc/token", async (_req: FastifyRequest, reply: FastifyReply) => {
    const stored = await getStoredToken();

    if (!stored) {
      return reply.status(401).send({
        error: "Not connected to Autodesk. Please log in first.",
      });
    }

    // Token still valid — return it
    if (!isTokenExpired(stored.expires_at)) {
      const remainingSeconds = Math.floor(
        (new Date(stored.expires_at).getTime() - Date.now()) / 1000
      );
      return {
        access_token: stored.access_token,
        expires_in: remainingSeconds,
      };
    }

    // Token expired — refresh it
    const refreshed = await refreshAccessToken(stored.refresh_token);

    await upsertToken(
      refreshed.access_token,
      refreshed.refresh_token,
      refreshed.expires_in,
      "data:read account:read"
    );

    return {
      access_token: refreshed.access_token,
      expires_in: refreshed.expires_in,
    };
  });
};
