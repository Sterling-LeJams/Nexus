CREATE TABLE IF NOT EXISTS model_object_tree (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    metadata_id UUID NOT NULL REFERENCES model_metadata(id) ON DELETE CASCADE,
    object_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    parent_object_id INTEGER,
    depth INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_model_object_tree_model_id ON model_object_tree(model_id);
CREATE INDEX idx_model_object_tree_parent ON model_object_tree(parent_object_id);
