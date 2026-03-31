import {
  AuthenticationClient,
  Scopes,
  ResponseType,
} from "@aps_sdk/authentication";
import type { ThreeLeggedToken, TwoLeggedToken } from "@aps_sdk/authentication";
import { config } from "../config.js";

// --------------------------------
// --- Autodesk Auth ---
// --------------------------------

const authClient = new AuthenticationClient();

// --------------------------------
// --- 2-Legged (Server-to-Server) ---
// --------------------------------

export const getInternalToken = async (): Promise<TwoLeggedToken> => {
  return authClient.getTwoLeggedToken(
    config.apsClientId,
    config.apsClientSecret,
    [
      Scopes.DataRead,
      Scopes.DataWrite,
      Scopes.DataCreate,
      Scopes.BucketRead,
      Scopes.BucketCreate,
    ]
  );
};

// --------------------------------
// --- 3-Legged (User Auth for ACC) ---
// --------------------------------

export const getThreeLeggedAuthUrl = (): string => {
  return authClient.authorize(
    config.apsClientId,
    ResponseType.Code,
    config.apsCallbackUrl,
    [Scopes.DataRead, Scopes.AccountRead]
  );
};

export const exchangeCodeForToken = async (
  code: string
): Promise<ThreeLeggedToken> => {
  return authClient.getThreeLeggedToken(
    config.apsClientId,
    code,
    config.apsCallbackUrl,
    {
      clientSecret: config.apsClientSecret,
    }
  );
};

export const refreshAccessToken = async (
  refreshToken: string
): Promise<ThreeLeggedToken> => {
  return authClient.refreshToken(
    config.apsClientId,
    refreshToken,
    {
      clientSecret: config.apsClientSecret,
    }
  );
};
