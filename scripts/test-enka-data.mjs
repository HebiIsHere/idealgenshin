// Test Enka API response for a known UID
fetch('https://enka.network/api/uid/800417142')
  .then(r => r.json())
  .then(data => {
    console.log('=== Top-level keys ===');
    console.log(Object.keys(data).join(', '));
    
    const char = data.avatarInfoList?.[0];
    if (char) {
      console.log('\n=== Character keys ===');
      console.log(Object.keys(char).join(', '));
      console.log('avatarId:', char.avatarId);
      console.log('Level:', char.propMap?.['4001']?.val);
      
      const art = char.equipList?.find(e => e.flat?.itemType === 'ITEM_RELIQUARY');
      if (art) {
        console.log('\n=== Artifact flat keys ===');
        console.log(Object.keys(art.flat).join(', '));
        console.log('setNameTextMapHash:', art.flat.setNameTextMapHash);
        console.log('icon:', art.flat.icon);
        console.log('nameTextMapHash:', art.flat.nameTextMapHash);
        console.log('rankLevel:', art.flat.rankLevel);
        console.log('reliquaryMainstat:', art.flat.reliquaryMainstat?.mainPropId, '=', art.flat.reliquaryMainstat?.statValue);
        console.log('reliquarySubstats:', art.flat.reliquarySubstats?.length || 0);
        if (art.flat.reliquarySubstats) {
          art.flat.reliquarySubstats.slice(0, 4).forEach(s => {
            console.log('  sub:', s.appendPropId, '=', s.statValue);
          });
        }
      }
    }
    
    // Show all artifacts' set info
    console.log('\n=== All artifact sets ===');
    for (const c of data.avatarInfoList || []) {
      for (const e of c.equipList || []) {
        if (e.flat?.itemType === 'ITEM_RELIQUARY') {
          console.log('  setNameTextMapHash:', e.flat.setNameTextMapHash, 'icon:', e.flat.icon, 'rank:', e.flat.rankLevel);
        }
      }
    }
  })
  .catch(e => console.error('Error:', e.message));
