import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AquaSimModel } from '../parser/types';
import { createBeamGroup, updateBeamScale } from './beamRenderer';
import { createTrussGroup, updateTrussScale } from './trussRenderer';
import { createMembraneGroup } from './membraneRenderer';
import { fitCameraToModel } from './cameraUtils';

export class AquaSimViewer {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;

    private modelGroup: THREE.Group;
    private beamGroup: THREE.Group;
    private trussGroup: THREE.Group;
    private membraneGroup: THREE.Group;

    private axesHelper: THREE.AxesHelper;
    private gridHelper: THREE.GridHelper | null = null;
    private currentBounds: THREE.Box3 = new THREE.Box3();
    private animFrameId: number | null = null;
    private isDestroyed: boolean = false;

    // Cross-section visual controls
    private currentScaleFactor: number = 1.0;
    private renderMode: 'solid' | 'wireframe' | 'both' = 'both';

    // Component map for quick visibility toggling: key -> THREE.Object3D
    private componentObjectMap: Map<string, THREE.Object3D> = new Map();

    constructor(container: HTMLElement) {
        this.container = container;

        // 1. Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f172a); // Slate-900 engineering dark background

        // 2. Camera: in AquaSim, +Z is vertical depth/elevation (sea surface at Z=0, seabed negative)
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
        this.camera.up.set(0, 0, 1); // Set Z as vertical up vector
        this.camera.position.set(200, -200, 150);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.container.appendChild(this.renderer.domElement);

        // 4. OrbitControls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.screenSpacePanning = true;

        // 5. Lighting: Ambient + Directionals for full visibility of underwater structure
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
        this.scene.add(ambientLight);

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
        dirLight1.position.set(300, -400, 500);
        this.scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0x90cdf4, 0.5); // Subtle sea-blue fill from below
        dirLight2.position.set(-300, 400, -500);
        this.scene.add(dirLight2);

        // 6. Helpers
        this.axesHelper = new THREE.AxesHelper(50);
        this.axesHelper.renderOrder = 999;
        this.scene.add(this.axesHelper);

        this.setupWaterSurfaceGrid(200);

        // 7. Model Groups
        this.modelGroup = new THREE.Group();
        this.modelGroup.name = 'modelGroup';
        this.scene.add(this.modelGroup);

        this.beamGroup = new THREE.Group();
        this.beamGroup.name = 'beamGroup';
        this.modelGroup.add(this.beamGroup);

        this.trussGroup = new THREE.Group();
        this.trussGroup.name = 'trussGroup';
        this.modelGroup.add(this.trussGroup);

        this.membraneGroup = new THREE.Group();
        this.membraneGroup.name = 'membraneGroup';
        this.modelGroup.add(this.membraneGroup);

        // 8. Event listeners
        window.addEventListener('resize', this.onResize);
        const resizeObserver = new ResizeObserver(() => this.onResize());
        resizeObserver.observe(this.container);

