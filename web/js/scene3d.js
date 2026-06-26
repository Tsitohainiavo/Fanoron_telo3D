import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let scene, camera, renderer, composer, controls;

export function initScene() {
  const container = document.getElementById('game-container');
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;  // baisse exposition
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a); // fond très sombre
  scene.fog = new THREE.FogExp2(0x1a1a1a, 0.0003);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(3.5, 4, 5.5);
  camera.lookAt(0, 0, 0);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 3.5;
  controls.maxDistance = 9;
  controls.maxPolarAngle = Math.PI / 1.8;
  controls.target.set(0, 0, 0);
  controls.update();

  // Post-processing : bloom très discret
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.2, 0.5);
  bloomPass.threshold = 0.4;
  bloomPass.strength = 0.3;
  bloomPass.radius = 0.5;
  composer.addPass(bloomPass);

  // Lumières tamisées
  const ambient = new THREE.AmbientLight(0x444466);
  scene.add(ambient);

  // Lumière principale douce
  const keyLight = new THREE.DirectionalLight(0xffeedd, 0.8);
  keyLight.position.set(3, 6, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 50;
  scene.add(keyLight);

  // Remplissage chaud
  const fillLight = new THREE.PointLight(0xffaa55, 0.4, 12);
  fillLight.position.set(-3, 1, 3);
  scene.add(fillLight);

  // Contre-jour froid très léger
  const rimLight = new THREE.PointLight(0x99aaff, 0.3, 12);
  rimLight.position.set(3, 1, -4);
  scene.add(rimLight);

  window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

export function animate() {
  requestAnimationFrame(animate);
  controls.update();
  composer.render();
}

export { scene, camera, controls };