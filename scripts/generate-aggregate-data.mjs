#!/usr/bin/env node
// scripts/generate-aggregate-data.mjs
// Generates single aggregate JSON files for all characters and weapons.
// Run after import-genshin-data.mjs to speed up dev mode loading.

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'src', 'data');

function aggregate(dir, outputFile) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== '_all.json' && f !== 'refinements.json');
  const items = [];
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      items.push(data);
    } catch(e) {
      console.error(`  Error reading ${f}: ${e.message}`);
    }
  }
  fs.writeFileSync(path.join(dir, outputFile), JSON.stringify(items));
  console.log(`  ${outputFile}: ${items.length} items (${(fs.statSync(path.join(dir, outputFile)).size/1024).toFixed(0)} KB)`);
}

console.log('=== Generating aggregate data files ===');
aggregate(path.join(DATA_DIR, 'characters'), '_all.json');
aggregate(path.join(DATA_DIR, 'weapons'), '_all.json');
console.log('Done.');
