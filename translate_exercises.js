const fs = require('fs');

async function run() {
  const { translate } = await import('@vitalets/google-translate-api');
  
  const exercises = JSON.parse(fs.readFileSync('./excercise/exercises.json', 'utf8'));
  const uniqueNames = [...new Set(exercises.map(e => e.name))];
  const uniqueEquipments = [...new Set(exercises.map(e => e.equipments && e.equipments[0]).filter(Boolean))];
  
  console.log(`Found ${uniqueNames.length} unique names and ${uniqueEquipments.length} equipments.`);

  const langs = ['es', 'fr', 'de', 'it', 'pt', 'ru'];
  
  // Combine all strings to translate
  const allStrings = [...uniqueEquipments, ...uniqueNames];
  
  // Translate in chunks of 50 to avoid length limits, joining with " | "
  const chunkSize = 50;
  
  for (const lang of langs) {
    console.log(`Translating to ${lang}...`);
    
    let translatedMap = {};
    const file = `./i18n/translations/${lang}.json`;
    let data = {};
    if (fs.existsSync(file)) {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    data.exerciseNames = data.exerciseNames || {};
    data.equipment = data.equipment || {};

    let textsToTranslate = [];
    for (const str of allStrings) {
      if ((uniqueEquipments.includes(str) && data.equipment[str]) || 
          (uniqueNames.includes(str) && data.exerciseNames[str])) {
        // already translated
        continue;
      }
      textsToTranslate.push(str);
    }
    
    console.log(`Items to translate for ${lang}: ${textsToTranslate.length}`);
    
    for (let i = 0; i < textsToTranslate.length; i += chunkSize) {
      const chunk = textsToTranslate.slice(i, i + chunkSize);
      const joined = chunk.join(' ||| ');
      
      try {
        const res = await translate(joined, { to: lang });
        const translatedArray = res.text.split(/\|\|\|/i).map(s => s.trim());
        
        for (let j = 0; j < chunk.length; j++) {
          const original = chunk[j];
          const translation = translatedArray[j] || original;
          
          if (uniqueEquipments.includes(original)) {
            data.equipment[original] = translation;
          } else {
            data.exerciseNames[original] = translation;
          }
        }
        
        // Wait 1 second to avoid rate limit
        await new Promise(r => setTimeout(r, 1000));
        
        console.log(`Translated ${i + chunk.length} / ${textsToTranslate.length}`);
      } catch (err) {
        console.error(`Error translating chunk for ${lang}:`, err.message);
        // Save current progress before failing completely
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        break;
      }
    }
    
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`Saved ${lang}.json`);
  }
}

run().catch(console.error);
