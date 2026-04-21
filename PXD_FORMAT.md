# PXD Draft File Format

This project uses `.pxd` as a draft format so you can save and reload work-in-progress pixel art.

## Quick Rules

- File extension: `.pxd`
- Content type: JSON text
- Current schema version: `1`
- Maximum grid size: `256 x 256`
- Pixel value:
  - hex color string (example: `"#ff00aa"`)
  - or `null` for transparent pixel

## JSON Schema (Practical)

```json
{
  "version": 1,
  "gridWidth": 32,
  "gridHeight": 32,
  "previewPixelSize": 16,
  "showGrid": true,
  "tool": "draw",
  "color": "#ff3b30",
  "importUseResize": false,
  "importWidthInput": 32,
  "importHeightInput": 32,
  "pixels": [
    [null, "#ff0000", null],
    ["#00ff00", "#0000ff", null]
  ]
}
```

## Field Details

- `version` (number): must be `1`
- `gridWidth` (number): integer, `1..256`
- `gridHeight` (number): integer, `1..256`
- `previewPixelSize` (number): integer, app clamps to `8..30`
- `showGrid` (boolean)
- `tool` (string): `"draw"` or `"erase"`
- `color` (string): hex color, expected `#rrggbb`
- `importUseResize` (boolean)
- `importWidthInput` (number): integer, `1..256`
- `importHeightInput` (number): integer, `1..256`
- `pixels` (2D array):
  - outer array length should equal `gridHeight`
  - each inner row should have `gridWidth` elements
  - each pixel is `null` or a string (recommended `#rrggbb`)

## Validation Behavior In App

When loading a `.pxd` file:

- Invalid JSON -> rejected
- Invalid grid size -> rejected
- Invalid `pixels` shape -> rejected
- Invalid pixel entries -> converted to `null` if not a string
- Unknown `tool` -> fallback to `"draw"`
- Invalid `color` -> fallback to `"#ff3b30"`

## AI Prompt Template (Optional)

Use this prompt when asking AI to generate a `.pxd`:

```text
Generate a valid .pxd JSON draft for a pixel editor.
Requirements:
- version = 1
- gridWidth and gridHeight in range 1..256
- pixels must be a 2D array with exact size [gridHeight][gridWidth]
- each pixel is null or hex color string "#rrggbb"
- include all fields: version, gridWidth, gridHeight, previewPixelSize, showGrid, tool, color, importUseResize, importWidthInput, importHeightInput, pixels
- output only JSON
```
