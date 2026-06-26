// board.js - Création du plateau et des pions 3D
import * as THREE from 'three';

// --- Matériaux ---
// Bois naturel pour la planche
const woodTexture = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  // Dégradé imitant le bois
  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#8b5a2b');
  gradient.addColorStop(0.3, '#a0522d');
  gradient.addColorStop(0.6, '#6b3e1b');
  gradient.addColorStop(1, '#8b5a2b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  // Ajout de veines
  ctx.strokeStyle = '#5c3317';
  ctx.lineWidth = 2;
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 512, 0);
    ctx.bezierCurveTo(Math.random() * 512, 128, Math.random() * 512, 384, Math.random() * 512, 512);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
})();

const boardMaterial = new THREE.MeshStandardMaterial({
  map: woodTexture,
  roughness: 0.7,
  metalness: 0.1,
});

// Intersections : petites pierres plates
const nodeGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.08, 16);
const nodeMat = new THREE.MeshStandardMaterial({
  color: 0xdddddd,
  roughness: 0.4,
  metalness: 0.3,
  emissive: new THREE.Color(0x111111),
  emissiveIntensity: 0.2,
});

// Lignes : fines et métalliques
const lineGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 8);
const lineMat = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  roughness: 0.3,
  metalness: 0.8,
  emissive: new THREE.Color(0x000000),
  emissiveIntensity: 0.1,
});

// Pions : sphères brillantes
const pieceGeo = new THREE.SphereGeometry(0.22, 32, 32);

export function createBoard() {
  const boardGroup = new THREE.Group();

  // Planche de bois (carrée)
  const plankGeo = new THREE.BoxGeometry(2.8, 0.1, 2.8);
  const plank = new THREE.Mesh(plankGeo, boardMaterial);
  plank.position.set(0, -0.15, 0);
  plank.receiveShadow = true;
  plank.castShadow = true;
  boardGroup.add(plank);

  // Positions 3D des 9 intersections (grille 2x2 centrée)
  const positions = [];
  for (let z = 1; z >= -1; z -= 1) {
    for (let x = -1; x <= 1; x++) {
      positions.push(new THREE.Vector3(x, 0, z));
    }
  }

  // Nœuds d'intersection
  positions.forEach((pos, index) => {
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    node.position.copy(pos);
    node.position.y = 0.05; // légèrement au-dessus de la planche
    node.castShadow = true;
    node.receiveShadow = true;
    node.userData.index = index; // <-- essentiel pour les clics
    node.userData.isNode = true;
    boardGroup.add(node);
  });

  // Lignes entre les intersections (selon adjacences)
  const edges = [
    [0,1], [1,2], [0,3], [3,6], [6,7], [7,8], [2,5], [5,8],
    [0,4], [2,4], [6,4], [8,4], [1,4], [3,4], [5,4], [7,4]
  ];
  edges.forEach(([i, j]) => {
    const p1 = positions[i];
    const p2 = positions[j];
    const mid = p1.clone().add(p2).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const length = dir.length();
    const cyl = new THREE.Mesh(lineGeo, lineMat);
    cyl.scale.y = length;
    cyl.position.copy(mid);
    cyl.position.y = 0.05;
    cyl.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    cyl.castShadow = true;
    cyl.receiveShadow = true;
    boardGroup.add(cyl);
  });

  return boardGroup;
}

export function createPiece(player) {
  const color = player === 'X' ? 0x00ffff : 0xff5599;
  const mat = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.25,
    metalness: 0.3,
    emissive: new THREE.Color(color).multiplyScalar(0.5),
    emissiveIntensity: 0.8,
  });
  const piece = new THREE.Mesh(pieceGeo, mat);
  piece.castShadow = true;
  piece.receiveShadow = true;
  piece.userData.player = player;
  return piece;
}