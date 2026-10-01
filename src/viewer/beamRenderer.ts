import * as THREE from 'three';
import { AquaSimNode, LineElement, StructuralComponent } from '../parser/types';
import { aquaSimToThree } from './cameraUtils';

export interface BeamRenderOptions {
    defaultColor?: number;
}

/**
 * Renders Beam structural components using batched THREE.LineSegments per component.
 */
export function createBeamGroup(
    beams: StructuralComponent<LineElement>[],
    nodes: Map<number, AquaSimNode>,
    options: BeamRenderOptions = {}
): THREE.Group {
    const beamGroup = new THREE.Group();
    beamGroup.name = 'beamGroup';

    // Engineering cyan/blue for rigid beams
    const defaultColor = options.defaultColor ?? 0x00d2ff;
    const material = new THREE.LineBasicMaterial({
        color: defaultColor,
        linewidth: 2
    });

    beams.forEach((comp, compIndex) => {
        if (!comp.elements || comp.elements.length === 0) return;

        // Use authentic component color from AquaSim XML if available
        let compMaterial = material;
        if (comp.color) {
            compMaterial = new THREE.LineBasicMaterial({
                color: new THREE.Color(comp.color.r, comp.color.g, comp.color.b),
                linewidth: 2
            });
        }

        const positions: number[] = [];

        for (const el of comp.elements) {
            const startNode = nodes.get(el.startNodeId);
            const endNode = nodes.get(el.endNodeId);

            if (startNode && endNode) {
                const p1 = aquaSimToThree(startNode.x, startNode.y, startNode.z);
                const p2 = aquaSimToThree(endNode.x, endNode.y, endNode.z);

                positions.push(p1.x, p1.y, p1.z);
                positions.push(p2.x, p2.y, p2.z);
            }
        }

        if (positions.length === 0) return;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(positions, 3)
        );

        const lineSegments = new THREE.LineSegments(geometry, compMaterial);
        lineSegments.name = `beam_${comp.id ?? compIndex}_${comp.name}`;
        lineSegments.userData = {
            aquaSimType: 'beam',
            componentName: comp.name,
            componentId: comp.id ?? compIndex,
            elementCount: comp.elements.length,
            metadata: comp.metadata
        };

        beamGroup.add(lineSegments);
    });

    return beamGroup;
}
