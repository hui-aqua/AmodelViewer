# AquaSim Web Model Viewer

A lightweight, high-performance browser-based 3D engineering viewer for **AquaSim** `.amodel` marine simulation models.

Built entirely with **TypeScript**, **Three.js**, and **Vite**, with no backend or external framework dependencies. The application parses and renders `.amodel` XML files completely on the client side, keeping engineering data private and local.

---

## 📸 Screenshots

| Cage & Net Close-up (with XML Colors) | Complete 1.1 km Mooring Array |
|:---:|:---:|
| ![Cage Close-up](public/aquasim_cage_preview.png) | ![Mooring Array](public/aquasim_viewer_preview.png) |

---

## 🚀 Key Features

- **Client-Side XML Parsing:** Drag & drop or select `.amodel` files; parsed instantly via browser DOM APIs without file size uploads.
- **Authentic AquaSim Colors:** Automatically extracts and applies RGB colors defined in `<color red="..." green="..." blue="..." />` for every beam, truss, and membrane component, with corresponding color swatches in the sidebar.
- **Engineering Coordinate System:**
  - Preserves exact AquaSim XYZ coordinates without axis swaps:
    - **X:** Lateral
    - **Y:** Longitudinal
    - **Z:** Vertical depth / elevation (sea surface at $Z = 0$, seabed at negative depth).
  - Sea-surface reference grid and scaled XYZ axes indicator.
- **High-Performance Batched Rendering:**
  - **Beams:** Batched `THREE.LineSegments` per component.
  - **Trusses:** Batched `THREE.LineSegments` per component (cables, ropes, moorings).
  - **Membranes:** Triangulated `THREE.BufferGeometry` (quads split into two triangles) with double-sided translucent shading.
- **Hierarchical Model Tree & Visibility Toggles:**
  - Expand/collapse categories (Beam, Truss, Membrane).
  - Independent visibility checkboxes for whole categories or individual components.
- **Dual Camera Fitting:**
  - **Fit All:** Frames the entire model bounding box (over $1\,\text{km}$ mooring grid).
  - **Focus Cage:** Zooms directly into the floating collar and underwater net cone ($\sim 50\,\text{m}$ span).
- **Topology Validation & Statistics:**
  - Validates all node references before drawing; missing nodes are logged and skipped without crashing.
  - Live statistics display: node count, element counts per category, invalid references, and bounding box.

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
| **Bounding Box X** | $-548.787\,\text{m} \rightarrow +548.787\,\text{m}$ |
| **Bounding Box Y** | $-548.787\,\text{m} \rightarrow +548.787\,\text{m}$ |
| **Bounding Box Z** | $-190.824\,\text{m} \rightarrow 0.000\,\text{m}$ (Seabed to Surface) |

---

## 🏗️ Architecture

```text
AquaSim XML (.amodel)
       │
       ▼
 [ amodelParser.ts ]  ── Pure TypeScript DOM parser & connectivity validator
       │
       ▼
  AquaSimModel        ── Normalized data model (Nodes Map, Beams, Trusses, Membranes)
       │
       ▼
[ AquaSimViewer.ts ]  ── Three.js rendering layer (Z-up camera, OrbitControls)
  ├── beamRenderer.ts      ── Batched LineSegments
  ├── trussRenderer.ts     ── Batched LineSegments
  └── membraneRenderer.ts  ── Triangulated BufferGeometry with authentic colors
```

---

## 💻 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/) in your web browser.

### 3. Run Automated Tests
```bash
npm test
```
Executes unit tests verifying node extraction, beam/truss/membrane connectivity, error handling, broken reference resilience, and renderer geometry.

### 4. Build for Production
```bash
npm run build
```
Generates an optimized static bundle in `dist/`.
