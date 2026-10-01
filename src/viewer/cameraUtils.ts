import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Dedicated coordinate transformation function.
 * AquaSim coordinate system is strictly preserved:
 * AquaSim X -> Three.js X
 * AquaSim Y -> Three.js Y
 * AquaSim Z -> Three.js Z (Vertical depth/height in AquaSim)
 */
export function aquaSimToThree(x: number, y: number, z: number): THREE.Vector3 {
    return new THREE.Vector3(x, y, z);
}

/**
 * Automatically fits camera to model bounding box.
 * Sets orbit controls target to center and frames the structure nicely.
 */
export function fitCameraToModel(
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    box: THREE.Box3,
    offsetMultiplier: number = 1.6
): void {
    if (box.isEmpty()) return;

    const center = new THREE.Vector3();
    box.getCenter(center);

    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0) return;

    const fov = camera.fov * (Math.PI / 180);
    let cameraDistance = (maxDim / 2) / Math.tan(fov / 2);
    cameraDistance *= offsetMultiplier;

    // View from an isometric angle looking towards the center (Z-up orientation)
    // Offset camera in X, Y, and positive Z direction relative to center
    const direction = new THREE.Vector3(1, -1.2, 0.8).normalize();
    const newPosition = center.clone().add(direction.multiplyScalar(cameraDistance));

    camera.position.copy(newPosition);

    // Ensure camera near and far clipping planes accommodate large mooring spans
    camera.near = Math.max(0.1, cameraDistance / 1000);
    camera.far = Math.max(5000, cameraDistance * 10);
    camera.updateProjectionMatrix();

    controls.target.copy(center);
    controls.update();
}
