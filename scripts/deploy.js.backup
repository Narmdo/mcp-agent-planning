#!/usr/bin/env node

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE_DIR = join(__dirname, '..');  // Go up one level from scripts/
const DEPLOY_DIR = join(__dirname, '..', 'deployments', 'ai-reasoning-framework');

const FILES_TO_COPY = [
  'src/',
  'migrations/',
  'package.json',
  'SETUP.md',
  'README.md'
];

const FILES_TO_EXCLUDE = [
  'node_modules',
  '.git',
  '.planning',
  '*.db',
  '*.log'
  // migrations/ should be included - contains important docs
];

async function deployFramework() {
  console.log('🚀 Deploying AI Reasoning Framework...');
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Target: ${DEPLOY_DIR}`);
  
  try {
    // Clean deployment directory first (preserve node_modules)
    console.log('🧹 Cleaning deployment directory...');
    
    // Try to remove with retry for locked files, but preserve node_modules
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // Remove everything except node_modules
        const items = await fs.readdir(DEPLOY_DIR).catch(() => []);
        
        for (const item of items) {
          if (item !== 'node_modules') {
            const itemPath = join(DEPLOY_DIR, item);
            await fs.rm(itemPath, { recursive: true, force: true });
          }
        }
        
        console.log('✅ Deployment directory cleaned (preserved node_modules)');
        break;
      } catch (error) {
        if (error.code === 'EBUSY' || error.code === 'EPERM') {
          retryCount++;
          console.log(`⚠️  Files in use, retrying... (${retryCount}/${maxRetries})`);
          console.log('💡 Make sure to close your MCP client first!');
          
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          } else {
            console.error('❌ Could not clean deployment directory.');
            console.error('🛑 Please close your MCP client and try again.');
            process.exit(1);
          }
        } else {
          throw error;
        }
      }
    }
    
    // Ensure deployment directory exists
    await fs.mkdir(DEPLOY_DIR, { recursive: true });
    console.log('📁 Created clean deployment directory');

    // Copy files
    for (const item of FILES_TO_COPY) {
      const sourcePath = join(SOURCE_DIR, item);
      const targetPath = join(DEPLOY_DIR, item);
      
      try {
        const stat = await fs.lstat(sourcePath);
        
        if (stat.isDirectory()) {
          await copyDirectory(sourcePath, targetPath);
          console.log(`📂 Copied directory: ${item}`);
        } else {
          await fs.mkdir(dirname(targetPath), { recursive: true });
          await fs.copyFile(sourcePath, targetPath);
          console.log(`📄 Copied file: ${item}`);
        }
      } catch (error) {
        console.warn(`⚠️  Could not copy ${item}: ${error.message}`);
      }
    }

    // Install/update dependencies in deployment
    const nodeModulesPath = join(DEPLOY_DIR, 'node_modules');
    let nodeModulesExists = false;
    
    try {
      await fs.access(nodeModulesPath);
      nodeModulesExists = true;
    } catch (error) {
      nodeModulesExists = false;
    }
    
    if (!nodeModulesExists) {
      console.log('📦 Installing dependencies...');
    } else {
      console.log('📦 Updating dependencies...');
    }
    const { spawn } = await import('child_process');
    
    await new Promise((resolve, reject) => {
      const npmInstall = spawn('npm', ['install', '--production'], {
        cwd: DEPLOY_DIR,
        stdio: 'inherit',
        shell: true
      });
      
      npmInstall.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}`));
        }
      });
    });

    console.log('✅ Deployment complete!');
    console.log('');
    console.log('🔧 MCP Configuration:');
    console.log('Add this to your MCP client config:');
    console.log('');
    console.log(JSON.stringify({
      "ai-reasoning-framework": {
        "command": "node",
        "args": [join(DEPLOY_DIR, "src", "server.js").replace(/\\/g, "\\\\")]
      }
    }, null, 2));
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

async function copyDirectory(source, target) {
  await fs.mkdir(target, { recursive: true });
  
  const items = await fs.readdir(source);
  
  for (const item of items) {
    const sourcePath = join(source, item);
    const targetPath = join(target, item);
    
    // Skip excluded files
    if (shouldExclude(item)) {
      continue;
    }
    
    const stat = await fs.lstat(sourcePath);
    
    if (stat.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

function shouldExclude(filename) {
  return FILES_TO_EXCLUDE.some(pattern => {
    if (pattern.includes('*')) {
      // Simple wildcard matching
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(filename);
    }
    return filename === pattern;
  });
}

deployFramework();
