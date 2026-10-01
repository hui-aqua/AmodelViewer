# AquaSim Web Model Viewer — Milestone 1

A lightweight, high-performance browser-based 3D engineering viewer for **AquaSim** `.amodel` simulation models.

Built strictly with **TypeScript**, **Vite**, and **Three.js** without heavy external frameworks or backend dependencies. All `.amodel` XML files remain 100% local on the client machine and are parsed in-browser using standard web APIs.

---

## 📸 Screenshots

### 1. Full Mooring Array View (1.1 km Field)
![Full Model View](public/aquasim_viewer_preview.png)

### 2. Floating Collar, Sinker Ring & Net Cone Close-up
![Cage Close-up View](public/aquasim_cage_preview.png)

---

## ✨ Features (Milestone 1)

1. **Direct `.amodel` File Opening & Drag-and-Drop:**
   - Drag and drop any `.amodel` file directly into the browser.
   - Or click **"Open .amodel"** to browse local files.
   - One-click **"Load Sample (testFile1)"** for immediate demonstration and validation.

2. **Strict Architectural Separation:**
   - **Parser Layer (`src/parser/`):** Pure TypeScript DOM XML parser that converts AquaSim files into an internal data model (`AquaSimModel`), entirely independent of Three.js.
   - **Validation Layer:** Verifies node ID references for all line elements and membrane quadrilaterals before creating geometry. Missing nodes are logged with warnings and gracefully skipped without crashing.
   - **Visualization Layer (`src/viewer/`):** High-performance Three.js rendering using batched `THREE.LineSegments` and `THREE.BufferGeometry` per component (never one mesh/line per element).

3. **Engineering Coordinate Fidelity:**
   - Strictly preserves AquaSim coordinate semantics:
     - **X:** Lateral
     - **Y:** Longitudinal
     - **Z:** Vertical depth / elevation (sea surface at `Z = 0`, seabed at negative Z).
   - Camera `up` vector configured as `(0, 0, 1)`.
   - Sea surface grid aligned with the X-Y plane at `Z = 0`.
   - Scale-adjusted XYZ axes indicator (X: Red, Y: Green, Z: Blue).

4. **Component Hierarchy & Visibility Toggles:**
   - Collapsible model tree with live element count badges:
     - **Beam (Cyan):** Floating collar, sinker ring, stusses, attachment rings.
     - **Truss (Amber):** Mooring cables, bridle lines, winches, rope stays.
     - **Membrane (Emerald):** Net panels, roof, side nets, bottom cone.
   - Independent category-level and per-component visibility checkboxes.

5. **Navigation & Camera Controls:**
   - Full 3D rotation (left drag), panning (right drag / middle click), and zoom (scroll).
   - **"Fit All"**: Automatically fits camera to the entire mooring array bounding box (over 1 km span).
   - **"Focus Cage"**: Automatically frames the central floating cage and underwater net cone (~50m span).

6. **Comprehensive Model Statistics:**
   - Node count, component counts, element counts, invalid references, and exact bounding box dimensions.

---

## 📊 Benchmark Model Statistics (`testFile1.amodel`)

| Metric | Measured Value |
|---|---|
| **Nodes** | 4,884 |
| **Total Elements** | 7,039 |
| **Beam Components / Elements** | 6 components / 700 elements |
| **Truss Components / Elements** | 33 components / 3,159 elements |
| **Membrane Components / Elements** | 7 components / 3,180 elements |
| **Invalid Node References** | 0 |
| **Bounding Box X** | -548.787 m → +548.787 m (span: 1,097.57 m) |
| **Bounding Box Y** | -548.787 m → +548.787 m (span: 1,097.57 m) |
| **Bounding Box Z** | -190.824 m → 0.000 m (depth: 190.82 m) |

---

## 🛠️ Project Structure

```text
SimViewer/
├── index.html                      # Main HTML application layout
├── package.json                    # Project dependencies and scripts
├── tsconfig.json                   # TypeScript compiler configuration
├── vite.config.ts                  # Vite and Vitest configuration
├── README.md                       # Documentation and usage guide
│
├── public/
│   ├── testFile1.amodel            # Benchmark sample model
│   ├── aquasim_viewer_preview.png  # Full mooring view screenshot
│   └── aquasim_cage_preview.png    # Cage close-up view screenshot
│
├── src/
│   ├── main.ts                     # Main entrypoint, state & UI wiring
│   ├── style.css                   # Engineering dark UI stylesheet
│   │
│   ├── parser/
│   │   ├── types.ts                # Internal structural data models
│   │   └── amodelParser.ts         # XML DOM parser & geometry validator
│   │
│   ├── viewer/
│   │   ├── AquaSimViewer.ts        # Scene, camera, controls, batched groups
│   │   ├── cameraUtils.ts          # Coordinate mapping & camera fitting
│   │   ├── beamRenderer.ts         # Batched LineSegments for beams
│   │   ├── trussRenderer.ts        # Batched LineSegments for trusses
│   │   └── membraneRenderer.ts     # Triangulated BufferGeometry for nets
│   │
│   └── ui/
│       ├── fileLoader.ts           # Input, drag-and-drop & sample fetcher
│       └── modelTree.ts            # Component hierarchy tree & stats panel
│
├── tests/
│   ├── amodelParser.test.ts        # Parser & validation test suite
│   └── renderers.test.ts           # 3D renderer geometry test suite
│
└── examples/
    └── models/
        ├── testFile1.amodel
        ├── ENCC100323640.amodel
        ├── ENC172233860Winch_nearSurface.amodel
        └── winch_cage.amodel
```

---

## 🚀 Installation & Running Locally

### Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open your browser at `http://127.0.0.1:5173/`.

### 3. Run Automated Tests
```bash
npm test
```
Runs the Vitest suite covering node parsing, beam/truss/membrane connectivity, error handling, broken reference resilience, and renderer triangulation.

### 4. Build for Production
```bash
npm run build
```
Creates an optimized static production bundle in `dist/`.

---

## 🔍 Notes on AquaSim XML Fields & Future Expansion

### Preserved & Safely Handled Fields
The parser reads and preserves component and element metadata in generic records (`metadata: Record<string, string>`), ensuring no engineering data is lost:
- `<dof6 TranslationX="..." rotationX="..." />`: Node degree-of-freedom boundary constraints.
- `<crossection ...>`, `<crossectionGroup ...>`: Beam pipe diameters and SDR specifications (e.g. `Flytekrage_Ø500_SDR13.6`).
- Membrane physical parameters: `emodule`, `diameter`, `areal`, `arealhorizontal`, `pretensiony`, `pretensionz`, `maskwidthy`, `maskwidthz`, `massDensity`, `weight`, `nocompression`, `calculationsModel`.
- Environmental tags: `<Environment>`, `<current>`, `<wavegenerator>`, `<windVelocity>`.
- Point loads & winches: `<pointLoad>`, `<winch>`, `<mooring>`.

These fields are preserved safely for future milestones (e.g. realistic pipe/rope diameters, stress visualization, tension contour plots, and simulation load boundary conditions).
