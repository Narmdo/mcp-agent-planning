-- Migration 006: Add blockers and blocker_impacts tables
-- Enables comprehensive blocker tracking and impact analysis

CREATE TABLE IF NOT EXISTS blockers (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  blocker_type TEXT NOT NULL DEFAULT 'external', -- 'external', 'resource', 'technical', 'decision', 'dependency'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in-progress', 'resolved', 'closed'
  owner TEXT,
  external_ref TEXT, -- Reference to external system/ticket
  resolution_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  created_by TEXT DEFAULT 'agent',
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS blocker_impacts (
  id TEXT PRIMARY KEY,
  blocker_id TEXT NOT NULL,
  task_id TEXT,
  impact_type TEXT NOT NULL DEFAULT 'blocks', -- 'blocks', 'delays', 'affects'
  impact_description TEXT,
  estimated_delay INTEGER, -- in hours
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (blocker_id) REFERENCES blockers(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Unique constraint to prevent duplicate impacts
  UNIQUE (blocker_id, task_id, impact_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blockers_project ON blockers(project_id);
CREATE INDEX IF NOT EXISTS idx_blockers_status ON blockers(status);
CREATE INDEX IF NOT EXISTS idx_blockers_severity ON blockers(severity);
CREATE INDEX IF NOT EXISTS idx_blockers_type ON blockers(blocker_type);
CREATE INDEX IF NOT EXISTS idx_blocker_impacts_blocker ON blocker_impacts(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocker_impacts_task ON blocker_impacts(task_id);
