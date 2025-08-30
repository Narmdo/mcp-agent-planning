import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Database {
  constructor() {
    this.db = null;
  }

  async initialize() {
    const planningDir = join(__dirname, '..', '.planning');
    
    // Ensure .planning directory exists
    const fs = await import('fs');
    if (!fs.existsSync(planningDir)) {
      fs.mkdirSync(planningDir, { recursive: true });
    }
    
    const dbPath = join(planningDir, 'database.db');
    
    this.db = new sqlite3.Database(dbPath);
    
    // Promisify database methods
    this.db.run = promisify(this.db.run.bind(this.db));
    this.db.get = promisify(this.db.get.bind(this.db));
    this.db.all = promisify(this.db.all.bind(this.db));

    // Enable JSON support
    await this.db.run('PRAGMA journal_mode = WAL');
    await this.db.run('PRAGMA foreign_keys = ON');

    await this.runMigrations();
  }

  async runMigrations() {
    // Create migrations table if it doesn't exist
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get current migration version
    const currentMigration = await this.db.get(`
      SELECT version FROM migrations ORDER BY version DESC LIMIT 1
    `);
    const currentVersion = currentMigration ? currentMigration.version : 0;

    // Run pending migrations
    const migrations = this.getMigrations();
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        console.log(`Running migration ${migration.version}: ${migration.name}`);
        await migration.up(this.db);
        await this.db.run(`
          INSERT INTO migrations (version, name) VALUES (?, ?)
        `, [migration.version, migration.name]);
      }
    }
  }

  getMigrations() {
    return [
      {
        version: 1,
        name: 'initial_schema',
        up: this.migration001_initial_schema.bind(this)
      }
      // Add new migrations here
    ];
  }

  async migration001_initial_schema(db) {
    // Main projects table with structured fields + flexible JSON
    await db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        goal TEXT NOT NULL,
        scope TEXT NOT NULL,
        branch TEXT NOT NULL,
        project_type TEXT DEFAULT 'other',
        status TEXT DEFAULT 'active',
        metadata JSON DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Flexible context data storage
    await db.run(`
      CREATE TABLE IF NOT EXISTS context_data (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        data_type TEXT NOT NULL,
        content JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for common queries
    await db.run('CREATE INDEX IF NOT EXISTS idx_projects_branch ON projects (branch)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_context_project ON context_data (project_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_context_type ON context_data (data_type)');
  }

  async getCurrentContext(branch) {
    const project = await this.db.get(`
      SELECT * FROM projects 
      WHERE branch = ? AND status = 'active'
      ORDER BY updated_at DESC 
      LIMIT 1
    `, [branch]);

    if (!project) {
      return null;
    }

    // Get recent context data
    const contextData = await this.db.all(`
      SELECT data_type, content FROM context_data 
      WHERE project_id = ? 
      ORDER BY updated_at DESC
    `, [project.id]);

    return {
      ...project,
      context_data: contextData
    };
  }

  async initializeContext({ goal, scope, branch, project_type = 'other' }) {
    const projectId = this.generateId();
    const projectName = this.deriveProjectName(goal);

    await this.db.run(`
      INSERT INTO projects (id, name, goal, scope, branch, project_type, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `, [projectId, projectName, goal, scope, branch, project_type]);

    // Initialize with basic context data
    await this.addContextData(projectId, 'initialization', {
      initialized_at: new Date().toISOString(),
      initial_goal: goal,
      initial_scope: scope
    });

    return { project_id: projectId };
  }

  async queryContext(queryType, filter = null) {
    const currentProject = await this.getCurrentActiveProject();
    
    if (!currentProject) {
      return 'No active project found. Initialize a project context first.';
    }

    switch (queryType) {
      case 'summary':
        return this.getProjectSummary(currentProject);
      
      case 'tasks':
        return this.getTaskData(currentProject.id, filter);
      
      case 'decisions':
        return this.getDecisionData(currentProject.id, filter);
      
      case 'files':
        return this.getFileData(currentProject.id, filter);
      
      case 'blockers':
        return this.getBlockerData(currentProject.id, filter);
      
      default:
        return `Unknown query type: ${queryType}`;
    }
  }

  async clearContext(scope) {
    let count = 0;
    let message = '';

    switch (scope) {
      case 'current_project':
        const project = await this.getCurrentActiveProject();
        if (project) {
          await this.db.run('DELETE FROM projects WHERE id = ?', [project.id]);
          count = 1;
          message = `Cleared context for project: ${project.name}`;
        } else {
          message = 'No active project to clear';
        }
        break;

      case 'current_branch':
        // TODO: Implement branch detection
        message = 'Branch-specific clearing not yet implemented';
        break;

      case 'all':
        const result = await this.db.run('DELETE FROM projects');
        count = result.changes || 0;
        message = 'Cleared all project contexts';
        break;
    }

    return { message, count };
  }

  // Helper methods
  async getCurrentActiveProject() {
    return await this.db.get(`
      SELECT * FROM projects 
      WHERE status = 'active' 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);
  }

  async addContextData(projectId, dataType, content) {
    const id = this.generateId();
    await this.db.run(`
      INSERT INTO context_data (id, project_id, data_type, content)
      VALUES (?, ?, ?, ?)
    `, [id, projectId, dataType, JSON.stringify(content)]);
  }

  async getProjectSummary(project) {
    const contextCount = await this.db.get(`
      SELECT COUNT(*) as count FROM context_data WHERE project_id = ?
    `, [project.id]);

    return `**Project Summary**\\n\\n` +
           `**Goal:** ${project.goal}\\n` +
           `**Scope:** ${project.scope}\\n` +
           `**Status:** ${project.status}\\n` +
           `**Branch:** ${project.branch}\\n` +
           `**Created:** ${project.created_at}\\n` +
           `**Context Records:** ${contextCount.count}\\n\\n` +
           `Use query_context() with specific types for detailed information.`;
  }

  async getTaskData(projectId, filter) {
    // Placeholder - will be enhanced as we add task tracking
    return 'Task tracking not yet implemented. This will show current tasks, progress, and completion status.';
  }

  async getDecisionData(projectId, filter) {
    // Placeholder - will be enhanced as we add decision logging
    return 'Decision logging not yet implemented. This will show architectural decisions and user preferences.';
  }

  async getFileData(projectId, filter) {
    // Placeholder - will be enhanced as we add file mapping
    return 'File mapping not yet implemented. This will show relevant files and their relationships to the project.';
  }

  async getBlockerData(projectId, filter) {
    // Placeholder - will be enhanced as we add blocker tracking
    return 'Blocker tracking not yet implemented. This will show current blockers and dependencies.';
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  deriveProjectName(goal) {
    // Simple name derivation from goal
    return goal.substring(0, 50).trim();
  }

  async close() {
    if (this.db) {
      await new Promise((resolve) => this.db.close(resolve));
    }
  }
}
