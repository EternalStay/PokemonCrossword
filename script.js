import { generateLayout } from 'https://cdn.skypack.dev/crossword-layout-generator';



/* Variables par défaut pour la création de la grille */
let currentLang = 'fr';
let currentDate = new Date();
let seed = getDailySeed();
genererGrilleDuJour();



/**
 * Gestion des grilles archivées
 */

const archiveBtn = document.getElementById('archives');
const archiveDate = document.getElementById('archives-date');
const archiveDateInput = document.getElementById('archive-date');
const archivePrevious = document.getElementById('archive-previous');
const archiveNext = document.getElementById('archive-next');
const title = document.getElementById('title');

// Click sur le bouton pour accéder aux grilles archivées
archiveBtn.addEventListener('click', () => {
  const isActive = archiveDate.classList.toggle('d-none');
  title.classList.toggle('d-none');

  if (!isActive) currentDate.setDate(currentDate.getDate() - 1);
  else currentDate = new Date();

  updateDateInput();
  genererGrilleDuJour();
});

// Click sur le jour d'avant
archivePrevious.addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() - 1);

  updateDateInput();
  genererGrilleDuJour();
});

// Click sur le jour d'après
archiveNext.addEventListener('click', () => {
  const today = new Date();
  today.setHours(0,0,0,0);

  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + 1);

  if (nextDate.toDateString() === today.toDateString()) {
    return;
  }

  currentDate = nextDate;
  updateDateInput();
  genererGrilleDuJour();
});

function updateDateInput() {
  const yyyy = currentDate.getFullYear();
  const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
  const dd = String(currentDate.getDate()).padStart(2, '0');
  archiveDateInput.innerHTML = `${dd}/${mm}/${yyyy}`;
  updateButtons();
}

function updateButtons() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  yesterday.setHours(0,0,0,0);
  const isYesterday = currentDate.toDateString() === yesterday.toDateString();
  
  if (isYesterday) archiveNext.classList.add('disabled');
  else archiveNext.classList.remove('disabled');
}



/**
 * Gestion des paramètres 
 */
const settingsBtn = document.getElementById('settings');
const settingsModal = document.getElementById('settings-modal');
const settingsModalClose = document.querySelector('.close-btn');
const settingsModalBackdrop = document.querySelector('.modal-backdrop');
const settingsLanguage = document.getElementById('language-select');

settingsBtn.addEventListener('click', () => { settingsModal.classList.remove('hidden'); });
settingsModalClose.addEventListener('click', () => { settingsModal.classList.add('hidden'); });
settingsModalBackdrop.addEventListener('click', () => { settingsModal.classList.add('hidden'); });
settingsLanguage.addEventListener('change', (e) => {
  currentLang = e.target.value;
  genererGrilleDuJour();
});







