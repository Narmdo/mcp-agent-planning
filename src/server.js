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
                branch: {
                  type: 'string',
                  description: 'Git branch name (optional - will detect from git if not provided)'
                }
              }
            }
          },
          {
            name: 'initialize_context',
            description: 'Initialize a new project context with structured data',
            inputSchema: {
              type: 'object',
              properties: {
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
              required: ['goal', 'scope', 'branch']
            }
          },
          {
            name: 'query_context',
            description: 'Query specific aspects of the current project context',
            inputSchema: {
              type: 'object',
              properties: {
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
              required: ['query_type']
            }
          },
          {
            name: 'clear_context',
            description: 'Clear project context with safety confirmation',
            inputSchema: {
              type: 'object',
              properties: {
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
              required: ['scope', 'confirm']
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
    const branch = args.branch || await this.detectGitBranch();
    const context = await this.db.getCurrentContext(branch);
    
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
    const results = await this.db.queryContext(args.query_type, args.filter);
    
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

    const result = await this.db.clearContext(args.scope);
    
    return {
      content: [
        {
          type: 'text',
          text: `Context cleared: ${result.message}. Removed ${result.count} records.`
        }
      ]
    };
  }

  async detectGitBranch() {
    // TODO: Implement git branch detection
    // For now, return 'main' as default
    return 'main';
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
