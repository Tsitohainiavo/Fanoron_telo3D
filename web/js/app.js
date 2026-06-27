import { initScene, animate, scene } from './scene3d.js';
import { createBoard, createPiece, PIECE_REST_Y } from './board.js';
import { createRoom } from './room.js';
import { setupInteraction, setNodeObjects } from './interactions.js';

// ---------- LOG VISUEL ----------
const logDiv = document.createElement('div');
logDiv.id = 'page-log';
logDiv.style.cssText = 'position:fixed; bottom:10px; right:10px; background:rgba(0,0,0,0.75); color:#0f0; padding:10px; border-radius:8px; max-width:300px; font-family:monospace; font-size:12px; z-index:100; pointer-events:none;';
document.body.appendChild(logDiv);

function showPageLog(msg) {
    console.log(msg);
    if (logDiv) {
        logDiv.innerHTML += msg + '<br>';
        const lines = logDiv.innerHTML.split('<br>');
        if (lines.length > 10) {
            lines.splice(0, lines.length - 10);
            logDiv.innerHTML = lines.join('<br>');
        }
    }
}
// ---------- FIN LOG ----------

let boardGroup, nodeObjects;
let pieceMeshes = {};
let state = null;
let currentMode = null;
let selectedPiece = null;
let animating = false;

// ---- Initialisation scène ----
initScene();

// La pièce (sol, murs, fenêtre, table...) est ajoutée AVANT le plateau :
// son dessus de table affleure exactement le dessous du plateau (voir
// room.js), c'est ce qui fait que le plateau a maintenant l'air posé.
scene.add(createRoom());

boardGroup = createBoard();
scene.add(boardGroup);
nodeObjects = boardGroup.children.filter(c => c.userData.isNode);
showPageLog(`Nœuds prêts : ${nodeObjects.length}`);
setNodeObjects(nodeObjects);
setupInteraction(onNodeClick);
animate();

// ---- UI ----
const menuOverlay = document.getElementById('menu-overlay');
const gameContainer = document.getElementById('game-container');
const turnIndicator = document.getElementById('turn-indicator');
const phaseBadge = document.getElementById('phase-badge');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const replayBtn = document.getElementById('replay-btn');
const backBtn = document.getElementById('back-btn');

// ---- Attente eel ----
function waitForEel() {
    return new Promise(resolve => {
        if (typeof eel !== 'undefined') resolve();
        else {
            const check = setInterval(() => {
                if (typeof eel !== 'undefined') {
                    clearInterval(check);
                    resolve();
                }
            }, 50);
        }
    });
}

async function initApp() {
    showPageLog('Attente de l\u2019objet eel...');
    await waitForEel();
    showPageLog('✅ Eel prêt');

    try {
        const testState = await eel.get_state()();
        showPageLog('🔗 Backend connecté : ' + JSON.stringify(testState));
    } catch (e) {
        showPageLog('❌ Backend injoignable : ' + e.message);
    }

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const mode = e.currentTarget.dataset.mode;
            let difficulty = null;
            if (mode === 'pve') {
                difficulty = document.getElementById('difficulty-select').value;
            }
            menuOverlay.style.display = 'none';
            gameContainer.style.display = 'block';

            showPageLog(`▶ Mode: ${mode}, diff: ${difficulty}`);
            try {
                const res = await eel.start_game(mode, difficulty)();
                showPageLog('start_game → ' + JSON.stringify(res));
                if (res.status === 'started') {
                    currentMode = mode;
                    await refreshState();
                    if (needsAiTurn()) aiAutoPlay();
                } else {
                    showPageLog('Erreur démarrage : ' + res.message);
                    menuOverlay.style.display = 'flex';
                    gameContainer.style.display = 'none';
                }
            } catch (err) {
                showPageLog('Erreur start_game : ' + err.message);
            }
        });
    });

    backBtn.addEventListener('click', () => {
        menuOverlay.style.display = 'flex';
        gameContainer.style.display = 'none';
        resetBoard();
    });

    undoBtn.addEventListener('click', async () => {
        if (animating) return;
        showPageLog('↩ Undo');
        const res = await eel.undo()();
        if (!res.error) {
            await refreshState();
            if (needsAiTurn()) aiAutoPlay();
        } else showPageLog('Undo error: ' + res.error);
    });

    redoBtn.addEventListener('click', async () => {
        if (animating) return;
        showPageLog('↪ Redo');
        const res = await eel.redo()();
        if (!res.error) {
            await refreshState();
            if (needsAiTurn()) aiAutoPlay();
        } else showPageLog('Redo error: ' + res.error);
    });

    replayBtn.addEventListener('click', async () => {
        const res = await eel.start_game(currentMode, document.getElementById('difficulty-select')?.value)();
        if (res.status === 'started') {
            await refreshState();
            replayBtn.style.display = 'none';
            if (needsAiTurn()) aiAutoPlay();
        }
    });
}

window.addEventListener('load', initApp);

// ---- Fonctions ----
async function refreshState() {
    try {
        state = await eel.get_state()();
        showPageLog(`État: ${state.current_player}, ${state.phase}, winner=${state.winner}`);
        updateHUD();
        await updatePiecesDisplay();
    } catch (e) {
        showPageLog('Erreur get_state : ' + e.message);
    }
}

