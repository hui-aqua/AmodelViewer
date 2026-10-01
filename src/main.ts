import './style.css';
import { AquaSimViewer } from './viewer/AquaSimViewer';
import { setupFileLoader, loadSampleModel } from './ui/fileLoader';
import { ModelTreeUI } from './ui/modelTree';
import { AquaSimModel } from './parser/types';

document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM Elements
    const viewportContainer = document.getElementById('viewport-container') as HTMLElement;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const btnOpenFile = document.getElementById('btn-open-file') as HTMLButtonElement;
    const btnLoadSample = document.getElementById('btn-load-sample') as HTMLButtonElement;
    const btnFitView = document.getElementById('btn-fit-view') as HTMLButtonElement;
    const btnToggleGrid = document.getElementById('btn-toggle-grid') as HTMLButtonElement;
    const btnToggleAxes = document.getElementById('btn-toggle-axes') as HTMLButtonElement;

    const treeContainer = document.getElementById('model-tree') as HTMLElement;
    const statsContainer = document.getElementById('model-stats') as HTMLElement;
    const loadingSpinner = document.getElementById('loading-spinner') as HTMLElement;
    const loadingText = document.getElementById('loading-text') as HTMLElement;

    const footerFilename = document.getElementById('footer-filename') as HTMLElement;
    const footerStatus = document.getElementById('footer-status') as HTMLElement;

    // 2. Initialize 3D Viewer
    const viewer = new AquaSimViewer(viewportContainer);

    // 3. Initialize Model Tree UI
    const modelTree = new ModelTreeUI(
        {
            treeContainer,
            statsContainer,
            statusText: footerStatus
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
        footerFilename.textContent = filename;
        footerStatus.textContent = 'Loaded successfully';

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
        footerFilename.textContent = filename;
        footerStatus.textContent = `Error: ${error.message}`;
        alert(`Failed to load model "${filename}":\n\n${error.message}`);
        console.error(error);
    }

    // 5. Setup File Loading (Input + Drag & Drop)
    setupFileLoader(fileInput, viewportContainer, {
        onLoadStart: (filename) => {
            showLoading(`Parsing "${filename}"...`);
            footerFilename.textContent = filename;
            footerStatus.textContent = 'Parsing...';
        },
        onLoadSuccess: handleModelLoaded,
        onLoadError: handleModelError
    });

    // 6. Toolbar Actions
    btnOpenFile.addEventListener('click', () => {
        fileInput.click();
    });

    btnLoadSample.addEventListener('click', () => {
        loadSampleModel('/testFile1.amodel', 'testFile1.amodel', {
            onLoadStart: (name) => {
                showLoading(`Loading benchmark sample "${name}"...`);
                footerFilename.textContent = name;
                footerStatus.textContent = 'Downloading and parsing...';
            },
            onLoadSuccess: handleModelLoaded,
            onLoadError: handleModelError
        });
    });

    const btnFitCage = document.getElementById('btn-fit-cage') as HTMLButtonElement;

    btnFitView.addEventListener('click', () => {
        viewer.fitView();
    });

    btnFitCage.addEventListener('click', () => {
        viewer.fitCageView();
    });

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

    // Automatically load testFile1.amodel on startup for instant validation
    loadSampleModel('/testFile1.amodel', 'testFile1.amodel', {
        onLoadStart: (name) => {
            showLoading(`Loading benchmark sample "${name}"...`);
            footerFilename.textContent = name;
            footerStatus.textContent = 'Initializing...';
        },
        onLoadSuccess: handleModelLoaded,
        onLoadError: (err) => {
            hideLoading();
            console.log('Sample model not auto-loaded:', err.message);
            footerStatus.textContent = 'Ready (drag & drop .amodel)';
        }
    });
});
