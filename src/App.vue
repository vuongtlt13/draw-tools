<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import AppTopToolbar from "./components/AppTopToolbar.vue";
import PixelCanvas from "./components/PixelCanvas.vue";
import PixelToolbar from "./components/PixelToolbar.vue";
import { usePixelCanvas } from "./composables/usePixelCanvas";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isDragActive = ref(false);
const dragDepth = ref(0);

const {
  tool,
  color,
  documents,
  activeDocument,
  isActiveUntitledBlank,
  activeDocumentId,
  setActiveDocument,
  createNewDocument,
  closeDocument,
  gridWidthInput,
  gridHeightInput,
  importUseResize,
  importWidthInput,
  importHeightInput,
  previewPixelSize,
  showGrid,
  canUndo,
  canRedo,
  setTool,
  applyResizeGrid,
  clearCanvas,
  undo,
  redo,
  saveDraft,
  loadDraft,
  importFromPng,
  exportPng,
  startPainting,
  continuePainting,
} = usePixelCanvas(canvasRef);

const getFileBaseName = (fileName: string): string =>
  fileName.replace(/\.[^.]+$/, "").trim() || "Untitled";

const handleDropFiles = async (files: FileList): Promise<void> => {
  const droppedFiles = Array.from(files);

  for (const file of droppedFiles) {
    const lowerName = file.name.toLowerCase();
    const isPxd = lowerName.endsWith(".pxd");
    const isPng = lowerName.endsWith(".png") || file.type === "image/png";

    if (isPxd) {
      await loadDraft(file);
      continue;
    }

    if (!isPng) continue;

    const canOverwriteCurrent = isActiveUntitledBlank.value && activeDocument.value;
    if (canOverwriteCurrent) {
      const shouldOverwrite = window.confirm(
        "File hiện tại đang trống (Untitled). Bạn muốn đè file hiện tại bằng PNG vừa thả?\n\nOK = Đè file hiện tại\nCancel = Tạo tab mới",
      );

      if (!shouldOverwrite) {
        createNewDocument(getFileBaseName(file.name));
      }
    } else {
      createNewDocument(getFileBaseName(file.name));
    }

    await importFromPng(file);
  }
};

const handleWindowDragOver = (event: DragEvent): void => {
  event.preventDefault();
};

const handleWindowDragEnter = (event: DragEvent): void => {
  event.preventDefault();
  dragDepth.value += 1;
  isDragActive.value = true;
};

const handleWindowDragLeave = (event: DragEvent): void => {
  event.preventDefault();
  dragDepth.value = Math.max(0, dragDepth.value - 1);
  if (dragDepth.value === 0) {
    isDragActive.value = false;
  }
};

const handleWindowDrop = async (event: DragEvent): Promise<void> => {
  event.preventDefault();
  dragDepth.value = 0;
  isDragActive.value = false;
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  await handleDropFiles(files);
};

onMounted(() => {
  window.addEventListener("dragenter", handleWindowDragEnter);
  window.addEventListener("dragleave", handleWindowDragLeave);
  window.addEventListener("dragover", handleWindowDragOver);
  window.addEventListener("drop", handleWindowDrop);
});

onUnmounted(() => {
  window.removeEventListener("dragenter", handleWindowDragEnter);
  window.removeEventListener("dragleave", handleWindowDragLeave);
  window.removeEventListener("dragover", handleWindowDragOver);
  window.removeEventListener("drop", handleWindowDrop);
});
</script>

<template>
  <div v-if="isDragActive" class="drop-zone-overlay">
    <div class="drop-zone-card">
      <strong>Drop files to import</strong>
      <span>.pxd -> open as new tab | .png -> import with tab logic</span>
    </div>
  </div>

  <AppTopToolbar
    :import-use-resize="importUseResize"
    :import-width-input="importWidthInput"
    :import-height-input="importHeightInput"
    @new-file="createNewDocument"
    @save-draft="saveDraft"
    @load-draft="loadDraft"
    @import="importFromPng"
    @export="exportPng"
    @update:import-use-resize="importUseResize = $event"
    @update:import-width-input="importWidthInput = $event"
    @update:import-height-input="importHeightInput = $event"
  />

  <div class="file-tabs">
    <button
      v-for="doc in documents"
      :key="doc.id"
      class="file-tab"
      :class="{ active: doc.id === activeDocumentId }"
      type="button"
      @click="setActiveDocument(doc.id)"
    >
      {{ doc.name }}
      <span class="close-tab" @click.stop="closeDocument(doc.id)">x</span>
    </button>
    <button class="new-tab-btn" type="button" @click="() => createNewDocument()">+ New File</button>
  </div>

  <main class="app">
    <PixelToolbar
      :tool="tool"
      :color="color"
      :grid-width-input="gridWidthInput"
      :grid-height-input="gridHeightInput"
      :import-use-resize="importUseResize"
      :import-width-input="importWidthInput"
      :import-height-input="importHeightInput"
      :preview-pixel-size="previewPixelSize"
      :show-grid="showGrid"
      :can-undo="canUndo"
      :can-redo="canRedo"
      @update:tool="setTool"
      @update:color="color = $event"
      @update:grid-width-input="gridWidthInput = $event"
      @update:grid-height-input="gridHeightInput = $event"
      @update:import-use-resize="importUseResize = $event"
      @update:import-width-input="importWidthInput = $event"
      @update:import-height-input="importHeightInput = $event"
      @update:preview-pixel-size="previewPixelSize = $event"
      @update:show-grid="showGrid = $event"
      @resize-grid="applyResizeGrid"
      @undo="undo"
      @redo="redo"
      @clear="clearCanvas"
    />

    <PixelCanvas v-model:canvas-ref="canvasRef" @mousedown="startPainting" @mousemove="continuePainting" />
  </main>
</template>
