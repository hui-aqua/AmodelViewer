import './style.css';
import { AquaSimViewer } from '@/viewer/AquaSimViewer';
import { setupFileLoader, loadSampleModel } from '@/ui/fileLoader';
import { ModelTreeUI } from '@/ui/modelTree';
import { AquaSimModel } from '@/parser/types';

function init() {
    // 1. DOM Elements
    const viewportContainer = document.getElementById('viewport-container') as HTMLElement;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const btnOpenFile = document.getElementById('btn-open-file') as HTMLButtonElement;
    const btnFitView = document.getElementById('btn-fit-view') as HTMLButtonElement;
    const btnFitCage = document.getElementById('btn-fit-cage') as HTMLButtonElement;
    const btnToggleCamera = document.getElementById('btn-toggle-camera') as HTMLButtonElement | null;
    const btnBoxCam = document.getElementById('btn-box-cam') as HTMLButtonElement | null;
    const selectRenderMode = document.getElementById('select-render-mode') as HTMLSelectElement | null;
    const btnToggleGrid = document.getElementById('btn-toggle-grid') as HTMLButtonElement;
    const btnToggleAxes = document.getElementById('btn-toggle-axes') as HTMLButtonElement;

    // View Orientation Buttons
    const btnViewX = document.getElementById('btn-view-x') as HTMLButtonElement | null;
    const btnViewY = document.getElementById('btn-view-y') as HTMLButtonElement | null;
    const btnViewZ = document.getElementById('btn-view-z') as HTMLButtonElement | null;
    const btnViewIso = document.getElementById('btn-view-iso') as HTMLButtonElement | null;

    // Plane Grid Buttons
    const btnPlaneXY = document.getElementById('btn-plane-xy') as HTMLButtonElement | null;
    const btnPlaneXZ = document.getElementById('btn-plane-xz') as HTMLButtonElement | null;
    const btnPlaneYZ = document.getElementById('btn-plane-yz') as HTMLButtonElement | null;

    const treeContainer = document.getElementById('model-tree') as HTMLElement;
    const statsContainer = document.getElementById('model-stats') as HTMLElement;
    const loadingSpinner = document.getElementById('loading-spinner') as HTMLElement;
    const loadingText = document.getElementById('loading-text') as HTMLElement;


    // 2. Initialize 3D Viewer
    const viewer = new AquaSimViewer(viewportContainer);

    const themeButton = document.getElementById('btn-toggle-theme') as HTMLButtonElement;
    let theme: 'light' | 'dark' = 'dark';
    try { theme = localStorage.getItem('amodel-theme') === 'light' ? 'light' : 'dark'; } catch {}
    const applyTheme = () => {
        document.documentElement.dataset.theme = theme; viewer.setTheme(theme);
        themeButton.title = 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' theme';
        themeButton.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' theme');
    };
    applyTheme();
    themeButton.addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; applyTheme(); try { localStorage.setItem('amodel-theme', theme); } catch {} });
    const sidebarButton = document.getElementById('btn-toggle-sidebar') as HTMLButtonElement;
    const sidebar = document.getElementById('model-sidebar') as HTMLElement;
    function setSidebarCollapsed(collapsed: boolean) {
        sidebar.hidden = collapsed;
        sidebarButton.classList.toggle('collapsed', collapsed);
        sidebarButton.title = collapsed ? 'Show model components' : 'Hide model components';
        sidebarButton.setAttribute('aria-label', sidebarButton.title);
        sidebarButton.setAttribute('aria-expanded', String(!collapsed));
    }
    setSidebarCollapsed(window.matchMedia('(max-width: 600px)').matches);
    sidebarButton.addEventListener('click', () => setSidebarCollapsed(!sidebar.hidden));

    // 3. Initialize Model Tree UI
    const modelTree = new ModelTreeUI(
        {
            treeContainer,
            statsContainer
        },
        viewer
    );

    // 4. State tracking
    let isGridVisible = true;
    let isAxesVisible = true;

    function showLoading(msg: string) {
        loadingText.textContent = msg;
        loadingSpinner.style.display = 'flex';
    }

    function hideLoading() {
        loadingSpinner.style.display = 'none';
    }

    function handleModelLoaded(model: AquaSimModel, filename: string) {
        hideLoading();

        // Load into 3D scene
        viewer.loadModel(model);

        // Update hierarchy and statistics in UI
        modelTree.update(model, filename);

        if (window.location.search.includes('focus=cage')) {
            viewer.fitCageView();
        }

        // Notify if warnings occurred
        if (model.report.warnings.length > 0) {
            console.warn(`Model loaded with ${model.report.warnings.length} warning(s):`, model.report.warnings);
        }
    }

    function handleModelError(error: Error, filename: string) {
        hideLoading();
        alert(`Failed to load model "${filename}":\n\n${error.message}`);
        console.error(error);
    }

    // 5. Setup File Loading (Input + Drag & Drop)
    setupFileLoader(fileInput, viewportContainer, {
        onLoadStart: (filename) => {
            showLoading(`Parsing "${filename}"...`);
        },
        onLoadSuccess: handleModelLoaded,
        onLoadError: handleModelError
    });

    // 6. Toolbar Actions
    btnOpenFile.addEventListener('click', () => {
        fileInput.click();
    });

    const sampleUrl = './models/ENCC100323640.amodel';
    const sampleName = 'ENCC100323640.amodel';

    btnFitView.addEventListener('click', () => {
        viewer.fitView();
    });

    btnFitCage.addEventListener('click', () => {
        viewer.fitCageView();
    });

    // 7. Camera Projection Switcher (Perspective <-> Orthographic)
    function updateCameraButtons(mode: 'perspective' | 'orthographic') {
        for (const button of [btnToggleCamera, btnBoxCam]) {
            if (!button) continue;
            button.setAttribute('aria-checked', String(mode === 'orthographic'));
            button.title = mode === 'perspective' ? 'Perspective projection ? switch to Orthographic' : 'Orthographic projection ? switch to Perspective';
        }
    }
    updateCameraButtons(viewer.getCameraMode());

    function handleToggleCamera() {
        const newMode = viewer.toggleCameraMode();
        updateCameraButtons(newMode);
    }

    if (btnToggleCamera) {
        btnToggleCamera.addEventListener('click', handleToggleCamera);
    }
    if (btnBoxCam) {
        btnBoxCam.addEventListener('click', handleToggleCamera);
    }

    // 8. Quick View Alignment Buttons (X+, Y+, Z+, Iso)
    if (btnViewX) {
        btnViewX.addEventListener('click', () => viewer.alignView('x+'));
    }
    if (btnViewY) {
        btnViewY.addEventListener('click', () => viewer.alignView('y+'));
    }
    if (btnViewZ) {
        btnViewZ.addEventListener('click', () => viewer.alignView('z+'));
    }
    if (btnViewIso) {
        btnViewIso.addEventListener('click', () => viewer.alignView('iso'));
    }

    // 9. Reference Grid Plane Toggles (XY, XZ, YZ)
    if (btnPlaneXY) {
        btnPlaneXY.addEventListener('click', () => {
            const next = !viewer.getPlaneVisibility('xy');
            viewer.setPlaneVisibility('xy', next);
            btnPlaneXY.classList.toggle('active', next);
        });
    }
    if (btnPlaneXZ) {
        btnPlaneXZ.addEventListener('click', () => {
            const next = !viewer.getPlaneVisibility('xz');
            viewer.setPlaneVisibility('xz', next);
            btnPlaneXZ.classList.toggle('active', next);
        });
    }
    if (btnPlaneYZ) {
        btnPlaneYZ.addEventListener('click', () => {
            const next = !viewer.getPlaneVisibility('yz');
            viewer.setPlaneVisibility('yz', next);
            btnPlaneYZ.classList.toggle('active', next);
        });
    }

    // Render Mode (Solid / Wireframe / Both)
    if (selectRenderMode) {
        selectRenderMode.addEventListener('change', () => {
            viewer.setRenderMode(selectRenderMode.value as 'solid' | 'wireframe' | 'both');
        });
    }

    // Master Grid & Axes Toggles
    btnToggleGrid.addEventListener('click', () => {
        isGridVisible = !isGridVisible;
        viewer.setGridVisibility(isGridVisible);
        btnToggleGrid.classList.toggle('btn-active', isGridVisible);
    });

    btnToggleAxes.addEventListener('click', () => {
        isAxesVisible = !isAxesVisible;
        viewer.setAxesVisibility(isAxesVisible);
        btnToggleAxes.classList.toggle('btn-active', isAxesVisible);
    });

    // 10. Automatically load ENCC100323640.amodel on startup
    loadSampleModel(sampleUrl, sampleName, {
        onLoadStart: (name) => {
            showLoading(`Loading benchmark sample "${name}"...`);
        },
        onLoadSuccess: handleModelLoaded,
        onLoadError: (err) => {
            hideLoading();
            console.log('Sample model not auto-loaded:', err.message);
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
