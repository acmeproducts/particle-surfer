import * as THREE from "three";

// @ts-ignore
import Stats from "stats.js";
import { ParticleSystem } from "./particle-system";
import { Particle } from "./particle";
import { getCameraMinMax } from "./helper";

// @ts-ignore
import { Howl } from "howler";

const base = ".";

let stats: Stats = new Stats();
stats.showPanel(0);
// document.body.appendChild(stats.dom);

let state: "menu" | "game" | "pause" = "menu";

let visibleArea = 10;
const trailHalfLife = 0.15; // seconds, adjust to taste
const tau = trailHalfLife / Math.log(2);

const innerRingRadius = 4;
const outerRingRadius = 9;

const smallMultiplier = 0.05;

let multiplier = 1;

let invert = false;

let reached50 = false;

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
  overlay: THREE.Mesh,
  progressCircumference: number = 0,
  backgroundMusic: Howl,
  backgroundMusicRate: number = 1,
  goal: THREE.Mesh;

//     gradientXStops: ["#00ff00", "#000000", "#000000", "#ffff00"],
//     gradientYStops: ["#00ff00", "#000000", "#000000", "#00ffff"],

const gradientStops = {
  blue_green: {
    gradientXStops: ["#0d9488", "#000000", "#000000", "#0891b2"],
    gradientYStops: ["#1d4ed8", "#000000", "#000000", "#15803d"],
  },
  yellow_red: {
    gradientXStops: ["#ff0000", "#000000", "#000000", "#ffaa00"],
    gradientYStops: ["#ff5500", "#000000", "#000000", "#ffaa00"],
  },
  green: {
    gradientXStops: ["#00ff00", "#000000", "#000000", "#88ff00"],
    gradientYStops: ["#44ff00", "#000000", "#000000", "#00ff88"],
  },
  pink: {
    gradientXStops: ["#ff0000", "#000000", "#000000", "#ff00ff"],
    gradientYStops: ["#ff4400", "#000000", "#000000", "#880044"],
  },
  black_white: {
    gradientXStops: ["#818181", "#000000", "#000000", "#a1a1a1"],
    gradientYStops: ["#c2c2c2", "#000000", "#000000", "#959595"],
  },
  red: {
    gradientXStops: ["#ff0000", "#000000", "#000000", "#ff4400"],
    gradientYStops: ["#ff0044", "#000000", "#000000", "#ff0000"],
  },
};

const levels: {
  seed: number;
  name: string;
  colors?: { gradientXStops: string[]; gradientYStops: string[] };
}[] = [
  { seed: 89842, name: "Level 1" },
  { seed: 7459, name: "Level 2", colors: gradientStops.yellow_red },
  { seed: 22391, name: "Level 3", colors: gradientStops.green },
  { seed: 78284, name: "Level 4", colors: gradientStops.pink },
  { seed: 70828, name: "Level 5", colors: gradientStops.black_white },
  { seed: 87609, name: "Level 6", colors: gradientStops.red },
  { seed: 49585, name: "Level 7", colors: gradientStops.blue_green },
];

let level: number = 0;

