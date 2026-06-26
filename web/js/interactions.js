// interactions.js - Gestion des clics sur les intersections
import * as THREE from 'three';
import { camera } from './scene3d.js';

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let intersectionsObjects = []; // sera rempli avec les nodes

export function setupInteraction(callback) {
  window.addEventListener('click', onClick, false);

  function onClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(intersectionsObjects);
    if (intersects.length > 0) {
      const index = intersects[0].object.userData.index;
      callback(index);
    }
  }
}

export function setIntersectionObjects(objects) {
  intersectionsObjects = objects;
}