import * as THREE from 'three';

// --- Texture marbre sombre générée procéduralement ---
function createMarbleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Fond noir profond
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 512, 512);

    // Veines de marbre (blanc/argenté)
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 80; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * 512, Math.random() * 512);
        ctx.bezierCurveTo(
            Math.random() * 512, Math.random() * 512,
            Math.random() * 512, Math.random() * 512,
            Math.random() * 512, Math.random() * 512
        );
        ctx.stroke();
    }

    // Veines plus épaisses et plus claires
    ctx.strokeStyle = '#777777';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 15; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * 512, Math.random() * 512);
        ctx.bezierCurveTo(
            Math.random() * 512, Math.random() * 512,
            Math.random() * 512, Math.random() * 512,
            Math.random() * 512, Math.random() * 512
        );
        ctx.stroke();
    }

    // Cercles gravés discrets (pour les intersections)
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const x = 85 + col * 170;
            const y = 85 + row * 170;
            ctx.beginPath();
            ctx.arc(x, y, 22, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    return new THREE.CanvasTexture(canvas);
}

const marbleTexture = createMarbleTexture();
const boardMat = new THREE.MeshStandardMaterial({
    map: marbleTexture,
    roughness: 0.3,
    metalness: 0.2,
});

// Lignes de connexion (discrètes)
const lineMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.5,
    metalness: 0.3,
});

// Repères de clic (invisibles mais solides)
const markerGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.02, 8);
const markerMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.0,   // complètement transparent, mais participe au raycasting
});

export function createBoard() {
    const group = new THREE.Group();

    // Planche en marbre
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.15, 2.8), boardMat);
    plank.position.y = -0.075;
    plank.receiveShadow = true;
    plank.castShadow = true;
    group.add(plank);

    // Positions des intersections
    const positions = [];
    for (let z = 1; z >= -1; z -= 1) {
        for (let x = -1; x <= 1; x++) {
            positions.push(new THREE.Vector3(x, 0, z));
        }
    }

    // Repères de clic (transparents)
    positions.forEach((pos, i) => {
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.copy(pos);
        marker.position.y = 0.08;
        marker.userData.index = i;
        marker.userData.isNode = true;
        marker.name = 'node';
        group.add(marker);
    });

    // Lignes de connexion
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
        cyl.receiveShadow = true;
        cyl.castShadow = true;
        group.add(cyl);
    });

    return group;
}

// Pions : plus gros et très visibles
const pieceGeo = new THREE.SphereGeometry(0.26, 32, 32);
export function createPiece(player) {
    const color = player === 'X' ? 0x00ffff : 0xff44aa;
    const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.15,
        metalness: 0.1,
        emissive: new THREE.Color(color).multiplyScalar(0.7),
        emissiveIntensity: 1.2,
    });
    const piece = new THREE.Mesh(pieceGeo, mat);
    piece.castShadow = true;
    piece.receiveShadow = true;
    piece.userData.player = player;
    return piece;
}