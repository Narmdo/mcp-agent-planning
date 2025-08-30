# Database Migrations

This directory contains documentation and examples for database migrations.

## How Migrations Work

1. **Automatic**: Migrations run automatically when the MCP server starts
2. **Versioned**: Each migration has a sequential version number
3. **Tracked**: Executed migrations are tracked in the `migrations` table
4. **Forward-only**: No rollback support (keep it simple for now)

## Adding a New Migration

When you need to change the database schema:

1. **Increment the version number** in the `getMigrations()` method
2. **Add your migration function** following the naming pattern
3. **Test thoroughly** - migrations can't be easily undone

### Example Migration

```javascript
// In database.js, add to getMigrations() array:
{
  version: 2, 
  name: 'add_task_tracking',
  up: this.migration002_add_task_tracking.bind(this)
}

// Then implement the migration method:
async migration002_add_task_tracking(db) {
  await db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'todo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )
  `);
  
  await db.run('CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks (project_id)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status)');
}
```

## Migration Guidelines

- **Keep migrations small and focused** - one logical change per migration
- **Always use IF NOT EXISTS** for CREATE statements when safe
- **Add proper indexes** for new columns that will be queried
- **Test with existing data** if you have any
- **Document breaking changes** in the migration comments

## Database Location

The database file is stored at: `.planning/database.db`

This directory (`.planning/`) will contain all agent planning data:
- `database.db` - Main SQLite database
- Future: logs, temporary files, cached data, etc.
