// app.js - Orchestration, communication avec le backend Python via Eel
import { initScene, animate, scene, camera } from './scene3d.js';
import { createBoard, createPiece } from './board.js';
import { setupInteraction, setNodeObjects } from './interactions.js';

// ---------- État local ----------
let boardGroup;
let pieceMeshes = {};   // { index: THREE.Mesh }
let state = null;
let currentMode = null;
let selectedPieceIndex = null; // pour la phase de mouvement

// ---------- Initialisation de la scène ----------
initScene();
boardGroup = createBoard();
scene.add(boardGroup);

// Récupérer les objets nœuds pour le raycasting
const nodeObjects = boardGroup.children.filter(child => child.userData.isNode);
setNodeObjects(nodeObjects);

setupInteraction(handleIntersectionClick);
animate();

// ---------- Menu ----------
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const mode = e.currentTarget.dataset.mode; // currentTarget pour éviter le select
    let difficulty = null;
    if (mode === 'pve') {
      difficulty = document.getElementById('difficulty-select').value;
    }
    document.getElementById('menu-overlay').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';

    console.log('Démarrage mode', mode, difficulty);
    const response = await eel.start_game(mode, difficulty)();
    console.log('Réponse start_game', response);
    if (response.status === 'started') {
      currentMode = mode;
      await refreshState();
      // Si l'IA doit jouer en premier (démo ou pve avec IA qui commence)
      if ((mode === 'demo') || (mode === 'pve' && state.current_player === 'O')) {
        setTimeout(() => aiAutoPlay(), 800);
      }
    }
  });
});

document.getElementById('back-btn').addEventListener('click', async () => {
  // Retour au menu
  document.getElementById('menu-overlay').style.display = 'flex';
  document.getElementById('game-container').style.display = 'none';
  resetBoard();
});

// ---------- Fonctions de jeu ----------
function resetBoard() {
  // Supprimer les pions existants
  Object.values(pieceMeshes).forEach(mesh => scene.remove(mesh));
  pieceMeshes = {};
  selectedPieceIndex = null;
}

async function refreshState() {
  state = await eel.get_state()();
  console.log('Nouvel état', state);
  updateHUD();
  updatePiecesDisplay();
}

function updateHUD() {
  const turnSpan = document.querySelector('#turn-indicator span');
  const phaseBadge = document.getElementById('phase-badge');
  if (state.winner) {
    document.getElementById('turn-indicator').innerHTML = `Gagnant : <span>${state.winner}</span>`;
    phaseBadge.textContent = 'Terminé';
    return;
  }
  turnSpan.textContent = state.current_player;
  phaseBadge.textContent = state.phase === 'placement' ? 'Placement' : 'Mouvement';
}

function updatePiecesDisplay() {
  // Retirer les pions qui n'existent plus
  for (const idx in pieceMeshes) {
    if (state.board[idx] === null) {
      scene.remove(pieceMeshes[idx]);
      delete pieceMeshes[idx];
    }
  }
  // Ajouter / déplacer les pions
  state.board.forEach((player, index) => {
    if (player === null) return;
    const pos = nodeObjects[index].position.clone();
    pos.y += 0.35; // hauteur au-dessus de l'intersection

    if (pieceMeshes[index]) {
      // Mise à jour de la position (animation simple)
      pieceMeshes[index].position.copy(pos);
    } else {
      const piece = createPiece(player);
      piece.position.copy(pos);
      scene.add(piece);
      pieceMeshes[index] = piece;
    }
  });
}

// --- Gestion des clics sur les intersections ---
async function handleIntersectionClick(index) {
  console.log('handleIntersectionClick index', index, 'mode', currentMode, 'player', state?.current_player);
  if (!state || state.winner) return;

  // Empêcher l'humain de jouer si c'est le tour de l'IA
  if (currentMode === 'demo') return;
  if (currentMode === 'pve' && state.current_player === 'O') {
    console.log("C'est au tour de l'IA, attendez...");
    return;
  }

  // Phase de placement : simple clic
  if (state.phase === 'placement') {
    if (state.board[index] !== null) {
      console.log('Case déjà occupée');
      return;
    }
    const move = index;
    console.log('Envoi coup placement', move);
    const result = await eel.make_move(move)();
    if (result.error) {
      alert(result.error);
      return;
    }
    await refreshState();
    // Vérifier si l'IA doit jouer après
    if ((currentMode === 'pve' && state.current_player === 'O') || currentMode === 'demo') {
      setTimeout(() => aiAutoPlay(), 600);
    }
    return;
  }

  // Phase de mouvement : deux clics (source puis destination)
  if (state.phase === 'mouvement') {
    // Premier clic : sélectionner un pion du joueur courant
    if (selectedPieceIndex === null) {
      if (state.board[index] !== state.current_player) {
        console.log('Ce n’est pas votre pion');
        return;
      }
      selectedPieceIndex = index;
      console.log('Pion sélectionné:', index);
      // (On pourrait ajouter un effet visuel de surbrillance)
      return;
    }

    // Deuxième clic : destination
    const src = selectedPieceIndex;
    selectedPieceIndex = null; // reset
    const move = [src, index];
    console.log('Envoi coup mouvement', move);
    const result = await eel.make_move(move)();
    if (result.error) {
      alert(result.error);
      return;
    }
    await refreshState();
    // Tour suivant (humain ou IA)
    if ((currentMode === 'pve' && state.current_player === 'O') || currentMode === 'demo') {
      setTimeout(() => aiAutoPlay(), 600);
    }
  }
}

// --- Jeu de l'IA ---
async function aiAutoPlay() {
  console.log('Déclenchement IA...');
  const result = await eel.make_move('ai')();
  if (result.error) {
    console.error('Erreur IA', result.error);
    return;
  }
  await refreshState();
  // Si après le coup de l'IA la partie continue et que c'est encore à une IA (démo), on relance
  if (!state.winner) {
    if (currentMode === 'demo' || (currentMode === 'pve' && state.current_player === 'O')) {
      setTimeout(() => aiAutoPlay(), 600);
    }
  }
}