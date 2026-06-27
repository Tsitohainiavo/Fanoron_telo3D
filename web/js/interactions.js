import * as THREE from 'three';
import { camera } from './scene3d.js';

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let nodeObjects = [];
let clickHandler = null;
let hoverHandler = null;

export function setupInteraction(onClick, onHover = null) {
    clickHandler = onClick;
    hoverHandler = onHover;
    window.addEventListener('click', onMouseClick);
    if (hoverHandler) {
        window.addEventListener('mousemove', onMouseMove);
    }
}

function onMouseClick(event) {
    const container = document.getElementById('game-container');
    if (container.style.display === 'none') return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(nodeObjects);
    if (intersects.length > 0) {
        clickHandler(intersects[0].object);
    } else {
        clickHandler(null);
    }
}

function onMouseMove(event) {
    if (!hoverHandler) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(nodeObjects);
    if (intersects.length > 0) {
        hoverHandler(intersects[0].object);
    } else {
        hoverHandler(null);
    }
}

export function setNodeObjects(objects) {
    nodeObjects = objects;
}