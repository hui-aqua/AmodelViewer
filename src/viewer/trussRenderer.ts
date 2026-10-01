import * as THREE from 'three';
import { AquaSimNode, LineElement, StructuralComponent } from '../parser/types';
import { aquaSimToThree } from './cameraUtils';

export interface TrussRenderOptions {
    defaultColor?: number;
    scaleFactor?: number;
    renderMode?: 'solid' | 'wireframe' | 'both';
}

interface TrussElementTransform {
    mid: THREE.Vector3;
    quat: THREE.Quaternion;
    length: number;
    baseRadius: number;
}

/**
 * Shared unit cylinder geometry for all circular trusses (moorings, ropes, cables)
 */
const unitTrussCylinder = new THREE.CylinderGeometry(1, 1, 1, 8);

/**
 * Renders Truss structural components using scalable circular 3D cylindrical sections (InstancedMesh).
 * Truss elements are ALWAYS circular per engineering specification.
 */
export function createTrussGroup(
    trusses: StructuralComponent<LineElement>[],
    nodes: Map<number, AquaSimNode>,
    options: TrussRenderOptions = {}
): THREE.Group {
    const trussGroup = new THREE.Group();
    trussGroup.name = 'trussGroup';

    const defaultColor = options.defaultColor ?? 0xffaa00;
    const scaleFactor = options.scaleFactor ?? 1.0;
    const renderMode = options.renderMode ?? 'both';

    trusses.forEach((comp, compIndex) => {
        if (!comp.elements || comp.elements.length === 0) return;

        const compColor = comp.color
            ? new THREE.Color(comp.color.r, comp.color.g, comp.color.b)
            : new THREE.Color(defaultColor);

        const compGroup = new THREE.Group();
        compGroup.name = `truss_comp_${comp.id ?? compIndex}`;

        // Truss is ALWAYS circular
        const baseRadius = comp.section?.radius ?? 0.015; // default 15mm

        // Precompute transformations
        const transforms: TrussElementTransform[] = [];
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

                transforms.push({
                    mid,
                    quat,
                    length,
                    baseRadius
                });
            }
        }

        if (transforms.length === 0) return;

        // 1. Solid Circular Instanced Mesh
        const solidMaterial = new THREE.MeshStandardMaterial({
            color: compColor,
            roughness: 0.55,
            metalness: 0.1
        });

        const instancedMesh = new THREE.InstancedMesh(unitTrussCylinder, solidMaterial, transforms.length);
        instancedMesh.name = `truss_solid_${comp.id ?? compIndex}`;

        const matrix = new THREE.Matrix4();
        const scaleVec = new THREE.Vector3();

        transforms.forEach((t, i) => {
            scaleVec.set(
                t.baseRadius * scaleFactor,
                t.length,
                t.baseRadius * scaleFactor
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
        lineSegments.name = `truss_line_${comp.id ?? compIndex}`;
        lineSegments.visible = renderMode !== 'solid';

        compGroup.add(instancedMesh);
        compGroup.add(lineSegments);

        compGroup.userData = {
            aquaSimType: 'truss',
            componentName: comp.name,
            componentId: comp.id ?? compIndex,
            elementCount: comp.elements.length,
            section: comp.section,
            transforms,
            instancedMesh,
            lineSegments,
            metadata: comp.metadata
        };

        trussGroup.add(compGroup);
    });

    return trussGroup;
}

/**
 * Dynamically scale truss circular sections without recreating geometry
 */
export function updateTrussScale(trussGroup: THREE.Group, scaleFactor: number): void {
    const matrix = new THREE.Matrix4();
    const scaleVec = new THREE.Vector3();

    trussGroup.children.forEach((compGroup) => {
        const u = compGroup.userData;
        const instancedMesh = u.instancedMesh as THREE.InstancedMesh | undefined;
        const transforms = u.transforms as TrussElementTransform[] | undefined;

        if (instancedMesh && transforms) {
            transforms.forEach((t, i) => {
                scaleVec.set(
                    t.baseRadius * scaleFactor,
                    t.length,
                    t.baseRadius * scaleFactor
                );
                matrix.compose(t.mid, t.quat, scaleVec);
                instancedMesh.setMatrixAt(i, matrix);
            });
            instancedMesh.instanceMatrix.needsUpdate = true;
        }
    });
}
