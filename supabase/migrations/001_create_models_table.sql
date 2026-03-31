CREATE TABLE IF NOT EXISTS models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    urn TEXT,
    file_name TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('ifc_local', 'ifc_example', 'device_upload', 'acc')),
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'translating', 'extracting_metadata', 'complete', 'failed')),
    storage_path TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_models_user_id ON models(user_id);
CREATE INDEX idx_models_urn ON models(urn);
