import { readdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const PACKAGES_DIR = join(__dirname, '../../packages');
const OUTPUT_FILE = join(__dirname, '../../packages/mcp-server-manifest.json');

const entries: Record<string, string> = {};

for (const name of readdirSync(PACKAGES_DIR)) {
  const buildPath = join(PACKAGES_DIR, name, 'build', 'index.js');
  if (existsSync(buildPath)) {
    entries[name] = `./../../packages/${name}/build/index.js`;
  }
}

writeFileSync(OUTPUT_FILE, JSON.stringify(entries, null, 2));
console.log('✅ MCP manifest generated at', OUTPUT_FILE);
