# AquaSim Web Model Viewer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-brightgreen)](https://hui-aqua.github.io/AmodelViewer/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r170-black)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF)](https://vitejs.dev/)

A lightweight, high-performance browser-based 3D engineering viewer for **AquaSim** `.amodel` marine aquaculture simulation files.

Built with **TypeScript**, **Three.js**, and **Vite** without heavy UI frameworks or backend servers. All `.amodel` XML files remain **100% private and client-side** in your browser.

---

## 🌐 Instant Online Web App

**No installation required!** You can use the web viewer directly in your web browser:

👉 **[Launch AquaSim Web Viewer on GitHub Pages](https://hui-aqua.github.io/AmodelViewer/)**

Simply drag and drop your `.amodel` file into the browser window or test using the pre-loaded benchmark models.

---

## 📸 Screenshots

| Floating Collar & Underwater Net Cone | Complete 1.1 km Mooring Array |
|:---:|:---:|
| ![Cage Close-up](public/aquasim_cage_preview.png) | ![Mooring Array](public/aquasim_viewer_preview.png) |

---

## 📖 User Manual

### 1. Running Locally (Alternative)
1. Ensure [Node.js](https://nodejs.org/) (v18+) is installed.
2. In the project directory, run:
   ```bash
   npm install
   npm run dev
   ```
3. Open your browser at `http://127.0.0.1:5173/`.

---

### 2. Loading a Model
You can load an `.amodel` file in three ways:
- **Drag & Drop:** Drag an `.amodel` file from your desktop/file explorer directly onto the 3D viewport.
- **File Dialog:** Click **"Open .amodel"** in the top toolbar to browse and select any file.
- **Sample Model Picker:** Select any of the 4 included benchmark sample models from the dropdown (`testFile1`, `winch_cage`, `ENC172233860`, `ENCC100323640`) and click **"Load Sample"**.

---

### 3. 3D Viewport Navigation
| Action | Mouse / Trackpad | Touch |
|---|---|---|
| **Rotate** | **Left-click + Drag** | One-finger swipe |
| **Pan** | **Right-click + Drag** (or **Middle-click + Drag**) | Two-finger drag |
| **Zoom** | **Mouse Scroll Wheel** | Pinch in / out |

---

### 4. Toolbar Controls
- **Open .amodel:** Load custom `.amodel` or `.xml` file from local storage.
- **Sample Selector:** Choose from 4 included benchmark marine cage models.
- **Fit All:** Centers the camera to enclose the entire model bounding box (including seabed anchors over 1 km away).
- **Focus Cage:** Zooms the camera directly in on the floating collar and underwater net cone (~50 m span).
- **Scale Slider:** Real-time scaling of beam and truss 3D cross-sections (from 0.5x to 20x) to clearly inspect slender cables or pipes at any zoom distance.
- **Display Mode:** Choose between **Solid + Centerline**, **Solid 3D Only**, or **Centerline Only**.
- **Grid:** Toggles the sea-surface reference grid on/off (positioned at water level $Z = 0$).
- **Axes:** Toggles the 3D coordinate axes indicator on/off (Red = X, Green = Y, Blue = Z).

---

### 5. Model Hierarchy & Visibility Controls
The left sidebar displays all components organized into three structural categories:
- **Beam:** Rigid structural rings, collars, stusses, and pipes (with section dimension badges, e.g., `Ø500mm` or `250×450mm`).
- **Truss:** Mooring lines, bridle ropes, winch cables, and bottom chains (with diameter badges, e.g., `Ø22mm`).
- **Membrane:** Aquaculture net panels, roof nets, and bottom cone nets.

Each component entry includes:
- **Checkbox:** Toggle visibility of the category or individual component.
- **Color Swatch:** Matches the authentic RGB color configured in the AquaSim XML file (`<color red="..." green="..." blue="..." />`).
- **Section Badge:** Displays physical cross-section geometry extracted from the model XML.
- **Element Count Badge:** Number of physical elements in that component.
- **Collapse/Expand Arrow (▼/▶):** Expand or collapse category lists.

---

### 6. Model Statistics & Coordinate System
- **Model Statistics:** Displays total node count, element count, component breakdown, invalid reference count, and exact bounding box coordinates in meters.
- **Coordinate Convention:**
  - **X (Red):** Lateral dimension
  - **Y (Green):** Longitudinal dimension
  - **Z (Blue):** Vertical depth/elevation ($Z = 0$ is the water surface, negative $Z$ represents water depth toward the seabed).

---

## 📊 Benchmark Model (`testFile1.amodel`)

| Metric | Measured Value |
|---|---|
| **Nodes** | 4,884 |
| **Total Elements** | 7,039 |
| **Beam Components / Elements** | 6 components / 700 elements |
| **Truss Components / Elements** | 33 components / 3,159 elements |
| **Membrane Components / Elements** | 7 components / 3,180 elements |
| **Invalid References** | 0 |
| **Bounding Box X** | $-548.787\,\text{m} \rightarrow +548.787\,\text{m}$ (1,097.57 m span) |
| **Bounding Box Y** | $-548.787\,\text{m} \rightarrow +548.787\,\text{m}$ (1,097.57 m span) |
| **Bounding Box Z** | $-190.824\,\text{m} \rightarrow 0.000\,\text{m}$ (190.82 m water depth) |

---

## 📁 Modern Project Structure

```text
SimViewer/
├── .github/
│   └── workflows/
│       ├── deploy.yml          # Automated CI/CD deployment to GitHub Pages
│       └── release.yml         # Automated GitHub Release standalone zip bundler
├── public/                     # Static assets served directly
│   ├── models/                 # Sanitized benchmark .amodel simulation models
│   │   ├── testFile1.amodel
│   │   ├── winch_cage.amodel
│   │   ├── ENC172233860Winch_nearSurface.amodel
│   │   └── ENCC100323640.amodel
│   ├── aquasim_cage_preview.png
│   └── aquasim_viewer_preview.png
├── src/                        # Modular application source code (@/*)
│   ├── parser/                 # Pure TypeScript XML parsing & validation (No Three.js)
│   │   ├── amodelParser.ts     # DOMParser, node extraction, section inference
│   │   └── types.ts            # Normalized data models and interfaces
│   ├── viewer/                 # Three.js 3D rendering layer
│   │   ├── AquaSimViewer.ts    # Main viewer engine (scene, camera, lights, controls)
│   │   ├── beamRenderer.ts     # 3D solid InstancedMesh & centerline renderer
│   │   ├── trussRenderer.ts    # 3D circular InstancedMesh & centerline renderer
│   │   ├── membraneRenderer.ts # Triangulated mesh & twine wireframe renderer
│   │   └── cameraUtils.ts      # Coordinate transforms & camera framing
│   ├── ui/                     # User interface components
│   │   ├── fileLoader.ts       # Drag-and-drop & file selection handlers
│   │   └── modelTree.ts        # Hierarchy tree, visibility toggles & stats panel
│   ├── main.ts                 # Application bootstrapping & event orchestration
│   └── style.css               # Modern engineering dark theme CSS tokens
├── tests/                      # Automated Vitest test suite
│   ├── amodelParser.test.ts    # Model parser and XML extraction tests (10 tests)
│   └── renderers.test.ts       # 3D geometry and rendering tests (4 tests)
├── index.html                  # HTML entry point with semantic layout
├── package.json                # Project dependencies, scripts and metadata
├── tsconfig.json               # Strict TypeScript config with @/* path aliases
├── vite.config.ts              # Vite 8 config with relative base & vendor chunking
├── LICENSE                     # MIT Open Source License
├── THIRD_PARTY_NOTICES.md      # IP clearance, trademark & third-party notices
└── .gitignore                  # Git ignore rules for builds, dependencies and IDEs
```

---

## 🧪 Testing & Production Build

### Run Unit Tests
```bash
npm test
```
Runs 14 automated Vitest tests covering:
- Node coordinate extraction with non-sequential IDs
- Beam, Truss, and Membrane element connectivity
- Component `<color>` attribute extraction
- Broken node reference tolerance and warnings
- Complete parsing of all 4 real `.amodel` benchmark models
- 3D solid cross-sections and dynamic scaling
- Membrane quad triangulation and translucent depth ordering

### Type Check
```bash
npm run typecheck
```
Executes strict TypeScript compiler checks without emitting code.

### Build Production Bundle
```bash
npm run build
```
Generates an optimized, minified static distribution in `dist/` with vendor chunk splitting:
- `assets/three-[hash].js`: Three.js 3D engine chunk (~504 kB)
- `assets/index-[hash].js`: Application bundle (~25 kB)
- `assets/index-[hash].css`: Stylesheet (~7.8 kB)

---

## ⚖️ Intellectual Property Clearance & Disclaimers

### Trademark Notice
**AquaSim®** is a registered trademark of **Aquastructure AS** (Trondheim, Norway).  
**AquaSim Web Viewer** is an independent, community-developed, open-source 3D visualization tool. It is **not** affiliated with, authorized by, sponsored by, or connected with Aquastructure AS. References to AquaSim and the `.amodel` format are used solely in a descriptive, nominative fair-use capacity to indicate file format compatibility.

### Data Sanitization
All benchmark simulation models included in `public/models/` have been cleansed of proprietary company names, confidential drive paths, customer references, and personal author identifiers.

For full license texts and third-party notices, please refer to [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
