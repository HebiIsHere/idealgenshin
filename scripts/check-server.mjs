async function check() {
  const html = await (await fetch('http://localhost:5173')).text();
  const mainMatch = html.match(/src="(\/src\/main\.tsx)"/);
  console.log('Entry:', mainMatch ? mainMatch[1] : 'NOT FOUND');
  
  const art = await (await fetch('http://localhost:5173/src/data/artifact_sets.ts')).text();
  console.log('Has enka_set_id_map import:', art.includes('enka_set_id_map'));
  console.log('Has old 140xx IDs:', art.includes("14001"));
  
  const res = await fetch('http://localhost:5173/src/data/artifact_sets.ts', {method:'HEAD'});
  console.log('Cache-Control:', res.headers.get('cache-control'));
  console.log('ETag:', res.headers.get('etag'));
  console.log('Has old char map:', art.includes("10000089") && art.includes("希格雯"));
  console.log('Has new import:', art.includes('character_id_name_map'));
}
check().catch(e => console.error(e.message));
