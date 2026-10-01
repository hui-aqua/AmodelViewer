import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { parseAmodelXml } from '../src/parser/amodelParser';
import { createBeamGroup, updateBeamScale } from '../src/viewer/beamRenderer';
import { createTrussGroup, updateTrussScale } from '../src/viewer/trussRenderer';
import { createMembraneGroup } from '../src/viewer/membraneRenderer';
import { aquaSimToThree } from '../src/viewer/cameraUtils';

describe('AquaSim 3D Renderers and Geometry', () => {
    it('should preserve AquaSim coordinates in aquaSimToThree without flipping axes', () => {
        const v = aquaSimToThree(12.5, -34.2, 56.7);
        expect(v.x).toBe(12.5);
        expect(v.y).toBe(-34.2);
        expect(v.z).toBe(56.7);
    });

    it('should create 3D solid cross-sections for circular and profile beams from amodel', () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <model name="BeamModel">
            <Nodes>
                <node id="1" x="0" y="0" z="0"/>
                <node id="2" x="10" y="0" z="0"/>
                <node id="3" x="20" y="0" z="0"/>
            </Nodes>
            <Components>
                <beam id="1" name="Flytekrage_Ø500">
                    <wizard type="circular" outerDiameter="500.0"/>
                    <elements>
                        <element id="101" StartNode_ID="1" EndNode_ID="2"/>
                        <element id="102" StartNode_ID="2" EndNode_ID="3"/>
                    </elements>
                </beam>
                <beam id="2" name="Klammer_H500">
                    <wizard type="ibeam" tfw="250.0" wh="410.0" tft="20.0" bft="20.0"/>
                    <elements>
                        <element id="103" StartNode_ID="1" EndNode_ID="2"/>
                    </elements>
                </beam>
            </Components>
        </model>`;

        const model = parseAmodelXml(xml);
        expect(model.beams[0].section?.shape).toBe('circular');
        expect(model.beams[0].section?.radius).toBeCloseTo(0.25);
        expect(model.beams[1].section?.shape).toBe('ibeam');
        expect(model.beams[1].section?.width).toBeCloseTo(0.25);
        expect(model.beams[1].section?.height).toBeCloseTo(0.45);

        const beamGroup = createBeamGroup(model.beams, model.nodes, { scaleFactor: 1.0 });
        expect(beamGroup.children.length).toBe(2);

        const comp1 = beamGroup.children[0] as THREE.Group;
        expect(comp1.userData.aquaSimType).toBe('beam');
        expect(comp1.userData.elementCount).toBe(2);
        expect(comp1.userData.instancedMesh).toBeDefined();

        const im1 = comp1.userData.instancedMesh as THREE.InstancedMesh;
        expect(im1.count).toBe(2);

        // Test dynamic scaling
        updateBeamScale(beamGroup, 2.5);
    });

    it('should create circular 3D cylindrical sections for trusses with dynamic scaling', () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <model name="TrussModel">
            <Nodes>
                <node id="1" x="0" y="0" z="0"/>
                <node id="2" x="0" y="10" z="-50"/>
            </Nodes>
            <Components>
                <truss id="2" name="Omegakjetting 22 mm">
                    <elements>
                        <element id="201" StartNode_ID="1" EndNode_ID="2"/>
                    </elements>
                </truss>
            </Components>
        </model>`;

        const model = parseAmodelXml(xml);
        expect(model.trusses[0].section?.shape).toBe('circular');
        expect(model.trusses[0].section?.radius).toBeCloseTo(0.011); // 22mm dia -> 11mm radius

        const trussGroup = createTrussGroup(model.trusses, model.nodes, { scaleFactor: 1.0 });
        expect(trussGroup.children.length).toBe(1);

        const comp = trussGroup.children[0] as THREE.Group;
        expect(comp.userData.aquaSimType).toBe('truss');
        expect(comp.userData.instancedMesh).toBeDefined();

        const im = comp.userData.instancedMesh as THREE.InstancedMesh;
        expect(im.count).toBe(1);

        // Test dynamic scaling
        updateTrussScale(trussGroup, 5.0);
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
                    <elements>
                        <element id="301" nodeA="1" nodeB="2" nodeC="3" nodeD="4"/>
                    </elements>
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
