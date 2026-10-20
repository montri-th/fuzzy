-- Applied by Netlify deploy migrations only. Search telemetry intentionally has no query or user identifier.
CREATE TABLE fuzzy_search_events (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  mode text NOT NULL CHECK (mode IN ('all','area','place','legacy')),
  engine text NOT NULL CHECK (engine IN ('new','legacy')),
  outcome text NOT NULL CHECK (outcome IN ('matched','ambiguous','no-match','error')),
  result_count integer NOT NULL CHECK (result_count BETWEEN 0 AND 100000),
  latency_ms numeric(10,2) NOT NULL CHECK (latency_ms BETWEEN 0 AND 60000),
  corpus_version varchar(80) NOT NULL,
  engine_version varchar(80) NOT NULL
);
CREATE INDEX fuzzy_search_events_created_at_idx ON fuzzy_search_events (created_at);

CREATE TABLE fuzzy_search_feedback (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  query text NOT NULL CHECK (char_length(query) BETWEEN 1 AND 160),
  note text NOT NULL CHECK (char_length(note) BETWEEN 1 AND 500),
  top_ids jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(top_ids) = 'array' AND jsonb_array_length(top_ids) <= 10),
  mode text NOT NULL CHECK (mode IN ('all','area','place')),
  religion text CHECK (religion IN ('buddhist','islam','christian','sikh')),
  result_status varchar(40) NOT NULL,
  result_count integer NOT NULL CHECK (result_count BETWEEN 0 AND 100000),
  corpus_version varchar(80) NOT NULL,
  engine_version varchar(80) NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','investigating','confirmed','rejected','resolved')),
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  cause text NOT NULL DEFAULT '' CHECK (char_length(cause) <= 300),
  expected_outcome text CHECK (expected_outcome IN ('ranked','abstain')),
  intended_ids jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(intended_ids) = 'array' AND jsonb_array_length(intended_ids) <= 10),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
  privacy_reviewed boolean NOT NULL DEFAULT false,
  CHECK (status NOT IN ('confirmed','resolved') OR (
    expected_outcome IS NOT NULL AND privacy_reviewed = true AND char_length(cause) > 0 AND (
      (expected_outcome = 'ranked' AND jsonb_array_length(intended_ids) > 0) OR
      (expected_outcome = 'abstain' AND jsonb_array_length(intended_ids) = 0)
    )
  ))
);
CREATE INDEX fuzzy_search_feedback_created_at_idx ON fuzzy_search_feedback (created_at DESC, id DESC);
CREATE INDEX fuzzy_search_feedback_status_idx ON fuzzy_search_feedback (status, updated_at DESC);

CREATE TABLE fuzzy_search_triage_audit (
  id uuid PRIMARY KEY,
  feedback_id uuid NOT NULL REFERENCES fuzzy_search_feedback(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  previous_version integer NOT NULL,
  new_version integer NOT NULL,
  previous_status text NOT NULL,
  status text NOT NULL,
  cause text NOT NULL,
  expected_outcome text,
  intended_ids jsonb NOT NULL,
  notes text NOT NULL,
  privacy_reviewed boolean NOT NULL,
  reviewer_kind text NOT NULL DEFAULT 'human_admin' CHECK (reviewer_kind = 'human_admin'),
  UNIQUE (feedback_id, new_version)
);
CREATE INDEX fuzzy_search_triage_audit_feedback_idx ON fuzzy_search_triage_audit (feedback_id, new_version);
