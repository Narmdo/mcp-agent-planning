#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { Database } from './database.js';

class AIReasoningFrameworkServer {
  constructor() {
    this.server = new Server(
      {
        name: 'ai-reasoning-framework',
        version: '0.1.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.db = new Database();
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_current_context',
            description: 'Get the current project context or indicate if initialization is needed',
            inputSchema: {
              type: 'object',
              properties: {
                project_path: {
                  type: 'string',
                  description: 'Absolute path to the project directory'
                },
                branch: {
                  type: 'string',
                  description: 'Git branch name (optional - will detect from git if not provided)'
                }
              },
              required: ['project_path']
            }
          },
          {
            name: 'initialize_context',
            description: 'Initialize a new project context with structured data',
            inputSchema: {
              type: 'object',
              properties: {
                project_path: {
                  type: 'string',
                  description: 'Absolute path to the project directory'
                },
                goal: {
                  type: 'string',
                  description: 'Primary goal/objective of the project'
                },
                scope: {
                  type: 'string', 
                  description: 'Scope and boundaries of the work'
                },
                branch: {
                  type: 'string',
                  description: 'Git branch for this context'
                },
                project_type: {
                  type: 'string',
                  enum: ['feature', 'refactor', 'bugfix', 'research', 'other'],
                  description: 'Type of project work'
                }
              },
              required: ['project_path', 'goal', 'scope', 'branch']
            }
          },
          {
            name: 'query_context',
            description: 'Query specific aspects of the current project context',
            inputSchema: {
              type: 'object',
              properties: {
                project_path: {
                  type: 'string',
                  description: 'Absolute path to the project directory'
                },
                query_type: {
                  type: 'string',
                  enum: ['tasks', 'decisions', 'files', 'blockers', 'summary'],
                  description: 'Type of information to retrieve'
                },
                filter: {
                  type: 'string',
                  description: 'Optional filter to narrow results'
                }
              },
              required: ['project_path', 'query_type']
            }
          },
          {
            name: 'clear_context',
            description: 'Clear project context with safety confirmation',
            inputSchema: {
              type: 'object',
              properties: {
                project_path: {
                  type: 'string',
                  description: 'Absolute path to the project directory'
                },
                scope: {
                  type: 'string',
                  enum: ['current_project', 'current_branch', 'all'],
                  description: 'Scope of context to clear'
                },
                confirm: {
                  type: 'boolean',
                  description: 'Confirmation flag - must be true to proceed'
                }
              },
              required: ['project_path', 'scope', 'confirm']
            }
          },
          {
            name: 'update_task_status',
            description: 'Create, update, complete, or delete tasks within the current project context',
            inputSchema: {
              type: 'object',
              properties: {
                project_path: {
                  type: 'string',
                  description: 'Absolute path to the project directory'
                },
                action: {
                  type: 'string',
                  enum: ['create', 'update', 'complete', 'delete'],
                  description: 'Action to perform on the task'
                },
                task_id: {
                  type: 'string',
                  description: 'Task ID (required for update, complete, delete actions)'
                },
                title: {
                  type: 'string',
                  description: 'Task title (required for create, optional for update)'
                },
                description: {
                  type: 'string',
                  description: 'Task description (optional)'
                },
                status: {
                  type: 'string',
                  enum: ['todo', 'in-progress', 'blocked', 'completed'],
                  description: 'Task status (optional, defaults to todo for new tasks)'
                },
                priority: {
                  type: 'string',
                  enum: ['high', 'medium', 'low'],
                  description: 'Task priority (optional, defaults to medium)'
                },
                assignee: {
                  type: 'string',
                  description: 'Task assignee (optional)'
                },
                notes: {
                  type: 'string',
                  description: 'Additional notes (optional)'
                }
              },
              required: ['project_path', 'action']
            }
          },
          {
            name: 'record_decision',
            description: 'Log architectural decisions, user preferences, and technical choices to prevent decision regression',
            inputSchema: {
              type: 'object',
              properties: {
                project_path: {
                  type: 'string',
                  description: 'Absolute path to the project directory'
                },
                decision_type: {
                  type: 'string',
                  enum: ['architectural', 'user-preference', 'technical-choice', 'approach-rejected', 'implementation-detail'],
                  description: 'Type of decision being logged'
                },
                title: {
                  type: 'string',
                  description: 'Brief title summarizing the decision'
                },
                description: {
                  type: 'string',
                  description: 'Detailed description of what was decided'
                },
                rationale: {
                  type: 'string',
                  description: 'Why this decision was made (optional but recommended)'
                },
                context: {
                  type: 'string',
                  description: 'Context or circumstances leading to this decision (optional)'
                },
                alternatives_considered: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Alternative approaches that were considered but rejected (optional)'
                },
                impacts: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Expected impacts or consequences of this decision (optional)'
                },
                made_by: {
                  type: 'string',
                  description: 'Who made this decision (defaults to "agent")'
                }
              },
              required: ['project_path', 'decision_type', 'title', 'description']
            }
          },
          {
            name: 'debug_database_location',
            description: 'Shows where the database file is located for debugging',
            inputSchema: {
              type: 'object',
              properties: {
                project_path: {
                  type: 'string',
                  description: 'Absolute path to the project directory'
                }
              },
              required: ['project_path']
            }
          },
          {
            name: 'map_relevant_code',
            description: 'Map and analyze relevant code files to track codebase understanding and relationships',
            inputSchema: {
              type: 'object',
              properties: {
                project_path: {
                  type: 'string',
                  description: 'Absolute path to the project directory'
                },
                file_path: {
                  type: 'string',
                  description: 'Relative path to the file being mapped'
                },
                analysis: {
                  type: 'object',
                  properties: {
                    file_type: {
                      type: 'string',
                      description: 'Programming language or file type (e.g., javascript, python, markdown)'
                    },
                    purpose: {
                      type: 'string',
                      description: 'Brief description of the file\'s purpose and role in the project'
                    },
                    key_functions: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'List of important functions, classes, or exports in this file'
                    },
                    dependencies: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Files or modules this file depends on'
                    },
                    importance_score: {
                      type: 'number',
                      minimum: 1,
                      maximum: 10,
                      description: 'Importance score (1-10) for prioritizing this file'
                    },
                    analysis_summary: {
                      type: 'string',
                      description: 'Detailed analysis of the file\'s structure, patterns, and significance'
                    }
                  },
                  description: 'Analysis data for the mapped file'
                }
              },
              required: ['project_path', 'file_path', 'analysis']
            }
          },
          {
            name: 'manage_task_dependencies',
            description: 'Manage task dependencies including adding, removing, and querying task relationships',
            inputSchema: {
              type: 'object',
              properties: {
                project_path: {
                  type: 'string',
                  description: 'Absolute path to the project directory'
                },
                action: {
                  type: 'string',
                  enum: ['add', 'remove', 'query', 'check_circular'],
                  description: 'Action to perform on task dependencies'
                },
                parent_task_id: {
                  type: 'string',
                  description: 'ID of the parent/blocking task (required for add/remove actions)'
                },
                child_task_id: {
                  type: 'string',
                  description: 'ID of the child/dependent task (required for add/remove actions)'
                },
                task_id: {
                  type: 'string',
                  description: 'ID of the task to query dependencies for (required for query action)'
                },
                dependency_type: {
                  type: 'string',
                  enum: ['blocks', 'subtask', 'prerequisite'],
                  description: 'Type of dependency relationship (optional, defaults to blocks)'
                }
              },
              required: ['project_path', 'action']
            }
          },
          {
            name: 'manage_blockers',
            description: 'Manage project blockers including creating, updating, resolving, and tracking blocker impacts',
            inputSchema: {
              type: 'object',
              properties: {
                project_path: {
                  type: 'string',
                  description: 'Absolute path to the project directory'
                },
                action: {
                  type: 'string',
                  enum: ['create', 'update', 'resolve', 'delete', 'query', 'add_impact', 'remove_impact'],
                  description: 'Action to perform on blockers'
                },
                blocker_id: {
                  type: 'string',
                  description: 'ID of the blocker (required for update/resolve/delete/add_impact/remove_impact actions)'
                },
                title: {
                  type: 'string',
                  description: 'Blocker title (required for create action)'
                },
                description: {
                  type: 'string',
                  description: 'Detailed description of the blocker'
                },
                blocker_type: {
                  type: 'string',
                  enum: ['external', 'resource', 'technical', 'decision', 'dependency'],
                  description: 'Type of blocker (optional, defaults to external)'
                },
                severity: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical'],
                  description: 'Blocker severity level (optional, defaults to medium)'
                },
                status: {
                  type: 'string',
                  enum: ['open', 'in-progress', 'resolved', 'closed'],
                  description: 'Blocker status (for update action)'
                },
                owner: {
                  type: 'string',
                  description: 'Person responsible for resolving the blocker'
                },
                external_ref: {
                  type: 'string',
                  description: 'External reference (ticket ID, URL, etc.)'
                },
                resolution_notes: {
                  type: 'string',
                  description: 'Notes about blocker resolution'
                },
                task_id: {
                  type: 'string',
                  description: 'Task ID for impact management (required for add_impact/remove_impact actions)'
                },
                impact_type: {
                  type: 'string',
                  enum: ['blocks', 'delays', 'affects'],
                  description: 'Type of impact on the task (optional, defaults to blocks)'
                },
                impact_description: {
                  type: 'string',
                  description: 'Description of how the blocker impacts the task'
                },
                estimated_delay: {
                  type: 'number',
                  description: 'Estimated delay in hours caused by this blocker'
                },
                filter: {
                  type: 'string',
                  description: 'Filter for query action (status, severity, type, or text search)'
                }
              },
              required: ['project_path', 'action']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_current_context':
            return await this.getCurrentContext(args);
          
          case 'initialize_context':
            return await this.initializeContext(args);
          
          case 'query_context':
            return await this.queryContext(args);
          
          case 'clear_context':
            return await this.clearContext(args);
          
          case 'update_task_status':
            return await this.updateTaskStatus(args);
          
          case 'record_decision':
            return await this.recordDecision(args);
          
          case 'debug_database_location':
            return await this.debugDatabaseLocation(args);

          case 'map_relevant_code':
            return await this.mapRelevantCode(args);

          case 'manage_task_dependencies':
            return await this.manageTaskDependencies(args);

          case 'manage_blockers':
            return await this.manageBlockers(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  // Tool implementations
  async getCurrentContext(args) {
    const branch = args.branch || await this.detectGitBranch(args.project_path);
    const context = await this.db.getCurrentContext(args.project_path, branch);
    
    if (!context) {
      return {
        content: [
          {
            type: 'text',
            text: 'No project context found. Call initialize_context() after gathering project requirements and goals from the user.'
          }
        ]
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Project context loaded:\\n\\n**Goal:** ${context.goal}\\n**Status:** ${context.status}\\n**Branch:** ${context.branch}\\n**Last Updated:** ${context.updated_at}\\n\\nUse query_context() to get specific details about tasks, decisions, or relevant files.`
        }
      ]
    };
  }

  async initializeContext(args) {
    const result = await this.db.initializeContext(args);
    
    return {
      content: [
        {
          type: 'text',
          text: `Project context initialized successfully!\\n\\n**Project ID:** ${result.project_id}\\n**Goal:** ${args.goal}\\n**Branch:** ${args.branch}\\n**Type:** ${args.project_type || 'other'}\\n\\nContext is now active and ready for development work.`
        }
      ]
    };
  }

  async queryContext(args) {
    const results = await this.db.queryContext(args.project_path, args.query_type, args.filter);
    
    return {
      content: [
        {
          type: 'text',
          text: results
        }
      ]
    };
  }

  async clearContext(args) {
    if (!args.confirm) {
      return {
        content: [
          {
            type: 'text',
            text: 'Context clearing requires explicit confirmation. Set confirm: true to proceed.'
          }
        ]
      };
    }

    const result = await this.db.clearContext(args.project_path, args.scope);
    
    return {
      content: [
        {
          type: 'text',
          text: `Context cleared: ${result.message}. Removed ${result.count} records.`
        }
      ]
    };
  }

  async updateTaskStatus(args) {
    try {
      const result = await this.db.updateTaskStatus(args.project_path, args);
      
      let message = '';
      switch (result.action) {
        case 'created':
          message = `✅ Task created successfully!\\n\\n**Task ID:** ${result.task_id}\\n**Title:** ${result.title}\\n**Status:** ${result.status}`;
          break;
        case 'updated':
          message = `✅ Task updated successfully!\\n\\n**Task ID:** ${result.task_id}\\n**Fields Updated:** ${result.fields_updated.join(', ')}`;
          break;
        case 'completed':
          message = `🎉 Task completed successfully!\\n\\n**Task ID:** ${result.task_id}\\n**Completed:** ${result.completed_at}`;
          break;
        case 'deleted':
          message = `🗑️ Task deleted successfully!\\n\\n**Task ID:** ${result.task_id}`;
          break;
        default:
          message = `Task ${result.action} successfully! ID: ${result.task_id}`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: message
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Task operation failed: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async recordDecision(args) {
    try {
      const result = await this.db.recordDecision(args.project_path, args);
      
      return {
        content: [
          {
            type: 'text',
            text: `📝 Decision recorded successfully!\\n\\n**Decision ID:** ${result.decision_id}\\n**Type:** ${result.decision_type}\\n**Title:** ${result.title}\\n\\nThis decision will help prevent regression and maintain consistency across agent sessions.`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Decision recording failed: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async debugDatabaseLocation(args) {
    const { join } = await import('path');
    const projectPath = args.project_path;
    const expectedPlanningDir = join(projectPath, '.planning');
    const expectedDbPath = join(expectedPlanningDir, 'database.db');
    
    const fs = await import('fs');
    const planningExists = fs.existsSync(expectedPlanningDir);
    const dbExists = fs.existsSync(expectedDbPath);
    
    return {
      content: [
        {
          type: 'text',
          text: `**Database Location Debug**\n\n` +
                `**Project Path:** ${projectPath}\n` +
                `**Expected .planning Directory:** ${expectedPlanningDir}\n` +
                `**Expected Database Path:** ${expectedDbPath}\n\n` +
                `**Status:**\n` +
                `- .planning directory exists: ${planningExists}\n` +
                `- database.db exists: ${dbExists}\n\n` +
                `This is where the framework will create/look for project context.`
        }
      ]
    };
  }

  async mapRelevantCode(args) {
    try {
      const { project_path, file_path, analysis } = args;
      
      // Validate required fields
      if (!project_path || !file_path || !analysis) {
        throw new Error('project_path, file_path, and analysis are required');
      }

      const db = await this.db.getDatabase(project_path);
      
      // Check if project exists
      const project = await db.get('SELECT id FROM projects WHERE path = ?', [project_path]);
      if (!project) {
        throw new Error('Project not found. Initialize context first with initialize_context()');
      }

      // Map the file
      const result = await this.db.mapRelevantCode(db, project.id, file_path, analysis);

      return {
        content: [
          {
            type: 'text',
            text: `✅ ${result.message}\n\n` +
                  `**File:** ${file_path}\n` +
                  `**Type:** ${analysis.file_type || 'unknown'}\n` +
                  `**Purpose:** ${analysis.purpose || 'Not specified'}\n` +
                  `**Importance:** ${analysis.importance_score || 1}/10\n\n` +
                  (analysis.key_functions && analysis.key_functions.length > 0 ? 
                    `**Key Functions:** ${analysis.key_functions.join(', ')}\n\n` : '') +
                  (analysis.dependencies && analysis.dependencies.length > 0 ? 
                    `**Dependencies:** ${analysis.dependencies.join(', ')}\n\n` : '') +
                  (analysis.analysis_summary ? 
                    `**Analysis:** ${analysis.analysis_summary}\n\n` : '') +
                  `File mapping updated. Use query_context with 'files' to view all mapped files.`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ File mapping failed: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async manageTaskDependencies(args) {
    try {
      const { project_path, action, parent_task_id, child_task_id, task_id, dependency_type = 'blocks' } = args;

      if (!project_path) {
        throw new Error('project_path is required');
      }

      const branch = await this.detectGitBranch(project_path);
      const context = await this.db.getCurrentContext(project_path, branch);
      
      if (!context) {
        throw new Error('No active project context found. Initialize a project context first.');
      }

      const db = await this.db.getProjectDatabase(project_path);

      switch (action) {
        case 'add':
          if (!parent_task_id || !child_task_id) {
            throw new Error('parent_task_id and child_task_id are required for add action');
          }
          
          const addResult = await this.db.addTaskDependency(db, context.id, parent_task_id, child_task_id, dependency_type);
          
          return {
            content: [
              {
                type: 'text',
                text: `✅ Task dependency created!\n\n` +
                      `**Dependency Type:** ${dependency_type}\n` +
                      `**Parent Task:** ${parent_task_id}\n` +
                      `**Child Task:** ${child_task_id}\n\n` +
                      `The child task is now ${dependency_type === 'blocks' ? 'blocked by' : 'dependent on'} the parent task.`
              }
            ]
          };

        case 'remove':
          if (!parent_task_id || !child_task_id) {
            throw new Error('parent_task_id and child_task_id are required for remove action');
          }
          
          const removeResult = await this.db.removeTaskDependency(db, parent_task_id, child_task_id, dependency_type);
          
          return {
            content: [
              {
                type: 'text',
                text: `${removeResult.success ? '✅' : '❌'} ${removeResult.message}`
              }
            ]
          };

        case 'query':
          if (!task_id) {
            throw new Error('task_id is required for query action');
          }
          
          const dependencies = await this.db.getTaskDependencies(db, task_id);
          
          let result = `**Task Dependencies for ${task_id}**\n\n`;
          
          if (dependencies.depends_on.length > 0) {
            result += `**Depends On (${dependencies.depends_on.length}):**\n`;
            dependencies.depends_on.forEach(dep => {
              result += `- ${dep.parent_title} (${dep.parent_status}) [${dep.dependency_type}]\n`;
            });
            result += '\n';
          }
          
          if (dependencies.blocks.length > 0) {
            result += `**Blocks (${dependencies.blocks.length}):**\n`;
            dependencies.blocks.forEach(dep => {
              result += `- ${dep.child_title} (${dep.child_status}) [${dep.dependency_type}]\n`;
            });
            result += '\n';
          }
          
          if (dependencies.depends_on.length === 0 && dependencies.blocks.length === 0) {
            result += 'No dependencies found for this task.\n';
          }
          
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };

        case 'check_circular':
          if (!parent_task_id || !child_task_id) {
            throw new Error('parent_task_id and child_task_id are required for check_circular action');
          }
          
          const wouldCreateCircle = await this.db.wouldCreateCircularDependency(db, parent_task_id, child_task_id);
          
          return {
            content: [
              {
                type: 'text',
                text: wouldCreateCircle 
                  ? `⚠️ Adding this dependency would create a circular dependency!`
                  : `✅ Safe to add dependency: ${parent_task_id} -> ${child_task_id}`
              }
            ]
          };

        default:
          throw new Error(`Unknown action: ${action}. Supported: add, remove, query, check_circular`);
      }

    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Task dependency operation failed: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async manageBlockers(args) {
    try {
      const { 
        project_path, action, blocker_id, title, description, blocker_type, severity, 
        status, owner, external_ref, resolution_notes, task_id, impact_type, 
        impact_description, estimated_delay, filter 
      } = args;

      if (!project_path) {
        throw new Error('project_path is required');
      }

      const branch = await this.detectGitBranch(project_path);
      const context = await this.db.getCurrentContext(project_path, branch);
      
      if (!context) {
        throw new Error('No active project context found. Initialize a project context first.');
      }

      const db = await this.db.getProjectDatabase(project_path);

      switch (action) {
        case 'create':
          if (!title) {
            throw new Error('title is required for create action');
          }
          
          const createResult = await this.db.createBlocker(db, context.id, {
            title, description, blocker_type, severity, owner, external_ref
          });
          
          return {
            content: [
              {
                type: 'text',
                text: `✅ Blocker created successfully!\n\n` +
                      `**ID:** ${createResult.blocker_id}\n` +
                      `**Title:** ${title}\n` +
                      `**Type:** ${blocker_type || 'external'}\n` +
                      `**Severity:** ${severity || 'medium'}\n` +
                      `**Status:** open\n` +
                      (owner ? `**Owner:** ${owner}\n` : '') +
                      (external_ref ? `**Reference:** ${external_ref}\n` : '') +
                      `\nUse manage_blockers with 'add_impact' action to link this blocker to affected tasks.`
              }
            ]
          };

        case 'update':
          if (!blocker_id) {
            throw new Error('blocker_id is required for update action');
          }
          
          const updates = {};
          if (title !== undefined) updates.title = title;
          if (description !== undefined) updates.description = description;
          if (blocker_type !== undefined) updates.blocker_type = blocker_type;
          if (severity !== undefined) updates.severity = severity;
          if (status !== undefined) updates.status = status;
          if (owner !== undefined) updates.owner = owner;
          if (external_ref !== undefined) updates.external_ref = external_ref;
          if (resolution_notes !== undefined) updates.resolution_notes = resolution_notes;
          
          const updateResult = await this.db.updateBlocker(db, blocker_id, updates);
          
          return {
            content: [
              {
                type: 'text',
                text: `✅ Blocker updated successfully!\n\n` +
                      `**Blocker ID:** ${blocker_id}\n` +
                      `**Updated Fields:** ${updateResult.updated_fields.join(', ')}\n\n` +
                      `Use query_context with 'blockers' to see all project blockers.`
              }
            ]
          };

        case 'resolve':
          if (!blocker_id) {
            throw new Error('blocker_id is required for resolve action');
          }
          
          const resolveUpdates = { status: 'resolved' };
          if (resolution_notes) resolveUpdates.resolution_notes = resolution_notes;
          
          await this.db.updateBlocker(db, blocker_id, resolveUpdates);
          
          return {
            content: [
              {
                type: 'text',
                text: `✅ Blocker resolved!\n\n` +
                      `**Blocker ID:** ${blocker_id}\n` +
                      `**Status:** resolved\n` +
                      (resolution_notes ? `**Resolution Notes:** ${resolution_notes}\n` : '') +
                      `\nAny tasks blocked by this issue can now proceed.`
              }
            ]
          };

        case 'delete':
          if (!blocker_id) {
            throw new Error('blocker_id is required for delete action');
          }
          
          const deleteResult = await this.db.deleteBlocker(db, blocker_id);
          
          return {
            content: [
              {
                type: 'text',
                text: `✅ Blocker deleted successfully!\n\n**Blocker ID:** ${blocker_id}`
              }
            ]
          };

        case 'query':
          const blockers = await this.db.getBlockers(db, context.id, { 
            status: filter, 
            severity: filter, 
            blocker_type: filter 
          });
          
          if (blockers.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `**No Blockers Found**\n\n${filter ? `Filter: ${filter}\n` : ''}Use manage_blockers with 'create' action to track project impediments.`
                }
              ]
            };
          }
          
          let result = `**Project Blockers (${blockers.length})**\n\n`;
          
          blockers.forEach(blocker => {
            const severityIcon = {
              'critical': '🔴',
              'high': '🟠', 
              'medium': '🟡',
              'low': '🟢'
            }[blocker.severity] || '⚪';
            
            result += `${severityIcon} **${blocker.title}** [${blocker.blocker_type}]\n`;
            result += `  *Status: ${blocker.status} | Severity: ${blocker.severity}*\n`;
            if (blocker.description) {
              result += `  ${blocker.description.substring(0, 80)}${blocker.description.length > 80 ? '...' : ''}\n`;
            }
            if (blocker.owner) result += `  *Owner: ${blocker.owner}*\n`;
            result += `  *ID: ${blocker.id}*\n\n`;
          });
          
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };

        case 'add_impact':
          if (!blocker_id || !task_id) {
            throw new Error('blocker_id and task_id are required for add_impact action');
          }
          
          const impactResult = await this.db.addBlockerImpact(db, blocker_id, task_id, {
            impact_type, impact_description, estimated_delay
          });
          
          return {
            content: [
              {
                type: 'text',
                text: `✅ Blocker impact added!\n\n` +
                      `**Blocker:** ${blocker_id}\n` +
                      `**Task:** ${task_id}\n` +
                      `**Impact Type:** ${impact_type || 'blocks'}\n` +
                      (impact_description ? `**Description:** ${impact_description}\n` : '') +
                      (estimated_delay ? `**Estimated Delay:** ${estimated_delay} hours\n` : '')
              }
            ]
          };

        case 'remove_impact':
          if (!blocker_id || !task_id) {
            throw new Error('blocker_id and task_id are required for remove_impact action');
          }
          
          const removeResult = await this.db.removeBlockerImpact(db, blocker_id, task_id, impact_type);
          
          return {
            content: [
              {
                type: 'text',
                text: `${removeResult.success ? '✅' : '❌'} ${removeResult.message}`
              }
            ]
          };

        default:
          throw new Error(`Unknown action: ${action}. Supported: create, update, resolve, delete, query, add_impact, remove_impact`);
      }

    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Blocker management failed: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async detectGitBranch(projectPath = null) {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      // Set working directory for git commands
      const options = projectPath ? { cwd: projectPath } : {};
      
      const { stdout } = await execAsync('git branch --show-current', options);
      const branch = stdout.trim();
      
      if (branch) {
        return branch;
      }
      
      // Fallback: try to get branch from git symbolic-ref
      const { stdout: refOutput } = await execAsync('git symbolic-ref --short HEAD', options);
      return refOutput.trim() || 'main';
      
    } catch (error) {
      console.error('Failed to detect git branch:', error.message);
      // Fall back to 'main' if git detection fails
      return 'main';
    }
  }

  async run() {
    await this.db.initialize();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('AI Reasoning Framework MCP Server running...');
  }
}

// Start the server
const server = new AIReasoningFrameworkServer();
server.run().catch(console.error);
