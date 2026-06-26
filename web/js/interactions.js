// interactions.js - Gestion des clics sur les intersections
import * as THREE from 'three';
import { camera } from './scene3d.js';

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let nodeObjects = []; // rempli depuis board.js
let clickCallback = null;

export function setupInteraction(callback) {
  clickCallback = callback;
  window.addEventListener('click', onMouseClick);
}

function onMouseClick(event) {
  // Ne réagit que si le conteneur du jeu est visible
  const container = document.getElementById('game-container');
  if (container.style.display === 'none') return;

  // Calculer la position normalisée de la souris
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Vérifier les intersections avec les nœuds du plateau
  const intersects = raycaster.intersectObjects(nodeObjects);
  if (intersects.length > 0) {
    const node = intersects[0].object;
    if (node.userData.isNode) {
      const index = node.userData.index;
      console.log('Clic sur intersection', index);
      if (clickCallback) clickCallback(index);
    }
  }
}

export function setNodeObjects(nodes) {
  nodeObjects = nodes;
}