function updateHUD() {
    if (!state) return;
    if (state.winner) {
        turnIndicator.innerHTML = `Gagnant : <span>${state.winner}</span>`;
        phaseBadge.textContent = 'Terminé';
        replayBtn.style.display = 'inline-block';
    } else {
        turnIndicator.querySelector('span').textContent = state.current_player;
        phaseBadge.textContent = state.phase === 'placement' ? 'Placement' : 'Mouvement';
        replayBtn.style.display = 'none';
    }
}

function animatePieceTo(mesh, targetPos, duration = 500) {
    return new Promise(resolve => {
        const startPos = mesh.position.clone();
        const startTime = performance.now();
        function step(now) {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1.0);
            // Interpolation lissée (easeInOut)
            const easeT = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;
            mesh.position.x = startPos.x + (targetPos.x - startPos.x) * easeT;
            mesh.position.z = startPos.z + (targetPos.z - startPos.z) * easeT;
            // Petit arc pendant le déplacement, mais on retombe pile sur
            // targetPos.y à la fin (= posé sur le plateau, pas flottant)
            const arc = 0.45 * Math.sin(easeT * Math.PI);
            mesh.position.y = startPos.y + (targetPos.y - startPos.y) * easeT + arc;
            if (t < 1.0) {
                requestAnimationFrame(step);
            } else {
                mesh.position.copy(targetPos);
                resolve();
            }
        }
        requestAnimationFrame(step);
    });
}

async function updatePiecesDisplay() {
    // Supprimer les pions disparus
    for (const idx in pieceMeshes) {
        if (state.board[idx] === null) {
            scene.remove(pieceMeshes[idx]);
            delete pieceMeshes[idx];
        }
    }
    // Ajouter / déplacer
    for (let i = 0; i < 9; i++) {
        const player = state.board[i];
        if (!player) continue;
        const targetPos = nodeObjects[i].position.clone();
        // PIECE_REST_Y : la moitié de la hauteur du pion, pour que sa
        // face inférieure touche exactement la surface du plateau (y=0)
        // au lieu de flotter au-dessus.
        targetPos.y = PIECE_REST_Y;

        if (!pieceMeshes[i]) {
            const piece = createPiece(player);
            const startX = player === 'X' ? -2.2 : 2.2;
            piece.position.set(startX, PIECE_REST_Y + 0.15, 0);
            scene.add(piece);
            pieceMeshes[i] = piece;
            animating = true;
            await animatePieceTo(piece, targetPos, 600);
            animating = false;
        } else if (!pieceMeshes[i].position.equals(targetPos)) {
            animating = true;
            await animatePieceTo(pieceMeshes[i], targetPos, 500);
            animating = false;
        }
    }
}

function needsAiTurn() {
    if (!state || state.winner) return false;
    if (currentMode === 'demo') return true;
    if (currentMode === 'pve' && state.current_player === 'O') return true;
    return false;
}

async function aiAutoPlay() {
    if (animating) return;
    showPageLog('🤖 IA réfléchit...');
    const res = await eel.make_move('ai')();
    showPageLog('Coup IA : ' + JSON.stringify(res));
    if (res.error) {
        showPageLog('Erreur IA : ' + res.error);
        return;
    }
    await refreshState();
    if (needsAiTurn()) {
        setTimeout(() => aiAutoPlay(), 600);
    }
}

async function onNodeClick(index) {
    showPageLog(`👆 Clic nœud ${index} (joueur: ${state?.current_player})`);
    if (!state || state.winner || animating) {
        showPageLog('Clic ignoré (bloqué)');
        return;
    }
    if (currentMode === 'demo') {
        showPageLog('Mode démo, clic ignoré');
        return;
    }
    if (currentMode === 'pve' && state.current_player === 'O') {
        showPageLog("⏳ C'est au tour de l'IA");
        return;
    }

    if (state.phase === 'placement') {
        if (state.board[index] !== null) {
            showPageLog('Case déjà occupée');
            return;
        }
        const move = index;
        const res = await eel.make_move(move)();
        if (res.error) {
            showPageLog('Erreur : ' + res.error);
            return;
        }
        await refreshState();
        if (needsAiTurn()) aiAutoPlay();
        return;
    }

    if (state.phase === 'mouvement') {
        if (selectedPiece === null) {
            if (state.board[index] !== state.current_player) {
                showPageLog('Ce n\u2019est pas votre pion');
                return;
            }
            selectedPiece = index;
            if (pieceMeshes[index]) {
                pieceMeshes[index].scale.set(1.2, 1.2, 1.2);
                pieceMeshes[index].material.emissiveIntensity = 1.5;
            }
            showPageLog('Pion sélectionné : ' + index);
        } else {
            const src = selectedPiece;
            selectedPiece = null;
            if (pieceMeshes[src]) {
                pieceMeshes[src].scale.set(1, 1, 1);
                pieceMeshes[src].material.emissiveIntensity = 0.5;
            }
            if (src === index) {
                showPageLog('Annulation sélection');
                return;
            }
            const move = [src, index];
            const res = await eel.make_move(move)();
            if (res.error) {
                showPageLog('Erreur : ' + res.error);
                return;
            }
            await refreshState();
            if (needsAiTurn()) aiAutoPlay();
        }
    }
}

function resetBoard() {
    for (const idx in pieceMeshes) {
        scene.remove(pieceMeshes[idx]);
    }
    pieceMeshes = {};
    selectedPiece = null;
    state = null;
}