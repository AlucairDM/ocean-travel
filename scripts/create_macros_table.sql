CREATE TABLE IF NOT EXISTS macros (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  scope TEXT,
  command TEXT NOT NULL,
  img TEXT,
  folder TEXT,
  sort INTEGER,
  permission TEXT,
  flags TEXT
);