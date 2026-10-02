# User guide

The viewer starts empty. Click **Open .amodel** to select a local model, or
drop an `.amodel` or XML file onto the viewport. Data stays in your browser.
Loading another file replaces the current model.

## Camera controls

| Action | Mouse | Touch |
| --- | --- | --- |
| Rotate | Left button and drag | One finger |
| Pan | Right button and drag | Two fingers |
| Zoom | Scroll wheel | Pinch |

Use **Fit entire model** for an overview or **Focus cage** to frame beams
and membranes. The projection switch toggles perspective and orthographic
cameras. The floating VIEW panel provides X+, Y+, Z+, and isometric (3D) views.

## Display controls

Choose solid sections with centerlines, solid sections only, or centerlines
only for beams and trusses. Membranes remain translucent net surfaces.
Grid and axes buttons toggle orientation helpers. AquaSim coordinates are
preserved: Z is vertical, the sea surface is Z = 0, and negative Z is underwater.

The theme button switches dark and light backgrounds and saves the preference
when storage is available. The sidebar arrow hides or shows model information.
The sidebar starts collapsed on narrow screens.

## Components and statistics

The sidebar groups beams, trusses, and membranes. Category checkboxes toggle
all components in a category; individual checkboxes toggle one component.
Expand arrows collapse lists. Swatches reflect model colors and section
badges show dimensions in millimeters.

Statistics include filename, node and element counts, component counts,
invalid references, and bounds in meters. Elements referencing missing nodes
are skipped and reported as warnings.

## Offline use

Unpack the standalone release ZIP and serve the directory over HTTP with a
local server. For example, run `python -m http.server` in that directory
and open `http://localhost:8000/`.
