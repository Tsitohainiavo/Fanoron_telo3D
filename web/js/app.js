import { initScene, animate, scene } from './scene3d.js';
import { createBoard, createPiece, PLANK_THICKNESS, PIECE_REST_Y, SIDE_POSITIONS, createSideStands } from './board.js';
import { createRoom } from './room.js';
import { setupInteraction, setNodeObjects } from './interactions.js';
import { Sound } from './sounds.js';

// ---- État global ----
let boardGroup, nodeObjects;
let pieceOnBoard = {};           // index -> mesh (pions sur le plateau)
let sidePieces = { X: [], O: [] }; // mesh des pions de côté (toujours 3 chacun)
let state = null;
let currentMode = null;
let selectedPiece = null;        // { type: 'side'|'board', index?, player?, mesh }
let animating = false;
let validMoves = [];

// Éléments d'interface
const menuOverlay = document.getElementById('menu-overlay');
const gameContainer = document.getElementById('game-container');
const turnIndicator = document.getElementById('turn-indicator');
const phaseBadge = document.getElementById('phase-badge');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const replayBtn = document.getElementById('replay-btn');
const backBtn = document.getElementById('back-btn');
const turnMessage = document.getElementById('turn-message');
const victoryOverlay = document.getElementById('victory-overlay');
const victoryText = document.getElementById('victory-text');
const newGameBtn = document.getElementById('new-game-btn');

// ---- Initialisation scène ----
initScene();
scene.add(createRoom());
boardGroup = createBoard();
scene.add(boardGroup);
nodeObjects = boardGroup.children.filter(c => c.userData.isNode);

// Supports latéraux
const sideStands = createSideStands();
scene.add(sideStands);

// Création des 6 pions de côté (3 par joueur)
for (const player of ['X', 'O']) {
    for (let i = 0; i < 3; i++) {
        const piece = createPiece(player);
        piece.userData.isSidePiece = true;
        piece.userData.slotIndex = i;
        sidePieces[player].push(piece);
        scene.add(piece);
    }
}

// Objets interactifs : nœuds du plateau + pions de côté
let allInteractive = [...nodeObjects];
function updateInteractiveList() {
    allInteractive = [...nodeObjects, ...sidePieces.X.filter(p => p.visible), ...sidePieces.O.filter(p => p.visible)];
    setNodeObjects(allInteractive);
}
updateInteractiveList();

setupInteraction(onClick, onHover);
animate();

// ---- Attente eel ----
function waitForEel() {
    return new Promise(resolve => {
        if (typeof eel !== 'undefined') resolve();
        else {
            const check = setInterval(() => {
                if (typeof eel !== 'undefined') { clearInterval(check); resolve(); }
            }, 50);
        }
    });
}

async function initApp() {
    await waitForEel();

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const mode = e.currentTarget.dataset.mode;
            let diff = null;
            if (mode === 'pve') diff = document.getElementById('difficulty-select').value;
            menuOverlay.style.display = 'none';
            gameContainer.style.display = 'block';
            try {
                const res = await eel.start_game(mode, diff)();
                if (res.status === 'started') {
                    currentMode = mode;
                    resetGameVisuals();
                    await refreshState();
                    if (needsAiTurn()) aiAutoPlay();
                } else {
                    alert('Erreur : ' + res.message);
                    menuOverlay.style.display = 'flex';
                }
            } catch (err) {
                alert('Erreur de connexion');
                menuOverlay.style.display = 'flex';
            }
        });
    });

    backBtn.addEventListener('click', () => {
        menuOverlay.style.display = 'flex';
        gameContainer.style.display = 'none';
        victoryOverlay.style.display = 'none';
        resetAll();
    });
    undoBtn.addEventListener('click', async () => { if (!animating) { await eel.undo()(); await refreshState(); if (needsAiTurn()) aiAutoPlay(); } });
    redoBtn.addEventListener('click', async () => { if (!animating) { await eel.redo()(); await refreshState(); if (needsAiTurn()) aiAutoPlay(); } });
    replayBtn.addEventListener('click', async () => {
        victoryOverlay.style.display = 'none';
        const diff = document.getElementById('difficulty-select')?.value;
        await eel.start_game(currentMode, diff)();
        resetGameVisuals();
        await refreshState();
        if (needsAiTurn()) aiAutoPlay();
    });
    newGameBtn.addEventListener('click', async () => {
        victoryOverlay.style.display = 'none';
        menuOverlay.style.display = 'flex';
        gameContainer.style.display = 'none';
        resetAll();
    });
}
window.addEventListener('load', initApp);

