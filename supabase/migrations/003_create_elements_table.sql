CREATE TABLE IF NOT EXISTS model_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    metadata_id UUID NOT NULL REFERENCES model_metadata(id) ON DELETE CASCADE,
    db_id INTEGER NOT NULL,
    external_id TEXT,
    name TEXT NOT NULL,
    category TEXT,
    family TEXT,
    type TEXT,
    properties JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_model_elements_model_id ON model_elements(model_id);
CREATE INDEX idx_model_elements_metadata_id ON model_elements(metadata_id);
CREATE INDEX idx_model_elements_category ON model_elements(category);
