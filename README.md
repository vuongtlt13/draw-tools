# Draw Tools - Pixel Asset Editor

A lightweight pixel editor built with Vue 3 + TypeScript for creating game assets and exporting PNG files for Godot.

## Features

- Draw / Eraser tools
- Adjustable grid size
- Preview pixel size slider
- Show/hide grid
- Undo / Redo
- Import PNG (with optional nearest-neighbor resize)
- Export PNG (transparent background)
- Save draft to `.pxd`
- Load draft from `.pxd`

## Tech Stack

- Vue 3
- TypeScript
- Vite

## Run Locally

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
```

Preview build:

```bash
npm run preview
```

## Workflow

### 1) Draw or import

- Draw directly on the canvas, or
- Import a PNG file and continue editing

### 2) Save draft (work in progress)

- Use `Save Draft` to save a `.pxd` file
- Use `Load Draft (.pxd)` to restore and continue editing later

See full `.pxd` format details in:

- `PXD_FORMAT.md`

### 3) Export final image

- Use `Export PNG` to output a `.png`
- Output resolution matches grid size exactly (e.g. `32x32` grid -> `32x32` PNG)

## Godot Import Notes (Pixel Art)

For crisp pixel rendering in Godot:

- Disable texture filtering (use nearest)
- Disable mipmaps for pixel assets
- Use lossless compression if needed by your pipeline

## Current Limits

- Max grid size: `256 x 256`
- Supported draft version: `1`
