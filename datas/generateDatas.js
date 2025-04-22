const fetch = require('node-fetch');
const fs = require('fs');

const LANGUAGES = ['fr', 'en', 'de', 'es', 'it'];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erreur lors de la récupération de ${url}: ${response.statusText}`);
  }
  return response.json();
}

function extractMultilang(entries, key = 'flavor_text') {
  const result = {};
  LANGUAGES.forEach(lang => {
    const localized = entries
      .filter(entry => entry.language.name === lang)
      .map(entry => entry[key].replace(/\n|\f/g, ' ').trim());
    result[lang] = [...new Set(localized)];
  });
  return result;
}

function extractNames(entries) {
  const names = {};
  LANGUAGES.forEach(lang => {
    const nameEntry = entries.find(entry => entry.language.name === lang);
    names[lang] = nameEntry ? nameEntry.name.trim() : '';
  });
  return names;
}

async function getUrls(endpoint) {
  const list = await fetchData(`${endpoint}?limit=10000`);
  return list.results.map(entry => entry.url);
}

async function getPokemonData() {
  const urls = await getUrls('https://pokeapi.co/api/v2/pokemon-species');
  const data = [];

  for (const url of urls) {
    try {
      const species = await fetchData(url);
      const names = extractNames(species.names);
      const descriptions = extractMultilang(species.flavor_text_entries);
      data.push({
        type: 'pokemon',
        mot: names,
        descriptions
      });
      await delay(100);
    } catch (error) {
      console.error(`Erreur avec le Pokémon ${url}:`, error.message);
    }
  }

  return data;
}

async function getItemData() {
  const urls = await getUrls('https://pokeapi.co/api/v2/item');
  const data = [];

  for (const url of urls) {
    try {
      const item = await fetchData(url);
      const names = extractNames(item.names);
      const descriptions = extractMultilang(item.flavor_text_entries, 'text');
      data.push({
        type: 'item',
        mot: names,
        descriptions
      });
      await delay(100);
    } catch (error) {
      console.error(`Erreur avec l'objet ${url}:`, error.message);
    }
  }

  return data;
}

async function getMoveData() {
  const urls = await getUrls('https://pokeapi.co/api/v2/move');
  const data = [];

  for (const url of urls) {
    try {
      const move = await fetchData(url);
      if (!move.is_main_series) continue;
      const names = extractNames(move.names);
      const descriptions = extractMultilang(move.flavor_text_entries);
      data.push({
        type: 'move',
        mot: names,
        descriptions
      });
      await delay(100);
    } catch (error) {
      console.error(`Erreur avec l'attaque ${url}:`, error.message);
    }
  }

  return data;
}

async function getAbilityData() {
  const urls = await getUrls('https://pokeapi.co/api/v2/ability');
  const data = [];

  for (const url of urls) {
    try {
      const ability = await fetchData(url);
      if (!ability.is_main_series) continue;
      const names = extractNames(ability.names);
      const descriptions = extractMultilang(ability.flavor_text_entries);
      data.push({
        type: 'ability',
        mot: names,
        descriptions
      });
      await delay(100);
    } catch (error) {
      console.error(`Erreur avec le talent ${url}:`, error.message);
    }
  }

  return data;
}

async function generateJSON() {
  const pokemonData = await getPokemonData();
  /*
  const itemData = await getItemData();
  const moveData = await getMoveData();
  const abilityData = await getAbilityData();
  */

  const allData = [
    ...pokemonData, 
    /*
    ...itemData, 
    ...moveData, 
    ...abilityData
    */
  ];

  fs.writeFileSync('datas/pokemon_data.json', JSON.stringify(allData, null, 2), 'utf-8');
  console.log('Fichier pokemon_data.json généré avec succès !');
}

generateJSON();
