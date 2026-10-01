import * as THREE from 'three';
import { AquaSimNode, LineElement, StructuralComponent } from '../parser/types';
import { aquaSimToThree } from './cameraUtils';

export interface BeamRenderOptions {
    defaultColor?: number;
    scaleFactor?: number;
    renderMode?: 'solid' | 'wireframe' | 'both';
}

interface BeamElementTransform {
    mid: THREE.Vector3;
    quat: THREE.Quaternion;
    length: number;
    baseScaleX: number;
    baseScaleZ: number;
}

/**
 * Shared unit geometries to minimize memory usage
 */
const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
const unitBox = new THREE.BoxGeometry(1, 1, 1);

/**
 * Renders Beam structural components using 3D solid cross-sections (InstancedMesh)
 * checked from the AquaSim .amodel file.
 */
export function createBeamGroup(
    beams: StructuralComponent<LineElement>[],
    nodes: Map<number, AquaSimNode>,
    options: BeamRenderOptions = {}
): THREE.Group {
    const beamGroup = new THREE.Group();
    beamGroup.name = 'beamGroup';

    const defaultColor = options.defaultColor ?? 0x00d2ff;
    const scaleFactor = options.scaleFactor ?? 1.0;
    const renderMode = options.renderMode ?? 'both';

    beams.forEach((comp, compIndex) => {
        if (!comp.elements || comp.elements.length === 0) return;

        const compColor = comp.color
            ? new THREE.Color(comp.color.r, comp.color.g, comp.color.b)
            : new THREE.Color(defaultColor);

        const compGroup = new THREE.Group();
        compGroup.name = `beam_comp_${comp.id ?? compIndex}`;

        // Determine cross-section from amodel
        const section = comp.section;
        const isRectangular = section?.shape === 'ibeam' || section?.shape === 'rectangular';
        const baseRadius = section?.radius ?? 0.1;
        const baseWidth = section?.width ?? (baseRadius * 2);
        const baseHeight = section?.height ?? (baseRadius * 2);

        // Precompute element transformations
        const transforms: BeamElementTransform[] = [];
        const linePositions: number[] = [];
        const upVector = new THREE.Vector3(0, 1, 0);

        for (const el of comp.elements) {
            const startNode = nodes.get(el.startNodeId);
            const endNode = nodes.get(el.endNodeId);

            if (startNode && endNode) {
                const p1 = aquaSimToThree(startNode.x, startNode.y, startNode.z);
                const p2 = aquaSimToThree(endNode.x, endNode.y, endNode.z);

                linePositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);

                const dir = new THREE.Vector3().subVectors(p2, p1);
                const length = dir.length();
                if (length < 1e-5) continue;

                dir.normalize();
                const quat = new THREE.Quaternion().setFromUnitVectors(upVector, dir);
                const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

                const baseScaleX = isRectangular ? baseWidth : baseRadius;
                const baseScaleZ = isRectangular ? baseHeight : baseRadius;

                transforms.push({
                    mid,
                    quat,
                    length,
                    baseScaleX,
                    baseScaleZ
                });
            }
        }

        if (transforms.length === 0) return;

        // 1. Solid 3D Instanced Mesh
        const geometry = isRectangular ? unitBox : unitCylinder;
        const solidMaterial = new THREE.MeshStandardMaterial({
            color: compColor,
            roughness: 0.45,
            metalness: 0.15
        });

        const instancedMesh = new THREE.InstancedMesh(geometry, solidMaterial, transforms.length);
        instancedMesh.name = `beam_solid_${comp.id ?? compIndex}`;

        const matrix = new THREE.Matrix4();
        const scaleVec = new THREE.Vector3();

        transforms.forEach((t, i) => {
            scaleVec.set(
                t.baseScaleX * scaleFactor,
                t.length,
                t.baseScaleZ * scaleFactor
            );
            matrix.compose(t.mid, t.quat, scaleVec);
            instancedMesh.setMatrixAt(i, matrix);
        });
        instancedMesh.instanceMatrix.needsUpdate = true;
        instancedMesh.visible = renderMode !== 'wireframe';

        // 2. LineSegments for centerlines
        const lineGeom = new THREE.BufferGeometry();
        lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        const lineMaterial = new THREE.LineBasicMaterial({
            color: compColor,
            linewidth: 1
        });
        const lineSegments = new THREE.LineSegments(lineGeom, lineMaterial);
        lineSegments.name = `beam_line_${comp.id ?? compIndex}`;
        lineSegments.visible = renderMode !== 'solid';

        compGroup.add(instancedMesh);
        compGroup.add(lineSegments);

        compGroup.userData = {
            aquaSimType: 'beam',
            componentName: comp.name,
            componentId: comp.id ?? compIndex,
            elementCount: comp.elements.length,
            section: comp.section,
            transforms,
            instancedMesh,
            lineSegments,
            metadata: comp.metadata
        };

        beamGroup.add(compGroup);
    });

    return beamGroup;
}

/**
 * Dynamically scale beam cross-sections without recreating geometry
 */
export function updateBeamScale(beamGroup: THREE.Group, scaleFactor: number): void {
    const matrix = new THREE.Matrix4();
    const scaleVec = new THREE.Vector3();

    beamGroup.children.forEach((compGroup) => {
        const u = compGroup.userData;
        const instancedMesh = u.instancedMesh as THREE.InstancedMesh | undefined;
        const transforms = u.transforms as BeamElementTransform[] | undefined;

        if (instancedMesh && transforms) {
            transforms.forEach((t, i) => {
                scaleVec.set(
                    t.baseScaleX * scaleFactor,
                    t.length,
                    t.baseScaleZ * scaleFactor
                );
                matrix.compose(t.mid, t.quat, scaleVec);
                instancedMesh.setMatrixAt(i, matrix);
            });
            instancedMesh.instanceMatrix.needsUpdate = true;
        }
    });
}
