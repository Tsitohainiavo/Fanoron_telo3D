import * as THREE from 'three';

export const PLANK_THICKNESS = 0.15;
export const PIECE_REST_Y = 0.05;   // moitié hauteur pion (0.1/2)
export const SIDE_PIECE_Y = 0.02;   // hauteur des pions sur les supports

// Positions des 3 emplacements de chaque côté (X et O)
// X à gauche (x négatif), O à droite (x positif), espacés en Z
export const SIDE_POSITIONS = {
    X: [new THREE.Vector3(-2.4, SIDE_PIECE_Y, -0.7), new THREE.Vector3(-2.4, SIDE_PIECE_Y, 0), new THREE.Vector3(-2.4, SIDE_PIECE_Y, 0.7)],
    O: [new THREE.Vector3(2.4, SIDE_PIECE_Y, -0.7), new THREE.Vector3(2.4, SIDE_PIECE_Y, 0), new THREE.Vector3(2.4, SIDE_PIECE_Y, 0.7)]
};

// Texture marbre
function createMarbleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#444444'; ctx.lineWidth = 1.5;
    for (let i=0;i<80;i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random()*512, Math.random()*512);
        ctx.bezierCurveTo(Math.random()*512,Math.random()*512,Math.random()*512,Math.random()*512,Math.random()*512,Math.random()*512);
        ctx.stroke();
    }
    ctx.strokeStyle = '#777777'; ctx.lineWidth = 2.5;
    for (let i=0;i<15;i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random()*512, Math.random()*512);
        ctx.bezierCurveTo(Math.random()*512,Math.random()*512,Math.random()*512,Math.random()*512,Math.random()*512,Math.random()*512);
        ctx.stroke();
    }
    ctx.strokeStyle = '#333333'; ctx.lineWidth = 2;
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
const boardMat = new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.3, metalness: 0.2 });
const lineMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.3 });

// Plateau principal
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

    // Marqueurs de clic invisibles + surbrillances
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

    // Lignes
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

// Petits socles décoratifs pour les pions de côté
export function createSideStands() {
    const group = new THREE.Group();
    const standGeo = new THREE.CylinderGeometry(0.28, 0.3, 0.08, 16);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x2a1e1a, roughness: 0.6, metalness: 0.2 });

    for (const player of ['X', 'O']) {
        SIDE_POSITIONS[player].forEach(pos => {
            const stand = new THREE.Mesh(standGeo, standMat);
            stand.position.set(pos.x, pos.y - 0.03, pos.z);
            stand.receiveShadow = true;
            group.add(stand);
        });
    }
    return group;
}

// Pion hexagonal
const pieceGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 6);
export function createPiece(player) {
    const color = player === 'X' ? 0xcd7f32 : 0xc0c0c0;
    const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.8,
        emissive: new THREE.Color(color).multiplyScalar(0.15),
        emissiveIntensity: 0.5
    });
    const piece = new THREE.Mesh(pieceGeo, mat);
    piece.castShadow = true;
    piece.receiveShadow = true;
    piece.userData.player = player;
    piece.rotation.y = Math.random() * Math.PI;
    return piece;
}