#!/usr/bin/env node

import { Database } from './database.js';

async function testDatabase() {
  console.log('Testing database functionality...');
  
  const db = new Database();
  
  try {
    // Initialize database
    await db.initialize();
    console.log('✅ Database initialized');

    // Test initialization
    const result = await db.initializeContext({
      project_path: process.cwd(),
      goal: 'Test project goal',
      scope: 'Testing the framework',
      branch: 'test-branch',
      project_type: 'feature'
    });
    console.log('✅ Context initialized:', result.project_id);

    // Test getting context
    const context = await db.getCurrentContext(process.cwd(), 'test-branch');
    console.log('✅ Context retrieved:', context ? 'Found' : 'Not found');

    // Test querying
    const summary = await db.queryContext(process.cwd(), 'summary');
    console.log('✅ Query test:', summary.substring(0, 50) + '...');

    // Test clearing
    const clearResult = await db.clearContext(process.cwd(), 'current_project');
    console.log('✅ Clear test:', clearResult.message);

    console.log('\\n🎉 All tests passed! MCP server is ready.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await db.close();
  }
}

testDatabase();
