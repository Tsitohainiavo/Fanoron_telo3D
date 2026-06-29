import * as THREE from 'three';

export const PLANK_THICKNESS = 0.15;
export const PIECE_REST_Y = 0.05;
export const SIDE_Y = -0.15 + PIECE_REST_Y;

export const SIDE_POSITIONS = {
    X: [
        new THREE.Vector3(-2.4, SIDE_Y, -0.7),
        new THREE.Vector3(-2.4, SIDE_Y, 0),
        new THREE.Vector3(-2.4, SIDE_Y, 0.7)
    ],
    O: [
        new THREE.Vector3(2.4, SIDE_Y, -0.7),
        new THREE.Vector3(2.4, SIDE_Y, 0),
        new THREE.Vector3(2.4, SIDE_Y, 0.7)
    ]
};

export const WINNING_LINES = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
];

function createMarbleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#555555'; ctx.lineWidth = 1.5;
    for (let i=0;i<80;i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random()*512, Math.random()*512);
        ctx.bezierCurveTo(Math.random()*512,Math.random()*512,Math.random()*512,Math.random()*512,Math.random()*512,Math.random()*512);
        ctx.stroke();
    }
    ctx.strokeStyle = '#888888'; ctx.lineWidth = 2.5;
    for (let i=0;i<15;i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random()*512, Math.random()*512);
        ctx.bezierCurveTo(Math.random()*512,Math.random()*512,Math.random()*512,Math.random()*512,Math.random()*512,Math.random()*512);
        ctx.stroke();
    }
    // Cercles pour les cases
    ctx.strokeStyle = '#444444'; ctx.lineWidth = 2;
    for (let row=0; row<3; row++) {
        for (let col=0; col<3; col++) {
            const x = 85 + col*170, y = 85 + row*170;
            ctx.beginPath();
            ctx.arc(x, y, 22, 0, Math.PI*2);
            ctx.stroke();
        }
    }
    return new THREE.CanvasTexture(canvas);
}

const marbleTex = createMarbleTexture();
const boardMat = new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.6, metalness: 0.05 }); // moins réfléchissant
const lineMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.1 });

export function createBoard() {
    const group = new THREE.Group();

    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.8, PLANK_THICKNESS, 2.8), boardMat);
    plank.position.y = -PLANK_THICKNESS / 2;
    plank.receiveShadow = true; plank.castShadow = true;
    group.add(plank);

    const positions = [];
    for (let z = 1; z >= -1; z -= 1) {
        for (let x = -1; x <= 1; x++) {
            positions.push(new THREE.Vector3(x, 0, z));
        }
    }

    const markerGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.02, 8);
    const markerMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1, metalness: 0, transparent: true, opacity: 0.0 });
    const highlightGeo = new THREE.RingGeometry(0.28, 0.35, 32);
    const highlightMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00aaaa, emissiveIntensity: 0.7, side: THREE.DoubleSide });

    positions.forEach((pos, i) => {
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.copy(pos);
        marker.position.y = 0.08;
        marker.userData.index = i;
        marker.userData.isNode = true;
        marker.name = 'node';
        group.add(marker);

        const highlight = new THREE.Mesh(highlightGeo, highlightMat);
        highlight.position.copy(pos);
        highlight.position.y = 0.09;
        highlight.rotation.x = -Math.PI / 2;
        highlight.visible = false;
        marker.userData.highlight = highlight;
        group.add(highlight);
    });

    const lineGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 8);
    const edges = [
        [0,1],[1,2],[0,3],[3,6],[6,7],[7,8],[2,5],[5,8],
        [0,4],[2,4],[6,4],[8,4],[1,4],[3,4],[5,4],[7,4]
    ];
    edges.forEach(([i,j]) => {
        const p1 = positions[i], p2 = positions[j];
        const mid = p1.clone().add(p2).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(p2, p1);
        const length = dir.length();
        const cyl = new THREE.Mesh(lineGeo, lineMat);
        cyl.scale.y = length;
        cyl.position.copy(mid);
        cyl.position.y = 0.05;
        cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
        cyl.receiveShadow = true; cyl.castShadow = true;
        group.add(cyl);
    });

    return group;
}

// Pion (inchangé)
const pieceGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 6);
const hitGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 6);

export function createPiece(player) {
    const color = player === 'X' ? 0xcd7f32 : 0xc0c0c0;
    const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.6,
        emissive: new THREE.Color(color).multiplyScalar(0.1),
        emissiveIntensity: 0.3
    });
    const piece = new THREE.Mesh(pieceGeo, mat);
    piece.castShadow = true;
    piece.receiveShadow = true;
    piece.userData.player = player;
    piece.rotation.y = Math.random() * Math.PI;

    const hitMat = new THREE.MeshBasicMaterial({ visible: false, transparent: true, opacity: 0 });
    const hitBox = new THREE.Mesh(hitGeo, hitMat);
    hitBox.userData.isHitBox = true;
    piece.add(hitBox);

    return piece;
}

export function createWinLine(startPos, endPos) {
    const dir = new THREE.Vector3().subVectors(endPos, startPos);
    const length = dir.length();
    const mid = startPos.clone().add(endPos).multiplyScalar(0.5);
    const geo = new THREE.CylinderGeometry(0.04, 0.04, length, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 1.5 });
    const line = new THREE.Mesh(geo, mat);
    line.position.copy(mid);
    line.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
    return line;
}