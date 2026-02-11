#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

const child = spawn('npm', ['run', 'db:push'], {
  cwd: '/home/mr-abu-lukas/Desktop/Leads Automation tool/leadnexconnect-v2-complete/leadnexconnect-v2/packages/database',
  stdio: ['pipe', 'inherit', 'inherit']
});

// Auto-respond to prompts after delays
setTimeout(() => {
  console.log('Sending: ENTER (create user_id column)');
  child.stdin.write('\n');
}, 2000);

setTimeout(() => {
  console.log('Sending: ENTER (create user_id for automated_campaign_runs)');
  child.stdin.write('\n');
}, 4000);

setTimeout(() => {
  console.log('Sending: DOWN ARROW + ENTER (select Yes)');
  child.stdin.write('\x1B[B\n'); // Down arrow + Enter
}, 6000);

child.on('exit', (code) => {
  console.log(`Process exited with code ${code}`);
  process.exit(code);
});