// ---- Interaction ----
function onHover(obj) {
    // Surbrillance des cases survolées (optionnel, non requis mais peut rester)
}

function onClick(obj) {
    if (!state || state.winner || animating) return;
    if (currentMode === 'demo') return;
    if (currentMode === 'pve' && state.current_player === 'O') return;

    // Clic sur un pion de côté (phase placement uniquement)
    if (obj && obj.userData.isSidePiece) {
        if (state.phase !== 'placement') return;
        if (obj.userData.player !== state.current_player) return;
        // Sélectionne ce pion
        if (selectedPiece && selectedPiece.mesh === obj) {
            // Désélection
            selectedPiece = null;
            updateHighlights();
            return;
        }
        selectedPiece = { type: 'side', mesh: obj, player: obj.userData.player };
        Sound.pickUp();
        updateHighlights();
        return;
    }

    // Clic sur une case du plateau
    if (obj && obj.userData.isNode) {
        const index = obj.userData.index;

        // Phase placement avec un pion de côté sélectionné
        if (state.phase === 'placement' && selectedPiece && selectedPiece.type === 'side') {
            if (!validMoves.includes(index)) return;
            const player = selectedPiece.player;
            const mesh = selectedPiece.mesh;
            selectedPiece = null;
            executePlacement(player, mesh, index);
            return;
        }

        // Phase mouvement : sélection d'un pion sur le plateau
        if (state.phase === 'mouvement') {
            if (selectedPiece === null || selectedPiece.type === 'side') {
                // Sélection d'un pion du joueur
                if (state.board[index] !== state.current_player) return;
                if (!pieceOnBoard[index]) return;
                selectedPiece = { type: 'board', index, mesh: pieceOnBoard[index] };
                pieceOnBoard[index].scale.set(1.2, 1.2, 1.2);
                pieceOnBoard[index].material.emissiveIntensity = 1.5;
                Sound.pickUp();
                updateHighlights();
            } else if (selectedPiece.type === 'board') {
                // Destination
                const src = selectedPiece.index;
                const mesh = selectedPiece.mesh;
                selectedPiece = null;
                mesh.scale.set(1, 1, 1);
                mesh.material.emissiveIntensity = 0.5;
                if (src === index) { updateHighlights(); return; }
                const moveValid = validMoves.some(m => Array.isArray(m) && m[0] === src && m[1] === index);
                if (!moveValid) return;
                executeMove(mesh, src, index);
            }
        }
    } else {
        // Clic hors zone : désélection
        if (selectedPiece) {
            if (selectedPiece.type === 'board') {
                selectedPiece.mesh.scale.set(1,1,1);
                selectedPiece.mesh.material.emissiveIntensity = 0.5;
            }
            selectedPiece = null;
            updateHighlights();
        }
    }
}

// ---- Mise à jour des lumières ----
function updateHighlights() {
    nodeObjects.forEach(n => { if (n.userData.highlight) n.userData.highlight.visible = false; });
    if (!state || state.winner) return;
    if (state.phase === 'placement' && selectedPiece && selectedPiece.type === 'side') {
        validMoves.forEach(idx => {
            const n = nodeObjects.find(no => no.userData.index === idx);
            if (n && n.userData.highlight) n.userData.highlight.visible = true;
        });
    }
    if (state.phase === 'mouvement' && selectedPiece && selectedPiece.type === 'board') {
        validMoves.forEach(m => {
            if (m[0] === selectedPiece.index) {
                const n = nodeObjects.find(no => no.userData.index === m[1]);
                if (n && n.userData.highlight) n.userData.highlight.visible = true;
            }
        });
    }
}

// ---- Animations ----
function animateMove(mesh, startPos, endPos, duration = 900) {
    return new Promise(resolve => {
        const startTime = performance.now();
        const startRot = mesh.rotation.y;
        const totalRot = Math.PI * 2; // tour complet pour effet roulement
        function step(now) {
            const t = Math.min((now - startTime) / duration, 1.0);
            const ease = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2;
            mesh.position.lerpVectors(startPos, endPos, ease);
            // Arc discret
            mesh.position.y = startPos.y + (endPos.y - startPos.y) * ease + 0.25 * Math.sin(ease * Math.PI);
            // Rotation roulement
            mesh.rotation.y = startRot + totalRot * ease;
            if (t < 1.0) {
                requestAnimationFrame(step);
            } else {
                mesh.position.copy(endPos);
                mesh.rotation.y = startRot; // on remet l'orientation aléatoire initiale
                resolve();
            }
        }
        requestAnimationFrame(step);
    });
}

