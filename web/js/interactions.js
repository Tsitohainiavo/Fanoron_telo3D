import * as THREE from 'three';
import { camera } from './scene3d.js';

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let nodeObjects = [];
let clickHandler = null;

export function setupInteraction(callback) {
    clickHandler = callback;
    window.addEventListener('click', onMouseClick);
}

function onMouseClick(event) {
    const container = document.getElementById('game-container');
    if (container.style.display === 'none') return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(nodeObjects);
    if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (obj.userData.isNode) {
            clickHandler(obj.userData.index);
        }
    }
}

export function setNodeObjects(nodes) {
    nodeObjects = nodes;
}