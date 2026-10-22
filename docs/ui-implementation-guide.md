# Building a Structural Model Viewer UI: Implementation Guide

This document explains how the AquaSim Web Viewer is assembled, styled, and connected to its Three.js scene. It is intended as a practical reference for developers creating a similar browser-based engineering model viewer. It describes the current implementation in this repository; values and behavior below are implementation facts, while suggestions are explicitly marked as guidance.

## 1. Architecture at a glance

The interface is split into four cooperating layers:

1. **HTML shell** (`index.html`) declares the page regions, toolbar controls, sidebar, drop/loading overlays, and floating orientation panel. Stable element IDs are the contract used by TypeScript.
2. **CSS design system** (`src/styles/main.css`) controls layout, typography, spacing, borders, interaction states, responsive behavior, and light/dark color tokens.
3. **UI controllers** (`src/ui/toolbar.ts`, `preferences.ts`, `modelTree.ts`, and `fileLoader.ts`) bind user actions to viewer methods and render model information.
4. **3D viewer and renderers** (`src/viewer/AquaSimViewer.ts` and `src/viewer/renderers/`) own cameras, scene helpers, model geometry, material colors, and GPU resource cleanup.

`src/main.ts` imports the stylesheet and starts `initializeApp`. The initializer creates the viewer, installs preferences, creates the model tree, connects file loading and toolbar actions, then updates both scene and sidebar when a model arrives. This keeps parsing/UI orchestration separate from geometry creation. A similar project can retain this separation even if its parser and data model differ.

## 2. Page composition and layout

The application fills the browser window. `html, body` use 100% width and height, hide outer overflow, and use a 13 px base font with 1.4 line height. `.app-layout` is a full-viewport vertical flex container. Its two children are:

- **Header:** `.app-header`, at least 52 px tall, with a brand at the left and a wrapping toolbar at the right. It has 16 px horizontal padding, a secondary surface background, a 1 px bottom border, and a z-index of 10.
- **Main body:** `.app-body`, a flex row that consumes remaining height and clips its children. The sidebar, a 30 px toggle rail, and the viewport occupy this row.

The sidebar is 320 px wide by default, constrained between 280 and 400 px. It is itself a vertical flex layout: the component tree expands to use remaining height, while the statistics panel is 340 px high (capped at 55% of the sidebar and given a 160 px minimum). Each section scrolls internally. On viewports at or below 600 px, the sidebar width becomes `min(280px, 70vw)` and its statistics panel can use up to 60% height. The preference controller starts the sidebar collapsed at this breakpoint; the user can reopen it with the rail button.

The viewport is the flexible remainder (`flex: 1`), positioned relatively so overlays and the orientation box can be anchored over the WebGL canvas. The renderer canvas is block-level and forced to fill its container. The viewer also observes container size with `ResizeObserver`, so canvas and camera dimensions track the actual viewport rather than just window resize events.

### Layering

The header is at z-index 10. The view orientation panel is 20. The drag/drop overlay is 50, and the loading overlay is 60. These values make transient states cover the scene while keeping the normal in-scene control panel visible above the canvas. When building a similar UI, document this small stacking order; arbitrary z-index escalation becomes hard to maintain.

## 3. Visual system: theme, color, and typography

### Theme tokens

The dark theme is the root default. CSS custom properties are declared in `:root` and reused throughout the stylesheet:

| Token | Dark value | Typical role |
| --- | --- | --- |
| `--bg-primary` | `#0f172a` | App/page background, deepest panels |
| `--bg-secondary` | `#1e293b` | Header and sidebar surface |
| `--bg-tertiary` | `#334155` | Buttons, selects, badges |
| `--text-primary` | `#f8fafc` | Main labels and values |
| `--text-secondary` | `#94a3b8` | Supporting labels and descriptions |
| `--text-muted` | `#64748b` | Section captions and low-priority text |
| `--border-color` | `#334155` | Dividers and default outlines |
| `--border-hover` | `#475569` | Hover outlines and stronger edges |
| `--accent-blue` | `#38bdf8` | Primary interaction and focus |
| `--accent-cyan` | `#00d2ff` | Highlighted statistics / beam default |
| `--accent-amber` | `#ffaa00` | Isometric view cue / truss default |
| `--accent-emerald` | `#10b981` | Success, Y/vertical-plane cue, membrane default |
| `--accent-rose` | `#f43f5e` | X/lateral-plane cue and warnings |

