#!/usr/bin/env node

/**
 * Quick Test Runner for AI Reasoning Framework
 * 
 * Basic validation of core functionality
 */

import { Database } from '../src/database.js';
import { promises as fs } from 'fs';
import { join } from 'path';

async function quickTest() {
  console.log('🧪 AI Reasoning Framework Quick Test');
  console.log('=====================================');
  
  const db = new Database();
  const testPath = join(process.cwd(), 'test-quick-' + Date.now());
  
  try {
    // Setup
    await fs.mkdir(testPath, { recursive: true });
    await db.initialize();
    
    console.log('✅ Database initialization');
    
    // Test project creation
    const result = await db.initializeContext({
      project_path: testPath,
      goal: 'Quick test project',
      scope: 'Testing basic functionality',
      project_type: 'feature',
      branch: 'test-branch'
    });
    
    console.log('✅ Project initialization');
    
    // Test context retrieval
    const context = await db.getCurrentContext(testPath, 'test-branch');
    if (context && context.goal === 'Quick test project') {
      console.log('✅ Context retrieval');
    } else {
      throw new Error('Context retrieval failed');
    }
    
    // Test task creation
    const database = await db.getProjectDatabase(testPath);
    const project = await db.getCurrentActiveProject(database);
    
    const task = await db.createTask(database, project.id, {
      title: 'Test task',
      description: 'Quick test task',
      priority: 'medium'
    });
    
    console.log('✅ Task creation');
    
    // Test decision logging
    const decision = await db.recordDecision(testPath, {
      decision_type: 'technical-choice',
      title: 'Quick test decision',
      description: 'Testing decision logging'
    });
    
    console.log('✅ Decision logging');
    
    // Cleanup
    await db.close();
    await fs.rm(testPath, { recursive: true, force: true });
    
    console.log('\n🎉 Quick test completed successfully!');
    console.log('Framework core functionality is working.');
    
  } catch (error) {
    console.log(`\n❌ Quick test failed: ${error.message}`);
    process.exit(1);
  }
}

quickTest();
