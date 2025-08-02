import * as THREE from "three";
import { UberNoise } from "uber-noise";
import { Particle } from "./particle";
import { createColorGrid, type ColorGridResult } from "./colors";

interface ParticlesOptions {
  num?: number;
  particleSize?: number;
  size?: THREE.Vector2;
  vertexColors?: boolean;
  color?: THREE.Color;
  maxSpeed?: number;
  minTime?: number;
  maxTime?: number;
  seed?: number;
  innerRingRadius?: number;
  outerRingRadius?: number;
  colorGridOptions?: {
    gradientXStops: string[];
    gradientYStops: string[];
    detailX?: number;
    detailY?: number;
  };
}

export class ParticleSystem {
  num: number;
  particleSize: number;
  size: THREE.Vector2;
  vertexColors: boolean;
  color: THREE.Color;
  maxSpeed: number;
  minTime: number;
  maxTime: number;
  noise: UberNoise | undefined;
  geo: THREE.BufferGeometry | undefined;
  positionData: Float32Array | undefined;
  colorData: Float32Array | undefined;
  parts: Particle[] = [];
  mesh: THREE.Points | undefined;

  noiseDetail = 1000;
  noiseData: number[][][] = [];

  colorGrid: ColorGridResult | undefined;

  innerRingRadius: number;
  outerRingRadius: number;

  constructor(opt?: ParticlesOptions) {
    opt = opt || {};

    this.num = opt.num ?? 15000;

    this.particleSize = opt.particleSize ?? 1;
    this.size = opt.size ?? new THREE.Vector2(1, 1);

    this.vertexColors = opt.vertexColors ?? true;
    this.color = opt.color ?? new THREE.Color(0xffffff);
    this.maxSpeed = opt.maxSpeed ?? 0.02;

    this.minTime = opt.minTime ?? 0.01;
    this.maxTime = opt.maxTime ?? 1;
    this.newNoise(opt.seed ?? 0);

    this.innerRingRadius = opt.innerRingRadius ?? 0;
    this.outerRingRadius = opt.outerRingRadius ?? 0;

    this.createParticles();

    this.colorGrid = createColorGrid({
      gradientXStops: opt.colorGridOptions?.gradientXStops ?? [
        "#0000ff",
        "#ff0000",
      ], // blue→red
      gradientYStops: opt.colorGridOptions?.gradientYStops ?? [
        "#00ff00",
        "#ffff00",
      ], // green→yellow
      detailX: opt.colorGridOptions?.detailX ?? 30,
      detailY: opt.colorGridOptions?.detailY ?? 30,
    });

    // saveGridAsPNG(this.colorGrid.grid);
  }
  newNoise(seed: number) {
    this.noise = new UberNoise({
      min: -0.01,
      max: 0.01,
      scale: 0.4,
      warp: 0.02,
      lacunarity: 0.5,
      seed: seed,
    });
    this.noiseData = [];
    for (let x = 0; x < this.noiseDetail; x++) {
      this.noiseData.push([]);
      for (let y = 0; y < this.noiseDetail; y++) {
        // turn x and y into -size.x and size.x
        let x2 = x / this.noiseDetail;
        let y2 = y / this.noiseDetail;
        this.noiseData[x].push([
          this.noise.get(x2, y2),
          this.noise.get(x2 + 100, y2 + 200),
        ]);
      }
    }
  }
  applyNoiseForce(p: Particle, dt: number) {
    if (!this.noise) return;

    // let x = Math.floor(
    //   ((p.pos.x + this.size.x) * this.noiseDetail) / (this.size.x * 2),
    // );
    // let y = Math.floor(
    //   ((p.pos.y + this.size.x) * this.noiseDetail) / (this.size.x * 2),
    // );

    // if (x < 0 || x >= this.noiseDetail || y < 0 || y >= this.noiseDetail)
    //   return;

    // p.acc.x = this.noiseData[x][y][0] * dt * 20;
    // p.acc.y = this.noiseData[x][y][1] * dt * 20;
    p.acc.x = this.noise.get(p.pos.x, p.pos.y) * dt * 20;
    p.acc.y = this.noise.get(p.pos.x + 123, p.pos.y - 543) * dt * 20;
  }

  createParticles() {
    this.geo = new THREE.BufferGeometry();

    this.positionData = new Float32Array(this.num * 3);

    this.geo.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positionData, 3),
    );

    if (this.vertexColors) {
      this.colorData = new Float32Array(this.num * 3);
      this.geo.setAttribute(
        "color",
        new THREE.BufferAttribute(this.colorData, 3),
      );
    } else {
      // @ts-ignore
      this.colorData = undefined;
    }

    this.parts = [];
    for (let i = 0; i < this.num; i++) {
      this.parts.push(new Particle());
    }

    const mat = new THREE.PointsMaterial({
      vertexColors: true,
      size: this.particleSize,
      sizeAttenuation: false,
      color: this.color,
      transparent: true,
      opacity: 0.5,
    });
    this.mesh = new THREE.Points(this.geo, mat);
    this.mesh.frustumCulled = false;
  }
  update(dt: number, camera: THREE.OrthographicCamera) {
    let color = new THREE.Color(0, 0, 0);

    for (let i = 0; i < this.num; i++) {
      let p = this.parts[i];

      if (p.isDead(camera)) {
        p.reset(camera);
      }

      this.applyNoiseForce(p, dt);
      p.update(dt, this.maxSpeed);

      if (!this.positionData) return;
      this.positionData[i * 3] = p.pos.x;
      this.positionData[i * 3 + 1] = p.pos.y;
      this.positionData[i * 3 + 2] = 0;

      if (this.colorData && this.colorGrid) {
        this.colorGrid.getColor(
          p.normalizedSpeed.x,
          p.normalizedSpeed.y,
          color,
        );
        this.colorData[i * 3] = color.r;
        this.colorData[i * 3 + 1] = color.g;
        this.colorData[i * 3 + 2] = color.b;
      }
    }
    if (!this.geo) return;

    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    if (this.vertexColors && this.geo.attributes.color && this.colorData) {
      (this.geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }
  }
}
