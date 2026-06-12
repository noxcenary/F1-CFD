import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

const server = spawn('npx', ['vite', '--port', '5199'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
});

server.stdout.on('data', () => {});
server.stderr.on('data', () => {});

await sleep(8000);

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

const logs = [];
page.on('console', msg => {
  const text = msg.text();
  if (text.includes('[PENETRATION') || text.includes('seedIndex:') ||
      text.includes('seedLocal:') || text.includes('seedWorld:') ||
      text.includes('firstPenetration') || text.includes('penetrationStep:') ||
      text.includes('stepStartOrEnd:') || text.includes('distanceTraveled') ||
      text.includes('ROOT CAUSE') || text.includes('No penetration')) {
    logs.push(`[${msg.type()}] ${text}`);
  }
});

page.on('pageerror', err => {
  logs.push(`[PAGE ERROR] ${err.message}`);
});

await page.goto('http://localhost:5199', { waitUntil: 'networkidle', timeout: 30000 });
await sleep(20000);

console.log('\n=== DIAGNOSTIC RESULTS ===\n');
if (logs.length === 0) {
  console.log('No diagnostic output captured. Checking for other console output...');
}
for (const l of logs) console.log(l);
console.log('\n==========================\n');

await browser.close();
server.kill();
process.exit(0);