async function executePlacement(player, mesh, targetIndex) {
    if (animating) return;
    animating = true;
    const res = await eel.make_move(targetIndex)();
    if (res.error) {
        animating = false;
        return;
    }
    Sound.place();
    const targetNode = nodeObjects.find(n => n.userData.index === targetIndex);
    const endPos = targetNode.position.clone();
    endPos.y = PIECE_REST_Y;
    const startPos = mesh.position.clone();

    // Retirer le pion de la liste des pions de côté
    const arr = sidePieces[player];
    const idx = arr.indexOf(mesh);
    if (idx > -1) arr.splice(idx, 1);

    await animateMove(mesh, startPos, endPos, 900);
    pieceOnBoard[targetIndex] = mesh;
    delete mesh.userData.isSidePiece;
    mesh.userData.slotIndex = undefined;
    updateInteractiveList();
    animating = false;
    await refreshState();
    if (needsAiTurn()) aiAutoPlay();
}

async function executeMove(mesh, src, dst) {
    if (animating) return;
    animating = true;
    const res = await eel.make_move([src, dst])();
    if (res.error) {
        animating = false;
        return;
    }
    Sound.move();
    const startNode = nodeObjects.find(n => n.userData.index === src);
    const endNode = nodeObjects.find(n => n.userData.index === dst);
    const startPos = startNode.position.clone(); startPos.y = PIECE_REST_Y;
    const endPos = endNode.position.clone(); endPos.y = PIECE_REST_Y;

    await animateMove(mesh, startPos, endPos, 800);
    pieceOnBoard[dst] = mesh;
    delete pieceOnBoard[src];
    animating = false;
    await refreshState();
    if (needsAiTurn()) aiAutoPlay();
}

// ---- Synchronisation avec l'état ----
async function refreshState() {
    try {
        state = await eel.get_state()();
        validMoves = state.valid_moves || [];
        updateHUD();
        await syncPiecesWithState();
        updateHighlights();
        checkVictory();
    } catch (e) { console.error(e); }
}

function updateHUD() {
    if (!state) return;
    const colorName = state.current_player === 'X' ? 'Bronze' : 'Argent';
    if (state.winner) {
        turnIndicator.innerHTML = `Gagnant : <span>${state.winner === 'X' ? 'Bronze' : 'Argent'}</span>`;
        phaseBadge.textContent = 'Terminé';
        replayBtn.style.display = 'inline-block';
        turnMessage.style.opacity = 0;
    } else {
        turnIndicator.querySelector('span').textContent = colorName;
        phaseBadge.textContent = state.phase === 'placement' ? 'Placement' : 'Mouvement';
        replayBtn.style.display = 'none';
        if (needsAiTurn()) {
            turnMessage.textContent = '🤖 L’IA réfléchit…';
            turnMessage.style.opacity = 1;
        } else if (currentMode === 'demo') {
            turnMessage.textContent = '🎮 Démo en cours';
            turnMessage.style.opacity = 1;
        } else {
            turnMessage.textContent = 'À vous de jouer !';
            turnMessage.style.opacity = 1;
        }
    }
}

function needsAiTurn() {
    if (!state || state.winner) return false;
    if (currentMode === 'demo') return true;
    if (currentMode === 'pve' && state.current_player === 'O') return true;
    return false;
}

