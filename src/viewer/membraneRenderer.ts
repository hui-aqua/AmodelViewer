import * as THREE from 'three';
import { AquaSimNode, MembraneElement, StructuralComponent } from '../parser/types';
import { aquaSimToThree } from './cameraUtils';

export interface MembraneRenderOptions {
    defaultColor?: number;
    opacity?: number;
    wireframe?: boolean;
}

/**
 * Renders Membrane structural components (nets, flaps, panels).
 * Each quadrilateral element (A, B, C, D) is split into two triangles:
 *   Triangle 1: [A, B, C]
 *   Triangle 2: [A, C, D]
 * Rendered using batched THREE.BufferGeometry with DoubleSide transparent material.
 */
export function createMembraneGroup(
    membranes: StructuralComponent<MembraneElement>[],
    nodes: Map<number, AquaSimNode>,
    options: MembraneRenderOptions = {}
): THREE.Group {
    const membraneGroup = new THREE.Group();
    membraneGroup.name = 'membraneGroup';

    // Translucent emerald/teal for nets and membranes
    const defaultColor = options.defaultColor ?? 0x10b981;
    const opacity = options.opacity ?? 0.65;
    const wireframe = options.wireframe ?? false;

    membranes.forEach((comp, compIndex) => {
        if (!comp.elements || comp.elements.length === 0) return;

        const positions: number[] = [];

        for (const el of comp.elements) {
            const nA = nodes.get(el.nodeA);
            const nB = nodes.get(el.nodeB);
            const nC = nodes.get(el.nodeC);
            const nD = nodes.get(el.nodeD);

            if (nA && nB && nC && nD) {
                const pA = aquaSimToThree(nA.x, nA.y, nA.z);
                const pB = aquaSimToThree(nB.x, nB.y, nB.z);
                const pC = aquaSimToThree(nC.x, nC.y, nC.z);
                const pD = aquaSimToThree(nD.x, nD.y, nD.z);

                // Triangle 1: A -> B -> C
                positions.push(pA.x, pA.y, pA.z);
                positions.push(pB.x, pB.y, pB.z);
                positions.push(pC.x, pC.y, pC.z);

                // Triangle 2: A -> C -> D
                positions.push(pA.x, pA.y, pA.z);
                positions.push(pC.x, pC.y, pC.z);
                positions.push(pD.x, pD.y, pD.z);
            }
        }

        if (positions.length === 0) return;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(positions, 3)
        );
        geometry.computeVertexNormals();

        const compColor = comp.color
            ? new THREE.Color(comp.color.r, comp.color.g, comp.color.b)
            : defaultColor;

        const material = new THREE.MeshStandardMaterial({
            color: compColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: opacity,
            wireframe: wireframe,
            roughness: 0.6,
            metalness: 0.1
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `membrane_${comp.id ?? compIndex}_${comp.name}`;
        mesh.userData = {
            aquaSimType: 'membrane',
            componentName: comp.name,
            componentId: comp.id ?? compIndex,
            elementCount: comp.elements.length,
            metadata: comp.metadata
        };

        membraneGroup.add(mesh);
    });

    return membraneGroup;
}
