// app.js - Orchestration, communication avec le bridge Python
import { initScene, animate, scene, camera, controls } from './scene3d.js';
import { createBoard, createPiece } from './board.js';
import { setupInteraction, setIntersectionObjects } from './interactions.js';

// ---------- État local ----------
let boardGroup, pieceMeshes = {};   // { index: THREE.Mesh }
let state = null;
let nodeObjects = [];               // pour le raycasting
let currentMode = null;

// ---------- Initialisation ----------
initScene();
createGameBoard();
setupInteraction(handleIntersectionClick);
animate();

// ---------- Menu ----------
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const mode = e.target.dataset.mode;
    let difficulty = null;
    if (mode === 'pve') {
      difficulty = document.getElementById('difficulty-select').value;
    }
    document.getElementById('menu-overlay').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';

    const response = await pywebview.api.start_game(mode, difficulty);
    if (response.status === 'started') {
      currentMode = mode;
      await refreshState();
      if (mode === 'demo' || (mode === 'pve' && state.current_player === 'O')) {
        setTimeout(() => aiAutoPlay(), 800);
      }
    }
  });
});

document.getElementById('back-btn').addEventListener('click', () => {
  document.getElementById('menu-overlay').style.display = 'flex';
  document.getElementById('game-container').style.display = 'none';
  resetBoard();
});

// ---------- Fonctions ----------
function createGameBoard() {
  boardGroup = createBoard();
  scene.add(boardGroup);

  // Récupérer les nodes pour le raycasting (les enfants avec userData.index)
  boardGroup.children.forEach(child => {
    if (child.geometry.type === 'CylinderGeometry') {
      // Les nodes ont une géométrie de cylindre, mais on doit filtrer ceux des lignes
      // On ajoute un userData lors de la création. Pour simplifier, on récupère les nodes par leur matériau.
      if (child.material.color.getHex() === 0x00ffff) { // nodes cyan
        // Attribuer un index basé sur la position
        const pos = child.position;
        const x = Math.round(pos.x) + 1;
        const z = Math.round(pos.z) + 1; // z = y dans notre grille
        const index = z * 3 + x;  // 0-8
        child.userData.index = index;
        nodeObjects.push(child);
      }
    }
  });
  setIntersectionObjects(nodeObjects);
}

function resetBoard() {
  // Supprime les pions existants
  Object.values(pieceMeshes).forEach(mesh => scene.remove(mesh));
  pieceMeshes = {};
}

async function refreshState() {
  state = await pywebview.api.get_state();
  updateHUD();
  updatePiecesDisplay();
}

function updateHUD() {
  document.getElementById('turn-indicator').querySelector('span').textContent = state.current_player;
  const phaseText = state.phase === 'placement' ? 'Placement' : 'Mouvement';
  document.getElementById('phase-badge').textContent = phaseText;
  if (state.winner) {
    document.getElementById('turn-indicator').textContent = `Gagnant : ${state.winner}`;
  }
}

function updatePiecesDisplay() {
  // Retirer les pions qui ne sont plus présents
  for (const idx in pieceMeshes) {
    if (state.board[idx] === null) {
      scene.remove(pieceMeshes[idx]);
      delete pieceMeshes[idx];
    }
  }
  // Ajouter/mettre à jour les pions
  state.board.forEach((player, index) => {
    if (player && !pieceMeshes[index]) {
      const piece = createPiece(player);
      piece.position.copy(nodeObjects[index].position.clone().add(new THREE.Vector3(0, 0.3, 0)));
      scene.add(piece);
      pieceMeshes[index] = piece;
    }
  });
}

async function handleIntersectionClick(index) {
  if (state.winner) return;
  if (currentMode === 'demo') return;
  if (currentMode === 'pve' && state.current_player === 'O') return; // tour IA

  // Construire le move selon la phase
  let move;
  if (state.phase === 'placement') {
    if (state.board[index] !== null) return; // occupé
    move = index;
  } else {
    // Mouvement : sélectionner la pièce source (à implémenter plus finement : un premier clic sélectionne la pièce, deuxième clic destination)
    // Version simplifiée : on s'attend à ce que l'humain clique d'abord sur sa pièce puis sur une destination.
    // Ici on fait un système à deux étapes simple avec variable globale.
    if (!window.selectedPiece) {
      if (state.board[index] !== state.current_player) return;
      window.selectedPiece = index;
      highlightValidMoves(index);
    } else {
      const src = window.selectedPiece;
      move = [src, index];
      window.selectedPiece = null;
      clearHighlights();
    }
    return; // on attend le deuxième clic
  }

  const result = await pywebview.api.make_move(move);
  if (result.error) {
    alert(result.error);
    return;
  }
  await refreshState();
  if (state.winner) return;

  // Si après le coup humain, l'IA doit jouer
  if ((currentMode === 'pve' && state.current_player === 'O') || currentMode === 'demo') {
    setTimeout(() => aiAutoPlay(), 600);
  }
}

async function aiAutoPlay() {
  const result = await pywebview.api.make_move('ai'); // l'API sait que c'est à l'IA de jouer
  await refreshState();
}

// Gestion simplifiée des highlights (à implémenter avec un effet visuel)
function highlightValidMoves(src) {}
function clearHighlights() {}