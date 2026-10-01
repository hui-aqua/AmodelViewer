import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { parseAmodelXml } from '../src/parser/amodelParser';
import { createBeamGroup } from '../src/viewer/beamRenderer';
import { createTrussGroup } from '../src/viewer/trussRenderer';
import { createMembraneGroup } from '../src/viewer/membraneRenderer';
import { aquaSimToThree } from '../src/viewer/cameraUtils';

describe('AquaSim 3D Renderers and Geometry', () => {
    it('should preserve AquaSim coordinates in aquaSimToThree without flipping axes', () => {
        const v = aquaSimToThree(12.5, -34.2, 56.7);
        expect(v.x).toBe(12.5);
        expect(v.y).toBe(-34.2);
        expect(v.z).toBe(56.7);
    });

    it('should aggregate Beam elements into batched LineSegments per component', () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <model name="BeamModel">
            <Nodes>
                <node id="1" x="0" y="0" z="0"/>
                <node id="2" x="10" y="0" z="0"/>
                <node id="3" x="20" y="0" z="0"/>
            </Nodes>
            <Components>
                <beam id="1" name="Collar">
                    <element id="101" StartNode_ID="1" EndNode_ID="2"/>
                    <element id="102" StartNode_ID="2" EndNode_ID="3"/>
                </beam>
            </Components>
        </model>`;

        const model = parseAmodelXml(xml);
        const beamGroup = createBeamGroup(model.beams, model.nodes);

        expect(beamGroup.children.length).toBe(1);
        const lineSegments = beamGroup.children[0] as THREE.LineSegments;
        expect(lineSegments).toBeInstanceOf(THREE.LineSegments);
        expect(lineSegments.userData.aquaSimType).toBe('beam');
        expect(lineSegments.userData.componentName).toBe('Collar');
        expect(lineSegments.userData.elementCount).toBe(2);

        // 2 line segments = 4 vertices = 12 floats in BufferAttribute
        const posAttr = lineSegments.geometry.getAttribute('position');
        expect(posAttr.count).toBe(4);
    });

    it('should aggregate Truss elements into batched LineSegments per component', () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <model name="TrussModel">
            <Nodes>
                <node id="1" x="0" y="0" z="0"/>
                <node id="2" x="0" y="10" z="-50"/>
            </Nodes>
            <Components>
                <truss id="2" name="MooringLine">
                    <element id="201" StartNode_ID="1" EndNode_ID="2"/>
                </truss>
            </Components>
        </model>`;

        const model = parseAmodelXml(xml);
        const trussGroup = createTrussGroup(model.trusses, model.nodes);

        expect(trussGroup.children.length).toBe(1);
        const lineSegments = trussGroup.children[0] as THREE.LineSegments;
        expect(lineSegments.userData.aquaSimType).toBe('truss');
        expect(lineSegments.userData.componentName).toBe('MooringLine');
        expect(lineSegments.userData.elementCount).toBe(1);

        const posAttr = lineSegments.geometry.getAttribute('position');
        expect(posAttr.count).toBe(2);
    });

    it('should triangulate quadrilateral Membrane elements into 2 triangles per quad', () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <model name="MembraneModel">
            <Nodes>
                <node id="1" x="0" y="0" z="0"/>
                <node id="2" x="10" y="0" z="0"/>
                <node id="3" x="10" y="10" z="0"/>
                <node id="4" x="0" y="10" z="0"/>
            </Nodes>
            <Components>
                <membrane id="3" name="NetMesh">
                    <element id="301" nodeA="1" nodeB="2" nodeC="3" nodeD="4"/>
                </membrane>
            </Components>
        </model>`;

        const model = parseAmodelXml(xml);
        const membraneGroup = createMembraneGroup(model.membranes, model.nodes);

        expect(membraneGroup.children.length).toBe(1);
        const mesh = membraneGroup.children[0] as THREE.Mesh;
        expect(mesh).toBeInstanceOf(THREE.Mesh);
        expect(mesh.userData.aquaSimType).toBe('membrane');
        expect(mesh.userData.componentName).toBe('NetMesh');
        expect(mesh.userData.elementCount).toBe(1);

        // 1 quad = 2 triangles = 6 vertices = 18 floats in BufferAttribute
        const posAttr = mesh.geometry.getAttribute('position');
        expect(posAttr.count).toBe(6);

        // Check material side is DoubleSide
        const mat = mesh.material as THREE.MeshStandardMaterial;
        expect(mat.side).toBe(THREE.DoubleSide);
        expect(mat.transparent).toBe(true);
    });
});
