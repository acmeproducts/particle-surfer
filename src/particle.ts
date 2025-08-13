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
  
  bounce(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    innerRingRadiusSquared: number,
    outerRingRadiusSquared: number,
  ) {
    const distSquared = this.pos.x * this.pos.x + this.pos.y * this.pos.y;
    
    // Bounce off inner ring
    if (distSquared < innerRingRadiusSquared) {
      const dist = Math.sqrt(distSquared);
      const innerRingRadius = Math.sqrt(innerRingRadiusSquared);
      
      // Normalize position to get direction from center
      const nx = this.pos.x / dist;
      const ny = this.pos.y / dist;
      
      // Push back outside inner ring
      this.pos.x = nx * (innerRingRadius + 0.1);
      this.pos.y = ny * (innerRingRadius + 0.1);
      
      // Reflect velocity outward with randomness
      const dotProduct = this.speed.x * nx + this.speed.y * ny;
      this.speed.x = this.speed.x - 2 * dotProduct * nx;
      this.speed.y = this.speed.y - 2 * dotProduct * ny;
      
      // Add random bounce
      this.speed.x += (Math.random() - 0.5) * 0.01;
      this.speed.y += (Math.random() - 0.5) * 0.01;
      
      // Dampen speed
      this.speed.multiplyScalar(0.7);
    }
    
    // Bounce off outer ring
    if (distSquared > outerRingRadiusSquared) {
      const dist = Math.sqrt(distSquared);
      const outerRingRadius = Math.sqrt(outerRingRadiusSquared);
      
      // Normalize position to get direction from center
      const nx = this.pos.x / dist;
      const ny = this.pos.y / dist;
      
      // Push back inside outer ring
      this.pos.x = nx * (outerRingRadius - 0.1);
      this.pos.y = ny * (outerRingRadius - 0.1);
      
      // Reflect velocity inward with randomness
      const dotProduct = this.speed.x * nx + this.speed.y * ny;
      this.speed.x = this.speed.x - 2 * dotProduct * nx;
      this.speed.y = this.speed.y - 2 * dotProduct * ny;
      
      // Add random bounce
      this.speed.x += (Math.random() - 0.5) * 0.01;
      this.speed.y += (Math.random() - 0.5) * 0.01;
      
      // Dampen speed
      this.speed.multiplyScalar(0.7);
    }
  }
  
  isDead(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    innerRingRadiusSquared: number,
    outerRingRadiusSquared: number,
  ): boolean {
    // Only die if time runs out, not from boundaries
    if (this.time < 0) return true;

    // Still check camera bounds for regular particles
    if (this.pos.x < minX || this.pos.x > maxX) return true;
    if (this.pos.y < minY || this.pos.y > maxY) return true;

    const distSquared = this.pos.x * this.pos.x + this.pos.y * this.pos.y;
    if (distSquared < innerRingRadiusSquared) return true;
    if (distSquared > outerRingRadiusSquared) return true;

    return false;
  }
}
