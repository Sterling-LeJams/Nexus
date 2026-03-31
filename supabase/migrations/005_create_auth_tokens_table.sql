-- Single-row table for MVP (one Autodesk connection per deployment).
-- Will be extended to per-user tokens when multi-tenant auth is added.
CREATE TABLE IF NOT EXISTS autodesk_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    scope TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure only one row exists (single-tenant MVP constraint).
CREATE UNIQUE INDEX idx_autodesk_tokens_singleton ON autodesk_tokens ((true));
