/**
 * app.js — Orchestrateur principal Fanoron-telo 3D
 *
 * Améliorations :
 *  - Animation d'entrée de page d'accueil (particules + brume)
 *  - Transition fluide menu → jeu (fondu croisé)
 *  - Confettis 2D via canvas HTML (plus fluides que les cubes Three.js)
 *  - Feedback visuel "IA réfléchit" (toast + animation highlight)
 *  - Animation de caméra plus douce à chaque changement de tour
 *  - Correction bug : undo/redo re-synchronise correctement l'état visuel
 *  - Correction bug : sélection de pion annulée si on clique ailleurs
 *  - Highlights animés (pulse) sur les destinations valides
 *  - Pulsation de la ligne de victoire
 *  - Nettoyage complet de scène sans fuites mémoire
 */

import * as THREE from 'three';
import { initScene, animate, scene, camera, controls } from './scene3d.js';
import {
    createBoard, createPiece,
    PLANK_THICKNESS, PIECE_REST_Y, SIDE_POSITIONS, WINNING_LINES, createWinLine
} from './board.js';
import { createRoom }        from './room.js';
import { setupInteraction, setNodeObjects } from './interactions.js';
import { Sound }             from './sounds.js';

/* ══════════════════════════════════════════════════
   ÉTAT GLOBAL
   ══════════════════════════════════════════════════ */

let boardGroup, nodeObjects;
let pieceOnBoard  = {};           // boardIndex -> THREE.Mesh
let sidePieces    = { X: [], O: [] };
let state         = null;
let currentMode   = null;
let selectedPiece = null;         // { type:'side'|'board', mesh, player?, index? }
let animating     = false;
let validMoves    = [];
let winLine       = null;
let winLinePulse  = null;

/* ── UI refs ── */
const menuOverlay     = document.getElementById('menu-overlay');
const gameContainer   = document.getElementById('game-container');
const chipDot         = document.getElementById('chip-dot');
const chipLabel       = document.getElementById('chip-label');
const playerChip      = document.querySelector('.player-chip');
const phaseBadge      = document.getElementById('phase-badge');
const undoBtn         = document.getElementById('undo-btn');
const redoBtn         = document.getElementById('redo-btn');
const replayBtn       = document.getElementById('replay-btn');
const backBtn         = document.getElementById('back-btn');
const turnMessage     = document.getElementById('turn-message');
const turnMsgIcon     = document.getElementById('turn-msg-icon');
const turnMsgText     = document.getElementById('turn-msg-text');
const victoryOverlay  = document.getElementById('victory-overlay');
const victoryWinner   = document.getElementById('victory-winner');
const observeBtn      = document.getElementById('observe-btn');
const newGameBtn      = document.getElementById('new-game-btn');
const aiToast         = document.getElementById('ai-thinking-toast');
const confettiCanvas  = document.getElementById('confetti-canvas');
const menuCanvas      = document.getElementById('menu-canvas');

/* ══════════════════════════════════════════════════
   PAGE D'ACCUEIL — Particules + Brume
   ══════════════════════════════════════════════════ */