The scheme is a dark slate foundation with saturated, distinct accents. The colors are used semantically: blue signals general interaction, emerald signals a positive state or membrane, rose identifies a warning or plane, and amber distinguishes trusses/isometric orientation. In a new viewer, select accents that remain distinct both against the canvas and in small sidebar swatches.

Light mode is activated by `data-theme="light"` on the document root. It overrides the surface, text, border, and some accent variables, and declares `color-scheme: light` so native form controls follow the theme. Theme-specific rules adjust panels whose default uses fixed translucent dark colors. The 3D scene background is set separately by `AquaSimViewer.setTheme`: dark `#0f172a`, light `#f1f5f9`. This is an important design boundary: DOM CSS variables do not automatically recolor Three.js materials or scene backgrounds.

Theme initialization in `preferences.ts` defaults to dark, reads `amodel-theme` from `localStorage`, applies the root data attribute and viewer background, updates button title/accessible label, and persists changes. Storage reads/writes are guarded so restricted browsing contexts still allow theme switching. Keep the DOM and 3D theme update in one function to avoid mismatched backgrounds.

### Typography

The UI uses a system sans-serif stack (`-apple-system`, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial). The body is compact at 13 px. Main brand text is 15 px/600; subtitle is 11 px. Sidebar section captions are 11 px/700, uppercase through content and letter-spaced by 0.05em. Component rows use 12 px. Numeric counts and engineering statistics use a monospace stack so columns and dimensions scan consistently. The view panel uses 10–11 px labels and monospaced bold axis buttons.

## 4. Spacing, borders, and line thickness

The UI relies on a compact spacing scale rather than a formal spacing-token system: common gaps and padding are 4, 6, 8, 10, 12, 14, and 16 px. Controls are generally 36 px tall for larger toolbar toggles, while compact selects and buttons use 4–6 px vertical padding. Corners are modest: 4–5 px for buttons and rows, 6 px for category cards, and 8 px for the floating view panel. This keeps the interface technical and dense without making controls feel like raw browser defaults.

Most UI dividers and outlines are **1 CSS px** (`border: 1px solid`). The drop target uses a **2 px dashed** accent border; keyboard focus uses a **2 px solid** accent outline with 2 px offset. Scrollbars are 6 px wide/high with 3 px rounded thumbs. Toolbar icons are inline SVG and typically use 1.7–2 px stroke width at 16–18 px icon size, giving them a consistent visible weight.

There are two different meanings of “line thickness” in the 3D display:

- **Structural centerlines:** `lineRenderer.ts` creates `THREE.LineSegments` with `THREE.LineBasicMaterial({ linewidth: 1 })`. In standard WebGL, Three.js line width is effectively limited to one device pixel on many platforms; do not assume `linewidth` can create reliably thick lines. If thicker, cross-platform lines are needed, use tube/cylinder geometry or a screen-space wide-line implementation.
- **Solid structural sections:** thickness is model geometry, not line styling. Beams use a box for I-beam/rectangular sections and otherwise a cylinder; trusses use cylinders. The scale factor multiplies their cross-section dimensions only, while their length remains the node-to-node length. See Section 6 for defaults and sizing details.

## 5. Controls and interaction patterns

The header groups file, camera framing, projection, render mode, grid, axes, and theme actions. Controls are regular HTML buttons/selects with IDs, titles, accessible names, and state attributes. SVGs are embedded inline so their stroke color can follow `currentColor` without extra image assets.

