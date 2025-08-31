-- Migration 005: Add task dependencies table
-- Enables task hierarchy and blocking relationships

CREATE TABLE IF NOT EXISTS task_dependencies (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  parent_task_id TEXT NOT NULL,
  child_task_id TEXT NOT NULL,
  dependency_type TEXT NOT NULL DEFAULT 'blocks', -- 'blocks', 'subtask', 'prerequisite'
  created_at TEXT NOT NULL,
  created_by TEXT DEFAULT 'agent',
  
  -- Constraints
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (child_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Prevent circular dependencies and self-references
  CHECK (parent_task_id != child_task_id),
  
  -- Unique constraint to prevent duplicate dependencies
  UNIQUE (parent_task_id, child_task_id, dependency_type)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_task_dependencies_parent ON task_dependencies(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_child ON task_dependencies(child_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_project ON task_dependencies(project_id);