        // 9. Start render loop
        this.animate();
    }

    private setupWaterSurfaceGrid(size: number): void {
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            this.gridHelper.dispose();
        }
        // Three.js GridHelper defaults to X-Z plane (Y-up).
        // For AquaSim Z-up, rotate 90 deg around X so it sits in the X-Y plane at Z=0 (sea surface).
        const divisions = 40;
        this.gridHelper = new THREE.GridHelper(size, divisions, 0x38bdf8, 0x1e293b);
        this.gridHelper.rotation.x = Math.PI / 2;
        this.gridHelper.position.set(0, 0, 0);
        this.scene.add(this.gridHelper);
    }

    private onResize = (): void => {
        if (!this.container || this.isDestroyed) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    };

    private animate = (): void => {
        if (this.isDestroyed) return;
        this.animFrameId = requestAnimationFrame(this.animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    };

    /**
     * Clear existing model geometry and dispose resources.
     */
    public clearModel(): void {
        this.componentObjectMap.clear();

        const disposeGroup = (group: THREE.Group) => {
            while (group.children.length > 0) {
                const child = group.children[0] as THREE.Mesh | THREE.LineSegments;
                group.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((m) => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        };

        disposeGroup(this.beamGroup);
        disposeGroup(this.trussGroup);
        disposeGroup(this.membraneGroup);
    }

    /**
     * Load an AquaSimModel into the 3D scene.
     */
    public loadModel(model: AquaSimModel): void {
        this.clearModel();

        // 1. Build Beams with amodel sections
        const beams = createBeamGroup(model.beams, model.nodes, {
            scaleFactor: this.currentScaleFactor,
            renderMode: this.renderMode
        });
        [...beams.children].forEach((obj) => {
            const id = obj.userData.componentId ?? obj.name;
            this.componentObjectMap.set(`beam_${id}`, obj);
            this.beamGroup.add(obj);
        });

        // 2. Build Trusses with circular sections
        const trusses = createTrussGroup(model.trusses, model.nodes, {
            scaleFactor: this.currentScaleFactor,
            renderMode: this.renderMode
        });
        [...trusses.children].forEach((obj) => {
            const id = obj.userData.componentId ?? obj.name;
            this.componentObjectMap.set(`truss_${id}`, obj);
            this.trussGroup.add(obj);
        });

        // 3. Build Membranes with all components preserved
        const membranes = createMembraneGroup(model.membranes, model.nodes);
        [...membranes.children].forEach((obj) => {
            const id = obj.userData.componentId ?? obj.name;
            this.componentObjectMap.set(`membrane_${id}`, obj);
            this.membraneGroup.add(obj);
        });

        // 4. Compute bounding box
        this.currentBounds.setFromObject(this.modelGroup);

        if (!this.currentBounds.isEmpty()) {
            const size = new THREE.Vector3();
            this.currentBounds.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);

            // Scale axes and grid helper to model scale
            this.axesHelper.scale.setScalar(Math.max(10, maxDim * 0.15));
            this.setupWaterSurfaceGrid(Math.max(200, Math.ceil(maxDim * 1.5 / 100) * 100));

            // Automatic camera fit
            this.fitView();
        }

        // Print debug checkpoint report as required in Section 28
        console.log(`AquaSim model loaded: "${model.name}"`);
        console.log(`Nodes:\n  ${model.nodes.size}`);
        console.log(`Components:\n  Beam: ${model.beams.length}\n  Truss: ${model.trusses.length}\n  Membrane: ${model.membranes.length}`);
        console.log(`Elements:\n  Beam: ${model.report.beamElementCount}\n  Truss: ${model.report.trussElementCount}\n  Membrane: ${model.report.membraneElementCount}\n  Total: ${model.report.totalElementCount}`);
        console.log(`Bounding box:\n  X: ${model.boundingBox.min.x.toFixed(3)} -> ${model.boundingBox.max.x.toFixed(3)}\n  Y: ${model.boundingBox.min.y.toFixed(3)} -> ${model.boundingBox.max.y.toFixed(3)}\n  Z: ${model.boundingBox.min.z.toFixed(3)} -> ${model.boundingBox.max.z.toFixed(3)}`);
        console.log(`Invalid node references:\n  ${model.report.invalidReferences}`);
    }

    /**
     * Automatic camera fit to entire model (including distant seabed mooring lines)
     */
    public fitView(): void {
        if (!this.currentBounds.isEmpty()) {
            fitCameraToModel(this.camera, this.controls, this.currentBounds);
        }
    }

    /**
     * Focus camera specifically on the floating cage structure and nets (radius ~50m)
     */
    public fitCageView(): void {
        const cageBounds = new THREE.Box3();
        if (this.beamGroup.children.length > 0) {
            cageBounds.expandByObject(this.beamGroup);
        }
        if (this.membraneGroup.children.length > 0) {
            cageBounds.expandByObject(this.membraneGroup);
        }
        if (!cageBounds.isEmpty()) {
            fitCameraToModel(this.camera, this.controls, cageBounds, 1.8);
        } else {
            this.fitView();
        }
    }

    /**
     * Category level visibility
     */
    public setCategoryVisibility(category: 'beam' | 'truss' | 'membrane', visible: boolean): void {
        switch (category) {
            case 'beam':
                this.beamGroup.visible = visible;
                break;
            case 'truss':
                this.trussGroup.visible = visible;
                break;
            case 'membrane':
                this.membraneGroup.visible = visible;
                break;
        }
    }

    /**
     * Component level visibility
     */
    public setComponentVisibility(key: string, visible: boolean): void {
        const obj = this.componentObjectMap.get(key);
        if (obj) {
            obj.visible = visible;
        }
    }

    /**
     * Dynamically scale the cross-sections of beam and truss elements
     */
    public setSectionScale(scale: number): void {
        this.currentScaleFactor = scale;
        updateBeamScale(this.beamGroup, scale);
        updateTrussScale(this.trussGroup, scale);
    }

    /**
     * Switch render mode: solid 3D sections, wireframe centerlines, or both
     */
    public setRenderMode(mode: 'solid' | 'wireframe' | 'both'): void {
        this.renderMode = mode;
        const updateVisibility = (group: THREE.Group) => {
            group.children.forEach((compGroup) => {
                const u = compGroup.userData;
                if (u.instancedMesh) {
                    u.instancedMesh.visible = mode !== 'wireframe';
                }
                if (u.lineSegments) {
                    u.lineSegments.visible = mode !== 'solid';
                }
            });
        };
        updateVisibility(this.beamGroup);
        updateVisibility(this.trussGroup);
    }

    /**
     * Set grid visibility
     */
    public setGridVisibility(visible: boolean): void {
        if (this.gridHelper) {
            this.gridHelper.visible = visible;
        }
    }

    /**
     * Set axes visibility
     */
    public setAxesVisibility(visible: boolean): void {
        this.axesHelper.visible = visible;
    }

    /**
     * Cleanup viewer
     */
    public destroy(): void {
        this.isDestroyed = true;
        if (this.animFrameId !== null) {
            cancelAnimationFrame(this.animFrameId);
        }
        window.removeEventListener('resize', this.onResize);
        this.clearModel();
        this.renderer.dispose();
        if (this.renderer.domElement.parentElement) {
            this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
        }
    }
}