- **Open model:** button clicks a hidden file input; the same file loader handles drag/drop on the viewport.
- **Fit framing:** two compact icon buttons call `fitView()` or `fitCageView()`.
- **Projection:** a custom switch has `role="switch"` and `aria-checked`; state selects the highlighted perspective/orthographic icon and swaps the active Three.js camera.
- **Render mode:** a native select offers both solid+centerline, solid only, and centerline only. It changes visibility of existing objects rather than rebuilding geometry.
- **Grid and axes:** icon buttons toggle helpers, active styling, and `aria-pressed` state.
- **Theme:** sun/moon SVG visibility follows the root theme selector.
- **Orientation:** a floating VIEW card contains X+, Y+, Z+, and 3D buttons, color coded on hover (rose, emerald, blue, amber).
- **Sidebar:** a narrow rail stays available while the information panel is collapsed. `aria-expanded`, label, and title are synchronized with visibility.

Buttons use small 0.15 s hover transitions, slight background/border changes, and an active blue tint. Axis buttons lift 1 px on hover and receive a modest shadow. Focusable buttons and inputs share an explicit 2 px `:focus-visible` outline. Reduced-motion handling currently disables the projection thumb transition; when extending motion, honor `prefers-reduced-motion` for all nonessential transitions.

## 6. The 3D scene and structural line thickness

`AquaSimViewer` creates a Three.js scene with a perspective camera and orthographic camera, WebGL renderer, OrbitControls, lighting, axes, three grid helpers, and groups for beams, trusses, and membranes. The renderer uses antialiasing, caps pixel ratio at 2, and applies ACES Filmic tone mapping. OrbitControls enables damping at 0.08 and screen-space panning. Lighting combines a white ambient light (0.75), a white directional light (0.9), and a subtle blue directional fill (0.5).

### Coordinate and helper colors

The model coordinate convention retains Z as vertical. Reference grids are 200 units initially and use 40 divisions. The XY sea-surface grid at Z=0 is cyan (`0x38bdf8`) over slate (`0x1e293b`); the XZ plane at Y=0 is emerald (`0x10b981`); the YZ plane at X=0 is rose (`0xf43f5e`). Axis helper begins at length 50 and is hidden initially. After loading, helper scale responds to the model bounds: axes become at least 10 and otherwise 15% of the largest model dimension; grid size becomes at least 200 and grows in 100-unit steps to cover 1.5 times that dimension.

### Beam and truss geometry

`beamRenderer.ts` and `trussRenderer.ts` provide a type-specific style to the shared `lineRenderer.ts`:

| Property | Beam | Truss |
| --- | ---: | ---: |
| Default color | `0x00d2ff` cyan | `0xffaa00` amber |
| Default radius | `0.1` | `0.015` |
| Cylinder radial segments | 16 | 8 |
| Roughness | 0.45 | 0.55 |
| Metalness | 0.15 | 0.1 |

If a component supplies RGB color it overrides the default. A section radius overrides the default radius; width and height can override the derived diameter for rectangular sections. A beam whose shape is `ibeam` or `rectangular` uses a unit box scaled by section width and height. Other beams and all trusses use unit cylinders, transformed between each pair of endpoint nodes. The endpoint coordinates are mapped through `aquaSimToThree`, then a quaternion rotates the primitive's Y axis onto the element direction. A midpoint translation and length scaling place the instance.

The renderer batches each component's repeated element primitive into an `InstancedMesh`, reducing draw calls. Centerlines are separately batched into one `LineSegments` geometry per component. Both representations are created once; render mode toggles their `visible` flags. The cross-section scale operation rewrites instance matrices from cached transforms and does not recreate geometry. This is why scale changes stay responsive on larger models.

### Membranes

Membrane triangles and quads are flattened into a `BufferGeometry`; quads become two triangles. The default surface is emerald, double-sided, transparent, and 0.65 opacity, with depth writing disabled to reduce occlusion artifacts when nets overlap. A second wireframe mesh overlays the same geometry at opacity 0.4. Parsed component color wins over the default. This separate surface/net treatment keeps the structure visible without making dense net panels visually opaque.

## 7. Sidebar tree and statistics

