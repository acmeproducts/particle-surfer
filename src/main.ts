import * as THREE from "three";

// @ts-ignore
import Stats from "stats.js";
import { ParticleSystem } from "./particle-system";
import { Particle } from "./particle";

let stats: Stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

const visibleArea = 4;
const trailHalfLife = 0.15; // seconds, adjust to taste
const tau = trailHalfLife / Math.log(2);

const innerRingRadius = 5;
const outerRingRadius = 7;

let renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.OrthographicCamera,
  keys: { [key: string]: boolean } = {},
  clock: THREE.Clock,
  particles: ParticleSystem[] = [],
  player: THREE.Mesh,
  playerPart: Particle,
  active: number = 0,
  size: THREE.Vector2,
  stop: boolean = false,
  helpCamera: THREE.PerspectiveCamera,
  debugOn: boolean = false,
  overlay: THREE.Mesh,
  overlayScene: THREE.Scene,
  overlayCamera: THREE.OrthographicCamera;

const levels: [number, number][] = [
  [89842, 74789],
  [41742, 37680],
  [78288, 60840],
  [15693, 83395],
  [54971, 5891],
  [29338, 42504],
  [83166, 59559],
  [14271, 26324],
  [87125, 3695],
  [43298, 94833],
  [12641, 84336],
  [81706, 92840],
  [81342, 18215],
  [68226, 9387],
  [50415, 61135],
  [40356, 68917],
  [21870, 34087],
  [77604, 4641],
  [35813, 32668],
];

let level: number = 0;

function setupScene(): void {
  renderer = new THREE.WebGLRenderer({
    antialising: true,
    preserveDrawingBuffer: true,
  } as any);

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClearColor = false;

  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onResize, false);

  scene = new THREE.Scene();

  // add black transparent rect
  overlay = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  overlay.position.set(0, 0, -10);

  overlayScene = new THREE.Scene();
  overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1);
  overlayScene.add(overlay);
  overlayCamera.position.z = 10;

  document.addEventListener(
    "keydown",
    (event: KeyboardEvent) => {
      keys[event.key] = true;
      if (event.key == " ") {
        switchActive();
      }
      if (event.key == "t") {
        stop = !stop;
      }
      if (event.key == "l") {
        nextLevel();
      }
      if (event.key == "r") {
        let s1 = Math.floor(Math.random() * 100000);
        let s2 = Math.floor(Math.random() * 100000);
        particles[0].newNoise(s1);
        particles[1].newNoise(s2);
        console.log("random level [" + s1 + ", " + s2 + "]");
        resetPlayer();
      }
      if (event.key == "d") {
        debugOn = !debugOn;
      }
    },
    false,
  );

  document.addEventListener("mouseup", () => {
    switchActive();
  });

  size = new THREE.Vector2(3, 2);

  camera = new THREE.OrthographicCamera(
    -visibleArea,
    visibleArea,
    visibleArea,
    -visibleArea,
  );
  camera.position.z = 10;
  onResize();

  clock = new THREE.Clock();

  let part1: ParticleSystem = new ParticleSystem({
    size: size,
    innerRingRadius: innerRingRadius,
    outerRingRadius: outerRingRadius,

    seed: levels[level][0],

    colorGridOptions: {
      gradientXStops: ["#ff0000", "#000000", "#000000", "#0000ff"],
      gradientYStops: ["#ff0000", "#000000", "#000000", "#0000ff"],
      detailX: 30,
      detailY: 30,
    },
  });
  let part2: ParticleSystem = new ParticleSystem({
    size: size,
    innerRingRadius: innerRingRadius,
    outerRingRadius: outerRingRadius,

    seed: levels[level][1],

    colorGridOptions: {
      gradientXStops: ["#00ff00", "#000000", "#000000", "#ffff00"],
      gradientYStops: ["#00ff00", "#000000", "#000000", "#00ffff"],
      detailX: 30,
      detailY: 30,
    },
  });

  particles.push(part1);
  particles.push(part2);

  if (part1.mesh) scene.add(part1.mesh);
  if (part2.mesh) scene.add(part2.mesh);

  switchActive();

  player = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  playerPart = new Particle();
  playerPart.pos.set(0, 0);
  playerPart.time = 1000000;
  scene.add(player);
}
function nextLevel(): void {
  level++;
  if (level >= levels.length) level = 0;

  particles[0].newNoise(levels[level][0]);
  particles[1].newNoise(levels[level][1]);
  console.log(
    "level: " + level + " [" + levels[level][0] + ", " + levels[level][1] + "]",
  );
}
function switchActive(): void {
  active++;
  if (active >= particles.length) active = 0;
  for (const element of particles) {
    if (!element.mesh) continue;
    (element.mesh.material as THREE.PointsMaterial).size = 1;
    element.mesh.visible = false;
  }

  let activeMesh = particles[active].mesh;
  if (!activeMesh) return;

  (activeMesh.material as THREE.PointsMaterial).size = 1;
  activeMesh.position.z = 0;
  activeMesh.visible = true;
}
function resetPlayer(): void {
  playerPart.reset(camera);
  playerPart.pos.set(0, 0);
  playerPart.time = 1000000;
  camera.position.x = 0;
  camera.position.y = 0;
  renderer.clear();
}
function animate(): void {
  requestAnimationFrame(animate);

  stats.begin();

  let dt: number = clock.getDelta();

  if (particles[0].mesh?.visible) particles[0].update(dt, camera);
  if (particles[1].mesh?.visible) particles[1].update(dt, camera);

  if (!stop) {
    particles[active].applyNoiseForce(playerPart, dt);

    playerPart.update(dt, particles[active].maxSpeed);
    player.position.set(playerPart.pos.x, playerPart.pos.y, 0);

    camera.position.x = (playerPart.pos.x + camera.position.x * 49) / 50;
    camera.position.y = (playerPart.pos.y + camera.position.y * 49) / 50;
  }

  const alpha = 1 - Math.exp(-dt / tau);
  (overlay.material as THREE.MeshBasicMaterial).opacity = alpha;

  renderer.render(overlayScene, overlayCamera);
  renderer.render(scene, camera);

  stats.end();
}

function onResize(): void {
  let aspect = window.innerWidth / window.innerHeight;
  if (aspect > 1) {
    camera.top = visibleArea / aspect;
    camera.bottom = -visibleArea / aspect;

    camera.right = visibleArea;
    camera.left = -visibleArea;
  } else {
    camera.top = visibleArea;
    camera.bottom = -visibleArea;

    camera.right = visibleArea * aspect;
    camera.left = -visibleArea * aspect;
  }
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

setupScene();
animate();
