# Contributing to AI Reasoning Framework

Thank you for your interest in contributing to the AI Reasoning Framework! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues
- Use [GitHub Issues](../../issues) to report bugs or request features
- Search existing issues before creating new ones
- Provide detailed information including:
  - Environment details (Node.js version, OS, MCP client)
  - Steps to reproduce
  - Expected vs actual behavior
  - Error messages and logs

### Submitting Changes

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow coding standards
   - Add/update tests
   - Update documentation
4. **Test thoroughly**
   ```bash
   npm test
   npm run test:production
   ```
5. **Submit a pull request**

## 🏗️ Development Setup

### Prerequisites
- Node.js 18+
- Git
- MCP-compatible client for testing

### Setup
```bash
git clone <your-fork>
cd ai-reasoning-framework
npm install
npm test
```

### Development Workflow
```bash
# 1. Make changes
# 2. Test changes
npm test

# 3. Deploy and test with MCP client
npm run deploy
# Restart your MCP client
# Test functionality

# 4. Run full test suite
npm run test:production
```

## 📝 Coding Standards

### JavaScript Style
- Use ES modules (`import`/`export`)
- Follow modern JavaScript practices
- Use meaningful variable names
- Add JSDoc comments for functions
- Handle errors appropriately

### Database Changes
- Create migrations for schema changes
- Use SQLite-compatible SQL
- Test migrations thoroughly
- Document schema changes

### MCP Tools
- Follow MCP protocol standards
- Use JSON schemas for validation
- Provide clear error messages
- Include comprehensive examples

## 🧪 Testing Guidelines

### Test Types
- **Unit Tests**: Test individual functions
- **Integration Tests**: Test tool interactions
- **End-to-End Tests**: Test complete workflows

### Testing Requirements
- All new features must have tests
- Maintain or improve test coverage
- Test error conditions
- Include performance considerations

### Running Tests
```bash
npm test                 # Basic tests
npm run test:quick      # Quick validation
npm run test:production # Full test suite
```

## 📚 Documentation

### Documentation Requirements
- Update README.md for user-facing changes
- Update SETUP.md for installation/config changes
- Add JSDoc comments to new functions
- Include usage examples
- Update tool descriptions

### Documentation Style
- Use clear, concise language
- Include code examples
- Follow Markdown standards
- Use proper formatting

## 🔄 Pull Request Guidelines

### Before Submitting
- [ ] Tests pass (`npm run test:production`)
- [ ] Documentation updated
- [ ] Code follows style guidelines
- [ ] No breaking changes (or properly documented)
- [ ] Related issues referenced

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings/errors
```

## 🐛 Bug Fix Guidelines

### For Bug Reports
1. **Reproduce the issue**
2. **Write a failing test** (if possible)
3. **Fix the bug**
4. **Verify the test passes**
5. **Test related functionality**

### For Security Issues
- Report privately via email first
- Allow time for fix before public disclosure
- Follow responsible disclosure practices

## ✨ Feature Development

### New MCP Tools
1. **Design the tool interface**
   - Define parameters
   - Plan return values
   - Consider error cases

2. **Implement the tool**
   - Add to `src/server.js`
   - Include validation
   - Handle errors gracefully

3. **Add database support** (if needed)
   - Create migration
   - Update `src/database.js`
   - Test schema changes

4. **Write tests**
   - Unit tests for logic
   - Integration tests for MCP
   - End-to-end workflow tests

5. **Update documentation**
   - Add to README.md tool list
   - Include usage examples
   - Update SETUP.md if needed

### Database Schema Changes
1. **Create migration file**
   ```sql
   -- migrations/007_your_feature.sql
   CREATE TABLE IF NOT EXISTS your_table (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       -- your columns
   );
   ```

2. **Update database.js**
   - Add helper functions
   - Include validation
   - Handle transactions

3. **Test thoroughly**
   - Test migration up/down
   - Test with existing data
   - Validate constraints

## 🎯 Areas for Contribution

### High Priority
- Performance optimizations
- Additional MCP tool implementations
- Enhanced error handling
- Documentation improvements

### Medium Priority
- UI/visualization tools
- Export/import functionality
- Advanced querying features
- Integration examples

### Low Priority
- Code refactoring
- Additional test coverage
- Development tooling
- Example projects

## 📞 Getting Help

- **Questions**: Start a [Discussion](../../discussions)
- **Bug Reports**: Create an [Issue](../../issues)
- **Feature Requests**: Create an [Issue](../../issues) with feature label
- **Security Issues**: Email [security-contact]

## 📜 Code of Conduct

### Our Standards
- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

### Unacceptable Behavior
- Harassment or discriminatory language
- Personal attacks or trolling
- Public or private harassment
- Publishing private information without permission
- Unprofessional conduct

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to the AI Reasoning Framework! 🚀