`ModelTreeUI` writes statistics and component tree markup into the containers declared in `index.html`. Categories are beams, trusses, and membranes. Category rows have a chevron, checkbox, label, and count; component rows include a color swatch, truncated label, count, visibility checkbox, and section badge when dimensions are available. Category and component visibility is delegated to viewer methods, so DOM state and scene object state remain coordinated.

Statistics use small grouped labels and right-aligned monospace values. Important counts use cyan highlighting, healthy values use emerald, and warnings use rose. The tree uses small cards with subdued translucent backgrounds, 1 px borders, and internal scrolling for long lists. Text inserted from model names is escaped before becoming HTML; preserve that safeguard when rendering untrusted model metadata.

## 8. Loading and empty states

The default page presents an empty-state drop prompt above the viewport. `.drop-overlay` fills the viewport and uses a translucent slate surface plus 2 px dashed blue border. It is normally transparent and pointer-events are disabled; an empty-state or active-drag class raises opacity. This lets drag/drop continue to reach the loader while still communicating the target area.

The loading overlay covers the viewport with a stronger translucent layer, centered content, and a 44 px spinner. The spinner ring is 3 px thick, with a faint blue track and accent-blue leading segment, rotating every 0.8 seconds. Loading text is 14 px. The app initializer shows/hides this state as parsing begins and completes.

## 9. Camera behavior and responsive rendering

The perspective camera starts at `(200, -200, 150)` with a 50-degree field of view. The orthographic camera uses a 300-unit initial frustum and the same initial position. Switching perspective to orthographic computes frustum height from camera distance and perspective field of view, preserving apparent scale. Switching back copies camera position and up vector. Axis alignment centers on the model bounds, uses 1.5 times the largest dimension as camera distance (with a 50-unit minimum dimension), and sets a recognizable up vector for each view. Orthographic alignment chooses a frustum height of 1.4 times the largest dimension.

After model loading, the viewer computes a bounding box and automatically fits the full model. `fitCageView` fits the beam and membrane groups with a padding factor of 1.8, falling back to full-model fit when those groups are empty. On resize, the active camera projection matrix and renderer size are updated. For another viewer, derive camera framing from bounds rather than hard-coding a single model scale.

## 10. A recipe for adapting this design

1. Declare semantic page regions and stable control IDs in HTML.
2. Define a small surface/text/border/accent token set; use it for the DOM and a coordinated scene-background mapping.
3. Build layout with flexbox and constrain scroll to information panels, leaving the canvas as a flexible region.
4. Keep toolbar actions in a controller module and give stateful controls accessible labels and `aria-pressed`/`aria-checked` values.
5. Separate renderer geometry from UI styling. Use actual meshes for engineering section thickness, and be cautious about WebGL line width portability.
6. Use component groups and instance batching for repeated members; retain per-component object references for visibility toggles.
7. Make colors configurable per component, with high-contrast defaults by structural type.
8. Fit the camera from model bounds and resize from the viewport container.
9. Add empty/loading/error states and guard optional browser storage.
10. Dispose geometries, materials, controls, and renderer resources when replacing a model or tearing down the viewer.

## 11. Source map

| Concern | Implementation |
| --- | --- |
| Page regions and controls | `index.html` |
| Color tokens, layout, typography, responsive rules | `src/styles/main.css` |
| Startup and model/UI coordination | `src/main.ts`, `src/app/initializeApp.ts` |
| Toolbar interactions | `src/ui/toolbar.ts` |
| Theme persistence and sidebar responsiveness | `src/ui/preferences.ts` |
| Tree and model statistics | `src/ui/modelTree.ts` |
| File picker and drag/drop | `src/ui/fileLoader.ts` |
| Scene, cameras, controls, lifecycle | `src/viewer/AquaSimViewer.ts` |
| Coordinate conversion and camera fitting | `src/viewer/cameraUtils.ts` |
| Beam/truss primitive construction and centerlines | `src/viewer/renderers/lineRenderer.ts`, `beamRenderer.ts`, `trussRenderer.ts` |
| Membrane rendering | `src/viewer/renderers/membraneRenderer.ts` |

For user-facing operation instructions, see [the user guide](user-guide.md). For build and project setup, see the repository [README](../README.md).
