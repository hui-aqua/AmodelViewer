import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { AquaSimViewer } from '@/viewer/AquaSimViewer';
import { parseAmodelXml } from '@/parser/amodelParser';

describe('single-model scene', () => {
    it('disposes and replaces the previous geometry without shifting the new model', () => {
        const viewer = Object.create(AquaSimViewer.prototype) as AquaSimViewer;
        const modelGroup = new THREE.Group();
        Object.assign(viewer, { modelGroup, componentObjectMap: new Map(), currentBounds: new THREE.Box3(), currentScaleFactor: 1, renderMode: 'both', axesHelper: new THREE.AxesHelper(), setupReferenceGridPlanes: vi.fn(), fitView: vi.fn(), gridVisible: true });
        const model = parseAmodelXml('<model><Nodes><node id="1" x="0" y="0" z="0"/><node id="2" x="10" y="0" z="0"/></Nodes><Components><beam id="1" name="Beam"><elements><element id="1" StartNode_ID="1" EndNode_ID="2"/></elements></beam></Components></model>');
        viewer.loadModel(model);
        const previous = modelGroup.children[0];
        let geometry: THREE.BufferGeometry | undefined;
        previous.traverse(object => { if ((object as THREE.Mesh).geometry) geometry = (object as THREE.Mesh).geometry; });
        expect(geometry).toBeDefined();
        const dispose = vi.spyOn(geometry!, 'dispose');
        viewer.loadModel(model);
        expect(dispose).toHaveBeenCalled();
        expect(modelGroup.children).toHaveLength(3);
        expect(modelGroup.children).not.toContain(previous);
        expect(modelGroup.children[0].position.x).toBe(0);
    });
});
