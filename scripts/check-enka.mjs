// Check Enka data for setNameTextMapHash and other ID fields
fetch('https://enka.network/api/uid/800417142')
  .then(r => r.json())
  .then(data => {
    const char = data.avatarInfoList?.[0];
    if (!char) { console.log('No characters'); return; }
    const art = char.equipList?.find(e => e.flat?.itemType === 'ITEM_RELIQUARY');
    if (!art) { console.log('No relics'); return; }
    console.log('Flat keys:', Object.keys(art.flat).join(', '));
    // Show all potential ID/hash fields
    Object.entries(art.flat).forEach(([k, v]) => {
      if (k.toLowerCase().includes('set') || k.toLowerCase().includes('hash')) {
        console.log('  ', k, '=', v);
      }
    });
  })
  .catch(e => console.error(e.message));
