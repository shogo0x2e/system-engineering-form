CREATE TABLE survey_responses (
  id TEXT PRIMARY KEY,

  user_key TEXT,
  fingerprint_key TEXT,

  q1_answer TEXT NOT NULL,
  q1_other_text TEXT,

  q2_answer TEXT,
  q2_other_text TEXT,

  q3_answer TEXT,

  gender TEXT,
  age_group TEXT,

  q1_display_order_json TEXT,
  q2_display_order_json TEXT,

  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
