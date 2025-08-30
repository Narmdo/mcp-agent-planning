# Setup Instructions

## Quick Start

1. **Install dependencies:**
   ```bash
   cd "P:\\Projects\\Ai Reasoning Framework"
   npm install
   ```

2. **Test the database:**
   ```bash
   npm test
   ```

3. **Run the MCP server:**
   ```bash
   npm start
   ```

## Deployment

For production use (including meta-development), deploy to a stable location:

```bash
npm run deploy
```

This copies the framework to `P:\\Projects\\deployments\\ai-reasoning-framework\\` and installs production dependencies.

**Important**: Always deploy before using the framework to manage its own development!

## Development vs Production

- **Development**: Work in `P:\\Projects\\Ai Reasoning Framework\\`
- **Production/Meta**: MCP client points to `P:\\Projects\\deployments\\ai-reasoning-framework\\`

## MCP Client Configuration

To use this server with Claude Desktop or other MCP clients, add to your MCP configuration:

```json
{
  "mcpServers": {
    "ai-reasoning-framework": {
      "command": "node",
      "args": ["P:\\\\Projects\\\\deployments\\\\ai-reasoning-framework\\\\src\\\\server.js"]
    }
  }
}
```

## Data Storage

- **Database**: `.planning/database.db` (SQLite)
- **Migrations**: Automatic on server startup
- **Planning Directory**: `.planning/` contains all agent state data

## Available Tools

- **get_current_context()** - Load existing project state
- **initialize_context()** - Set up new project with goals and scope
- **query_context()** - Query specific aspects (summary, tasks, decisions, files, blockers)
- **clear_context()** - Clear project context (requires confirmation)

## Next Development Steps

1. Add task tracking functionality
2. Implement decision logging
3. Add file mapping capabilities  
4. Enhance git branch detection
5. Add more sophisticated querying
