import * as THREE from "three";

export class Particle {
  pos: THREE.Vector2;
  speed: THREE.Vector2;
  acc: THREE.Vector2;
  time: number;

  normalizedSpeed: THREE.Vector2;

  constructor() {
    this.pos = new THREE.Vector2(0, 0);
    this.speed = new THREE.Vector2(0, 0);
    this.acc = new THREE.Vector2(0, 0);
    this.time = Math.random() * 1.8 + 0.3;

    this.normalizedSpeed = new THREE.Vector2(0, 0);
  }
  reset(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    innerRingRadiusSquared: number,
    outerRingRadiusSquared: number,
  ) {
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
  isDead(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    innerRingRadiusSquared: number,
    outerRingRadiusSquared: number,
  ): boolean {
    // check if within camera bounds

    if (this.time < 0) return true;

    if (this.pos.x < minX || this.pos.x > maxX) return true;
    if (this.pos.y < minY || this.pos.y > maxY) return true;

    const distSquared = this.pos.x * this.pos.x + this.pos.y * this.pos.y;
    if (distSquared < innerRingRadiusSquared) return true;
    if (distSquared > outerRingRadiusSquared) return true;

    return false;
  }
}
