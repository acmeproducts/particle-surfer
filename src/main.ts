/* eslint-disable prefer-const */
/* eslint-disable prettier/prettier */
import { Application, Graphics, RenderTexture, Sprite } from "pixi.js";
import { UberNoise } from "uber-noise";
import ParticleSystem from "./particles";
import 'pixi.js/math-extras';
import Stats from "stats.js";

(async () => {
  const app = new Application();
  await app.init({ background: "#000000", resizeTo: window });

  const noise = new UberNoise({ scale: 0.01})
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  const renderTexture = RenderTexture.create({ width: 1000, height: 1000 });

  const sprite = new Sprite(renderTexture);
  app.stage.addChild(sprite);

  const particles = new ParticleSystem();
  let stats = new Stats();
  stats.showPanel( 1 ); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild( stats.dom );

  // app.stage.addChild(particles.container);
  for(let i = 0; i < 5000; i++) {
    particles.spawnParticle();
  }

  // add mostly transparent black to the render texture

  const black = new Graphics();
  black.rect(0, 0, 1000, 1000).fill({ color: 0x000000, alpha: 0.1 });
  particles.container.addChild(black);

  let noiseData: number[][][] = [];
  for(let x = 0; x < 1000; x++) {
    noiseData.push([]);
    for(let y = 0; y < 1000; y++) {
      noiseData[x].push([noise.get(x, y), noise.get(x + 5000, y - 1234)]);
    }
  }

  console.log(noiseData);


  app.ticker.add(() => {
    stats.begin();
    particles.update(app.ticker.deltaTime, noiseData);

    app.renderer.render({ container: particles.container, target: renderTexture, clear: false });
    stats.end();
  
  });

  window.addEventListener("keydown", (e) => {
    
  });

  window.addEventListener("keyup", (e) => {
    
  });
})();
