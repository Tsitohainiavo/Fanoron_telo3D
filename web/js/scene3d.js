// scene3d.js - Configuration Three.js (module)
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
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);
  scene.fog = new THREE.FogExp2(0x0a0a0a, 0.0008);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(3.5, 5, 6);
  camera.lookAt(0, 0, 0);

  // OrbitControls pour rotation 360° fluide
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 3.5;
  controls.maxDistance = 9;
  controls.maxPolarAngle = Math.PI / 1.8;
  controls.target.set(0, 0, 0);
  controls.update();

  // Post-processing (bloom)
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.4, 0.85);
  bloomPass.threshold = 0.3;
  bloomPass.strength = 0.8;
  bloomPass.radius = 0.8;
  composer.addPass(bloomPass);

  // Lumières
  const ambient = new THREE.AmbientLight(0x404066);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(5, 10, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 50;
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0x3366ff, 0.8, 15);
  fillLight.position.set(-4, 2, 4);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight(0xff3399, 0.6, 15);
  rimLight.position.set(4, 2, -4);
  scene.add(rimLight);

  // Plateforme futuriste
  const gridHelper = new THREE.PolarGridHelper(3, 32, 20, 64, 0x333355, 0x222244);
  scene.add(gridHelper);

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