// Test dev server module loading chain
async function test() {
  const BASE = 'http://localhost:5174';
  
  const r = await fetch(BASE + '/src/main.tsx');
  const text = await r.text();
  const imports = [...text.matchAll(/from "(\.[^"]+)"/g)].map(m => m[1]);
  console.log('main.tsx imports:', imports.length);
  imports.forEach(i => console.log('  ', i));
  
  // Load App.tsx - the heavy component
  const t = Date.now();
  const ar = await fetch(BASE + '/src/App.tsx');
  const atext = await ar.text();
  console.log('\nApp.tsx loaded:', Date.now()-t, 'ms,', atext.length, 'chars');
  
  const aimports = [...atext.matchAll(/from "(\.[^"]+)"/g)].map(m => m[1]);
  console.log('App.tsx imports:', aimports.length);
  aimports.forEach(i => console.log('  ', i));
  
  // Check the components/optimizer directory - is it using old glob?
  const storeFiles = aimports.filter(i => i.includes('store') || i.includes('components'));
  console.log('\nStore/component imports:', storeFiles.length);
}
test().catch(e => console.error(e.message));
