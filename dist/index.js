#!/usr/bin/env node

// Entry point for mcp-agent-planning - redirects to the actual server
import '../src/server.js';

class MCPAgentPlanningServer {
  constructor() {
    this.server = new Server(
      {
        name: 'mcp-agent-planning',
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
                }
              },
              required: ['project_path', 'action']
            }
          },
          {
            name: 'record_decision',
            description: 'Log decisions to prevent regression',
            inputSchema: {
              type: 'object',
              properties: {
                project_path: {
                  type: 'string',
                  description: 'Absolute path to the project directory'
                },
                decision_type: {
                  type: 'string',
                  enum: ['architectural', 'user-preference', 'technical-choice'],
                  description: 'Type of decision being logged'
                },
                title: {
                  type: 'string',
                  description: 'Brief title summarizing the decision'
                },
                description: {
                  type: 'string',
                  description: 'Detailed description of what was decided'
                }
              },
              required: ['project_path', 'decision_type', 'title', 'description']
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
                }
              },
              required: ['project_path', 'query_type']
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
          case 'update_task_status':
            return await this.updateTaskStatus(args);
          case 'record_decision':
            return await this.recordDecision(args);
          case 'query_context':
            return await this.queryContext(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error executing ${name}: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }

  async getCurrentContext(args) {
    const branch = args.branch || await this.detectGitBranch(args.project_path);
    const context = await this.db.getCurrentContext(args.project_path, branch);
    
    if (!context) {
      return {
        content: [{
          type: 'text',
          text: 'No project context found. Call initialize_context() first.'
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: `Project context loaded:\n\n**Goal:** ${context.goal}\n**Status:** ${context.status}\n**Branch:** ${context.branch}\n**Last Updated:** ${context.updated_at}\n\nUse query_context() to get specific details.`
      }]
    };
  }

  async initializeContext(args) {
    const result = await this.db.initializeContext(args);
    return {
      content: [{
        type: 'text',
        text: `Project context initialized!\n\n**Project ID:** ${result.project_id}\n**Goal:** ${args.goal}\n**Branch:** ${args.branch}\n**Type:** ${args.project_type || 'other'}\n\nContext is now active.`
      }]
    };
  }

  async updateTaskStatus(args) {
    const result = await this.db.updateTaskStatus(args.project_path, args);
    return {
      content: [{
        type: 'text',
        text: `✅ Task ${result.action} successfully! ID: ${result.task_id}`
      }]
    };
  }

  async recordDecision(args) {
    const result = await this.db.recordDecision(args.project_path, args);
    return {
      content: [{
        type: 'text',
        text: `📝 Decision recorded: ${result.title}\n\nThis prevents regression across agent sessions.`
      }]
    };
  }

  async queryContext(args) {
    const results = await this.db.queryContext(args.project_path, args.query_type);
    return {
      content: [{
        type: 'text',
        text: results
      }]
    };
  }

  async detectGitBranch(projectPath = null) {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const options = projectPath ? { cwd: projectPath } : {};
      const { stdout } = await execAsync('git branch --show-current', options);
      return stdout.trim() || 'main';
    } catch (error) {
      return 'main';
    }
  }

  async run() {
    await this.db.initialize();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Agent Planning Server running...');
  }
}

// Start the server
const server = new MCPAgentPlanningServer();
server.run().catch(console.error);
