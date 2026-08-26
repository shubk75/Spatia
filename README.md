# SPATIA 3D

SPATIA 3D is a browser-based **360° panorama stitching and 3D visualization studio**. It takes a sequence of photos, assigns them to directions around a scene, generates an equirectangular panorama, and displays it as an interactive 3D photosphere.

Everything runs directly in the browser.

## Features

- Drag-and-drop or upload multiple photos.
- Normalize photos to **1024×1024** square images.
- Automatically detect photo directions or assign them manually.
- Reorder, reverse, and remove photos.
- Generate a **4096×2048 equirectangular panorama**.
- View the result in an interactive 360° sphere.
- Explore source-photo positions in **Tourism** mode.
- Inspect the generated cubemap in **Cross** mode.
- Adjust FOV, brightness, and camera orientation.
- Enable automatic 360° rotation.
- Download the panorama as a JPEG.
- Load Markdown or PDF site information beside the viewer.
- Switch between dark and light themes.
- Use built-in demo datasets.

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

Directions can also be changed manually, and the sequence can be reordered before stitching.

### 3. Generate the panorama

SPATIA 3D uses two projection paths.

**Angular-sector stitching**

For a normal photo sequence, 360° is divided into equal sectors:

```text
sector angle = 360° / number of photos
```

Each photo is projected into its assigned sector using a pinhole-style projection. Output pixels are sampled from the corresponding source photo using bilinear interpolation.

**Cubemap stitching**

When the required directional faces are available, the app builds a six-face cubemap and converts it into an equirectangular panorama. The same faces are used to create the **Cross** layout.

### 4. Render the 3D scene

The generated panorama is converted into a Three.js texture and mapped onto an inverted sphere.

The viewer supports:

- drag-to-look navigation
- compass heading
- FOV / zoom control
- automatic rotation
- brightness adjustment
- fullscreen
- panorama download

### 5. Explore the source photos

**Tourism** mode places the original photos around the scene according to their assigned yaw angles.

Each photo is represented by a square camera frustum. Selecting one smoothly moves the 3D camera toward that viewpoint.

### 6. Display site information

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

## Tech Stack

- **HTML5 / CSS / JavaScript**
- **Tailwind CSS** — UI and responsive layout
- **Three.js** — 3D rendering
- **OrbitControls** — Tourism camera controls
- **Canvas 2D API** — image processing and stitching
- **Lucide** — icons
- **Marked** — Markdown rendering
- **PDF.js** — PDF text extraction

The current app is contained in a single `Spatia.html` file and loads its libraries from CDNs.

## Run Locally

Open the HTML file directly, or run a local server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/Spatia.html
```

## Workflow

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
   ├── Sphere
   ├── Tourism
   └── Cross
```

## Project Structure

```text
.
└── Spatia.html
```

`Spatia.html` contains the UI, styling, stitching engine, Three.js viewer, demo generators, document handling, and export logic.
