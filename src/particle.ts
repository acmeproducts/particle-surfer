import * as THREE from "three";

interface ParticleOptions {
  time?: number;
}

const DEADZONE = 0.2;

export class Particle {
  pos: THREE.Vector2;
  speed: THREE.Vector2;
  acc: THREE.Vector2;
  time: number;

  normalizedSpeed: THREE.Vector2;

  constructor(opt?: ParticleOptions) {
    opt = opt || {};

    this.pos = new THREE.Vector2(0, 0);
    this.speed = new THREE.Vector2(0, 0);
    this.acc = new THREE.Vector2(0, 0);
    this.time = opt.time ?? Math.random() * 1.8 + 0.3;

    this.normalizedSpeed = new THREE.Vector2(0, 0);
  }
  reset(camera: THREE.OrthographicCamera) {
    const halfWidth = (camera.right - camera.left) / 2 / camera.zoom;
    const halfHeight = (camera.top - camera.bottom) / 2 / camera.zoom;

    const minX = camera.position.x - halfWidth - DEADZONE;
    const maxX = camera.position.x + halfWidth + DEADZONE;
    const minY = camera.position.y - halfHeight - DEADZONE;
    const maxY = camera.position.y + halfHeight + DEADZONE;

    this.pos.set(
      Math.random() * (maxX - minX) + minX,
      Math.random() * (maxY - minY) + minY,
    );
    this.acc.set(0, 0);
    this.speed.set(0, 0);
    this.time = Math.random() * 1.8 + 0.3;
  }
  update(dt: number, maxSpeed: number) {
    this.speed.add(this.acc);
    this.speed.clampLength(0, maxSpeed);
    this.pos.x += this.speed.x * dt * 50;
    this.pos.y += this.speed.y * dt * 50;
    this.time -= dt;

    this.normalizedSpeed.set(this.speed.x / maxSpeed, this.speed.y / maxSpeed);
  }
  isDead(camera: THREE.OrthographicCamera): boolean {
    // check if within camera bounds

    const halfWidth = (camera.right - camera.left) / 2 / camera.zoom;
    const halfHeight = (camera.top - camera.bottom) / 2 / camera.zoom;

    const minX = camera.position.x - halfWidth - DEADZONE;
    const maxX = camera.position.x + halfWidth + DEADZONE;
    const minY = camera.position.y - halfHeight - DEADZONE;
    const maxY = camera.position.y + halfHeight + DEADZONE;

    if (this.time < 0) return true;

    if (this.pos.x < minX || this.pos.x > maxX) return true;
    if (this.pos.y < minY || this.pos.y > maxY) return true;

    return false;
  }
}
