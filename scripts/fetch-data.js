import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DATA_DIR = path.join(__dirname, '../public/data');
const SETS_DETAILS_DIR = path.join(PUBLIC_DATA_DIR, 'sets');

// Ensure directories exist
if (!fs.existsSync(PUBLIC_DATA_DIR)) {
  fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
}
if (!fs.existsSync(SETS_DETAILS_DIR)) {
  fs.mkdirSync(SETS_DETAILS_DIR, { recursive: true });
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function fetchData(url) {
  console.log(`Fetching from: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json();
}

async function main() {
  try {
    console.log('=== Starting Yu-Gi-Oh! Missing Cards Data Fetch ===');
    
    // 1. Fetch TCG Sets list
    const setsList = await fetchData('https://db.ygoprodeck.com/api/v7/cardsets.php');
    console.log(`Loaded ${setsList.length} sets from TCG database.`);

    // 2. Fetch Master Duel legal cards
    const mdData = await fetchData('https://db.ygoprodeck.com/api/v7/cardinfo.php?format=master+duel');
    const mdCardIds = new Set(mdData.data.map(card => card.id));
    console.log(`Loaded ${mdCardIds.size} cards currently in Master Duel.`);

    // 3. Fetch all cards in the entire database
    const allData = await fetchData('https://db.ygoprodeck.com/api/v7/cardinfo.php');
    const allCards = allData.data;
    console.log(`Loaded ${allCards.length} cards from total database.`);

    // 4. Group all cards by set and map card details
    console.log('Processing and mapping card sets...');
    const cardsBySet = {};
    const globalMissingCards = [];

    for (const card of allCards) {
      // Determine if missing from Master Duel
      const isMissing = !mdCardIds.has(card.id);
      
      // Store basic card info for chunking
      const cardInfo = {
        id: card.id,
        name: card.name,
        type: card.type,
        desc: card.desc || '',
        atk: card.atk,
        def: card.def,
        level: card.level,
        scale: card.scale,
        linkval: card.linkval,
        race: card.race || '',
        attribute: card.attribute || '',
        archetype: card.archetype || '',
        is_missing: isMissing
      };

      if (isMissing) {
        globalMissingCards.push(cardInfo);
      }

      // Associate with TCG sets
      if (card.card_sets && card.card_sets.length > 0) {
        for (const setItem of card.card_sets) {
          const setName = setItem.set_name;
          if (!cardsBySet[setName]) {
            cardsBySet[setName] = [];
          }
          // Avoid duplicate cards in same set (some sets list same card multiple times for different rarities)
          const exists = cardsBySet[setName].some(c => c.id === card.id);
          if (!exists) {
            cardsBySet[setName].push({
              ...cardInfo,
              set_code: setItem.set_code,
              set_rarity: setItem.set_rarity
            });
          }
        }
      }
    }

    console.log(`Total missing cards identified globally: ${globalMissingCards.length}`);

    // 5. Compile sets metadata and write individual set files
    const setsMetadata = [];

    for (const set of setsList) {
      const setName = set.set_name;
      const setCode = set.set_code;
      const tcgDate = set.tcg_date || 'Unknown';
      const numCardsInSet = set.num_of_cards || 0;

      const setCards = cardsBySet[setName] || [];
      const missingCardsInSet = setCards.filter(c => c.is_missing);
      const missingCount = missingCardsInSet.length;
      
      // Calculate missing percentage
      const missingPercentage = numCardsInSet > 0 
        ? Math.round((missingCount / numCardsInSet) * 100 * 100) / 100 
        : 0;

      // Create slug for file path
      const slug = slugify(setName);

      // Only save sets that actually have cards in the database
      if (setCards.length > 0) {
        setsMetadata.push({
          name: setName,
          code: setCode,
          slug: slug,
          tcg_date: tcgDate,
          total_cards: numCardsInSet,
          missing_count: missingCount,
          missing_percentage: missingPercentage
        });

        // Write individual set file
        const setDetailsPath = path.join(SETS_DETAILS_DIR, `${slug}.json`);
        fs.writeFileSync(
          setDetailsPath,
          JSON.stringify({
            name: setName,
            code: setCode,
            slug: slug,
            tcg_date: tcgDate,
            total_cards: numCardsInSet,
            missing_count: missingCount,
            cards: setCards
          }, null, 2)
        );
      }
    }

    // Sort sets by release date descending (newest first)
    setsMetadata.sort((a, b) => {
      if (a.tcg_date === 'Unknown') return 1;
      if (b.tcg_date === 'Unknown') return -1;
      return new Date(b.tcg_date) - new Date(a.tcg_date);
    });

    // Write main sets metadata file
    const setsMetadataPath = path.join(PUBLIC_DATA_DIR, 'sets.json');
    fs.writeFileSync(setsMetadataPath, JSON.stringify(setsMetadata, null, 2));

    // Write global missing cards file (for global search, simplified to keep it small)
    const globalMissingCardsPath = path.join(PUBLIC_DATA_DIR, 'missing_cards.json');
    fs.writeFileSync(globalMissingCardsPath, JSON.stringify(globalMissingCards.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      atk: c.atk,
      def: c.def,
      level: c.level,
      race: c.race,
      attribute: c.attribute,
      archetype: c.archetype
    })), null, 2));

    console.log('=== Data Sync Complete! ===');
    console.log(`Successfully generated sets summary and ${setsMetadata.length} set files.`);
  } catch (error) {
    console.error('Error during data fetch and compilation:', error);
    process.exit(1);
  }
}

main();