function setupScene(): void {
  renderer = new THREE.WebGLRenderer({
    powerPreference: "high-performance",
    antialias: false,
    stencil: false,
    depth: false,
    preserveDrawingBuffer: true,
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClearColor = false;

  scene = new THREE.Scene();

  camera = new THREE.OrthographicCamera(
    -visibleArea,
    visibleArea,
    visibleArea,
    -visibleArea,
  );
  camera.position.z = 10;
  onResize();

  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onResize, false);

  renderer.toneMapping = THREE.ACESFilmicToneMapping;

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

  scene.add(overlay);

  document.addEventListener(
    "keydown",
    (event: KeyboardEvent) => {
      keys[event.key] = true;
      if (event.key == " " && state === "game") {
        multiplier = smallMultiplier;
      }
      // if (event.key == "t") {
      //   stop = !stop;
      // }
      if (event.key == "l") {
        nextLevel();
      }

      if (event.key == "r") {
        level = 10000;
        nextLevel();
      }
    },
    false,
  );

  document.addEventListener("mousedown", (event: MouseEvent) => {
    if (state === "game") {
      event.preventDefault();

      multiplier = smallMultiplier;
    }
  });

  document.addEventListener("mouseup", () => {
    multiplier = 1;
  });

  // add touch events
  document.addEventListener("touchstart", (event: TouchEvent) => {
    if (state === "game") {
      event.preventDefault();

      multiplier = smallMultiplier;
    }
  });

  document.addEventListener("contextmenu", (event: MouseEvent) => {
    if (state === "game") {
      event.preventDefault();
    }
  });

  document.addEventListener("touchend", () => {
    multiplier = 1;
  });

  const restartButton = document.getElementById("restart-button");
  if (restartButton) {
    restartButton.addEventListener("click", () => {
      resetPlayer();

      const deathMenu = document.getElementById("death-menu");
      if (deathMenu) {
        deathMenu.classList.add("hidden");
      }
      state = "game";
      player.visible = true;
      multiplier = 1;
    });
  }

  // pause menu

  const nextLevelButton = document.getElementById("next-level-button");
  if (nextLevelButton) {
    nextLevelButton.addEventListener("click", () => {
      nextLevel();
    });
  }

  document.addEventListener("keyup", (event: KeyboardEvent) => {
    keys[event.key] = false;

    if (event.key == " ") {
      multiplier = 1;
    }

    // if (event.key == "n") {
    //   invert = !invert;
    // }

    if (event.key == "f") {
      const fullscreen = document.fullscreenElement;
      if (fullscreen) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    }
  });

  // document.addEventListener("mouseup", () => {
  //   switchActive();
  // });

  const startButton = document.getElementById("start-button");
  if (startButton) {
    startButton.addEventListener("click", () => {
      const mainMenu = document.getElementById("main-menu");
      if (mainMenu) {
        startButton.classList.add("hidden");
        mainMenu.style.display = "none";
      }

      visibleArea = 3;
      onResize();

      player.visible = true;
      const progressBar = document.getElementById("progress-bar");
      if (progressBar) {
        progressBar.classList.remove("hidden");
      }
      resetPlayer();
      state = "game";
    });
  }

  backgroundMusic = new Howl({
    src: [`${base}/music.mp3`],
    autoplay: true,
    loop: true,
  });

  size = new THREE.Vector2(3, 2);

  const svgCircle = document.querySelector(".circle circle");
  if (!svgCircle) throw new Error("circle not found");

  // ensure stroke-dasharray is set to the true circumference
  const r = parseFloat(svgCircle.getAttribute("r") || "0");
  progressCircumference = 2 * Math.PI * r;
  svgCircle.setAttribute("stroke-dasharray", progressCircumference.toFixed(3));

  clock = new THREE.Clock();

  let part1: ParticleSystem = new ParticleSystem({
    size: size,
    innerRingRadius: innerRingRadius,
    outerRingRadius: outerRingRadius,

    seed: levels[level].seed,

    colorGridOptions: {
      gradientXStops: ["#0d9488", "#000000", "#000000", "#0891b2"],
      gradientYStops: ["#1d4ed8", "#000000", "#000000", "#15803d"],
      detailX: 30,
      detailY: 30,
    },
  });
  // let part2: ParticleSystem = new ParticleSystem({
  //   size: size,
  //   innerRingRadius: innerRingRadius,
  //   outerRingRadius: outerRingRadius,

  //   seed: levels[level],

  //   colorGridOptions: {
  //     gradientXStops: ["#00ff00", "#000000", "#000000", "#ffff00"],
  //     gradientYStops: ["#00ff00", "#000000", "#000000", "#00ffff"],
  //     detailX: 30,
  //     detailY: 30,
  //   },
  // });

  particles.push(part1);
  // particles.push(part2);

  if (part1.mesh) scene.add(part1.mesh);
  // if (part2.mesh) scene.add(part2.mesh);

  switchActive();

  player = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  player.visible = false;
  playerPart = new Particle();
  resetPlayer();

  goal = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, outerRingRadius - innerRingRadius + 1, 0.07),
    new THREE.MeshBasicMaterial({ color: 0 }),
  );
  goal.position.set(0, outerRingRadius - innerRingRadius / 2 - 0.5, 0);
  goal.visible = false;
  scene.add(goal);

  scene.add(player);
}
function nextLevel(): void {
  const pauseMenu = document.getElementById("pause-menu");
  if (pauseMenu) {
    pauseMenu.classList.add("hidden");
  }
  state = "game";

  resetPlayer();

  level++;
  if (level >= levels.length) {
    // random level
    level = Math.floor(Math.random() * 100000);
    particles[0].newNoise(level);

    const colors = Object.values(gradientStops);
    // random colors
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    particles[0].setColors(randomColor);

    console.log("random level: " + level + " [" + level + "]");
    return;
  }

  particles[0].newNoise(levels[level].seed);
  let colors = levels[level].colors;
  if (colors) {
    particles[0].setColors(colors);
  }
  // particles[1].newNoise(levels[level][1]);
  console.log("level: " + level + " [" + levels[level].seed + "]");
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
  const { minX, maxX, minY, maxY } = getCameraMinMax(camera);

  playerPart.reset(
    minX,
    maxX,
    minY,
    maxY,
    innerRingRadius * innerRingRadius,
    outerRingRadius * outerRingRadius,
  );
  playerPart.pos.set(0, (innerRingRadius + outerRingRadius) / 2);
  playerPart.time = 100000000;
  camera.position.x = playerPart.pos.x;
  camera.position.y = playerPart.pos.y;
  renderer.clear();

  player.visible = true;

  reached50 = false;
  multiplier = 1;
  if (goal) goal.visible = false;
}
function animate(): void {
  requestAnimationFrame(animate);

  stats.begin();

  let dt: number = clock.getDelta();

  const minRate = 0.8;
  const maxRate = 1;
  // if (multiplier < 0.5 && backgroundMusicRate > minRate) {
  //   backgroundMusicRate -= dt * 4;
  // } else if (multiplier > 0.5 && backgroundMusicRate < maxRate) {
  //   backgroundMusicRate += dt * 4;
  // }
  if (multiplier < 0.5) {
    backgroundMusicRate = minRate;
  } else {
    backgroundMusicRate = maxRate;
  }
  backgroundMusic.rate(backgroundMusicRate);

  if (state === "menu") {
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 10;
    camera.rotation.z = 0;
  }

  if (particles[0].mesh?.visible)
    particles[0].update(dt, camera, multiplier, invert);
  // if (particles[1].mesh?.visible)
  //   particles[1].update(dt, camera, multiplier, invert);

  const { minX, maxX, minY, maxY } = getCameraMinMax(camera);

  if (multiplier < 0.5) {
    const overlay = document.getElementById("overlay");
    if (overlay) {
      overlay.style.opacity = "1.0";
    }
  } else {
    const overlay = document.getElementById("overlay");
    if (overlay) {
      overlay.style.opacity = "0.0";
    }
  }

  // multiplier = keys["m"] ? 0.05 : 1;
  if (!stop && state === "game") {
    particles[active].applyNoiseForce(playerPart, dt * multiplier, invert);

    playerPart.update(dt, particles[active].maxSpeed);
    player.position.set(playerPart.pos.x, playerPart.pos.y, 0);

    // get angle of player position
    const angle = Math.atan2(playerPart.pos.y, playerPart.pos.x);
    camera.rotation.z = angle - Math.PI / 2;

    let progress = ((Math.PI / 2 - angle) / (2 * Math.PI) + 1) % 1;

    if (progress > 0.6 && !reached50) {
      progress = 0.01;
    }
    if (progress > 0.5 && !reached50) {
      reached50 = true;
      goal.visible = true;
    }

    if (progress < 0.1 && reached50) {
      // win;
      const pauseMenu = document.getElementById("pause-menu");
      // remove hidden class
      if (pauseMenu) {
        pauseMenu.classList.remove("hidden");
      }
      state = "pause";
      player.visible = false;
      multiplier = 1;
      progress = 1;
    }

    const offset = (1 - progress) * progressCircumference;

    const svgCircle = document.querySelector(".circle");
    if (svgCircle && svgCircle instanceof SVGElement) {
      svgCircle.setAttribute("stroke-dashoffset", offset.toFixed(3));
    }

    camera.position.x = (playerPart.pos.x + camera.position.x * 49) / 50;
    camera.position.y = (playerPart.pos.y + camera.position.y * 49) / 50;

    camera.position.z = 0;
    camera.position.setLength((innerRingRadius + outerRingRadius) / 2);
    camera.position.z = 10;

    if (
      playerPart.isDead(
        minX,
        maxX,
        minY,
        maxY,
        innerRingRadius * innerRingRadius,
        outerRingRadius * outerRingRadius,
      )
    ) {
      console.log("player died");
      const deathMenu = document.getElementById("death-menu");
      if (deathMenu) {
        deathMenu.classList.remove("hidden");
      }
      state = "pause";
      player.visible = false;
      multiplier = 1;
    }
  }

  const alpha = 1 - Math.exp(-dt / tau);
  (overlay.material as THREE.MeshBasicMaterial).opacity = alpha;

  renderer.render(scene, camera);

  stats.end();
}

function onResize(): void {
  let aspect = window.innerWidth / window.innerHeight;
  // if (aspect > 1) {
  //   camera.top = visibleArea / aspect;
  //   camera.bottom = -visibleArea / aspect;

  //   camera.right = visibleArea;
  //   camera.left = -visibleArea;
  // } else {
  camera.top = visibleArea;
  camera.bottom = -visibleArea;

  camera.right = visibleArea * aspect;
  camera.left = -visibleArea * aspect;
  // }
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

setupScene();
animate();
