// board.js - Création du plateau et des pions 3D
import * as THREE from 'three';

// Géométries partagées
const pieceGeo = new THREE.SphereGeometry(0.22, 32, 32);
const nodeGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.1, 16);
const lineGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 8);

// Matériaux PBR
const nodeMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, roughness: 0.3, metalness: 0.9, emissive: new THREE.Color(0x004466), emissiveIntensity: 0.6 });
const lineMat = new THREE.MeshStandardMaterial({ color: 0x226688, roughness: 0.5, metalness: 0.7, emissive: new THREE.Color(0x001122), emissiveIntensity: 0.4 });

export function createBoard() {
  const boardGroup = new THREE.Group();

  // Positions 3D des 9 intersections (grille 2x2 centrée)
  const positions = [];
  for (let y = 1; y >= -1; y -= 1) {
    for (let x = -1; x <= 1; x++) {
      positions.push(new THREE.Vector3(x, 0, y));
    }
  }

  // Noeuds d'intersection
  positions.forEach(pos => {
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    node.position.copy(pos);
    node.castShadow = true;
    node.receiveShadow = true;
    boardGroup.add(node);
  });

  // Lignes (adjacences selon le diagramme)
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
  const color = player === 'X' ? 0x00ffff : 0xff3399;
  const mat = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.2,
    metalness: 0.4,
    emissive: new THREE.Color(color).multiplyScalar(0.4),
    emissiveIntensity: 0.7
  });
  const piece = new THREE.Mesh(pieceGeo, mat);
  piece.castShadow = true;
  piece.receiveShadow = true;
  piece.userData = { player };
  return piece;
}