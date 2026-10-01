import {
    AquaSimModel,
    AquaSimNode,
    LineElement,
    MembraneElement,
    StructuralComponent,
    ParseReport
} from './types';

/**
 * Helper to extract all XML attributes as a key-value record
 */
function extractAttributes(element: Element): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        attrs[attr.name] = attr.value;
    }
    return attrs;
}

/**
 * Parse an .amodel XML string into an internal AquaSimModel structure.
 * Pure TypeScript, completely independent of Three.js.
 */
export function parseAmodelXml(xmlText: string): AquaSimModel {
    if (!xmlText || xmlText.trim().length === 0) {
        throw new Error('Unable to parse .amodel file: file is empty.');
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    // Check for XML parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
        throw new Error(`Unable to parse .amodel file: ${parserError.textContent || 'XML syntax error'}`);
    }

    const modelElem = xmlDoc.querySelector('model');
    const modelMeta = modelElem ? extractAttributes(modelElem) : {};

    // 1. Parse Nodes
    const nodes = new Map<number, AquaSimNode>();
    const nodeElements = xmlDoc.querySelectorAll('Nodes > node, model > Nodes > node, node');

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    nodeElements.forEach((nodeEl) => {
        const idStr = nodeEl.getAttribute('id');
        const xStr = nodeEl.getAttribute('x');
        const yStr = nodeEl.getAttribute('y');
        const zStr = nodeEl.getAttribute('z');

        if (idStr !== null && xStr !== null && yStr !== null && zStr !== null) {
            const id = parseInt(idStr, 10);
            const x = parseFloat(xStr);
            const y = parseFloat(yStr);
            const z = parseFloat(zStr);

            if (!Number.isNaN(id) && !Number.isNaN(x) && !Number.isNaN(y) && !Number.isNaN(z)) {
                nodes.set(id, {
                    id,
                    x,
                    y,
                    z,
                    metadata: extractAttributes(nodeEl)
                });

                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                if (z < minZ) minZ = z;
                if (z > maxZ) maxZ = z;
            }
        }
    });

    if (nodes.size === 0) {
        throw new Error('No AquaSim nodes found in the model.');
    }

    // 2. Parse Structural Components: Beam, Truss, Membrane
    const warnings: string[] = [];
    let invalidReferences = 0;

    // Helper to extract component color from <color red="..." green="..." blue="..." />
    function extractColor(compEl: Element): { r: number; g: number; b: number } | undefined {
        const colorEl = compEl.querySelector('color');
        if (!colorEl) return undefined;
        const rStr = colorEl.getAttribute('red');
        const gStr = colorEl.getAttribute('green');
        const bStr = colorEl.getAttribute('blue');
        if (rStr !== null && gStr !== null && bStr !== null) {
            const r = parseFloat(rStr);
            const g = parseFloat(gStr);
            const b = parseFloat(bStr);
            if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
                return { r, g, b };
            }
        }
        return undefined;
    }

    // Helper to parse line elements (beams and trusses)
    function parseLineComponents(
        tagName: 'beam' | 'truss'
    ): StructuralComponent<LineElement>[] {
        const components: StructuralComponent<LineElement>[] = [];
        const compElements = xmlDoc.querySelectorAll(`Components > ${tagName}, ${tagName}`);

        compElements.forEach((compEl) => {
            const idAttr = compEl.getAttribute('id');
            const nameAttr = compEl.getAttribute('name') || `${tagName}_${idAttr || components.length + 1}`;
            const id = idAttr !== null ? parseInt(idAttr, 10) : undefined;
            const metadata = extractAttributes(compEl);
            const color = extractColor(compEl);

            const validElements: LineElement[] = [];
            const elementNodes = compEl.querySelectorAll('element');

            elementNodes.forEach((elemEl) => {
                const elemIdStr = elemEl.getAttribute('id');
                const startIdStr = elemEl.getAttribute('StartNode_ID') || elemEl.getAttribute('startNodeId');
                const endIdStr = elemEl.getAttribute('EndNode_ID') || elemEl.getAttribute('endNodeId');

                if (elemIdStr && startIdStr && endIdStr) {
                    const elemId = parseInt(elemIdStr, 10);
                    const startNodeId = parseInt(startIdStr, 10);
                    const endNodeId = parseInt(endIdStr, 10);

                    // Connectivity validation
                    const hasStart = nodes.has(startNodeId);
                    const hasEnd = nodes.has(endNodeId);

                    if (!hasStart || !hasEnd) {
                        invalidReferences++;
                        const warn = `${tagName.toUpperCase()} [${nameAttr}] element ${elemId} references missing node(s): start=${startNodeId} (${hasStart ? 'OK' : 'MISSING'}), end=${endNodeId} (${hasEnd ? 'OK' : 'MISSING'}). Skipping element.`;
                        console.warn(warn);
                        warnings.push(warn);
                    } else {
                        validElements.push({
                            id: elemId,
                            startNodeId,
                            endNodeId,
                            metadata: extractAttributes(elemEl)
                        });
                    }
                }
            });

            components.push({
                id,
                name: nameAttr,
                type: tagName,
                color,
                elements: validElements,
                metadata
            });
        });

        return components;
    }

    // Helper to parse membrane components
    function parseMembraneComponents(): StructuralComponent<MembraneElement>[] {
        const components: StructuralComponent<MembraneElement>[] = [];
        const compElements = xmlDoc.querySelectorAll('Components > membrane, membrane');

        compElements.forEach((compEl) => {
            const idAttr = compEl.getAttribute('id');
            const nameAttr = compEl.getAttribute('name') || `membrane_${idAttr || components.length + 1}`;
            const id = idAttr !== null ? parseInt(idAttr, 10) : undefined;
            const metadata = extractAttributes(compEl);
            const color = extractColor(compEl);

            const validElements: MembraneElement[] = [];
            const elementNodes = compEl.querySelectorAll('element');

            elementNodes.forEach((elemEl) => {
                const elemIdStr = elemEl.getAttribute('id');
                const nodeAStr = elemEl.getAttribute('nodeA');
                const nodeBStr = elemEl.getAttribute('nodeB');
                const nodeCStr = elemEl.getAttribute('nodeC');
                const nodeDStr = elemEl.getAttribute('nodeD');

                if (elemIdStr && nodeAStr && nodeBStr && nodeCStr && nodeDStr) {
                    const elemId = parseInt(elemIdStr, 10);
                    const nodeA = parseInt(nodeAStr, 10);
                    const nodeB = parseInt(nodeBStr, 10);
                    const nodeC = parseInt(nodeCStr, 10);
                    const nodeD = parseInt(nodeDStr, 10);

                    const hasA = nodes.has(nodeA);
                    const hasB = nodes.has(nodeB);
                    const hasC = nodes.has(nodeC);
                    const hasD = nodes.has(nodeD);

                    if (!hasA || !hasB || !hasC || !hasD) {
                        invalidReferences++;
                        const warn = `MEMBRANE [${nameAttr}] element ${elemId} references missing node(s): A=${nodeA}(${hasA ? 'OK' : 'MISSING'}), B=${nodeB}(${hasB ? 'OK' : 'MISSING'}), C=${nodeC}(${hasC ? 'OK' : 'MISSING'}), D=${nodeD}(${hasD ? 'OK' : 'MISSING'}). Skipping element.`;
                        console.warn(warn);
                        warnings.push(warn);
                    } else {
                        validElements.push({
                            id: elemId,
                            nodeA,
                            nodeB,
                            nodeC,
                            nodeD,
                            metadata: extractAttributes(elemEl)
                        });
                    }
                }
            });

            components.push({
                id,
                name: nameAttr,
                type: 'membrane',
                color,
                elements: validElements,
                metadata
            });
        });

        return components;
    }

    const beams = parseLineComponents('beam');
    const trusses = parseLineComponents('truss');
    const membranes = parseMembraneComponents();

    const beamElementCount = beams.reduce((acc, c) => acc + c.elements.length, 0);
    const trussElementCount = trusses.reduce((acc, c) => acc + c.elements.length, 0);
    const membraneElementCount = membranes.reduce((acc, c) => acc + c.elements.length, 0);
    const totalElementCount = beamElementCount + trussElementCount + membraneElementCount;

    const report: ParseReport = {
        nodeCount: nodes.size,
        beamComponentCount: beams.length,
        beamElementCount,
        trussComponentCount: trusses.length,
        trussElementCount,
        membraneComponentCount: membranes.length,
        membraneElementCount,
        totalElementCount,
        invalidReferences,
        warnings
    };

    return {
        name: modelMeta.name || 'AquaSim Model',
        description: modelMeta.description,
        version: modelMeta.version,
        nodes,
        beams,
        trusses,
        membranes,
        boundingBox: {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ }
        },
        report,
        metadata: modelMeta
    };
}
