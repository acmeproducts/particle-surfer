import * as PIXI from "pixi.js";
import type UberNoise from "uber-noise";

export type ParticleOptions = {
  x: number;
  y: number;
  size: number;
  color: PIXI.ColorSource;
  alpha: number;
  speedX: number;
  speedY: number;
  maxAge: number;
};

class Particle extends PIXI.Graphics {
  speedX: number = 0;
  speedY: number = 0;
  age: number = 0;
  maxAge: number = 100;
  initialSize: number = 1;

  maxSpeed: number = 2;

  speed = new PIXI.Point(0, 0);
  acc = new PIXI.Point(0, 0);

  constructor() {
    super();
    this.reset(new PIXI.Point(Math.random() * 1000, Math.random() * 1000));

    this.rect(0, 0, 1, 1);
  }

  update(dt: number, noise: number[][][]) {
    let x = Math.max(0, Math.min(999, Math.floor(this.x)));
    let y = Math.max(0, Math.min(999, Math.floor(this.y)));

    this.acc.x = noise[x][y][0];
    this.acc.y = noise[x][y][1];

    this.speed.x += this.acc.x * dt * 0.1;
    this.speed.y += this.acc.y * dt * 0.1;

    let l = this.speed.magnitude();
    if(l > this.maxSpeed) {
      this.speed.normalize().multiplyScalar(this.maxSpeed, this.speed);
    }

    if(this.x > 1000) {
      this.x = 0;
    } else if(this.x < 0) {
      this.x = 1000;
    }

    if(this.y > 1000) {
      this.y = 0;
    } else if(this.y < 0) {
      this.y = 1000;
    }

    let lastX = this.x;
    let lastY = this.y;

    this.x += this.speed.x * dt * 0.1;
    this.y += this.speed.y * dt * 0.1;
    this.age += dt;

    this.clear();
    this.beginPath();

    this.moveTo(lastX, lastY);
    this.lineTo(this.x, this.y);

    // get angle between lastX, lastY and this.x, this.y
    let angle = Math.atan2(this.y - lastY, this.x - lastX);
    // get distance between lastX, lastY and this.x, this.y
    // let distance = Math.sqrt((this.x - lastX) ** 2 + (this.y - lastY) ** 2);

    // this.scale.set(1, distance);
    // this.rotation = angle;

    // color based on angle (to hue)
    let hue = angle / (2 * Math.PI);

    this.stroke({
      color: `hsl(${(hue * 100).toFixed(1)}, 100%, 50%)`,
      width: 5,
    });
  }

  reset(position: PIXI.Point) {
    this.x = position.x;
    this.y = position.y;
    this.acc.set(0, 0);
    this.speed.set(0, 0);
    this.age = 0;
    this.maxAge = Math.random() * 100 + 10;
  }

}

export default class ParticleSystem {
  private readonly maxParticles: number;
  public container: PIXI.Container;
  private readonly particles: Particle[];
  private readonly particlePool: Particle[];


  constructor(maxParticles: number = 10000) {
    this.maxParticles = maxParticles;
    this.container = new PIXI.Container();
    this.container.zIndex = 10;
    this.particles = [];
    this.particlePool = [];
  }


  spawnParticle(): Particle | null {
    let particle: Particle;
    if (this.particlePool.length > 0) {
      particle = this.particlePool.pop()!;
    } else if (this.particles.length < this.maxParticles) {
      particle = new Particle();
      particle.reset(new PIXI.Point(Math.random() * 1000, Math.random() * 1000));

      this.container.addChild(particle);
    } else {
      return null;
    }

    this.particles.push(particle);

    return particle;
  }

  removeParticle(particle: Particle): void {
    const index = this.particles.indexOf(particle);
    if (index !== -1) {
      particle.visible = false;

      this.particles.splice(index, 1);
      this.particlePool.push(particle);
    }
  }

  update(deltaTime: number, noise: number[][][]): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(deltaTime, noise);

      if(this.particles[i].age > this.particles[i].maxAge) {
        this.particles[i].reset(new PIXI.Point(Math.random() * 1000, Math.random() * 1000));
      }
    }
  }
}
