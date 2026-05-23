// Count MUI modules in the dependency tree
const BASE = 'http://localhost:5176';

async function collectModules(url, visited = new Set()) {
  if (visited.has(url)) return;
  visited.add(url);
  
  const r = await fetch(BASE + url);
  if (!r.ok) return;
  const text = await r.text();
  
  const imports = [...text.matchAll(/from "(\/[^"]+)"/g)].map(m => m[1]);
  const dynImports = [...text.matchAll(/import\("(\/[^"]+)"\)/g)].map(m => m[1]);
  
  for (const imp of [...imports, ...dynImports]) {
    if (imp.startsWith('/src/') || imp.startsWith('/node_modules/.vite/deps/') || imp.startsWith('/@')) {
      await collectModules(imp, visited);
    }
  }
}

const visited = new Set();
await collectModules('/src/main.tsx', visited);

const muiModules = [...visited].filter(u => u.includes('@mui'));
const srcModules = [...visited].filter(u => u.includes('/src/'));
const depsModules = [...visited].filter(u => u.includes('.vite/deps'));
const otherModules = [...visited].filter(u => 
  !u.includes('@mui') && !u.includes('/src/') && !u.includes('.vite/deps')
);

console.log('Total modules:', visited.size);
console.log('  MUI modules:', muiModules.length);
console.log('  src modules:', srcModules.length);
console.log('  deps modules:', depsModules.length);
console.log('  other:', otherModules.length);

// Check for largest MUI modules
if (muiModules.length > 0) {
  console.log('\nSample MUI modules:');
  muiModules.slice(0, 10).forEach(m => console.log('  ', m));
}
