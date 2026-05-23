// Load the full module dependency tree from dev server and measure time
const BASE = 'http://localhost:5174';

async function loadModule(url, visited = new Set()) {
  if (visited.has(url)) return 0;
  visited.add(url);
  
  const t0 = Date.now();
  const r = await fetch(BASE + url);
  if (!r.ok) {
    console.log('FAILED:', url, r.status);
    return Date.now() - t0;
  }
  const text = await r.text();
  const time = Date.now() - t0;
  
  // Find all imports
  const imports = [...text.matchAll(/from "(\/[^"]+)"/g)].map(m => m[1]);
  // Also match dynamic imports
  const dynImports = [...text.matchAll(/import\("(\/[^"]+)"\)/g)].map(m => m[1]);
  
  let totalChildTime = 0;
  for (const imp of [...imports, ...dynImports]) {
    if (imp.startsWith('/src/') || imp.startsWith('/node_modules/.vite/deps/')) {
      totalChildTime += await loadModule(imp, visited);
    }
  }
  
  if (time > 500 || url.includes('all.json')) {
    console.log(`${time}ms ${url}`);
  }
  return time + totalChildTime;
}

console.log('Loading module tree...');
const t0 = Date.now();
const visited = new Set();
await loadModule('/src/main.tsx', visited);

// Don't load CSS
console.log(`\nTotal modules: ${visited.size}`);
console.log(`Total sequential time: ${Date.now() - t0}ms`);
console.log('(In real browser, requests are parallelized)');
