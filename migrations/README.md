# Database Migrations

This directory contains SQL migration files and documentation for the AI Reasoning Framework database schema.

## 📊 Current Schema

The framework uses **6 migrations** to build a comprehensive project management database:

| Migration | File | Purpose |
|-----------|------|---------|
| 001 | `src/database.js` | Core schema (contexts, schema_migrations) |
| 002 | `src/database.js` | Task tracking system |
| 003 | `src/database.js` | Decision logging |
| 004 | `src/database.js` | File mapping capabilities |
| 005 | `005_add_task_dependencies.sql` | Task dependencies with circular detection |
| 006 | `006_add_blocker_management.sql` | Blocker tracking and impact analysis |

## 🔄 How Migrations Work

1. **Automatic Execution**: Migrations run automatically when the MCP server starts
2. **Version Tracking**: Applied migrations are tracked in `schema_migrations` table
3. **Forward-Only**: No rollback support (keeps the system simple and reliable)
4. **Sequential**: Migrations must be applied in order by version number

## 📋 Current Database Tables

After all migrations are applied, the database contains:

- **`contexts`** - Project contexts with goals, scope, and branch information
- **`tasks`** - Task management with status, priority, and assignee tracking
- **`decisions`** - Architectural decision records with rationale and alternatives
- **`mapped_files`** - Codebase file mapping with importance scoring and analysis
- **`task_dependencies`** - Task relationship management with circular dependency prevention
- **`blockers`** - Project impediment tracking with severity and impact analysis
- **`blocker_impacts`** - Detailed impact analysis for blockers
- **`schema_migrations`** - Migration version tracking

## 🛠️ Adding New Migrations

To add a new migration:

### Method 1: In-Code Migration (Migrations 001-004)
1. **Add to getMigrations() array** in `src/database.js`:
   ```javascript
   {
     version: 7,
     name: 'add_new_feature', 
     up: this.migration007_add_new_feature.bind(this)
   }
   ```

2. **Implement the migration method**:
   ```javascript
   async migration007_add_new_feature(db) {
     await db.run(`
       CREATE TABLE IF NOT EXISTS new_table (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         context_id INTEGER NOT NULL,
         -- your columns here
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE CASCADE
       )
     `);
   }
   ```

### Method 2: SQL File Migration (Migrations 005-006)
1. **Create SQL file**: `migrations/007_your_feature.sql`
2. **Add to getMigrations() array**:
   ```javascript
   {
     version: 7,
     name: 'add_new_feature',
     up: () => this.loadSqlMigration('007_your_feature.sql')
   }
   ```

## ✅ Testing Migrations

Always test new migrations:

```bash
# Test basic functionality
npm test

# Test with production scenarios  
npm run test:production

# Debug database state
npm run debug-db
```

## 🔍 Migration Best Practices

1. **Use IF NOT EXISTS** for table creation
2. **Include proper foreign keys** for referential integrity
3. **Add timestamps** (created_at, updated_at) to new tables
4. **Use INTEGER PRIMARY KEY AUTOINCREMENT** for IDs
5. **Test with existing data** before deploying
6. **Keep migrations small and focused** on single changes

## 📁 File Organization

- **Migrations 001-004**: Defined in `src/database.js` as methods
- **Migrations 005+**: Separate SQL files in `migrations/` directory
- **Documentation**: This README.md file

## 🚨 Important Notes

- **Never modify existing migrations** once they're deployed
- **Always increment version numbers** sequentially
- **Test thoroughly** - migrations can't be easily rolled back
- **Backup important data** before running new migrations
- **Use transactions** for complex multi-statement migrations
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
