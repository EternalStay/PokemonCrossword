import { generateLayout } from 'https://cdn.skypack.dev/crossword-layout-generator';

let lang = 'fr';

genererGrilleDuJour();

function getDailySeed() {
  const dateInput = document.getElementById('date');
  const dateStr = dateInput ? dateInput.value : new Date().toISOString().slice(0, 10);
  
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function seededRandom(seed) {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function getRandomElement(arr, randFn) {
  return arr[Math.floor(randFn() * arr.length)];
}

function nettoyerMot(mot) {
  return mot.toUpperCase().replace(/[\ :-\s]/g, '');
}

function sansAccent(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, '');
}

function partageLettre(mot, selection) {
  return selection.some(sel =>
    sel.answer.split('').some(l => mot.includes(l))
  );
}

function genererGrilleDuJour() {
  fetch('datas/pokemon_data.json')
  .then(res => res.json())
  .then(data => {
    const seed = getDailySeed();
    const rand = seededRandom(seed);
    
    console.log(seed, rand);
    
    const filteredData = data.filter(entry =>
      entry.type === 'pokemon' &&
      entry.mot?.[lang] &&
      Array.isArray(entry.descriptions?.[lang]) &&
      entry.descriptions[lang].length > 0
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
        const mot = nettoyerMot(entry.mot[lang]);
        const desc = entry.descriptions[lang];
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
          const mot = nettoyerMot(entry.mot[lang]);
          const desc = entry.descriptions[lang];
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
      const key = `${row}-${col}`;
      const direction = orientationMap.get(key) || 'across';
      
      if (e.key === 'Backspace' || e.key === 'Delete') {
        current.value = '';
        
        let prevInput = null;
        if (derniereDirectionActive === 'down') {
          prevInput = document.querySelector(`input[data-row="${row - 1}"][data-col="${col}"]`);
        } else {
          prevInput = document.querySelector(`input[data-row="${row}"][data-col="${col - 1}"]`);
        }
        if (prevInput) prevInput.focus();
        
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
      localStorage.setItem(`grille_${lang}_${seed}`, JSON.stringify(grilleData));
      
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
  
  const sauvegarde = JSON.parse(localStorage.getItem(`grille_${lang}_${seed}`));
  if (sauvegarde) {
    sauvegarde.forEach(item => {
      const input = document.querySelector(`input[data-row="${item.row}"][data-col="${item.col}"]`);
      if (input) input.value = item.value;
    });
  }
}

document.getElementById('settings').addEventListener('click', () => {
  document.querySelector('.settings-modal').classList.remove('hidden');
});

document.querySelector('.close-btn').addEventListener('click', () => {
  document.querySelector('.settings-modal').classList.add('hidden');
});

document.querySelector('.modal-backdrop').addEventListener('click', () => {
  document.querySelector('.settings-modal').classList.add('hidden');
});

document.getElementById('language-select').addEventListener('change', (e) => {
  lang = e.target.value;
  genererGrilleDuJour();
});