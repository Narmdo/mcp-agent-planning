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
    // Database will be created per-project, so this is just for general setup
    console.error('Database manager initialized');
  }

  async getProjectDatabase(projectPath) {
    // Get or create a database connection for a specific project
    const planningDir = join(projectPath, '.planning');
    
    console.error(`Creating .planning directory at: ${planningDir}`);
    
    // Ensure .planning directory exists
    const fs = await import('fs');
    if (!fs.existsSync(planningDir)) {
      fs.mkdirSync(planningDir, { recursive: true });
      console.error('Created .planning directory');
    } else {
      console.error('Using existing .planning directory');
    }
    
    const dbPath = join(planningDir, 'database.db');
    console.error(`Database path: ${dbPath}`);
    
    const db = new sqlite3.Database(dbPath);
    
    // Promisify database methods properly to preserve context
    const originalRun = db.run.bind(db);
    db.run = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        originalRun(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              changes: this.changes,
              lastID: this.lastID
            });
          }
        });
      });
    };
    
    db.get = promisify(db.get.bind(db));
    db.all = promisify(db.all.bind(db));

    // Enable JSON support
    await db.run('PRAGMA journal_mode = WAL');
    await db.run('PRAGMA foreign_keys = ON');

    // Run migrations for this project database
    await this.runMigrationsForProject(db);
    
    return db;
  }

  async runMigrationsForProject(db) {
    // Create migrations table if it doesn't exist
    await db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get current migration version
    const currentMigration = await db.get(`
      SELECT version FROM migrations ORDER BY version DESC LIMIT 1
    `);
    const currentVersion = currentMigration ? currentMigration.version : 0;

    // Run pending migrations
    const migrations = this.getMigrations();
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        console.log(`Running migration ${migration.version}: ${migration.name}`);
        await migration.up(db);
        await db.run(`
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
      },
      {
        version: 2,
        name: 'add_task_tracking',
        up: this.migration002_add_task_tracking.bind(this)
      },
      {
        version: 3,
        name: 'add_decision_logging',
        up: this.migration003_add_decision_logging.bind(this)
      },
      {
        version: 4,
        name: 'add_file_mapping',
        up: this.migration004_add_file_mapping.bind(this)
      },
      {
        version: 5,
        name: 'add_task_dependencies',
        up: this.migration005_add_task_dependencies.bind(this)
      },
      {
        version: 6,
        name: 'add_blocker_management',
        up: this.migration006_add_blocker_management.bind(this)
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

  async migration002_add_task_tracking(db) {
    // Tasks table for tracking work items and progress
    await db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'todo',
        priority TEXT DEFAULT 'medium',
        assignee TEXT,
        tags JSON DEFAULT '[]',
        parent_task_id TEXT,
        estimated_effort TEXT,
        actual_effort TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        FOREIGN KEY (parent_task_id) REFERENCES tasks (id) ON DELETE SET NULL
      )
    `);

    // Create indexes for efficient task queries
    await db.run('CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks (project_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks (priority)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks (parent_task_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_tasks_updated ON tasks (updated_at)');
  }

  async migration003_add_decision_logging(db) {
    // Decisions table for logging architectural decisions and user preferences
    await db.run(`
      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        decision_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        rationale TEXT,
        context TEXT,
        alternatives_considered JSON DEFAULT '[]',
        impacts JSON DEFAULT '[]',
        made_by TEXT DEFAULT 'agent',
        decision_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active',
        superseded_by TEXT,
        tags JSON DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        FOREIGN KEY (superseded_by) REFERENCES decisions (id) ON DELETE SET NULL
      )
    `);

    // Create indexes for efficient decision queries
    await db.run('CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions (project_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_decisions_type ON decisions (decision_type)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions (status)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_decisions_date ON decisions (decision_date)');
  }

  async migration004_add_file_mapping(db) {
    // File mappings table for tracking codebase understanding
    await db.run(`
      CREATE TABLE IF NOT EXISTS file_mappings (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT,
        purpose TEXT,
        key_functions JSON DEFAULT '[]',
        dependencies JSON DEFAULT '[]',
        dependents JSON DEFAULT '[]',
        last_analyzed DATETIME DEFAULT CURRENT_TIMESTAMP,
        analysis_summary TEXT,
        complexity_score INTEGER DEFAULT 0,
        importance_score INTEGER DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for efficient file queries
    await db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_file_mappings_path ON file_mappings (project_id, file_path)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_file_mappings_type ON file_mappings (file_type)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_file_mappings_importance ON file_mappings (importance_score)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_file_mappings_analyzed ON file_mappings (last_analyzed)');
  }

  async migration005_add_task_dependencies(db) {
    // Task dependencies table for task hierarchy and blocking relationships
    await db.run(`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        parent_task_id TEXT NOT NULL,
        child_task_id TEXT NOT NULL,
        dependency_type TEXT NOT NULL DEFAULT 'blocks',
        created_at TEXT NOT NULL,
        created_by TEXT DEFAULT 'agent',
        
        FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (child_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        
        CHECK (parent_task_id != child_task_id),
        UNIQUE (parent_task_id, child_task_id, dependency_type)
      )
    `);

    // Create indexes for efficient dependency queries
    await db.run('CREATE INDEX IF NOT EXISTS idx_task_dependencies_parent ON task_dependencies(parent_task_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_task_dependencies_child ON task_dependencies(child_task_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_task_dependencies_project ON task_dependencies(project_id)');
  }

  async migration006_add_blocker_management(db) {
    // Blockers table for tracking project impediments
    await db.run(`
      CREATE TABLE IF NOT EXISTS blockers (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        blocker_type TEXT NOT NULL DEFAULT 'external',
        severity TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'open',
        owner TEXT,
        external_ref TEXT,
        resolution_notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        resolved_at TEXT,
        created_by TEXT DEFAULT 'agent',
        
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Blocker impacts table for tracking which tasks are affected
    await db.run(`
      CREATE TABLE IF NOT EXISTS blocker_impacts (
        id TEXT PRIMARY KEY,
        blocker_id TEXT NOT NULL,
        task_id TEXT,
        impact_type TEXT NOT NULL DEFAULT 'blocks',
        impact_description TEXT,
        estimated_delay INTEGER,
        created_at TEXT NOT NULL,
        
        FOREIGN KEY (blocker_id) REFERENCES blockers(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        
        UNIQUE (blocker_id, task_id, impact_type)
      )
    `);

    // Create indexes for efficient blocker queries
    await db.run('CREATE INDEX IF NOT EXISTS idx_blockers_project ON blockers(project_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_blockers_status ON blockers(status)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_blockers_severity ON blockers(severity)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_blockers_type ON blockers(blocker_type)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_blocker_impacts_blocker ON blocker_impacts(blocker_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_blocker_impacts_task ON blocker_impacts(task_id)');
  }

  async getCurrentContext(projectPath, branch) {
    const db = await this.getProjectDatabase(projectPath);
    
    const project = await db.get(`
      SELECT * FROM projects 
      WHERE branch = ? AND status = 'active'
      ORDER BY updated_at DESC 
      LIMIT 1
    `, [branch]);

    if (!project) {
      return null;
    }

    // Get recent context data
    const contextData = await db.all(`
      SELECT data_type, content FROM context_data 
      WHERE project_id = ? 
      ORDER BY updated_at DESC
    `, [project.id]);

    return {
      ...project,
      context_data: contextData
    };
  }

  async initializeContext({ project_path, goal, scope, branch, project_type = 'other' }) {
    const db = await this.getProjectDatabase(project_path);
    
    const projectId = this.generateId();
    const projectName = this.deriveProjectName(goal);

    await db.run(`
      INSERT INTO projects (id, name, goal, scope, branch, project_type, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `, [projectId, projectName, goal, scope, branch, project_type]);

    // Initialize with basic context data
    await this.addContextData(db, projectId, 'initialization', {
      initialized_at: new Date().toISOString(),
      initial_goal: goal,
      initial_scope: scope
    });

    return { project_id: projectId };
  }

  async queryContext(projectPath, queryType, filter = null) {
    const db = await this.getProjectDatabase(projectPath);
    const currentProject = await this.getCurrentActiveProject(db);
    
    if (!currentProject) {
      return 'No active project found. Initialize a project context first.';
    }

    switch (queryType) {
      case 'summary':
        return this.getProjectSummary(db, currentProject);
      
      case 'tasks':
        return this.getTaskData(db, currentProject.id, filter);
      
      case 'decisions':
        return this.getDecisionData(db, currentProject.id, filter);
      
      case 'files':
        return this.getFileData(db, currentProject.id, filter);
      
      case 'blockers':
        return this.getBlockerData(currentProject.id, filter);
      
      default:
        return `Unknown query type: ${queryType}`;
    }
  }

  async clearContext(projectPath, scope) {
    const db = await this.getProjectDatabase(projectPath);
    let count = 0;
    let message = '';

    switch (scope) {
      case 'current_project':
        const project = await this.getCurrentActiveProject(db);
        if (project) {
          await db.run('DELETE FROM projects WHERE id = ?', [project.id]);
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

  // Task Management Methods
  async updateTaskStatus(projectPath, taskData) {
    const db = await this.getProjectDatabase(projectPath);
    const currentProject = await this.getCurrentActiveProject(db);
    
    if (!currentProject) {
      throw new Error('No active project found. Initialize a project context first.');
    }

    const { action, task_id, title, description, status, priority, assignee, notes } = taskData;

    switch (action) {
      case 'create':
        return await this.createTask(db, currentProject.id, { title, description, status, priority, assignee, notes });
      
      case 'update':
        if (!task_id) throw new Error('task_id required for update action');
        return await this.updateTask(db, task_id, { title, description, status, priority, assignee, notes });
      
      case 'complete':
        if (!task_id) throw new Error('task_id required for complete action');
        return await this.completeTask(db, task_id, notes);
      
      case 'delete':
        if (!task_id) throw new Error('task_id required for delete action');
        return await this.deleteTask(db, task_id);
      
      default:
        throw new Error(`Unknown task action: ${action}. Supported: create, update, complete, delete`);
    }
  }

  async createTask(db, projectId, taskData) {
    const taskId = this.generateId();
    const { title, description, status = 'todo', priority = 'medium', assignee, notes } = taskData;
    
    if (!title) {
      throw new Error('Task title is required');
    }

    await db.run(`
      INSERT INTO tasks (id, project_id, title, description, status, priority, assignee, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [taskId, projectId, title, description, status, priority, assignee, notes]);

    return {
      task_id: taskId,
      action: 'created',
      title: title,
      status: status
    };
  }

  async updateTask(db, taskId, updates) {
    // Build dynamic update query
    const updateFields = [];
    const params = [];
    
    ['title', 'description', 'status', 'priority', 'assignee', 'notes'].forEach(field => {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(updates[field]);
      }
    });
    
    if (updateFields.length === 0) {
      throw new Error('No valid update fields provided');
    }
    
    // Add updated timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(taskId);
    
    const query = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`;
    
    const result = await db.run(query, params);
    
    if ((result.changes || 0) === 0) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return {
      task_id: taskId,
      action: 'updated',
      fields_updated: Object.keys(updates).filter(k => updates[k] !== undefined)
    };
  }

  async completeTask(db, taskId, notes) {
    // Check if task can be completed (all dependencies satisfied)
    const dependencyCheck = await this.canCompleteTask(db, taskId);
    
    if (!dependencyCheck.can_complete) {
      const blockedBy = dependencyCheck.unsatisfied_dependencies
        .map(dep => `"${dep.title}" (${dep.status})`)
        .join(', ');
      throw new Error(`Cannot complete task: blocked by unsatisfied dependencies: ${blockedBy}`);
    }
    
    const updates = {
      status: 'completed',
      notes: notes,
      completed_at: new Date().toISOString()
    };
    
    const updateFields = ['status = ?', 'completed_at = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params = ['completed', updates.completed_at];
    
    if (notes) {
      updateFields.push('notes = ?');
      params.push(notes);
    }
    
    params.push(taskId);
    
    const query = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`;
    const result = await db.run(query, params);
    
    if ((result.changes || 0) === 0) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return {
      task_id: taskId,
      action: 'completed',
      completed_at: updates.completed_at,
      dependency_check: dependencyCheck
    };
  }

  async deleteTask(db, taskId) {
    const result = await db.run('DELETE FROM tasks WHERE id = ?', [taskId]);
    
    if ((result.changes || 0) === 0) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return {
      task_id: taskId,
      action: 'deleted'
    };
  }

  // Task Dependency Management Methods
  async addTaskDependency(db, projectId, parentTaskId, childTaskId, dependencyType = 'blocks') {
    // Validate both tasks exist
    const parentTask = await db.get('SELECT id FROM tasks WHERE id = ?', [parentTaskId]);
    const childTask = await db.get('SELECT id FROM tasks WHERE id = ?', [childTaskId]);
    
    if (!parentTask) {
      throw new Error(`Parent task not found: ${parentTaskId}`);
    }
    if (!childTask) {
      throw new Error(`Child task not found: ${childTaskId}`);
    }
    
    // Check for circular dependencies
    const wouldCreateCircle = await this.wouldCreateCircularDependency(db, parentTaskId, childTaskId);
    if (wouldCreateCircle) {
      throw new Error('Cannot create dependency: would result in circular dependency');
    }
    
    const dependencyId = this.generateId();
    const now = new Date().toISOString();
    
    const result = await this.runCustom(db, `
      INSERT INTO task_dependencies 
      (id, project_id, parent_task_id, child_task_id, dependency_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [dependencyId, projectId, parentTaskId, childTaskId, dependencyType, now]);

    return {
      dependency_id: dependencyId,
      parent_task_id: parentTaskId,
      child_task_id: childTaskId,
      dependency_type: dependencyType,
      changes: result.changes
    };
  }

  async removeTaskDependency(db, parentTaskId, childTaskId, dependencyType = null) {
    let query = 'DELETE FROM task_dependencies WHERE parent_task_id = ? AND child_task_id = ?';
    const params = [parentTaskId, childTaskId];
    
    if (dependencyType) {
      query += ' AND dependency_type = ?';
      params.push(dependencyType);
    }
    
    const result = await this.runCustom(db, query, params);
    
    return {
      success: result.changes > 0,
      message: result.changes > 0 
        ? `Removed dependency: ${parentTaskId} -> ${childTaskId}`
        : `No dependency found: ${parentTaskId} -> ${childTaskId}`,
      changes: result.changes
    };
  }

  async getTaskDependencies(db, taskId) {
    // Get tasks that this task depends on (parents)
    const parents = await db.all(`
      SELECT td.*, pt.title as parent_title, pt.status as parent_status
      FROM task_dependencies td
      JOIN tasks pt ON pt.id = td.parent_task_id
      WHERE td.child_task_id = ?
    `, [taskId]);

    // Get tasks that depend on this task (children)
    const children = await db.all(`
      SELECT td.*, ct.title as child_title, ct.status as child_status
      FROM task_dependencies td
      JOIN tasks ct ON ct.id = td.child_task_id
      WHERE td.parent_task_id = ?
    `, [taskId]);

    return {
      depends_on: parents,
      blocks: children
    };
  }

  async wouldCreateCircularDependency(db, parentTaskId, childTaskId) {
    // Check if childTaskId is already an ancestor of parentTaskId
    const visited = new Set();
    const stack = [childTaskId];
    
    while (stack.length > 0) {
      const currentId = stack.pop();
      
      if (visited.has(currentId)) {
        continue;
      }
      visited.add(currentId);
      
      if (currentId === parentTaskId) {
        return true; // Circular dependency detected
      }
      
      // Get all tasks that depend on the current task
      const dependents = await db.all(
        'SELECT child_task_id FROM task_dependencies WHERE parent_task_id = ?',
        [currentId]
      );
      
      for (const dependent of dependents) {
        stack.push(dependent.child_task_id);
      }
    }
    
    return false;
  }

  async getTasksBlockedBy(db, taskId) {
    // Get all tasks that are blocked by the given task
    return await db.all(`
      SELECT t.*, td.dependency_type
      FROM tasks t
      JOIN task_dependencies td ON t.id = td.child_task_id
      WHERE td.parent_task_id = ? AND td.dependency_type = 'blocks'
    `, [taskId]);
  }

  async canCompleteTask(db, taskId) {
    // Check if all dependencies are satisfied
    const dependencies = await db.all(`
      SELECT pt.id, pt.title, pt.status, td.dependency_type
      FROM task_dependencies td
      JOIN tasks pt ON pt.id = td.parent_task_id
      WHERE td.child_task_id = ? AND td.dependency_type IN ('blocks', 'prerequisite')
    `, [taskId]);

    const unsatisfiedDeps = dependencies.filter(dep => dep.status !== 'completed');
    
    return {
      can_complete: unsatisfiedDeps.length === 0,
      unsatisfied_dependencies: unsatisfiedDeps
    };
  }

  // Blocker Management Methods
  async createBlocker(db, projectId, blockerData) {
    const blockerId = this.generateId();
    const { 
      title, 
      description, 
      blocker_type = 'external', 
      severity = 'medium', 
      owner, 
      external_ref 
    } = blockerData;
    
    if (!title) {
      throw new Error('title is required for blocker creation');
    }
    
    const now = new Date().toISOString();
    
    const result = await this.runCustom(db, `
      INSERT INTO blockers 
      (id, project_id, title, description, blocker_type, severity, status, owner, external_ref, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
    `, [blockerId, projectId, title, description, blocker_type, severity, owner, external_ref, now]);

    return {
      blocker_id: blockerId,
      title,
      status: 'open',
      severity,
      blocker_type,
      changes: result.changes
    };
  }

  async updateBlocker(db, blockerId, updates) {
    const allowedFields = ['title', 'description', 'blocker_type', 'severity', 'status', 'owner', 'external_ref', 'resolution_notes'];
    const updateFields = [];
    const params = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`);
        params.push(value);
      }
    });
    
    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    // Add resolved_at timestamp if status is being set to resolved
    if (updates.status === 'resolved') {
      updateFields.push('resolved_at = ?');
      params.push(new Date().toISOString());
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(blockerId);
    
    const query = `UPDATE blockers SET ${updateFields.join(', ')} WHERE id = ?`;
    const result = await this.runCustom(db, query, params);
    
    if (result.changes === 0) {
      throw new Error(`Blocker not found: ${blockerId}`);
    }
    
    return {
      blocker_id: blockerId,
      changes: result.changes,
      updated_fields: Object.keys(updates)
    };
  }

  async getBlockers(db, projectId, filters = {}) {
    let query = 'SELECT * FROM blockers WHERE project_id = ?';
    const params = [projectId];
    
    // Apply filters
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    
    if (filters.severity) {
      query += ' AND severity = ?';
      params.push(filters.severity);
    }
    
    if (filters.blocker_type) {
      query += ' AND blocker_type = ?';
      params.push(filters.blocker_type);
    }
    
    if (filters.owner) {
      query += ' AND owner = ?';
      params.push(filters.owner);
    }
    
    query += ' ORDER BY severity DESC, created_at DESC';
    
    return await db.all(query, params);
  }

  async getBlockerImpacts(db, blockerId) {
    return await db.all(`
      SELECT bi.*, t.title as task_title, t.status as task_status
      FROM blocker_impacts bi
      LEFT JOIN tasks t ON t.id = bi.task_id
      WHERE bi.blocker_id = ?
      ORDER BY bi.created_at
    `, [blockerId]);
  }

  async addBlockerImpact(db, blockerId, taskId, impactData = {}) {
    const impactId = this.generateId();
    const { 
      impact_type = 'blocks', 
      impact_description, 
      estimated_delay 
    } = impactData;
    
    const now = new Date().toISOString();
    
    const result = await this.runCustom(db, `
      INSERT INTO blocker_impacts 
      (id, blocker_id, task_id, impact_type, impact_description, estimated_delay, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [impactId, blockerId, taskId, impact_type, impact_description, estimated_delay, now]);

    return {
      impact_id: impactId,
      blocker_id: blockerId,
      task_id: taskId,
      impact_type,
      changes: result.changes
    };
  }

  async removeBlockerImpact(db, blockerId, taskId, impactType = null) {
    let query = 'DELETE FROM blocker_impacts WHERE blocker_id = ? AND task_id = ?';
    const params = [blockerId, taskId];
    
    if (impactType) {
      query += ' AND impact_type = ?';
      params.push(impactType);
    }
    
    const result = await this.runCustom(db, query, params);
    
    return {
      success: result.changes > 0,
      message: result.changes > 0 
        ? `Removed blocker impact: ${blockerId} -> ${taskId}`
        : `No impact found: ${blockerId} -> ${taskId}`,
      changes: result.changes
    };
  }

  async getTasksBlockedByBlockers(db, projectId) {
    return await db.all(`
      SELECT DISTINCT t.*, 
             GROUP_CONCAT(b.title) as blocking_issues,
             COUNT(bi.id) as blocker_count
      FROM tasks t
      JOIN blocker_impacts bi ON t.id = bi.task_id
      JOIN blockers b ON b.id = bi.blocker_id
      WHERE t.project_id = ? AND b.status IN ('open', 'in-progress')
      GROUP BY t.id
      ORDER BY blocker_count DESC, t.priority DESC
    `, [projectId]);
  }

  async deleteBlocker(db, blockerId) {
    const result = await this.runCustom(db, 'DELETE FROM blockers WHERE id = ?', [blockerId]);
    
    if (result.changes === 0) {
      throw new Error(`Blocker not found: ${blockerId}`);
    }
    
    return {
      blocker_id: blockerId,
      action: 'deleted',
      changes: result.changes
    };
  }

  // Decision Management Methods
  async recordDecision(projectPath, decisionData) {
    const db = await this.getProjectDatabase(projectPath);
    const currentProject = await this.getCurrentActiveProject(db);
    
    if (!currentProject) {
      throw new Error('No active project found. Initialize a project context first.');
    }

    const { decision_type, title, description, rationale, context, alternatives_considered, impacts, made_by = 'agent' } = decisionData;
    
    if (!decision_type || !title || !description) {
      throw new Error('decision_type, title, and description are required');
    }

    const validTypes = ['architectural', 'user-preference', 'technical-choice', 'approach-rejected', 'implementation-detail'];
    if (!validTypes.includes(decision_type)) {
      throw new Error(`Invalid decision_type. Must be one of: ${validTypes.join(', ')}`);
    }

    const decisionId = this.generateId();
    
    await db.run(`
      INSERT INTO decisions (
        id, project_id, decision_type, title, description, rationale, context,
        alternatives_considered, impacts, made_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      decisionId, currentProject.id, decision_type, title, description, rationale, context,
      JSON.stringify(alternatives_considered || []),
      JSON.stringify(impacts || []),
      made_by
    ]);

    return {
      decision_id: decisionId,
      decision_type,
      title,
      status: 'recorded'
    };
  }

  async supersededDecision(projectPath, decisionId, newDecisionData) {
    const db = await this.getProjectDatabase(projectPath);
    
    // Create new decision
    const newDecision = await this.recordDecision(projectPath, newDecisionData);
    
    // Mark old decision as superseded
    const result = await db.run(`
      UPDATE decisions 
      SET status = 'superseded', superseded_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newDecision.decision_id, decisionId]);
    
    if ((result.changes || 0) === 0) {
      throw new Error(`Decision not found: ${decisionId}`);
    }

    return {
      old_decision_id: decisionId,
      new_decision_id: newDecision.decision_id,
      action: 'superseded'
    };
  }

  // File Mapping Methods
  async mapRelevantCode(projectPath, mappingData) {
    const db = await this.getProjectDatabase(projectPath);
    const currentProject = await this.getCurrentActiveProject(db);
    
    if (!currentProject) {
      throw new Error('No active project found. Initialize a project context first.');
    }

    const { file_path, file_type, purpose, key_functions, dependencies, dependents, analysis_summary, complexity_score = 0, importance_score = 0, notes } = mappingData;
    
    if (!file_path) {
      throw new Error('file_path is required');
    }

    // Check if file mapping already exists
    const existing = await db.get(`
      SELECT id FROM file_mappings 
      WHERE project_id = ? AND file_path = ?
    `, [currentProject.id, file_path]);

    if (existing) {
      // Update existing mapping
      const result = await db.run(`
        UPDATE file_mappings 
        SET file_type = ?, purpose = ?, key_functions = ?, dependencies = ?, 
            dependents = ?, analysis_summary = ?, complexity_score = ?, 
            importance_score = ?, notes = ?, last_analyzed = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        file_type, purpose, 
        JSON.stringify(key_functions || []),
        JSON.stringify(dependencies || []),
        JSON.stringify(dependents || []),
        analysis_summary, complexity_score, importance_score, notes,
        existing.id
      ]);

      return {
        mapping_id: existing.id,
        file_path,
        action: 'updated'
      };
    } else {
      // Create new mapping
      const mappingId = this.generateId();
      
      await db.run(`
        INSERT INTO file_mappings (
          id, project_id, file_path, file_type, purpose, key_functions,
          dependencies, dependents, analysis_summary, complexity_score,
          importance_score, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        mappingId, currentProject.id, file_path, file_type, purpose,
        JSON.stringify(key_functions || []),
        JSON.stringify(dependencies || []),
        JSON.stringify(dependents || []),
        analysis_summary, complexity_score, importance_score, notes
      ]);

      return {
        mapping_id: mappingId,
        file_path,
        action: 'created'
      };
    }
  }

  async removeFileMapping(projectPath, filePath) {
    const db = await this.getProjectDatabase(projectPath);
    const currentProject = await this.getCurrentActiveProject(db);
    
    if (!currentProject) {
      throw new Error('No active project found. Initialize a project context first.');
    }

    const result = await db.run(`
      DELETE FROM file_mappings 
      WHERE project_id = ? AND file_path = ?
    `, [currentProject.id, filePath]);

    if ((result.changes || 0) === 0) {
      throw new Error(`File mapping not found: ${filePath}`);
    }

    return {
      file_path: filePath,
      action: 'removed'
    };
  }

  // Helper methods
  async getCurrentActiveProject(db) {
    return await db.get(`
      SELECT * FROM projects 
      WHERE status = 'active' 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);
  }

  async addContextData(db, projectId, dataType, content) {
    const id = this.generateId();
    await db.run(`
      INSERT INTO context_data (id, project_id, data_type, content)
      VALUES (?, ?, ?, ?)
    `, [id, projectId, dataType, JSON.stringify(content)]);
  }

  async getProjectSummary(db, project) {
    const contextCount = await db.get(`
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

  async getTaskData(db, projectId, filter) {
    let query = `
      SELECT * FROM tasks 
      WHERE project_id = ?
    `;
    const params = [projectId];
    
    // Apply filters
    if (filter) {
      const filterLower = filter.toLowerCase();
      if (['todo', 'in-progress', 'blocked', 'completed'].includes(filterLower)) {
        query += ' AND status = ?';
        params.push(filterLower);
      } else if (['high', 'medium', 'low'].includes(filterLower)) {
        query += ' AND priority = ?';
        params.push(filterLower);
      } else {
        // Text search in title or description
        query += ' AND (title LIKE ? OR description LIKE ?)';
        params.push(`%${filter}%`, `%${filter}%`);
      }
    }
    
    query += ' ORDER BY priority DESC, created_at ASC';
    
    const tasks = await db.all(query, params);
    
    if (tasks.length === 0) {
      return `**No Tasks Found**\\n\\nProject ID: ${projectId}\\n${filter ? `Filter: ${filter}\\n` : ''}\\nUse update_task_status() to create and manage tasks.`;
    }
    
    let result = `**Tasks Summary**\\n\\n`;
    
    // Group by status
    const tasksByStatus = {
      'todo': [],
      'in-progress': [],
      'blocked': [],
      'completed': []
    };
    
    tasks.forEach(task => {
      const status = task.status || 'todo';
      if (!tasksByStatus[status]) tasksByStatus[status] = [];
      tasksByStatus[status].push(task);
    });
    
    // Display each status group
    Object.entries(tasksByStatus).forEach(([status, statusTasks]) => {
      if (statusTasks.length > 0) {
        result += `**${status.toUpperCase().replace('-', ' ')} (${statusTasks.length})**\\n`;
        statusTasks.forEach(task => {
          result += `- ${task.title}`;
          if (task.priority && task.priority !== 'medium') {
            result += ` [${task.priority}]`;
          }
          if (task.description) {
            result += ` - ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}`;
          }
          result += `\\n`;
        });
        result += `\\n`;
      }
    });
    
    result += `Total: ${tasks.length} tasks`;
    
    return result;
  }

  async getDecisionData(db, projectId, filter) {
    let query = `
      SELECT * FROM decisions 
      WHERE project_id = ? AND status = 'active'
    `;
    const params = [projectId];
    
    // Apply filters
    if (filter) {
      const filterLower = filter.toLowerCase();
      const validTypes = ['architectural', 'user-preference', 'technical-choice', 'approach-rejected', 'implementation-detail'];
      
      if (validTypes.includes(filterLower)) {
        query += ' AND decision_type = ?';
        params.push(filterLower);
      } else {
        // Text search in title or description
        query += ' AND (title LIKE ? OR description LIKE ? OR rationale LIKE ?)';
        params.push(`%${filter}%`, `%${filter}%`, `%${filter}%`);
      }
    }
    
    query += ' ORDER BY decision_date DESC';
    
    const decisions = await db.all(query, params);
    
    if (decisions.length === 0) {
      return `**No Decisions Found**\\n\\nProject ID: ${projectId}\\n${filter ? `Filter: ${filter}\\n` : ''}\\nUse record_decision() to log architectural decisions and user preferences.`;
    }
    
    let result = `**Decision History**\\n\\n`;
    
    // Group by type
    const decisionsByType = {};
    decisions.forEach(decision => {
      const type = decision.decision_type;
      if (!decisionsByType[type]) decisionsByType[type] = [];
      decisionsByType[type].push(decision);
    });
    
    // Display each type group
    Object.entries(decisionsByType).forEach(([type, typeDecisions]) => {
      result += `**${type.toUpperCase().replace('-', ' ')} (${typeDecisions.length})**\\n`;
      typeDecisions.forEach(decision => {
        result += `- **${decision.title}**`;
        if (decision.made_by && decision.made_by !== 'agent') {
          result += ` [by ${decision.made_by}]`;
        }
        result += `\\n  ${decision.description}`;
        if (decision.rationale) {
          result += `\\n  *Rationale: ${decision.rationale}*`;
        }
        result += `\\n  *Decided: ${decision.decision_date}*\\n`;
      });
      result += `\\n`;
    });
    
    result += `Total: ${decisions.length} active decisions`;
    
    return result;
  }

  async getFileData(db, projectId, filter) {
    let query = `
      SELECT * FROM file_mappings 
      WHERE project_id = ?
    `;
    const params = [projectId];
    
    // Apply filters
    if (filter) {
      const filterLower = filter.toLowerCase();
      
      if (['javascript', 'typescript', 'python', 'java', 'css', 'html', 'json', 'markdown'].includes(filterLower)) {
        query += ' AND file_type = ?';
        params.push(filterLower);
      } else if (!isNaN(parseInt(filter))) {
        // Filter by importance score
        query += ' AND importance_score >= ?';
        params.push(parseInt(filter));
      } else {
        // Text search in file path, purpose, or analysis
        query += ' AND (file_path LIKE ? OR purpose LIKE ? OR analysis_summary LIKE ?)';
        params.push(`%${filter}%`, `%${filter}%`, `%${filter}%`);
      }
    }
    
    query += ' ORDER BY importance_score DESC, last_analyzed DESC';
    
    const files = await db.all(query, params);
    
    if (files.length === 0) {
      return `**No File Mappings Found**\\n\\nProject ID: ${projectId}\\n${filter ? `Filter: ${filter}\\n` : ''}\\nUse map_relevant_code() to track codebase understanding and file relationships.`;
    }
    
    let result = `**Codebase Mapping**\\n\\n`;
    
    // Group by file type
    const filesByType = {};
    files.forEach(file => {
      const type = file.file_type || 'unknown';
      if (!filesByType[type]) filesByType[type] = [];
      filesByType[type].push(file);
    });
    
    // Display each type group
    Object.entries(filesByType).forEach(([type, typeFiles]) => {
      result += `**${type.toUpperCase()} FILES (${typeFiles.length})**\\n`;
      typeFiles.forEach(file => {
        result += `- **${file.file_path}**`;
        if (file.importance_score > 0) {
          result += ` [importance: ${file.importance_score}]`;
        }
        result += `\\n`;
        if (file.purpose) {
          result += `  *Purpose: ${file.purpose}*\\n`;
        }
        if (file.analysis_summary) {
          result += `  ${file.analysis_summary.substring(0, 100)}${file.analysis_summary.length > 100 ? '...' : ''}\\n`;
        }
        
        // Show key functions if available
        try {
          const keyFunctions = JSON.parse(file.key_functions || '[]');
          if (keyFunctions.length > 0) {
            result += `  *Key functions: ${keyFunctions.slice(0, 3).join(', ')}${keyFunctions.length > 3 ? '...' : ''}*\\n`;
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
        
        result += `  *Last analyzed: ${file.last_analyzed}*\\n`;
      });
      result += `\\n`;
    });
    
    result += `Total: ${files.length} mapped files`;
    
    return result;
  }

  async getBlockerData(db, projectId, filter) {
    const filters = {};
    
    // Parse filter into structured filters
    if (filter) {
      const filterLower = filter.toLowerCase();
      
      if (['open', 'in-progress', 'resolved', 'closed'].includes(filterLower)) {
        filters.status = filterLower;
      } else if (['low', 'medium', 'high', 'critical'].includes(filterLower)) {
        filters.severity = filterLower;
      } else if (['external', 'resource', 'technical', 'decision', 'dependency'].includes(filterLower)) {
        filters.blocker_type = filterLower;
      } else {
        // Text search in title or description
        filters.text_search = filter;
      }
    }
    
    let query = 'SELECT * FROM blockers WHERE project_id = ?';
    const params = [projectId];
    
    // Apply structured filters
    Object.entries(filters).forEach(([key, value]) => {
      if (key !== 'text_search') {
        query += ` AND ${key} = ?`;
        params.push(value);
      }
    });
    
    // Apply text search
    if (filters.text_search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${filters.text_search}%`, `%${filters.text_search}%`);
    }
    
    query += ' ORDER BY severity DESC, created_at DESC';
    
    const blockers = await db.all(query, params);
    
    if (blockers.length === 0) {
      return `**No Blockers Found**\\n\\nProject ID: ${projectId}\\n${filter ? `Filter: ${filter}\\n` : ''}\\nUse manage_blockers() to track project impediments and blockers.`;
    }
    
    let result = `**Project Blockers**\\n\\n`;
    
    // Group by status
    const blockersByStatus = {};
    blockers.forEach(blocker => {
      const status = blocker.status || 'unknown';
      if (!blockersByStatus[status]) blockersByStatus[status] = [];
      blockersByStatus[status].push(blocker);
    });
    
    // Display each status group
    const statusOrder = ['open', 'in-progress', 'resolved', 'closed'];
    statusOrder.forEach(status => {
      if (blockersByStatus[status]) {
        const statusBlockers = blockersByStatus[status];
        result += `**${status.toUpperCase()} (${statusBlockers.length})**\\n`;
        
        statusBlockers.forEach(blocker => {
          const severityIcon = {
            'critical': '🔴',
            'high': '🟠', 
            'medium': '🟡',
            'low': '🟢'
          }[blocker.severity] || '⚪';
          
          result += `${severityIcon} **${blocker.title}** [${blocker.blocker_type}]\\n`;
          if (blocker.description) {
            result += `  ${blocker.description.substring(0, 100)}${blocker.description.length > 100 ? '...' : ''}\\n`;
          }
          if (blocker.owner) {
            result += `  *Owner: ${blocker.owner}*\\n`;
          }
          if (blocker.external_ref) {
            result += `  *Reference: ${blocker.external_ref}*\\n`;
          }
          result += `  *Created: ${blocker.created_at}*\\n`;
          if (blocker.resolved_at) {
            result += `  *Resolved: ${blocker.resolved_at}*\\n`;
          }
        });
        result += `\\n`;
      }
    });
    
    result += `Total: ${blockers.length} blockers`;
    
    return result;
  }

  // File mapping operations
  async mapRelevantCode(db, projectId, filePath, analysis) {
    // Check if file already exists
    const existing = await db.get(
      'SELECT id FROM file_mappings WHERE project_id = ? AND file_path = ?',
      [projectId, filePath]
    );

    const {
      file_type = 'unknown',
      purpose = '',
      key_functions = [],
      dependencies = [],
      importance_score = 1,
      analysis_summary = ''
    } = analysis;

    const now = new Date().toISOString();

    if (existing) {
      // Update existing mapping
      const result = await this.runCustom(db, `
        UPDATE file_mappings 
        SET file_type = ?, purpose = ?, key_functions = ?, dependencies = ?, 
            importance_score = ?, analysis_summary = ?, last_analyzed = ?
        WHERE id = ?
      `, [
        file_type,
        purpose,
        JSON.stringify(key_functions),
        JSON.stringify(dependencies),
        importance_score,
        analysis_summary,
        now,
        existing.id
      ]);
      
      return {
        success: true,
        message: `Updated file mapping for ${filePath}`,
        file_id: existing.id,
        changes: result.changes
      };
    } else {
      // Create new mapping
      const result = await this.runCustom(db, `
        INSERT INTO file_mappings 
        (project_id, file_path, file_type, purpose, key_functions, dependencies, 
         importance_score, analysis_summary, first_analyzed, last_analyzed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        projectId,
        filePath,
        file_type,
        purpose,
        JSON.stringify(key_functions),
        JSON.stringify(dependencies),
        importance_score,
        analysis_summary,
        now,
        now
      ]);
      
      return {
        success: true,
        message: `Mapped new file ${filePath}`,
        file_id: result.lastID,
        changes: result.changes
      };
    }
  }

  async removeFileMapping(db, projectId, filePath) {
    const result = await this.runCustom(db, 
      'DELETE FROM file_mappings WHERE project_id = ? AND file_path = ?',
      [projectId, filePath]
    );
    
    return {
      success: result.changes > 0,
      message: result.changes > 0 
        ? `Removed file mapping for ${filePath}`
        : `No mapping found for ${filePath}`,
      changes: result.changes
    };
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
