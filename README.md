# AquaSim Web Model Viewer

A lightweight, browser-based 3D engineering viewer for **AquaSim** `.amodel` marine aquaculture simulation files.

Built with **TypeScript**, **Three.js**, and **Vite** without external frameworks or backend servers. All `.amodel` XML files remain 100% client-side and are parsed directly in the browser.

---

## 📸 Screenshots

| Floating Collar & Underwater Net Cone | Complete 1.1 km Mooring Array |
|:---:|:---:|
| ![Cage Close-up](public/aquasim_cage_preview.png) | ![Mooring Array](public/aquasim_viewer_preview.png) |

---

## 📖 User Manual

### 1. Starting the Application
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
- **File Dialog:** Click **"Open .amodel"** in the top toolbar to browse and select a file.
- **One-Click Benchmark Sample:** Click **"Load Sample (testFile1)"** to immediately load and verify the included benchmark fish cage model.

---

### 3. 3D Viewport Navigation
| Action | Mouse / Trackpad | Touch |
|---|---|---|
| **Rotate** | **Left-click + Drag** | One-finger swipe |
| **Pan** | **Right-click + Drag** (or **Middle-click + Drag**) | Two-finger drag |
| **Zoom** | **Mouse Scroll Wheel** | Pinch in / out |

---

### 4. Toolbar Controls
- **Fit All:** Centers the camera to enclose the entire model bounding box (including seabed anchors over 1 km away).
- **Focus Cage:** Zooms the camera directly in on the floating collar and underwater net cone (~50 m span).
- **Scale Slider:** Real-time scaling of beam and truss 3D cross-sections (from 0.5x to 20x) to clearly inspect slender cables or pipes at any zoom distance.
- **Display Mode:** Choose between **Solid + Centerline**, **Solid 3D Only**, or **Centerline Only**.
- **Grid:** Toggles the sea-surface reference grid on/off (positioned at water level $Z = 0$).
- **Axes:** Toggles the 3D coordinate axes indicator on/off (Red = X, Green = Y, Blue = Z).

---

### 5. Model Hierarchy & Visibility Controls
The left sidebar displays all components organized into three structural categories:
- **Beam:** Rigid structural rings, collars, stusses, and pipes.
- **Truss:** Mooring lines, bridle ropes, winch cables, and bottom chains.
- **Membrane:** Aquaculture net panels, roof nets, and bottom cone nets.

Each component entry includes:
- **Checkbox:** Toggle visibility of the category or individual component.
- **Color Swatch:** Matches the authentic RGB color configured in the AquaSim XML file (`<color red="..." green="..." blue="..." />`).
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

## 🛠️ Architecture & Technology

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
  ├── beamRenderer.ts      ── Batched LineSegments with component colors
  ├── trussRenderer.ts     ── Batched LineSegments with component colors
  └── membraneRenderer.ts  ── Triangulated BufferGeometry with transparent shading
```

---

## 🧪 Testing & Production Build

### Run Unit Tests
```bash
npm test
```
Runs 11 automated Vitest tests covering:
- Node coordinate extraction with non-sequential IDs
- Beam, Truss, and Membrane element connectivity
- Component `<color>` attribute extraction
- Broken node reference tolerance and warnings
- Complete parsing of `testFile1.amodel`
- Batched `LineSegments` and quad-to-triangle geometry generation

### Build Production Bundle
```bash
npm run build
```
Generates an optimized, minified static distribution in `dist/`.