(function initMenuCanvas() {
    if (!menuCanvas) return;
    const ctx = menuCanvas.getContext('2d');
    let w, h, particles;

    function resize() {
        w = menuCanvas.width  = window.innerWidth;
        h = menuCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Particules dorées
    particles = Array.from({ length: 60 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.5 + Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -0.08 - Math.random() * 0.18,
        alpha: 0.2 + Math.random() * 0.5,
        dAlpha: (Math.random() - 0.5) * 0.004
    }));

    function draw() {
        ctx.clearRect(0, 0, w, h);

        // Fond radial sombre chaud
        const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h) * 0.8);
        bg.addColorStop(0,   'rgba(40,20,8,0.92)');
        bg.addColorStop(0.5, 'rgba(20,10,4,0.96)');
        bg.addColorStop(1,   'rgba(10,5,2,1)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Brume centrale ambrée
        const fog = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w * 0.45);
        fog.addColorStop(0,   'rgba(120,65,10,0.14)');
        fog.addColorStop(0.6, 'rgba(80,40,5,0.06)');
        fog.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = fog;
        ctx.fillRect(0, 0, w, h);

        // Particules
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha += p.dAlpha;
            if (p.alpha <= 0 || p.alpha >= 0.7) p.dAlpha *= -1;
            if (p.y < -5)  p.y = h + 5;
            if (p.x < -5)  p.x = w + 5;
            if (p.x > w+5) p.x = -5;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(201,162,75,${Math.max(0, p.alpha)})`;
            ctx.fill();
        });

        requestAnimationFrame(draw);
    }
    draw();
})();

/* ══════════════════════════════════════════════════
   INITIALISATION THREE.JS
   ══════════════════════════════════════════════════ */

initScene();
scene.add(createRoom());
boardGroup  = createBoard();
scene.add(boardGroup);
nodeObjects = boardGroup.children.filter(c => c.userData.isNode);

// Pions de réserve initiaux
for (const player of ['X', 'O']) {
    for (let i = 0; i < 3; i++) {
        const mesh = createPiece(player);
        mesh.userData.isSidePiece = true;
        mesh.userData.slotIndex   = i;
        sidePieces[player].push(mesh);
        scene.add(mesh);
    }
}

_updateInteractiveList();
setupInteraction(onClick, onHover);
animate();

/* ══════════════════════════════════════════════════
   ANIMATION DES HIGHLIGHTS (pulse)
   ══════════════════════════════════════════════════ */

(function animateHighlights() {
    let t = 0;
    function step() {
        t += 0.04;
        const scale = 1 + 0.08 * Math.sin(t * 3);
        nodeObjects.forEach(n => {
            const hl = n.userData.highlight;
            if (hl && hl.visible) {
                hl.scale.setScalar(scale);
                hl.material.opacity = 0.7 + 0.25 * Math.sin(t * 3);
            }
        });
        requestAnimationFrame(step);
    }
    step();
})();

/* ══════════════════════════════════════════════════
   ATTENTE EEL + DÉMARRAGE
   ══════════════════════════════════════════════════ */

function waitForEel() {
    return new Promise(resolve => {
        if (typeof eel !== 'undefined') return resolve();
        const iv = setInterval(() => {
            if (typeof eel !== 'undefined') { clearInterval(iv); resolve(); }
        }, 50);
    });
}

async function initApp() {
    await waitForEel();

    /* Boutons de mode */
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const mode = e.currentTarget.dataset.mode;
            const diff = mode === 'pve'
                ? document.getElementById('difficulty-select').value
                : null;

            // Animation de sortie menu
            menuOverlay.classList.add('fade-out');
            await _wait(300);

            gameContainer.style.display = 'block';
            gameContainer.classList.add('fade-in');
            menuOverlay.style.display = 'none';
            menuOverlay.classList.remove('fade-out');

            try {
                const res = await eel.start_game(mode, diff)();
                if (res.status === 'started') {
                    currentMode = mode;
                    _resetGameVisuals();
                    await _refreshState();
                    if (_needsAiTurn()) _aiAutoPlay();
                } else {
                    _showError(res.message || 'Erreur inconnue');
                    menuOverlay.style.display = 'flex';
                    gameContainer.style.display = 'none';
                }
            } catch (err) {
                console.error(err);
                _showError('Connexion au serveur impossible.');
                menuOverlay.style.display = 'flex';
                gameContainer.style.display = 'none';
            }
        });
    });

    /* Retour menu */
    backBtn.addEventListener('click', () => {
        menuOverlay.style.display = 'flex';
        gameContainer.style.display = 'none';
        victoryOverlay.classList.remove('active');
        _removeWinLine();
        _resetAll();
        _setAiToast(false);
    });

    /* Undo */
    undoBtn.addEventListener('click', async () => {
        if (animating) return;
        const res = await eel.undo()();
        if (res.error) return;
        await _refreshState();
        if (_needsAiTurn()) _aiAutoPlay();
    });

    /* Redo */
    redoBtn.addEventListener('click', async () => {
        if (animating) return;
        const res = await eel.redo()();
        if (res.error) return;
        await _refreshState();
        if (_needsAiTurn()) _aiAutoPlay();
    });

    /* Rejouer */
    replayBtn.addEventListener('click', async () => {
        victoryOverlay.classList.remove('active');
        _removeWinLine();
        _stopWinLinePulse();
        const diff = document.getElementById('difficulty-select')?.value;
        await eel.start_game(currentMode, diff)();
        _resetGameVisuals();
        await _refreshState();
        if (_needsAiTurn()) _aiAutoPlay();
    });

    /* Nouvelle partie */
    newGameBtn.addEventListener('click', () => {
        victoryOverlay.classList.remove('active');
        _removeWinLine();
        _stopWinLinePulse();
        menuOverlay.style.display = 'flex';
        gameContainer.style.display = 'none';
        _resetAll();
        _setAiToast(false);
    });

    /* Observer plateau */
    observeBtn.addEventListener('click', () => {
        victoryOverlay.classList.remove('active');
    });
}

window.addEventListener('load', initApp);

/* ══════════════════════════════════════════════════
   INTERACTION (CLICS)
   ══════════════════════════════════════════════════ */

function onHover(obj) {
    // Remonter à la racine si hitbox enfant
    if (obj?.parent?.userData.isSidePiece) obj = obj.parent;
    if (obj?.userData.isHitBox)             obj = obj.parent;
}

function onClick(obj) {
    if (!state || state.winner || animating) return;
    if (currentMode === 'demo') return;
    if (currentMode === 'pve' && state.current_player === 'O') return;

    // Remonter à la racine (hitbox → pion)
    if (obj?.parent?.userData.isSidePiece) obj = obj.parent;
    if (obj?.userData.isHitBox)             obj = obj.parent;

    /* ── PION DE RÉSERVE ── */
    if (obj?.userData.isSidePiece) {
        if (state.phase !== 'placement') return;
        if (obj.userData.player !== state.current_player) {
            Sound.error(); return;
        }
        // Toggle sélection
        if (selectedPiece?.mesh === obj) {
            _deselectPiece();
            return;
        }
        _deselectPiece();
        selectedPiece = { type: 'side', mesh: obj, player: obj.userData.player };
        _elevate(obj, true);
        Sound.pickUp();
        _updateHighlights();
        return;
    }

    /* ── NŒUD DU PLATEAU ── */
    if (obj?.userData.isNode) {
        const idx = obj.userData.index;

        // Phase placement : poser un pion
        if (state.phase === 'placement' && selectedPiece?.type === 'side') {
            if (!validMoves.includes(idx)) { Sound.error(); return; }
            const { player, mesh } = selectedPiece;
            selectedPiece = null;
            _updateHighlights();
            _executePlacement(player, mesh, idx);
            return;
        }

        // Phase mouvement
        if (state.phase === 'mouvement') {
            if (!selectedPiece || selectedPiece.type === 'side') {
                // Sélectionner un pion sur le plateau
                if (state.board[idx] !== state.current_player) return;
                if (!pieceOnBoard[idx]) return;
                _deselectPiece();
                selectedPiece = { type: 'board', index: idx, mesh: pieceOnBoard[idx] };
                _elevate(pieceOnBoard[idx], true);
                Sound.pickUp();
                _updateHighlights();
                return;
            }
            if (selectedPiece.type === 'board') {
                const src  = selectedPiece.index;
                const mesh = selectedPiece.mesh;
                _deselectPiece();
                if (src === idx) { _updateHighlights(); return; }
                const ok = validMoves.some(m => Array.isArray(m) && m[0] === src && m[1] === idx);
                if (!ok) {
                    // Re-sélection ?
                    if (state.board[idx] === state.current_player && pieceOnBoard[idx]) {
                        selectedPiece = { type: 'board', index: idx, mesh: pieceOnBoard[idx] };
                        _elevate(pieceOnBoard[idx], true);
                        Sound.pickUp();
                        _updateHighlights();
                    } else {
                        Sound.error();
                    }
                    return;
                }
                _executeMove(mesh, src, idx);
            }
        }
        return;
    }

    // Clic dans le vide → déselect
    _deselectPiece();
    _updateHighlights();
}

/* ══════════════════════════════════════════════════
   SÉLECTION / DÉSELECTION
   ══════════════════════════════════════════════════ */

function _deselectPiece() {
    if (!selectedPiece) return;
    if (selectedPiece.mesh) _elevate(selectedPiece.mesh, false);
    selectedPiece = null;
    _updateHighlights();
}

/** Monte / descend légèrement un pion pour montrer qu'il est sélectionné. */
function _elevate(mesh, up) {
    if (!mesh) return;
    const base = mesh.userData.isSidePiece ? PIECE_REST_Y : PIECE_REST_Y;
    mesh.position.y = up ? base + 0.12 : base;
    mesh.material.emissiveIntensity = up ? 1.8 : 0.5;
}

/* ══════════════════════════════════════════════════
   HIGHLIGHTS
   ══════════════════════════════════════════════════ */

function _updateHighlights() {
    nodeObjects.forEach(n => {
        if (n.userData.highlight) n.userData.highlight.visible = false;
    });
    if (!state || state.winner) return;

    if (state.phase === 'placement' && selectedPiece?.type === 'side') {
        validMoves.forEach(idx => {
            const n = nodeObjects.find(no => no.userData.index === idx);
            if (n?.userData.highlight) n.userData.highlight.visible = true;
        });
    }

    if (state.phase === 'mouvement' && selectedPiece?.type === 'board') {
        validMoves.forEach(m => {
            if (!Array.isArray(m) || m[0] !== selectedPiece.index) return;
            const n = nodeObjects.find(no => no.userData.index === m[1]);
            if (n?.userData.highlight) n.userData.highlight.visible = true;
        });
    }
}

/* ══════════════════════════════════════════════════
   ANIMATIONS DE DÉPLACEMENT
   ══════════════════════════════════════════════════ */

function _animateMove(mesh, startPos, endPos, duration = 850) {
    return new Promise(resolve => {
        const t0 = performance.now();
        function step(now) {
            const raw  = Math.min((now - t0) / duration, 1);
            const ease = raw < 0.5
                ? 2 * raw * raw
                : 1 - Math.pow(-2 * raw + 2, 2) / 2;

            mesh.position.lerpVectors(startPos, endPos, ease);
            // Arc parabolique
            mesh.position.y = startPos.y + (endPos.y - startPos.y) * ease
                + 0.3 * Math.sin(ease * Math.PI);
            mesh.rotation.y += 0.06;

            raw < 1 ? requestAnimationFrame(step) : (mesh.position.copy(endPos), resolve());
        }
        requestAnimationFrame(step);
    });
}

/* ── Caméra contextuelle ── */
const CAM_TARGETS = {
    X: { pos: new THREE.Vector3(-2.5, 4.2, 5.5), look: new THREE.Vector3(-0.5, 0, 0) },
    O: { pos: new THREE.Vector3( 2.5, 4.2, 5.5), look: new THREE.Vector3( 0.5, 0, 0) },
    center: { pos: new THREE.Vector3(0, 5.5, 7), look: new THREE.Vector3(0, 0.2, 0) }
};

function _animateCamera(targetPos, targetLook, duration = 900) {
    return new Promise(resolve => {
        const t0       = performance.now();
        const startPos = camera.position.clone();
        const startLook = controls.target.clone();
        controls.enabled = false;
        function step(now) {
            const raw  = Math.min((now - t0) / duration, 1);
            const ease = raw < 0.5
                ? 2 * raw * raw
                : 1 - Math.pow(-2 * raw + 2, 2) / 2;
            camera.position.lerpVectors(startPos,  targetPos,  ease);
            controls.target.lerpVectors(startLook, targetLook, ease);
            if (raw < 1) {
                requestAnimationFrame(step);
            } else {
                camera.position.copy(targetPos);
                controls.target.copy(targetLook);
                controls.enabled = true;
                resolve();
            }
        }
        requestAnimationFrame(step);
    });
}

function _moveCameraForPlayer(player) {
    if (!player) return;
    const t = CAM_TARGETS[player];
    if (t) _animateCamera(t.pos, t.look, 900);
}

/* ══════════════════════════════════════════════════
   EXÉCUTION DE COUPS
   ══════════════════════════════════════════════════ */

async function _executePlacement(player, mesh, targetIdx) {
    if (animating) return;
    animating = true;

    // Appel serveur
    const res = await eel.make_move(targetIdx)();
    if (res.error) {
        console.warn('Placement refusé :', res.error);
        animating = false;
        return;
    }

    // Retirer de la réserve
    const arr = sidePieces[player];
    const pos = arr.indexOf(mesh);
    if (pos > -1) arr.splice(pos, 1);
    delete mesh.userData.isSidePiece;

    // Animer
    const targetNode = nodeObjects.find(n => n.userData.index === targetIdx);
    const endPos = targetNode.position.clone();
    endPos.y = PIECE_REST_Y;
    await _animateMove(mesh, mesh.position.clone(), endPos, 850);
    pieceOnBoard[targetIdx] = mesh;
    _updateInteractiveList();

    Sound.place();
    animating = false;

    await _refreshState();
    if (_needsAiTurn()) _aiAutoPlay();
}

async function _executeMove(mesh, src, dst) {
    if (animating) return;
    animating = true;

    const res = await eel.make_move([src, dst])();
    if (res.error) {
        console.warn('Mouvement refusé :', res.error);
        animating = false;
        return;
    }

    const startNode = nodeObjects.find(n => n.userData.index === src);
    const endNode   = nodeObjects.find(n => n.userData.index === dst);
    const startPos  = startNode.position.clone(); startPos.y = PIECE_REST_Y;
    const endPos    = endNode.position.clone();   endPos.y   = PIECE_REST_Y;

    await _animateMove(mesh, startPos, endPos, 800);
    pieceOnBoard[dst] = mesh;
    delete pieceOnBoard[src];

    Sound.move();
    animating = false;

    await _refreshState();
    if (_needsAiTurn()) _aiAutoPlay();
}

/* ══════════════════════════════════════════════════
   IA AUTO-PLAY
   ══════════════════════════════════════════════════ */

async function _aiAutoPlay() {
    if (animating) return;
    _setAiToast(true);
    Sound.thinkStart();

    const oldBoard = state ? [...state.board] : null;
    let res;
    try {
        res = await eel.make_move('ai')();
    } catch (e) {
        console.error('Erreur IA :', e);
        _setAiToast(false);
        return;
    }
    _setAiToast(false);
    if (res?.error) return;

    // Détecter le coup joué par comparaison d'états
    const newState = await eel.get_state()();
    const nb = newState.board;
    let move = null;

    if (oldBoard) {
        // Placement ?
        for (let i = 0; i < 9; i++) {
            if (!oldBoard[i] && nb[i]) {
                move = { type: 'place', index: i, player: nb[i] };
                break;
            }
        }
        // Déplacement ?
        if (!move) {
            for (let i = 0; i < 9; i++) {
                if (oldBoard[i] && !nb[i]) {
                    const pl = oldBoard[i];
                    for (let j = 0; j < 9; j++) {
                        if (!oldBoard[j] && nb[j] === pl) {
                            move = { type: 'move', src: i, dst: j, player: pl };
                            break;
                        }
                    }
                    break;
                }
            }
        }
    }

    if (move) {
        animating = true;
        if (move.type === 'place') {
            const arr = sidePieces[move.player];
            if (arr.length > 0) {
                const mesh = arr.shift();
                delete mesh.userData.isSidePiece;
                const node   = nodeObjects.find(n => n.userData.index === move.index);
                const endPos = node.position.clone(); endPos.y = PIECE_REST_Y;
                await _animateMove(mesh, mesh.position.clone(), endPos, 950);
                pieceOnBoard[move.index] = mesh;
                _updateInteractiveList();
                Sound.place();
            }
        } else {
            const mesh = pieceOnBoard[move.src];
            if (mesh) {
                const sNode = nodeObjects.find(n => n.userData.index === move.src);
                const eNode = nodeObjects.find(n => n.userData.index === move.dst);
                const sp    = sNode.position.clone(); sp.y = PIECE_REST_Y;
                const ep    = eNode.position.clone(); ep.y = PIECE_REST_Y;
                await _animateMove(mesh, sp, ep, 850);
                pieceOnBoard[move.dst] = mesh;
                delete pieceOnBoard[move.src];
                Sound.move();
            }
        }
        animating = false;
    }

    await _refreshState();

    // En démo, enchaîner avec un délai
    if (_needsAiTurn()) {
        await _wait(currentMode === 'demo' ? 900 : 500);
        _aiAutoPlay();
    }
}

/* ══════════════════════════════════════════════════
   SYNCHRONISATION ÉTAT ↔ VISUEL
   ══════════════════════════════════════════════════ */

async function _refreshState() {
    try {
        state      = await eel.get_state()();
        validMoves = state.valid_moves || [];
        _updateHUD();
        await _syncPiecesWithState();
        _updateHighlights();
        if (!state.winner) _moveCameraForPlayer(state.current_player);
        _checkVictory();
    } catch (e) {
        console.error('Erreur refreshState :', e);
    }
}

async function _syncPiecesWithState() {
    // Retirer de pieceOnBoard les cases redevenues vides
    for (const idx in pieceOnBoard) {
        if (state.board[idx] === null || state.board[idx] === undefined) {
            const mesh = pieceOnBoard[idx];
            const player = mesh.userData.player;
            if (!sidePieces[player].includes(mesh)) {
                sidePieces[player].push(mesh);
                mesh.userData.isSidePiece = true;
            }
            delete pieceOnBoard[idx];
        }
    }

    // Ajouter les pions manquants
    for (let i = 0; i < 9; i++) {
        const player = state.board[i];
        if (player && !pieceOnBoard[i]) {
            let mesh = sidePieces[player].shift();
            if (!mesh) {
                mesh = createPiece(player);
                scene.add(mesh);
            }
            delete mesh.userData.isSidePiece;
            const node = nodeObjects.find(n => n.userData.index === i);
            mesh.position.copy(node.position);
            mesh.position.y = PIECE_REST_Y;
            mesh.material.emissiveIntensity = 0.5;
            pieceOnBoard[i] = mesh;
        }
    }

    // Repositionner les pièces de réserve
    for (const player of ['X', 'O']) {
        const slots = SIDE_POSITIONS[player];
        sidePieces[player].forEach((mesh, i) => {
            if (i < slots.length) {
                mesh.position.copy(slots[i]);
                mesh.visible = true;
                mesh.userData.isSidePiece = true;
                mesh.material.emissiveIntensity = 0.5;
            } else {
                mesh.visible = false;
            }
        });
    }

    _updateInteractiveList();

    // Invalider sélection si incohérente après sync
    if (selectedPiece) {
        if (selectedPiece.type === 'board' && !pieceOnBoard[selectedPiece.index]) {
            selectedPiece = null;
        } else if (selectedPiece.type === 'side' && !sidePieces[selectedPiece.player]?.includes(selectedPiece.mesh)) {
            selectedPiece = null;
        }
    }
}

function _updateInteractiveList() {
    const interactive = [
        ...nodeObjects,
        ...sidePieces.X.filter(p => p.visible),
        ...sidePieces.O.filter(p => p.visible)
    ];
    setNodeObjects(interactive);
}

/* ══════════════════════════════════════════════════
   HUD
   ══════════════════════════════════════════════════ */

function _updateHUD() {
    if (!state) return;
    const isBronze = state.current_player === 'X';

    if (state.winner) {
        const winnerName = state.winner === 'X' ? 'Bronze' : 'Argent';
        chipLabel.textContent = winnerName;
        phaseBadge.textContent = 'Terminé';
        replayBtn.style.display = 'flex';
        turnMessage.classList.add('hidden');
        undoBtn.disabled = true;
        redoBtn.disabled = true;
    } else {
        const colorName = isBronze ? 'Bronze' : 'Argent';
        chipLabel.textContent = colorName;
        playerChip.classList.toggle('silver', !isBronze);
        phaseBadge.textContent = state.phase === 'placement' ? 'Placement' : 'Mouvement';
        replayBtn.style.display = 'none';
        undoBtn.disabled = false;
        redoBtn.disabled = false;

        // Message de tour
        turnMessage.classList.remove('hidden');
        if (_needsAiTurn()) {
            turnMsgIcon.textContent = '⚙';
            turnMsgText.textContent = 'L\'IA réfléchit…';
        } else if (currentMode === 'demo') {
            turnMsgIcon.textContent = '🎲';
            turnMsgText.textContent = 'Démo — IA contre IA';
        } else {
            turnMsgIcon.textContent = '●';
            turnMsgText.textContent = `À ${colorName} de jouer`;
        }
    }
}

/* ══════════════════════════════════════════════════
   VICTOIRE
   ══════════════════════════════════════════════════ */

function _checkVictory() {
    if (!state?.winner || winLine) return;

    const player = state.winner;
    const board  = state.board;
    const line   = WINNING_LINES.find(l =>
        board[l[0]] === player && board[l[1]] === player && board[l[2]] === player
    );
    if (!line) return;

    const p1 = nodeObjects.find(n => n.userData.index === line[0]).position.clone();
    const p2 = nodeObjects.find(n => n.userData.index === line[2]).position.clone();
    p1.y = p2.y = 0.06;
    winLine = createWinLine(p1, p2);
    scene.add(winLine);

    // Pulsation de la ligne de victoire
    let t = 0;
    winLinePulse = setInterval(() => {
        t += 0.08;
        if (winLine) {
            winLine.children[0].intensity = 1.2 + 0.8 * Math.sin(t);
            winLine.material && (winLine.material.emissiveIntensity = 2.5 + 1.5 * Math.sin(t));
        }
    }, 30);

    Sound.victory();
    _spawnConfetti();

    setTimeout(() => {
        const winnerName = player === 'X' ? '✦ Bronze' : '✧ Argent';
        victoryWinner.textContent = winnerName;
        victoryOverlay.classList.add('active');
    }, 1800);
}

function _removeWinLine() {
    if (winLine) { scene.remove(winLine); winLine = null; }
}
function _stopWinLinePulse() {
    if (winLinePulse) { clearInterval(winLinePulse); winLinePulse = null; }
}

/* ══════════════════════════════════════════════════
   CONFETTIS 2D (canvas HTML — plus performant)
   ══════════════════════════════════════════════════ */

function _spawnConfetti() {
    if (!confettiCanvas) return;
    confettiCanvas.style.display = 'block';
    confettiCanvas.width  = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    const ctx = confettiCanvas.getContext('2d');

    const COLORS = ['#ffd700','#c9a24b','#00d4ff','#ff6b9d','#69ff94','#c0c0c0'];
    const pieces = Array.from({ length: 140 }, () => ({
        x:  Math.random() * confettiCanvas.width,
        y: -20 - Math.random() * 80,
        w:  6 + Math.random() * 8,
        h:  10 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        vy: 2 + Math.random() * 4,
        vx: (Math.random() - 0.5) * 2,
        angle:  Math.random() * Math.PI * 2,
        dAngle: (Math.random() - 0.5) * 0.18
    }));

    const start = performance.now();
    function draw(now) {
        const elapsed = (now - start) / 1000;
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        let alive = false;
        pieces.forEach(p => {
            p.y     += p.vy;
            p.x     += p.vx;
            p.angle += p.dAngle;
            p.vy    += 0.05;  // gravité légère
            if (p.y < confettiCanvas.height + 20) alive = true;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, 1 - elapsed / 4);
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });
        if (alive && elapsed < 5) requestAnimationFrame(draw);
        else {
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            confettiCanvas.style.display = 'none';
        }
    }
    requestAnimationFrame(draw);
}

/* ══════════════════════════════════════════════════
   TOAST IA
   ══════════════════════════════════════════════════ */

function _setAiToast(visible) {
    if (!aiToast) return;
    aiToast.classList.toggle('visible', visible);
}

/* ══════════════════════════════════════════════════
   RÉINITIALISATIONS
   ══════════════════════════════════════════════════ */

function _resetAll() {
    for (const idx in pieceOnBoard) {
        scene.remove(pieceOnBoard[idx]);
    }
    pieceOnBoard = {};
    for (const player of ['X', 'O']) {
        sidePieces[player].forEach(p => scene.remove(p));
    }
    sidePieces    = { X: [], O: [] };
    selectedPiece = null;
    state         = null;
    validMoves    = [];
    _removeWinLine();
    _stopWinLinePulse();
    _updateHighlights();
}

function _resetGameVisuals() {
    // Remettre tous les pions du plateau en réserve
    for (const idx in pieceOnBoard) {
        const mesh   = pieceOnBoard[idx];
        const player = mesh.userData.player;
        mesh.userData.isSidePiece = true;
        if (!sidePieces[player].includes(mesh)) sidePieces[player].push(mesh);
    }
    pieceOnBoard = {};

    // S'assurer d'avoir 3 pions par joueur
    for (const player of ['X', 'O']) {
        while (sidePieces[player].length < 3) {
            const mesh = createPiece(player);
            mesh.userData.isSidePiece = true;
            sidePieces[player].push(mesh);
            scene.add(mesh);
        }
        // Couper le surplus
        while (sidePieces[player].length > 3) {
            const extra = sidePieces[player].pop();
            scene.remove(extra);
        }
        sidePieces[player].forEach((mesh, i) => {
            mesh.visible  = true;
            mesh.position.copy(SIDE_POSITIONS[player][i]);
            mesh.material.emissiveIntensity = 0.5;
        });
    }

    selectedPiece = null;
    state         = null;
    validMoves    = [];
    _removeWinLine();
    _stopWinLinePulse();
    _updateInteractiveList();
    _updateHighlights();
}

/* ══════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════ */

function _needsAiTurn() {
    if (!state || state.winner) return false;
    if (currentMode === 'demo') return true;
    if (currentMode === 'pve' && state.current_player === 'O') return true;
    return false;
}

function _wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function _showError(msg) {
    // Toast d'erreur simple non bloquant
    const t = document.createElement('div');
    t.style.cssText = `
        position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
        background:rgba(180,40,40,0.9);color:#fff;padding:.6rem 1.4rem;
        border-radius:20px;font-size:.88rem;z-index:999;
        animation:fade-in .3s ease;
    `;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}