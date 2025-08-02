import * as THREE from "three";

const DEADZONE = 0.2;

export function getCameraMinMax(camera: THREE.OrthographicCamera) {
  // Get camera-space axes in world space
  const right = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(camera.quaternion)
    .normalize();
  const up = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(camera.quaternion)
    .normalize();

  const halfWidth = (camera.right - camera.left) / 2 / camera.zoom;
  const halfHeight = (camera.top - camera.bottom) / 2 / camera.zoom;

  const offsetRight = right.clone().multiplyScalar(halfWidth);
  const offsetUp = up.clone().multiplyScalar(halfHeight);

  const corners = [
    camera.position.clone().add(offsetRight).add(offsetUp), // +X, +Y
    camera.position.clone().sub(offsetRight).add(offsetUp), // -X, +Y
    camera.position.clone().sub(offsetRight).sub(offsetUp), // -X, -Y
    camera.position.clone().add(offsetRight).sub(offsetUp), // +X, -Y
  ];

  const allX = corners.map((c) => c.x);
  const allY = corners.map((c) => c.y);

  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);

  return { minX, maxX, minY, maxY };
}
