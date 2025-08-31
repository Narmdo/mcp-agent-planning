# MCP Agent Planning

Transform your AI agents with persistent memory, task tracking, and decision logging. Never lose context again across chat sessions - your AI assistants remember everything and continue exactly where they left off.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP-v0.5.0-blue)](https://github.com/modelcontextprotocol)

## What Your AI Can Do

✅ **Remember project context**: *"Continue working on the user auth system we discussed yesterday"*  
✅ **Track tasks and progress**: *"Show me what tasks are still pending for the API refactor"*  
✅ **Never repeat decisions**: *"Why did we choose PostgreSQL over MongoDB again?"*  
✅ **Manage dependencies**: *"What's blocking the frontend deployment?"*  
✅ **Resume complex workflows**: Switch between chat sessions without losing any context

## Perfect For

- **Developers** working on long-term projects with multiple AI sessions
- **Product Managers** tracking features across different conversations  
- **Teams** that need consistent AI assistance across various contexts
- **Anyone** tired of re-explaining project context to AI assistants

## Quick Start

Get your AI assistants remembering everything in 2 minutes:

### 1. Install

```bash
# Try it instantly
npx mcp-agent-planning

# Or install globally  
npm install -g mcp-agent-planning
```

### 2. Configure Claude Desktop

Add this to your Claude Desktop config:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "agent-planning": {
      "command": "npx",
      "args": ["-y", "mcp-agent-planning"]
    }
  }
}
```

### 3. Start Using

Restart Claude Desktop and you'll see "🔗 agent-planning" in the status bar.

Ask your AI assistant:
- *"Initialize context for my React project in /home/user/my-app"*
- *"Create a task to implement user authentication"*
- *"What decisions have we made about the database?"*

## Usage Examples

### Project Context Management
```
"Initialize context for this project. The goal is to build a customer dashboard with React and Node.js. We're focusing on the authentication system first."

"Get current context for this project"

"What tasks are still pending?"
```

### Task Tracking
```
"Create a task: Set up user authentication with JWT tokens"

"Update task AUTH-001 to in-progress status"

"Show me all blocked tasks and their dependencies"
```

### Decision Logging
```
"Record decision: We chose PostgreSQL over MongoDB because we need ACID compliance for financial data"

"What architectural decisions have we made about the API structure?"
```

### File Mapping
```
"Map this authentication file - it contains the JWT middleware and user validation functions"

"Show me all mapped files and their importance scores"
```

## Configuration

### Environment Variables
- No environment variables required - works out of the box
- Database stored in project's `.planning/` directory
- Automatic git branch detection

### Advanced Configuration
```json
{
  "mcpServers": {
    "agent-planning": {
      "command": "mcp-agent-planning",
      "args": [],
      "env": {
        "DEBUG": "1"
      }
    }
  }
}
```

## How It Works

1. **Project Context**: Initialize once per project/branch with goals and scope
2. **Persistent Storage**: SQLite database in your project's `.planning/` folder
3. **Branch Awareness**: Separate contexts for different git branches
4. **Task Management**: Create, update, and track tasks with dependencies
5. **Decision Logging**: Record architectural and technical decisions
6. **File Mapping**: Track important files and their relationships

## Tools Available

| Tool | Description |
|------|-------------|
| `get_current_context` | Load existing project context |
| `initialize_context` | Set up new project with goals and scope |
| `update_task_status` | Create, update, complete, or delete tasks |
| `record_decision` | Log decisions to prevent regression |
| `query_context` | Search tasks, decisions, files, or blockers |
| `manage_task_dependencies` | Handle task relationships and blocking |
| `manage_blockers` | Track and resolve project impediments |
| `map_relevant_code` | Analyze and track important files |

## AI Assistant Compatibility

Works with any MCP-compatible AI assistant:
- **Claude Desktop** (recommended)
- **Cursor AI**
- **Continue.dev** 
- **Custom MCP clients**

## Troubleshooting

### "No tools available"
- Restart your AI client after adding the configuration
- Check that the config file path is correct for your OS
- Verify JSON syntax in your config file

### "Command not found"
```bash
# If npx fails, install globally first
npm install -g mcp-agent-planning
```

### "Permission denied"
```bash
# On macOS/Linux, you may need to allow execution
chmod +x /path/to/mcp-agent-planning
```

### "Database issues" 
- Check that your project directory is writable
- The `.planning/` directory will be created automatically
- Use the `debug_database_location` tool to verify paths

## Examples in Action

### Starting a New Project
```
User: "I'm starting a new e-commerce site with Next.js. Help me set up the project structure."

AI: "I'll initialize context for your e-commerce project and help you plan the structure."

→ Uses initialize_context to create persistent project memory
→ Creates initial tasks for project setup
→ Records architectural decisions as they're made
```

### Resuming Work Later
```
User: "What were we working on with the payment system?"

AI: "Let me check our project context..."

→ Uses get_current_context to load previous session
→ Uses query_context to find payment-related tasks and decisions  
→ Continues exactly where you left off
```

## Development

```bash
# Clone and develop
git clone https://github.com/Narmdo/mcp-agent-planning.git
cd mcp-agent-planning
npm install

# Test locally
npm run dev

# Build for distribution
npm run build
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/Narmdo/mcp-agent-planning/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Narmdo/mcp-agent-planning/discussions)

---

Made with ❤️ for developers who want AI assistants that actually remember things.
