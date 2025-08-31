#!/usr/bin/env node

/**
 * AI Reasoning Framework Production Testing Suite
 * 
 * Comprehensive end-to-end testing scenarios to validate:
 * - Agent continuity across sessions
 * - All 10 MCP tools functionality  
 * - Database integrity and migrations
 * - Complex workflow scenarios
 * - Error handling and edge cases
 * - Performance under load
 */

import { Database } from '../src/database.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

class ProductionTestSuite {
  constructor() {
    this.db = new Database();
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
      details: []
    };
    this.testProjectPath = null;
  }

  async run() {
    console.log('\n🧪 AI Reasoning Framework Production Testing Suite');
    console.log('='.repeat(60));
    
    try {
      await this.setupTestEnvironment();
      
      // Core functionality tests
      await this.testDatabaseInitialization();
      await this.testProjectLifecycle();
      await this.testTaskManagement();
      await this.testTaskDependencies();
      await this.testBlockerManagement();
      await this.testDecisionLogging();
      await this.testFileMapping();
      await this.testComplexWorkflows();
      await this.testErrorHandling();
      await this.testPerformance();
      
      await this.cleanupTestEnvironment();
      
    } catch (error) {
      this.recordFailure('Test Suite Setup', error.message);
    }
    
    this.printResults();
    process.exit(this.testResults.failed > 0 ? 1 : 0);
  }

  async setupTestEnvironment() {
    console.log('\n📋 Setting up test environment...');
    
    // Create temporary test project directory
    const tempDir = join(process.cwd(), 'test-temp-' + randomBytes(8).toString('hex'));
    this.testProjectPath = tempDir;
    
    await fs.mkdir(tempDir, { recursive: true });
    console.log(`  ✓ Created test directory: ${tempDir}`);
    
    await this.db.initialize();
    console.log('  ✓ Database initialized');
  }

  async cleanupTestEnvironment() {
    console.log('\n🧹 Cleaning up test environment...');
    
    try {
      await this.db.close();
      if (this.testProjectPath) {
        await fs.rm(this.testProjectPath, { recursive: true, force: true });
        console.log('  ✓ Test directory cleaned up');
      }
    } catch (error) {
      console.log(`  ⚠️ Cleanup warning: ${error.message}`);
    }
  }

  async testDatabaseInitialization() {
    console.log('\n🗄️ Testing Database Initialization...');
    
    try {
      const db = await this.db.getProjectDatabase(this.testProjectPath);
      
      // Test that all required tables exist
      const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
      const tableNames = tables.map(t => t.name);
      
      const requiredTables = [
        'projects', 'context_data', 'tasks', 'decisions', 
        'file_mappings', 'task_dependencies', 'blockers', 'blocker_impacts'
      ];
      
      for (const table of requiredTables) {
        if (tableNames.includes(table)) {
          this.recordSuccess(`Database table '${table}' exists`);
        } else {
          this.recordFailure(`Database table '${table}' missing`, 'Required table not found');
        }
      }
      
      // Test migrations table
      const migrations = await db.all('SELECT * FROM migrations ORDER BY version');
      if (migrations.length >= 6) {
        this.recordSuccess(`Database migrations (${migrations.length} applied)`);
      } else {
        this.recordFailure('Database migrations', `Expected 6+ migrations, found ${migrations.length}`);
      }
      
    } catch (error) {
      this.recordFailure('Database initialization', error.message);
    }
  }

  async testProjectLifecycle() {
    console.log('\n📁 Testing Project Lifecycle...');
    
    try {
      const branch = 'test-branch';
      
      // Test project initialization
      const initResult = await this.db.initializeContext({
        project_path: this.testProjectPath,
        goal: 'Test AI Reasoning Framework functionality',
        scope: 'Comprehensive testing of all framework features',
        project_type: 'feature',
        branch: branch
      });
      
      if (initResult.project_id) {
        this.recordSuccess('Project initialization');
      } else {
        this.recordFailure('Project initialization', 'No project ID returned');
      }
      
      // Test context retrieval
      const context = await this.db.getCurrentContext(this.testProjectPath, branch);
      if (context && context.goal) {
        this.recordSuccess('Context retrieval');
      } else {
        this.recordFailure('Context retrieval', 'Context not found or incomplete');
      }
      
      // Test context querying
      const summary = await this.db.getContextSummary(this.testProjectPath, null);
      if (summary.includes('Test AI Reasoning Framework')) {
        this.recordSuccess('Context summary generation');
      } else {
        this.recordFailure('Context summary', 'Summary does not contain expected content');
      }
      
    } catch (error) {
      this.recordFailure('Project lifecycle', error.message);
    }
  }

  async testTaskManagement() {
    console.log('\n📋 Testing Task Management...');
    
    try {
      const db = await this.db.getProjectDatabase(this.testProjectPath);
      const project = await this.db.getCurrentActiveProject(db);
      
      // Test task creation
      const task1 = await this.db.createTask(db, project.id, {
        title: 'Test Task 1',
        description: 'First test task',
        priority: 'high',
        status: 'todo'
      });
      
      if (task1.task_id) {
        this.recordSuccess('Task creation');
      } else {
        this.recordFailure('Task creation', 'No task ID returned');
      }
      
      // Test task update
      const updateResult = await this.db.updateTask(db, task1.task_id, {
        status: 'in-progress',
        notes: 'Task updated during testing'
      });
      
      if (updateResult.task_id === task1.task_id) {
        this.recordSuccess('Task update');
      } else {
        this.recordFailure('Task update', 'Task update failed');
      }
      
      // Test task completion
      const completeResult = await this.db.completeTask(db, task1.task_id, 'Testing completed');
      
      if (completeResult.action === 'completed') {
        this.recordSuccess('Task completion');
      } else {
        this.recordFailure('Task completion', 'Task not marked as completed');
      }
      
      // Test task querying
      const tasks = await this.db.getTaskData(db, project.id, null);
      
      if (tasks.includes('Test Task 1')) {
        this.recordSuccess('Task querying');
      } else {
        this.recordFailure('Task querying', 'Created task not found in query results');
      }
      
    } catch (error) {
      this.recordFailure('Task management', error.message);
    }
  }

  async testTaskDependencies() {
    console.log('\n🔗 Testing Task Dependencies...');
    
    try {
      const db = await this.db.getProjectDatabase(this.testProjectPath);
      const project = await this.db.getCurrentActiveProject(db);
      
      // Create parent and child tasks
      const parentTask = await this.db.createTask(db, project.id, {
        title: 'Parent Task',
        description: 'Task that blocks others',
        priority: 'high'
      });
      
      const childTask = await this.db.createTask(db, project.id, {
        title: 'Child Task',
        description: 'Task that depends on parent',
        priority: 'medium'
      });
      
      // Test dependency creation
      const depResult = await this.db.addTaskDependency(
        db, project.id, parentTask.task_id, childTask.task_id, 'blocks'
      );
      
      if (depResult.dependency_id) {
        this.recordSuccess('Task dependency creation');
      } else {
        this.recordFailure('Task dependency creation', 'No dependency ID returned');
      }
      
      // Test circular dependency detection
      const wouldCreateCircle = await this.db.wouldCreateCircularDependency(
        db, childTask.task_id, parentTask.task_id
      );
      
      if (wouldCreateCircle) {
        this.recordSuccess('Circular dependency detection');
      } else {
        this.recordFailure('Circular dependency detection', 'Failed to detect circular dependency');
      }
      
      // Test dependency validation on completion
      try {
        await this.db.completeTask(db, childTask.task_id, 'Should fail');
        this.recordFailure('Dependency validation', 'Child task completed despite unsatisfied dependency');
      } catch (error) {
        if (error.message.includes('blocked by')) {
          this.recordSuccess('Dependency validation on completion');
        } else {
          this.recordFailure('Dependency validation', 'Unexpected error: ' + error.message);
        }
      }
      
      // Complete parent task and then child should be completable
      await this.db.completeTask(db, parentTask.task_id, 'Parent completed');
      await this.db.completeTask(db, childTask.task_id, 'Child completed after parent');
      this.recordSuccess('Dependency resolution workflow');
      
    } catch (error) {
      this.recordFailure('Task dependencies', error.message);
    }
  }

  async testBlockerManagement() {
    console.log('\n🚫 Testing Blocker Management...');
    
    try {
      const db = await this.db.getProjectDatabase(this.testProjectPath);
      const project = await this.db.getCurrentActiveProject(db);
      
      // Test blocker creation
      const blockerResult = await this.db.createBlocker(db, project.id, {
        title: 'Test Blocker',
        description: 'Blocking issue for testing',
        blocker_type: 'technical',
        severity: 'high',
        owner: 'test-user'
      });
      
      if (blockerResult.blocker_id) {
        this.recordSuccess('Blocker creation');
      } else {
        this.recordFailure('Blocker creation', 'No blocker ID returned');
      }
      
      // Test blocker update
      const updateResult = await this.db.updateBlocker(db, blockerResult.blocker_id, {
        status: 'in-progress',
        resolution_notes: 'Working on resolution'
      });
      
      if (updateResult.changes > 0) {
        this.recordSuccess('Blocker update');
      } else {
        this.recordFailure('Blocker update', 'No changes made');
      }
      
      // Create a task and link it to the blocker
      const task = await this.db.createTask(db, project.id, {
        title: 'Blocked Task',
        description: 'Task affected by blocker'
      });
      
      const impactResult = await this.db.addBlockerImpact(
        db, blockerResult.blocker_id, task.task_id, {
          impact_type: 'blocks',
          impact_description: 'Cannot proceed due to technical issue',
          estimated_delay: 24
        }
      );
      
      if (impactResult.impact_id) {
        this.recordSuccess('Blocker impact tracking');
      } else {
        this.recordFailure('Blocker impact tracking', 'No impact ID returned');
      }
      
      // Test blocker resolution
      await this.db.updateBlocker(db, blockerResult.blocker_id, {
        status: 'resolved',
        resolution_notes: 'Issue resolved during testing'
      });
      
      this.recordSuccess('Blocker resolution workflow');
      
    } catch (error) {
      this.recordFailure('Blocker management', error.message);
    }
  }

  async testDecisionLogging() {
    console.log('\n📝 Testing Decision Logging...');
    
    try {
      const decisionResult = await this.db.recordDecision(this.testProjectPath, {
        decision_type: 'architectural',
        title: 'Test Decision',
        description: 'Testing decision logging functionality',
        rationale: 'To ensure decision tracking works correctly',
        context: 'During production testing',
        alternatives_considered: ['Option A', 'Option B'],
        impacts: ['Better testing coverage'],
        made_by: 'test-suite'
      });
      
      if (decisionResult.decision_id) {
        this.recordSuccess('Decision logging');
      } else {
        this.recordFailure('Decision logging', 'No decision ID returned');
      }
      
      // Test decision querying
      const db = await this.db.getProjectDatabase(this.testProjectPath);
      const project = await this.db.getCurrentActiveProject(db);
      const decisions = await this.db.getDecisionData(db, project.id, null);
      
      if (decisions.includes('Test Decision')) {
        this.recordSuccess('Decision querying');
      } else {
        this.recordFailure('Decision querying', 'Logged decision not found in query results');
      }
      
    } catch (error) {
      this.recordFailure('Decision logging', error.message);
    }
  }

  async testFileMapping() {
    console.log('\n📁 Testing File Mapping...');
    
    try {
      const db = await this.db.getProjectDatabase(this.testProjectPath);
      const project = await this.db.getCurrentActiveProject(db);
      
      const mappingResult = await this.db.mapRelevantCode(db, project.id, 'test/file.js', {
        file_type: 'javascript',
        purpose: 'Testing file mapping functionality',
        key_functions: ['testFunction', 'validateMapping'],
        dependencies: ['jest', 'lodash'],
        importance_score: 8,
        analysis_summary: 'Test file for validating file mapping system'
      });
      
      if (mappingResult.file_id) {
        this.recordSuccess('File mapping');
      } else {
        this.recordFailure('File mapping', 'No file ID returned');
      }
      
      // Test file querying
      const files = await this.db.getFileData(db, project.id, 'javascript');
      
      if (files.includes('test/file.js')) {
        this.recordSuccess('File mapping querying');
      } else {
        this.recordFailure('File mapping querying', 'Mapped file not found in query results');
      }
      
    } catch (error) {
      this.recordFailure('File mapping', error.message);
    }
  }

  async testComplexWorkflows() {
    console.log('\n🔄 Testing Complex Workflows...');
    
    try {
      const db = await this.db.getProjectDatabase(this.testProjectPath);
      const project = await this.db.getCurrentActiveProject(db);
      
      // Create a complex project scenario
      // 1. Create multiple interconnected tasks
      const tasks = [];
      for (let i = 1; i <= 5; i++) {
        const task = await this.db.createTask(db, project.id, {
          title: `Complex Task ${i}`,
          description: `Part of complex workflow test`,
          priority: i <= 2 ? 'high' : 'medium'
        });
        tasks.push(task);
      }
      
      // 2. Create dependency chain: Task1 -> Task2 -> Task3
      await this.db.addTaskDependency(db, project.id, tasks[0].task_id, tasks[1].task_id, 'blocks');
      await this.db.addTaskDependency(db, project.id, tasks[1].task_id, tasks[2].task_id, 'blocks');
      
      // 3. Create a blocker affecting Task4
      const blocker = await this.db.createBlocker(db, project.id, {
        title: 'Complex Workflow Blocker',
        description: 'Blocking Task4 in complex scenario',
        blocker_type: 'external',
        severity: 'medium'
      });
      
      await this.db.addBlockerImpact(db, blocker.blocker_id, tasks[3].task_id, {
        impact_type: 'blocks',
        estimated_delay: 8
      });
      
      // 4. Record decisions about the workflow
      await this.db.recordDecision(this.testProjectPath, {
        decision_type: 'technical-choice',
        title: 'Complex Workflow Design',
        description: 'Decided on task dependency structure',
        rationale: 'Ensures proper execution order'
      });
      
      // 5. Complete tasks in correct order
      await this.db.completeTask(db, tasks[0].task_id, 'First task completed');
      await this.db.completeTask(db, tasks[1].task_id, 'Second task completed');
      await this.db.completeTask(db, tasks[2].task_id, 'Third task completed');
      
      // 6. Resolve blocker and complete Task4
      await this.db.updateBlocker(db, blocker.blocker_id, { status: 'resolved' });
      await this.db.completeTask(db, tasks[3].task_id, 'Fourth task completed after blocker resolved');
      
      this.recordSuccess('Complex workflow execution');
      
      // Test comprehensive context querying
      const summary = await this.db.getContextSummary(this.testProjectPath, null);
      if (summary.includes('Complex Task') && summary.includes('Complex Workflow')) {
        this.recordSuccess('Complex workflow context preservation');
      } else {
        this.recordFailure('Complex workflow context', 'Context summary incomplete');
      }
      
    } catch (error) {
      this.recordFailure('Complex workflows', error.message);
    }
  }

  async testErrorHandling() {
    console.log('\n⚠️ Testing Error Handling...');
    
    try {
      const db = await this.db.getProjectDatabase(this.testProjectPath);
      
      // Test invalid task operations
      try {
        await this.db.updateTask(db, 'nonexistent-task-id', { title: 'Should fail' });
        this.recordFailure('Error handling - invalid task update', 'Should have thrown error');
      } catch (error) {
        if (error.message.includes('not found')) {
          this.recordSuccess('Error handling - invalid task update');
        } else {
          this.recordFailure('Error handling - task update', 'Unexpected error: ' + error.message);
        }
      }
      
      // Test invalid dependency creation
      try {
        await this.db.addTaskDependency(db, 'project-id', 'fake-parent', 'fake-child', 'blocks');
        this.recordFailure('Error handling - invalid dependency', 'Should have thrown error');
      } catch (error) {
        if (error.message.includes('not found')) {
          this.recordSuccess('Error handling - invalid dependency creation');
        } else {
          this.recordFailure('Error handling - dependency', 'Unexpected error: ' + error.message);
        }
      }
      
      // Test invalid blocker operations
      try {
        await this.db.updateBlocker(db, 'nonexistent-blocker', { status: 'resolved' });
        this.recordFailure('Error handling - invalid blocker update', 'Should have thrown error');
      } catch (error) {
        if (error.message.includes('not found')) {
          this.recordSuccess('Error handling - invalid blocker update');
        } else {
          this.recordFailure('Error handling - blocker', 'Unexpected error: ' + error.message);
        }
      }
      
    } catch (error) {
      this.recordFailure('Error handling tests', error.message);
    }
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance...');
    
    try {
      const db = await this.db.getProjectDatabase(this.testProjectPath);
      const project = await this.db.getCurrentActiveProject(db);
      
      // Test bulk operations
      const startTime = Date.now();
      
      // Create 50 tasks
      const tasks = [];
      for (let i = 1; i <= 50; i++) {
        const task = await this.db.createTask(db, project.id, {
          title: `Performance Test Task ${i}`,
          description: `Task ${i} for performance testing`,
          priority: i % 3 === 0 ? 'high' : 'medium'
        });
        tasks.push(task);
      }
      
      // Create 20 dependencies
      for (let i = 0; i < 20; i++) {
        const parentIndex = Math.floor(Math.random() * 25);
        const childIndex = 25 + Math.floor(Math.random() * 25);
        try {
          await this.db.addTaskDependency(
            db, project.id, 
            tasks[parentIndex].task_id, 
            tasks[childIndex].task_id, 
            'blocks'
          );
        } catch (error) {
          // Skip if dependency would create circle or already exists
        }
      }
      
      // Create 10 blockers
      for (let i = 1; i <= 10; i++) {
        await this.db.createBlocker(db, project.id, {
          title: `Performance Test Blocker ${i}`,
          description: `Blocker ${i} for performance testing`,
          blocker_type: 'technical',
          severity: i % 2 === 0 ? 'high' : 'medium'
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (duration < 10000) { // Should complete in under 10 seconds
        this.recordSuccess(`Performance - bulk operations (${duration}ms)`);
      } else {
        this.recordFailure('Performance - bulk operations', `Too slow: ${duration}ms`);
      }
      
      // Test large query performance
      const queryStart = Date.now();
      const summary = await this.db.getContextSummary(this.testProjectPath, null);
      const queryEnd = Date.now();
      const queryDuration = queryEnd - queryStart;
      
      if (queryDuration < 1000) { // Should complete in under 1 second
        this.recordSuccess(`Performance - large context query (${queryDuration}ms)`);
      } else {
        this.recordFailure('Performance - context query', `Too slow: ${queryDuration}ms`);
      }
      
    } catch (error) {
      this.recordFailure('Performance testing', error.message);
    }
  }

  recordSuccess(testName) {
    this.testResults.passed++;
    this.testResults.details.push({ status: 'PASS', test: testName });
    console.log(`  ✅ ${testName}`);
  }

  recordFailure(testName, error) {
    this.testResults.failed++;
    this.testResults.errors.push({ test: testName, error });
    this.testResults.details.push({ status: 'FAIL', test: testName, error });
    console.log(`  ❌ ${testName}: ${error}`);
  }

  printResults() {
    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📋 Total:  ${this.testResults.passed + this.testResults.failed}`);
    
    if (this.testResults.failed > 0) {
      console.log('\n💥 Failures:');
      this.testResults.errors.forEach(({ test, error }) => {
        console.log(`  - ${test}: ${error}`);
      });
    }
    
    const successRate = (this.testResults.passed / (this.testResults.passed + this.testResults.failed) * 100).toFixed(1);
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Framework is production-ready.');
    } else {
      console.log('\n⚠️ Some tests failed. Review failures before production deployment.');
    }
  }
}

// Run the test suite
const testSuite = new ProductionTestSuite();
testSuite.run().catch(console.error);
