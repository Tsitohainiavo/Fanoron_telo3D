import * as THREE from 'three';
import { PLANK_THICKNESS } from './board.js';

function createWoodTexture(baseColor = '#5a3a22', grainColor = '#2a180e', size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = grainColor;
    for (let i = 0; i < 60; i++) {
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
    tex.anisotropy = 4;
    return tex;
}

function createFloorTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(0, 0, size, size);
    const tile = size / 4;
    ctx.strokeStyle = '#1a0e08';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
        ctx.beginPath(); ctx.moveTo(i * tile, 0); ctx.lineTo(i * tile, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * tile); ctx.lineTo(size, i * tile); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
}

export function createRoom() {
    const room = new THREE.Group();
    const FLOOR_Y = -1.35;

    // Sol
    const floorMat = new THREE.MeshStandardMaterial({ map: createFloorTexture(), roughness: 0.6, metalness: 0.05 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y;
    floor.receiveShadow = true;
    room.add(floor);

    // Tapis
    const rugMat = new THREE.MeshStandardMaterial({ color: 0x6a2a2a, roughness: 0.9, metalness: 0 });
    const rug = new THREE.Mesh(new THREE.CircleGeometry(4.0, 48), rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.y = FLOOR_Y + 0.01;
    rug.receiveShadow = true;
    room.add(rug);
    const rugTrimMat = new THREE.MeshStandardMaterial({ color: 0xb8923f, roughness: 0.4, metalness: 0.6 });
    const rugTrim = new THREE.Mesh(new THREE.RingGeometry(3.95, 4.02, 64), rugTrimMat);
    rugTrim.rotation.x = -Math.PI / 2;
    rugTrim.position.y = FLOOR_Y + 0.012;
    room.add(rugTrim);

    // Murs
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2233, roughness: 0.8, metalness: 0.05 });
    const wallBack = new THREE.Mesh(new THREE.PlaneGeometry(26, 10), wallMat);
    wallBack.position.set(0, FLOOR_Y + 5, -9.1);
    wallBack.receiveShadow = true;
    room.add(wallBack);
    const wallSide = new THREE.Mesh(new THREE.PlaneGeometry(26, 10), wallMat);
    wallSide.rotation.y = Math.PI / 2;
    wallSide.position.set(-9.1, FLOOR_Y + 5, 0);
    wallSide.receiveShadow = true;
    room.add(wallSide);

    // Plinthes
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xc9a24b, roughness: 0.35, metalness: 0.7 });
    const trimBack = new THREE.Mesh(new THREE.BoxGeometry(26, 0.2, 0.06), trimMat);
    trimBack.position.set(0, FLOOR_Y + 0.1, -9.06);
    room.add(trimBack);
    const trimSide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 26), trimMat);
    trimSide.position.set(-9.06, FLOOR_Y + 0.1, 0);
    room.add(trimSide);

    // Fenêtre
    const windowGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a3318, roughness: 0.5, metalness: 0.35 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x223344, emissive: 0x8fa8cc, emissiveIntensity: 0.4, roughness: 0.2 });
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

    // Table
    const TABLE_TOP_THICKNESS = 0.12;
    const tableTopY = -PLANK_THICKNESS - TABLE_TOP_THICKNESS / 2;
    const woodMat = new THREE.MeshStandardMaterial({ map: createWoodTexture(), roughness: 0.35, metalness: 0.1 });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(5.8, TABLE_TOP_THICKNESS, 3.8), woodMat);
    tableTop.position.y = tableTopY;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    room.add(tableTop);

    // Bordure laiton
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xc9a24b, roughness: 0.3, metalness: 0.6 });
    const edge = new THREE.Mesh(new THREE.BoxGeometry(5.92, 0.05, 3.92), edgeMat);
    edge.position.y = tableTopY - TABLE_TOP_THICKNESS / 2 - 0.025;
    edge.castShadow = true;
    room.add(edge);

    // Pieds
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2a160a, roughness: 0.5, metalness: 0.2 });
    const legHeight = tableTopY - TABLE_TOP_THICKNESS / 2 - 0.05 - FLOOR_Y;
    const legGeo = new THREE.CylinderGeometry(0.09, 0.12, legHeight, 12);
    const legPositions = [[-2.6, -1.65], [2.6, -1.65], [-2.6, 1.65], [2.6, 1.65]];
    legPositions.forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(x, FLOOR_Y + legHeight / 2, z);
        leg.castShadow = true;
        leg.receiveShadow = true;
        room.add(leg);
    });

    return room;
}