/* Fonction pour récupérer la Seed quotidienne */
function getDailySeed() {
  const dateStr = currentDate.toISOString().slice(0, 10);
  console.log(dateStr);
  
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/* Valeur de seed random */
function seededRandom(seed) {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/* Récupère un élément au hasard du tableau */
function getRandomElement(arr, randFn) {
  return arr[Math.floor(randFn() * arr.length)];
}

/* Retire les caractères spéciaux d'un mot */
function nettoyerMot(mot) {
  return mot.toUpperCase().replace(/[\ :-\s]/g, '');
}

/* Retire les caractères accentués d'un mot */
function sansAccent(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, '');
}

function partageLettre(mot, selection) {
  return selection.some(sel =>
    sel.answer.split('').some(l => mot.includes(l))
  );
}

/* Génération de la grille du jour */
function genererGrilleDuJour() {
  fetch('datas/pokemon_data.json')
  .then(res => res.json())
  .then(data => {
    seed = getDailySeed();
    const rand = seededRandom(seed);
    
    const filteredData = data.filter(entry =>
      entry.type === 'pokemon' &&
      entry.mot?.[currentLang] &&
      Array.isArray(entry.descriptions?.[currentLang]) &&
      entry.descriptions[currentLang].length > 0
    );
    
    if (filteredData.length === 0) {
      console.log("Aucun mot Pokémon disponible pour cette langue.");
      return;
    }
    
    let layout = null;
    let selection = [];
    let tentative = 0;
    
    while ((!layout || !layout.table || layout.table.length === 0) && tentative < 5) {
      const used = new Set();
      selection = [];
      
      let firstEntry = null;
      while (!firstEntry) {
        const entry = filteredData[Math.floor(rand() * filteredData.length)];
        const mot = nettoyerMot(entry.mot[currentLang]);
        const desc = entry.descriptions[currentLang];
        if (mot && desc?.length) {
          firstEntry = {
            answer: mot,
            clue: getRandomElement(desc, rand)
          };
          selection.push(firstEntry);
          used.add(mot);
        }
      }
      
      while (selection.length < 8) {
        const candidats = filteredData
        .map(entry => {
          const mot = nettoyerMot(entry.mot[currentLang]);
          const desc = entry.descriptions[currentLang];
          return { mot, desc };
        })
        .filter(entry =>
          entry.mot &&
          entry.desc?.length &&
          !used.has(entry.mot) &&
          partageLettre(entry.mot, selection)
        );
        
        if (candidats.length === 0) break;
        
        const choix = candidats[Math.floor(rand() * candidats.length)];
        selection.push({
          answer: choix.mot,
          clue: getRandomElement(choix.desc, rand)
        });
        used.add(choix.mot);
      }
      
      try {
        layout = generateLayout(selection);
      } catch (e) {
        console.warn(`Tentative ${tentative + 1} échouée : ${e.message}`);
      }
      
      tentative++;
    }
    
    if (!layout || !layout.table || layout.table.length === 0) {
      console.log("Impossible de générer une grille avec les mots choisis");
      return;
    }
    
    afficherGrille(layout, selection);
  });
}

function afficherGrille(layout, mots) {
  const grilleDiv = document.getElementById('grille');
  const indicesDiv = document.getElementById('indices');
  const messageDiv = document.getElementById('message');
  messageDiv.innerHTML = '';
  grilleDiv.innerHTML = '';
  
  const lettresAJouer = new Set();
  const numeros = {};
  const orientationMap = new Map();
  
  layout.result.forEach((word, i) => {
    const r = word.starty - 1;
    const c = word.startx - 1;
    const dir = word.orientation;
    
    if (r >= 0 && c >= 0) {
      const key = `${r}-${c}`;
      if (!numeros[key]) {
        numeros[key] = [];
      }
      numeros[key].push(i + 1);
      
      for (let j = 0; j < word.answer.length; j++) {
        const rr = dir === 'across' ? r : r + j;
        const cc = dir === 'across' ? c + j : c;
        const pos = `${rr}-${cc}`;
        lettresAJouer.add(pos);
        orientationMap.set(pos, dir);
      }
    }
  });
  
  layout.table.forEach((row, rowIndex) => {
    const rowDiv = document.createElement('div');
    rowDiv.classList.add('row');
    
    row.forEach((cell, colIndex) => {
      const cellDiv = document.createElement('div');
      cellDiv.classList.add('cell');
      const posKey = `${rowIndex}-${colIndex}`;
      
      if (numeros[posKey]) {
        (numeros[posKey]).forEach((numero) => {
          const numberTag = document.createElement('div');
          numberTag.classList.add('cell-number');
          if (numeros[posKey].length > 1) {
            numberTag.classList.add(mots[numero - 1]['orientation'] == 'across' ? 'across' : 'down');
          }
          numberTag.textContent = numero;
          cellDiv.appendChild(numberTag);
        })
      }
      
      if (cell === '-') {
        cellDiv.classList.add('vide');
      } else {
        const input = document.createElement('input');
        input.maxLength = 1;
        input.classList.add('letter');
        input.dataset.row = rowIndex;
        input.dataset.col = colIndex;
        cellDiv.appendChild(input);
        cellDiv.classList.add('filled');
      }
      
      rowDiv.appendChild(cellDiv);
    });
    
    grilleDiv.appendChild(rowDiv);
  });
  
  indicesDiv.innerHTML = '<h2>Indices</h2><ul>' +
  mots.map((m, i) => `<li><strong>${i + 1}.</strong> ${m.clue}</li>`).join('') +
  '</ul>';
  
  let derniereCaseActive = null;
  let derniereDirectionActive = null;
  
  document.querySelectorAll('input.letter').forEach(input => {
    input.addEventListener('click', (e) => {
      derniereCaseActive = null;
      derniereDirectionActive = null;
    });
    
    input.addEventListener('keydown', (e) => {
      const current = e.target;
      const row = parseInt(current.dataset.row);
      const col = parseInt(current.dataset.col);
      
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (current.value) {
          current.value = '';
        } else {
          let prevInput = null;
          if (derniereDirectionActive === 'down') {
            prevInput = document.querySelector(`input[data-row="${row - 1}"][data-col="${col}"]`);
          } else {
            prevInput = document.querySelector(`input[data-row="${row}"][data-col="${col - 1}"]`);
          }
          if (prevInput) {
            prevInput.focus();
            prevInput.select();
          }
        }
        e.preventDefault();
      }
    });
    
    
    input.addEventListener('input', (e) => {
      const val = e.target.value.toUpperCase();
      e.target.value = val;
      
      const grilleData = [...document.querySelectorAll('input.letter')]
      .filter(input => input.value)
      .map(input => ({
        row: input.dataset.row,
        col: input.dataset.col,
        value: input.value
      }));
      localStorage.setItem(`grille_${currentLang}_${seed}`, JSON.stringify(grilleData));
      
      const current = e.target;
      const row = parseInt(current.dataset.row);
      const col = parseInt(current.dataset.col);
      const key = `${row}-${col}`;
      const direction = orientationMap.get(key) || 'across';
      
      let nextInput = null;
      
      if (val.length === 1) {
        if (derniereCaseActive == null) {
          if (direction == 'down') {
            nextInput = document.querySelector(`input[data-row="${row + 1}"][data-col="${col}"]`);
          } else {
            nextInput = document.querySelector(`input[data-row="${row}"][data-col="${col + 1}"]`);
          }
          derniereDirectionActive = direction;
        } else {
          if (derniereDirectionActive == 'down') {
            nextInput = document.querySelector(`input[data-row="${row + 1}"][data-col="${col}"]`);
          } else {
            nextInput = document.querySelector(`input[data-row="${row}"][data-col="${col + 1}"]`);
          }
        }
        
        if (nextInput) nextInput.focus();
        nextInput.select();
        
        derniereCaseActive = current;
      }
    });
  });
  
  document.getElementById('verifier').onclick = () => {
    let toutCorrect = true;
    const inputs = document.querySelectorAll('input.letter');
    
    inputs.forEach(input => {
      const row = parseInt(input.dataset.row);
      const col = parseInt(input.dataset.col);
      const expected = layout.table[row][col];
      const userInput = input.value.toUpperCase();
      
      const cell = input.closest('.cell');
      
      if (sansAccent(userInput) === sansAccent(expected)) {
        cell.classList.remove('incorrect');
        cell.classList.add('correct');
      } else {
        cell.classList.remove('correct');
        cell.classList.add('incorrect');
        toutCorrect = false;
      }
    });
    
    if (toutCorrect) {
      messageDiv.innerHTML = '<p style="color: green; font-weight: bold;">🎉 Bravo, tout est correct !</p>';
    } else {
      messageDiv.innerHTML = '<p style="color: red;">Il reste des erreurs. Corrige-les et réessaie !</p>';
      setTimeout(() => {
        document.querySelectorAll('.cell').forEach(cell => {
          cell.classList.remove('correct');
          cell.classList.remove('incorrect');
        });
        messageDiv.innerHTML = '';
      }, 5000);
    }
  };
  
  document.getElementById('reset-grille').addEventListener('click', () => {
    document.querySelectorAll('input.letter').forEach(input => {
      input.value = '';
      const cell = input.closest('.cell');
      cell.classList.remove('correct', 'incorrect');
    });
    localStorage.removeItem('grille');
  });
  
  const sauvegarde = JSON.parse(localStorage.getItem(`grille_${currentLang}_${seed}`));
  if (sauvegarde) {
    sauvegarde.forEach(item => {
      const input = document.querySelector(`input[data-row="${item.row}"][data-col="${item.col}"]`);
      if (input) input.value = item.value;
    });
  }
}

