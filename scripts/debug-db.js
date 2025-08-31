#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { join } from 'path';

async function debugDatabase() {
  console.log('🔍 AI Reasoning Framework - Database Debug Tool');
  console.log('================================================');
  
  const dbPath = join(process.cwd(), '.planning', 'database.db');
  console.log('📁 Database path:', dbPath);
  
  const db = new sqlite3.Database(dbPath);
  db.all = promisify(db.all.bind(db));
  db.get = promisify(db.get.bind(db));
  
  try {
    // Check if database exists and has tables
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    console.log('\n📊 Database Tables:');
    if (tables.length === 0) {
      console.log('❌ No tables found - database may not be initialized');
      return;
    }
    
    tables.forEach(table => console.log(`  ✅ ${table.name}`));
    
    // Check migrations
    if (tables.find(t => t.name === 'migrations')) {
      const migrations = await db.all('SELECT * FROM migrations ORDER BY version');
      console.log('\n🔄 Applied Migrations:');
      migrations.forEach(migration => {
        console.log(`  ✅ v${migration.version}: ${migration.name} (${migration.applied_at})`);
      });
    }
    
    // Check contexts (projects table in current schema)
    if (tables.find(t => t.name === 'projects')) {
      const contexts = await db.all('SELECT * FROM projects ORDER BY created_at DESC LIMIT 5');
      console.log('\n📋 Recent Projects/Contexts:');
      if (contexts.length === 0) {
        console.log('  📝 No projects found');
      } else {
        contexts.forEach(context => {
          console.log(`  🎯 ID: ${context.id} | Branch: ${context.branch} | Goal: ${context.goal}`);
          console.log(`     📅 Created: ${context.created_at} | Status: ${context.status}`);
        });
      }
    }
    
    // Check tasks
    if (tables.find(t => t.name === 'tasks')) {
      const taskCount = await db.get('SELECT COUNT(*) as count FROM tasks');
      const recentTasks = await db.all('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 5');
      console.log(`\n✅ Tasks: ${taskCount.count} total`);
      if (recentTasks.length > 0) {
        console.log('   Recent tasks:');
        recentTasks.forEach(task => {
          console.log(`     📝 ${task.title} (${task.status}) - ${task.priority} priority`);
        });
      }
    }
    
    // Check decisions
    if (tables.find(t => t.name === 'decisions')) {
      const decisionCount = await db.get('SELECT COUNT(*) as count FROM decisions');
      console.log(`\n🎯 Decisions: ${decisionCount.count} total`);
    }
    
    // Check blockers
    if (tables.find(t => t.name === 'blockers')) {
      const blockerCount = await db.get('SELECT COUNT(*) as count FROM blockers WHERE status != "resolved"');
      console.log(`\n🚫 Active Blockers: ${blockerCount.count}`);
    }
    
    // Check mapped files
    if (tables.find(t => t.name === 'file_mappings')) {
      const fileCount = await db.get('SELECT COUNT(*) as count FROM file_mappings');
      console.log(`\n📁 Mapped Files: ${fileCount.count} total`);
    }
    
    console.log('\n✨ Database debug complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    db.close();
  }
}

debugDatabase().catch(console.error);
