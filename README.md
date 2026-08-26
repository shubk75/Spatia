# SPATIA 3D

**SPATIA 3D** is a browser-based 360° panorama stitching and 3D visualization studio. It takes a sequence of photographs, assigns them to directions around a scene, generates an equirectangular panorama, and displays the result as an interactive 3D photosphere.

Everything runs locally in the browser. No backend server is required for the application itself.

## Features

- Drag-and-drop or upload multiple photos.
- Normalize source photos to **1024×1024** square images.
- Automatically detect photo directions or assign them manually.
- Reorder, reverse, and remove photos before stitching.
- Generate a **4096×2048 equirectangular panorama**.
- View the panorama in an interactive Three.js 360° sphere.
- Explore source-photo positions in **Tourism** mode.
- Inspect the generated cubemap in **Cross** mode.
- Adjust field of view, brightness, and camera orientation.
- Enable automatic 360° rotation.
- Save the current workspace as a **SPATIA Project (`.json`)** with the project Export feature.
- Restore a saved project with the Import feature, including source photos, photo-direction settings, viewer settings, and attached site information.
- Load Markdown or PDF site information beside the 3D viewer.
- Keep the Site Information panel visible alongside the viewer, including in fullscreen mode.
- Switch between dark and light themes.
- Use built-in procedural demo datasets.

> **Note:** SPATIA 3D does not provide the previous JPEG/PNG panorama download or clipboard-export controls. Project Export is intended for saving and restoring the editable SPATIA workspace.

## How It Works

### 1. Prepare the photos

Every uploaded photo is center-cropped and resized to **1024×1024**.

Each photo is associated with a direction:

```text
N  0°    NE 45°    E  90°    SE 135°
S 180°   SW 225°   W 270°   NW 315°
Up / Down
```

### 2. Assign directions

**Auto-Detect Directions** distributes the current photo sequence around the 360° horizon and assigns each photo to the nearest compass direction.

Directions can also be changed manually, and the sequence can be reordered or reversed before stitching.

### 3. Generate the panorama

SPATIA 3D uses two projection paths.

#### Angular-sector stitching

For a normal photo sequence, 360° is divided into equal sectors:

```text
sector angle = 360° / number of photos
```

Each photo is projected into its assigned sector using a pinhole-style projection. Output pixels are sampled from the corresponding source photo using bilinear interpolation.

#### Cubemap stitching

When the required directional faces are available, the app builds a six-face cubemap and converts it into an equirectangular panorama. The same faces are used to create the **Cross** layout.

### 4. Render the 3D scene

The generated panorama is converted into a Three.js texture and mapped onto an inverted sphere.

The viewer supports:

- drag-to-look navigation
- compass heading
- FOV / zoom control
- automatic rotation
- brightness adjustment
- fullscreen viewing
- Sphere, Tourism, and Cross viewing modes

### 5. Save and restore a project

The **Project Export** feature creates a `.json` project file containing the information required to rebuild the current workspace. The project includes:

- standardized source photos and their sequence order
- assigned direction metadata
- camera FOV setting
- Floor & Ceiling Fill setting
- viewer brightness setting
- the currently attached Markdown/PDF site-information file, when present

The **Project Import** feature reads a previously exported SPATIA project and rebuilds the photo sequence, viewer settings, panorama, and site-information panel.

A project file is self-contained: the source photos used for the project are embedded in the JSON file as data URLs.

### 6. Explore the source photos

**Tourism** mode places the original photos around the scene according to their assigned yaw angles.

Each photo is represented by a square camera frustum. Selecting one smoothly moves the 3D camera toward that viewpoint.

### 7. Display site information

The **Site Information** panel supports:

- Markdown files rendered with **Marked**
- PDF files processed with **PDF.js**

The panel appears alongside the 3D viewer and can remain visible in fullscreen.

## Demo Datasets

The app includes three procedural sample scenes:

- **Living Room & Office**
- **Temple Sanctuary**
- **City Loft 360°**

The demo images are generated in the browser.

## Technology Stack

- **HTML5 / CSS / JavaScript** — application structure and logic
- **Tailwind CSS** — UI styling and responsive layout
- **Three.js** — 3D rendering
- **OrbitControls** — Tourism camera controls
- **Canvas 2D API** — image processing and panorama stitching
- **Lucide** — interface icons
- **Marked** — Markdown rendering
- **PDF.js** — PDF text extraction

The application is contained in a single `Spatia.html` file and loads its third-party libraries from CDNs.

## Running Locally

No build step is required.

### Option 1: Open directly

Open `Spatia.html` in a modern browser.

### Option 2: Use a local HTTP server

A local server is recommended for more consistent browser behavior:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/Spatia.html
```

## Basic Workflow

```text
Upload photos
      ↓
Normalize to 1024×1024
      ↓
Assign / detect directions
      ↓
Generate panorama
      ↓
4096×2048 equirectangular image
      ↓
Three.js viewer
   ┌───┼────┐
Sphere Tourism Cross
      ↓
Export Project (.json)
      ↓
Import Project later to restore the workspace
```

## Project File Format

SPATIA project files are JSON documents identified internally as:

```text
type: spatia-project
version: 1
```

The current project format is designed to preserve the editable SPATIA workspace rather than produce a standalone panorama image export.

## Browser Usage Notes

- Photo processing and panorama generation happen in the browser, so memory and performance depend on the device and browser.
- Exported project files can become large because source images are embedded directly in the JSON.
- Keep exported project files private when they contain photographs or site-information documents that should not be shared.
