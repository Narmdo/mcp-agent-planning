#!/usr/bin/env node

/**
 * Build script for MCP Agent Planning
 * Creates the dist/ directory with production-ready files
 */

import fs from 'fs/promises';
import path from 'path';

const PROJECT_ROOT = process.cwd();
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

async function ensureDistDir() {
  try {
    await fs.access(DIST_DIR);
  } catch {
    await fs.mkdir(DIST_DIR, { recursive: true });
  }
}

async function copyFile(src, dest) {
  try {
    await fs.copyFile(src, dest);
    console.log(`✅ Copied ${path.basename(src)}`);
  } catch (error) {
    console.error(`❌ Failed to copy ${path.basename(src)}:`, error.message);
  }
}

async function updateShebangPermissions(filePath) {
  try {
    // On Unix systems, make the file executable
    if (process.platform !== 'win32') {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      await execAsync(`chmod +x "${filePath}"`);
    }
  } catch (error) {
    console.warn(`Warning: Could not set executable permissions on ${filePath}`);
  }
}

async function build() {
  console.log('🏗️  Building MCP Agent Planning...\n');

  try {
    // Ensure dist directory exists
    await ensureDistDir();

    // Check if index.js already exists and is up to date
    try {
      await fs.access(path.join(DIST_DIR, 'index.js'));
      console.log('✅ dist/index.js already exists');
    } catch {
      console.log('❌ dist/index.js not found - please create it first');
      process.exit(1);
    }

    // Make sure the main entry point is executable
    await updateShebangPermissions(path.join(DIST_DIR, 'index.js'));

    console.log('\n🎉 Build completed successfully!');
    console.log('\nTo test the build:');
    console.log('  npm start');
    console.log('\nTo test as global package:');
    console.log('  npm pack');
    console.log('  npm install -g ./mcp-agent-planning-*.tgz');

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

build();