// Aligne les pions physiques avec l'état logique
async function syncPiecesWithState() {
    // 1. Retirer les pions du plateau qui ne sont plus dans l'état
    for (const idx in pieceOnBoard) {
        if (state.board[idx] === null) {
            // Le pion n'est plus là : on le renvoie dans la réserve
            const mesh = pieceOnBoard[idx];
            const player = mesh.userData.player;
            if (!sidePieces[player].includes(mesh)) {
                sidePieces[player].push(mesh);
                mesh.userData.isSidePiece = true;
            }
            delete pieceOnBoard[idx];
        }
    }

    // 2. Placer les pions manquants sur le plateau
    for (let i = 0; i < 9; i++) {
        const player = state.board[i];
        if (player && !pieceOnBoard[i]) {
            // Chercher un pion de réserve de ce joueur
            const arr = sidePieces[player];
            if (arr.length > 0) {
                const mesh = arr.shift();
                delete mesh.userData.isSidePiece;
                const pos = nodeObjects[i].position.clone();
                pos.y = PIECE_REST_Y;
                mesh.position.copy(pos);
                pieceOnBoard[i] = mesh;
            } else {
                // Cas extrême : créer un nouveau pion (ne devrait pas arriver)
                const mesh = createPiece(player);
                mesh.position.copy(nodeObjects[i].position);
                mesh.position.y = PIECE_REST_Y;
                scene.add(mesh);
                pieceOnBoard[i] = mesh;
            }
        }
    }

    // 3. Positionner les pions de réserve sur leurs emplacements
    for (const player of ['X', 'O']) {
        const positions = SIDE_POSITIONS[player];
        const pieces = sidePieces[player];
        pieces.forEach((mesh, i) => {
            if (i < positions.length) {
                mesh.position.copy(positions[i]);
                mesh.visible = true;
            } else {
                mesh.visible = false; // sécurité
            }
        });
    }

    updateInteractiveList();
    // Si le pion sélectionné a été retiré (undo), on désélectionne
    if (selectedPiece && selectedPiece.type === 'board' && !pieceOnBoard[selectedPiece.index]) {
        selectedPiece = null;
    }
    if (selectedPiece && selectedPiece.type === 'side' && !sidePieces[selectedPiece.player].includes(selectedPiece.mesh)) {
        selectedPiece = null;
    }
}

function checkVictory() {
    if (state && state.winner) {
        const winnerName = state.winner === 'X' ? 'Bronze' : 'Argent';
        victoryText.textContent = `Victoire du joueur ${winnerName} !`;
        victoryOverlay.style.display = 'flex';
        Sound.victory();
        spawnConfetti();
    }
}

function spawnConfetti() {
    const group = new THREE.Group();
    const colors = [0xffd700, 0xc0c0c0, 0x00ffff, 0xff69b4, 0x00ff00];
    for (let i = 0; i < 100; i++) {
        const geo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        const mat = new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
        const piece = new THREE.Mesh(geo, mat);
        piece.position.set((Math.random() - 0.5) * 4, 2 + Math.random() * 2, (Math.random() - 0.5) * 4);
        group.add(piece);
    }
    scene.add(group);
    const start = performance.now();
    function anim() {
        const elapsed = (performance.now() - start) / 1000;
        group.children.forEach(p => {
            p.position.y -= 0.02;
            p.rotation.x += 0.05;
            p.rotation.y += 0.03;
        });
        if (elapsed < 3) requestAnimationFrame(anim);
        else scene.remove(group);
    }
    requestAnimationFrame(anim);
}

async function aiAutoPlay() {
    if (animating) return;
    const res = await eel.make_move('ai')();
    if (res.error) return;
    await refreshState();
    if (needsAiTurn()) setTimeout(() => aiAutoPlay(), 800);
}

function resetAll() {
    // Nettoyer les pions
    for (const idx in pieceOnBoard) {
        const mesh = pieceOnBoard[idx];
        if (mesh) scene.remove(mesh);
    }
    pieceOnBoard = {};
    sidePieces.X.forEach(p => scene.remove(p));
    sidePieces.O.forEach(p => scene.remove(p));
    sidePieces = { X: [], O: [] };
    selectedPiece = null;
    state = null;
    validMoves = [];
    updateHighlights();
}

function resetGameVisuals() {
    // Remettre tous les pions en réserve
    for (const idx in pieceOnBoard) {
        const mesh = pieceOnBoard[idx];
        const player = mesh.userData.player;
        if (!sidePieces[player].includes(mesh)) sidePieces[player].push(mesh);
        mesh.userData.isSidePiece = true;
    }
    pieceOnBoard = {};

    // Recréer les pions de côté si manquants (normalement 3 chacun)
    for (const player of ['X', 'O']) {
        while (sidePieces[player].length < 3) {
            const mesh = createPiece(player);
            mesh.userData.isSidePiece = true;
            sidePieces[player].push(mesh);
            scene.add(mesh);
        }
        sidePieces[player].forEach((mesh, i) => {
            mesh.visible = true;
            mesh.position.copy(SIDE_POSITIONS[player][i]);
        });
    }
    selectedPiece = null;
    state = null;
    validMoves = [];
    updateInteractiveList();
    updateHighlights();
}