import { describe, it, expect, vi } from 'vitest';
import { ModelTreeUI } from '@/ui/modelTree';
import { AquaSimViewer } from '@/viewer/AquaSimViewer';
import { parseAmodelXml } from '@/parser/amodelParser';

describe('multi-model hierarchy', () => {
    it('keeps imports and scopes component and model visibility independently', () => {
        const viewer = { setComponentVisibility: vi.fn(), setModelVisibility: vi.fn() };
        const treeContainer = document.createElement('div');
        const ui = new ModelTreeUI({ treeContainer, statsContainer: document.createElement('div'), statusText: document.createElement('div') }, viewer as unknown as AquaSimViewer);
        const model = parseAmodelXml('<model><Nodes><node id="1" x="0" y="0" z="0"/><node id="2" x="10" y="0" z="0"/></Nodes><Components><beam id="1" name="Beam"><elements><element id="1" StartNode_ID="1" EndNode_ID="2"/></elements></beam></Components></model>');
        ui.update(model, 'first.amodel', 'model-1');
        ui.update(model, 'second.amodel', 'model-2');
        expect(treeContainer.querySelectorAll('.tree-model')).toHaveLength(2);
        const component = treeContainer.querySelector('[data-key="model-1:beam_1"]') as HTMLInputElement;
        component.checked = false; component.dispatchEvent(new Event('change'));
        expect(viewer.setComponentVisibility).toHaveBeenCalledWith('model-1:beam_1', false);
        const second = treeContainer.querySelectorAll('.model-header input')[1] as HTMLInputElement;
        second.checked = false; second.dispatchEvent(new Event('change'));
        expect(viewer.setModelVisibility).toHaveBeenCalledWith('model-2', false);
        (treeContainer.querySelector('.model-header button') as HTMLButtonElement).click();
        expect((treeContainer.querySelector('.model-children') as HTMLElement).hidden).toBe(true);
    });
});
