<script setup lang="ts">
import type { Tool } from "../composables/usePixelCanvas";

defineProps<{
  tool: Tool;
  color: string;
  gridWidthInput: number;
  gridHeightInput: number;
  importUseResize: boolean;
  importWidthInput: number;
  importHeightInput: number;
  previewPixelSize: number;
  showGrid: boolean;
  canUndo: boolean;
  canRedo: boolean;
}>();

const emit = defineEmits<{
  "update:tool": [Tool];
  "update:color": [string];
  "update:gridWidthInput": [number];
  "update:gridHeightInput": [number];
  "update:importUseResize": [boolean];
  "update:importWidthInput": [number];
  "update:importHeightInput": [number];
  "update:previewPixelSize": [number];
  "update:showGrid": [boolean];
  "resize-grid": [];
  clear: [];
  undo: [];
  redo: [];
}>();
</script>

<template>
  <section class="toolbar">
    <h1>Pixel Asset Drawer</h1>

    <div class="group">
      <label for="colorPicker">Color</label>
      <input
        id="colorPicker"
        :value="color"
        type="color"
        @input="emit('update:color', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="group tool-buttons">
      <button :class="{ active: tool === 'draw' }" type="button" @click="emit('update:tool', 'draw')">
        Draw
      </button>
      <button :class="{ active: tool === 'erase' }" type="button" @click="emit('update:tool', 'erase')">
        Eraser
      </button>
    </div>

    <div class="group grid-config">
      <label for="gridWidth">Grid</label>
      <div class="inline-fields">
        <input
          id="gridWidth"
          :value="gridWidthInput"
          type="number"
          min="4"
          max="256"
          @input="emit('update:gridWidthInput', Number(($event.target as HTMLInputElement).value))"
        />
        <span>x</span>
        <input
          id="gridHeight"
          :value="gridHeightInput"
          type="number"
          min="4"
          max="256"
          @input="emit('update:gridHeightInput', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <button type="button" @click="emit('resize-grid')">Resize Grid</button>
    </div>

    <div class="group">
      <label for="pixelSize">Preview Pixel Size</label>
      <input
        id="pixelSize"
        :value="previewPixelSize"
        type="range"
        min="8"
        max="30"
        @input="emit('update:previewPixelSize', Number(($event.target as HTMLInputElement).value))"
      />
      <small>{{ previewPixelSize }}px</small>
    </div>

    <div class="group">
      <label for="toggleGrid">
        <input
          id="toggleGrid"
          :checked="showGrid"
          type="checkbox"
          @change="emit('update:showGrid', ($event.target as HTMLInputElement).checked)"
        />
        Show Grid
      </label>
    </div>

    <div class="group action-buttons">
      <button type="button" :disabled="!canUndo" @click="emit('undo')">Undo</button>
      <button type="button" :disabled="!canRedo" @click="emit('redo')">Redo</button>
    </div>

    <div class="group action-buttons">
      <button type="button" @click="emit('clear')">Clear</button>
    </div>
  </section>
</template>
