import * as THREE from 'three';
import { PLANK_THICKNESS } from './board.js';

/* ------------------------------------------------------------------ *
 * Textures procédurales
 * ------------------------------------------------------------------ */
function createWoodTexture(baseColor = '#3b2113', grainColor = '#190f06', size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = grainColor;
    for (let i = 0; i < 50; i++) {
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.globalAlpha = 0.2 + Math.random() * 0.3;
        const y = Math.random() * size;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(
            size * 0.3, y + (Math.random() * 24 - 12),
            size * 0.7, y + (Math.random() * 24 - 12),
            size, y + (Math.random() * 12 - 6)
        );
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createFloorTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#16110d';
    ctx.fillRect(0, 0, size, size);
    const tile = size / 4;
    ctx.strokeStyle = '#070503';
    ctx.lineWidth = 4;
    for (let i = 0; i <= 4; i++) {
        ctx.beginPath(); ctx.moveTo(i * tile, 0); ctx.lineTo(i * tile, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * tile); ctx.lineTo(size, i * tile); ctx.stroke();
    }
    for (let i = 0; i < 250; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`;
        ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
}

/* ------------------------------------------------------------------ *
 * Appliques murales
 * ------------------------------------------------------------------ */
function createSconce(scene, x, z, y = 3.2) {
    const group = new THREE.Group();
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xc9a24b, roughness: 0.3, metalness: 0.75 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.28, 12), baseMat);
    const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xffd8a0, emissive: 0xffaa55, emissiveIntensity: 1.4, roughness: 0.3
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), bulbMat);
    bulb.position.y = -0.22;
    group.add(base, bulb);
    group.position.set(x, y, z);

    const light = new THREE.PointLight(0xffaa55, 0.55, 7.5, 2);
    light.position.set(x, y - 0.2, z + (z < 0 ? 0.35 : -0.35));
    scene.add(light);

    return group;
}

/* ------------------------------------------------------------------ *
 * Pièce complète
 * ------------------------------------------------------------------ */
export function createRoom() {
    const room = new THREE.Group();
    const FLOOR_Y = -1.35;

    // ----- Sol -----
    const floorMat = new THREE.MeshStandardMaterial({ map: createFloorTexture(), roughness: 0.65, metalness: 0.08 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y;
    floor.receiveShadow = true;
    room.add(floor);

    // ----- Tapis (élargi) -----
    const rugMat = new THREE.MeshStandardMaterial({ color: 0x5c1f1f, roughness: 0.95, metalness: 0 });
    const rug = new THREE.Mesh(new THREE.CircleGeometry(4.0, 48), rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.y = FLOOR_Y + 0.005;
    rug.receiveShadow = true;
    room.add(rug);
    const rugTrimMat = new THREE.MeshStandardMaterial({ color: 0xb8923f, roughness: 0.4, metalness: 0.6 });
    const rugTrim = new THREE.Mesh(new THREE.RingGeometry(3.95, 4.02, 64), rugTrimMat);
    rugTrim.rotation.x = -Math.PI / 2;
    rugTrim.position.y = FLOOR_Y + 0.006;
    room.add(rugTrim);

    // ----- Murs (inchangés) -----
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1c1622, roughness: 0.88, metalness: 0.04 });
    const wallBack = new THREE.Mesh(new THREE.PlaneGeometry(26, 10), wallMat);
    wallBack.position.set(0, FLOOR_Y + 5, -9);
    wallBack.receiveShadow = true;
    room.add(wallBack);
    const wallSide = new THREE.Mesh(new THREE.PlaneGeometry(26, 10), wallMat);
    wallSide.rotation.y = Math.PI / 2;
    wallSide.position.set(-9, FLOOR_Y + 5, 0);
    wallSide.receiveShadow = true;
    room.add(wallSide);
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xc9a24b, roughness: 0.35, metalness: 0.7 });
    const trimBack = new THREE.Mesh(new THREE.BoxGeometry(26, 0.22, 0.06), trimMat);
    trimBack.position.set(0, FLOOR_Y + 0.11, -8.96);
    room.add(trimBack);
    const trimSide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 26), trimMat);
    trimSide.position.set(-8.96, FLOOR_Y + 0.11, 0);
    room.add(trimSide);

    // ----- Fenêtre et tableau (inchangés) -----
    const windowGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a3318, roughness: 0.5, metalness: 0.35 });
    const glowMat = new THREE.MeshStandardMaterial({
        color: 0x223344, emissive: 0x8fa8cc, emissiveIntensity: 0.7, roughness: 0.2
    });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.4, 0.12), frameMat);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.0), glowMat);
    glow.position.z = 0.07;
    const muntinMat = frameMat;
    const muntinV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.0, 0.1), muntinMat);
    muntinV.position.z = 0.08;
    const muntinH = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.1), muntinMat);
    muntinH.position.z = 0.08;
    windowGroup.add(frame, glow, muntinV, muntinH);
    windowGroup.position.set(4.6, FLOOR_Y + 5.3, -8.88);
    room.add(windowGroup);
    const moonLight = new THREE.PointLight(0x8fb0ff, 0.6, 16);
    moonLight.position.set(4.6, FLOOR_Y + 5.3, -7.2);
    room.add(moonLight);

    const paintingGroup = new THREE.Group();
    const paintFrameMat = new THREE.MeshStandardMaterial({ color: 0x7a5a2a, roughness: 0.4, metalness: 0.55 });
    const paintCanvasMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.85 });
    const paintFrame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.4, 0.08), paintFrameMat);
    const paintCanvas = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.1), paintCanvasMat);
    paintCanvas.position.z = 0.05;
    paintingGroup.add(paintFrame, paintCanvas);
    paintingGroup.position.set(-5.4, FLOOR_Y + 5.5, -8.88);
    room.add(paintingGroup);

    room.add(createSconce(room, -3, -8.8, FLOOR_Y + 4.5));
    room.add(createSconce(room, 3, -8.8, FLOOR_Y + 4.5));

    // ----------------------------------------------------------------
    // Table ÉLARGIE pour accueillir les pions de réserve (x jusqu'à ±2.4)
    // ----------------------------------------------------------------
    const TABLE_TOP_THICKNESS = 0.12;
    const tableTopY = -PLANK_THICKNESS - TABLE_TOP_THICKNESS / 2; // -0.21

    const woodMat = new THREE.MeshStandardMaterial({ map: createWoodTexture(), roughness: 0.35, metalness: 0.18 });
    // Largeur augmentée à 5.8 (de -2.9 à 2.9)
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(5.8, TABLE_TOP_THICKNESS, 3.8), woodMat);
    tableTop.position.y = tableTopY;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    room.add(tableTop);

    // Moulure de bord
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x1a0d06, roughness: 0.4, metalness: 0.3 });
    const edge = new THREE.Mesh(new THREE.BoxGeometry(5.92, 0.05, 3.92), edgeMat);
    edge.position.y = tableTopY - TABLE_TOP_THICKNESS / 2 - 0.025;
    edge.castShadow = true;
    room.add(edge);

    // Pieds de table (recalculés pour la largeur)
    const legTopY = tableTopY - TABLE_TOP_THICKNESS / 2 - 0.05;
    const legHeight = legTopY - FLOOR_Y;
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2a160a, roughness: 0.5, metalness: 0.2 });
    const legGeo = new THREE.CylinderGeometry(0.09, 0.12, legHeight, 12);
    const legOffsetX = 2.6; // légèrement plus écartés
    const legOffsetZ = 1.65;
    const legPositions = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    legPositions.forEach(([sx, sz]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(sx * legOffsetX, FLOOR_Y + legHeight / 2, sz * legOffsetZ);
        leg.castShadow = true;
        leg.receiveShadow = true;
        room.add(leg);
    });

    // Traverses
    const braceGeo = new THREE.BoxGeometry(0.06, 0.06, legOffsetZ * 2 - 0.3);
    [-1, 1].forEach(sx => {
        const brace = new THREE.Mesh(braceGeo, legMat);
        brace.position.set(sx * legOffsetX, FLOOR_Y + legHeight * 0.22, 0);
        room.add(brace);
    });
    const braceGeo2 = new THREE.BoxGeometry(legOffsetX * 2 - 0.3, 0.06, 0.06);
    [-1, 1].forEach(sz => {
        const brace = new THREE.Mesh(braceGeo2, legMat);
        brace.position.set(0, FLOOR_Y + legHeight * 0.22, sz * legOffsetZ);
        room.add(brace);
    });

    return room;
}