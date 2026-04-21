<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import AppTopToolbar from "./components/AppTopToolbar.vue";
import PixelCanvas from "./components/PixelCanvas.vue";
import PixelToolbar from "./components/PixelToolbar.vue";
import { usePixelCanvas } from "./composables/usePixelCanvas";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isDragActive = ref(false);
const dragDepth = ref(0);
const isImportDecisionOpen = ref(false);
const importDecisionFileName = ref("");
const importDecisionResolver = ref<((overwriteCurrent: boolean) => void) | null>(null);
const isSaveAsOpen = ref(false);
const saveAsName = ref("");
const isRenameOpen = ref(false);
const renameName = ref("");

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
  saveDraftAs,
  renameActiveDocument,
  loadDraft,
  importFromPng,
  exportPng,
  startPainting,
  continuePainting,
} = usePixelCanvas(canvasRef);

const getFileBaseName = (fileName: string): string =>
  fileName.replace(/\.[^.]+$/, "").trim() || "Untitled";

const askImportDecision = (fileName: string): Promise<boolean> => {
  importDecisionFileName.value = fileName;
  isImportDecisionOpen.value = true;
  return new Promise<boolean>((resolve) => {
    importDecisionResolver.value = resolve;
  });
};

const resolveImportDecision = (overwriteCurrent: boolean): void => {
  if (importDecisionResolver.value) {
    importDecisionResolver.value(overwriteCurrent);
  }
  importDecisionResolver.value = null;
  isImportDecisionOpen.value = false;
  importDecisionFileName.value = "";
};

const openSaveAsModal = (): void => {
  saveAsName.value = (activeDocument.value?.name ?? "Untitled").replace(/\.pxd$/i, "");
  isSaveAsOpen.value = true;
};

const confirmSaveAs = (): void => {
  const nextName = saveAsName.value.trim();
  if (!nextName) return;
  saveDraftAs(nextName);
  isSaveAsOpen.value = false;
};

const cancelSaveAs = (): void => {
  isSaveAsOpen.value = false;
};

const openRenameModal = (): void => {
  renameName.value = activeDocument.value?.name ?? "Untitled";
  isRenameOpen.value = true;
};

const confirmRename = (): void => {
  const nextName = renameName.value.trim();
  if (!nextName) return;
  renameActiveDocument(nextName);
  isRenameOpen.value = false;
};

const cancelRename = (): void => {
  isRenameOpen.value = false;
};

const handleDropFiles = async (droppedFiles: File[]): Promise<void> => {
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
      const shouldOverwrite = await askImportDecision(file.name);

      if (!shouldOverwrite) {
        createNewDocument(getFileBaseName(file.name));
      }
    } else {
      createNewDocument(getFileBaseName(file.name));
    }

    await importFromPng(file);
  }
};

const extractDroppedFiles = (event: DragEvent): File[] => {
  const transfer = event.dataTransfer;
  if (!transfer) return [];

  const itemFiles: File[] = [];
  if (transfer.items && transfer.items.length > 0) {
    for (const item of Array.from(transfer.items)) {
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (file) itemFiles.push(file);
    }
  }

  if (itemFiles.length > 0) return itemFiles;
  return Array.from(transfer.files ?? []);
};

const handleWindowDragOver = (event: DragEvent): void => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }
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
  const droppedFiles = extractDroppedFiles(event);
  if (droppedFiles.length === 0) return;
  await handleDropFiles(droppedFiles);
};

const registerDropListeners = (target: Window | Document): void => {
  target.addEventListener("dragenter", handleWindowDragEnter as EventListener);
  target.addEventListener("dragleave", handleWindowDragLeave as EventListener);
  target.addEventListener("dragover", handleWindowDragOver as EventListener);
  target.addEventListener("drop", handleWindowDrop as unknown as EventListener);
};

const unregisterDropListeners = (target: Window | Document): void => {
  target.removeEventListener("dragenter", handleWindowDragEnter as EventListener);
  target.removeEventListener("dragleave", handleWindowDragLeave as EventListener);
  target.removeEventListener("dragover", handleWindowDragOver as EventListener);
  target.removeEventListener("drop", handleWindowDrop as unknown as EventListener);
};

const handleRenameShortcut = (event: KeyboardEvent): void => {
  if (event.key !== "F2") return;
  event.preventDefault();
  openRenameModal();
};

onMounted(() => {
  registerDropListeners(window);
  registerDropListeners(document);
  window.addEventListener("keydown", handleRenameShortcut);
});

onUnmounted(() => {
  unregisterDropListeners(window);
  unregisterDropListeners(document);
  window.removeEventListener("keydown", handleRenameShortcut);
});
</script>

<template>
  <div v-if="isDragActive" class="drop-zone-overlay">
    <div class="drop-zone-card">
      <strong>Drop files to import</strong>
      <span>.pxd -> open as new tab | .png -> import with tab logic</span>
    </div>
  </div>

  <div v-if="isImportDecisionOpen" class="modal-overlay">
    <div class="modal-card">
      <h3>Import PNG</h3>
      <p>
        Tab hiện tại đang trống (Untitled). Với file
        <strong>{{ importDecisionFileName }}</strong
        >, bạn muốn làm gì?
      </p>
      <div class="action-buttons">
        <button type="button" @click="resolveImportDecision(true)">Đè tab hiện tại</button>
        <button type="button" @click="resolveImportDecision(false)">Tạo tab mới</button>
      </div>
    </div>
  </div>

  <div v-if="isSaveAsOpen" class="modal-overlay">
    <div class="modal-card">
      <h3>Save Draft As</h3>
      <p>Nhập tên mới cho bản draft (.pxd).</p>
      <input v-model="saveAsName" type="text" placeholder="weapon_v2" />
      <div class="action-buttons">
        <button type="button" @click="confirmSaveAs">Save As</button>
        <button type="button" @click="cancelSaveAs">Cancel</button>
      </div>
    </div>
  </div>

  <div v-if="isRenameOpen" class="modal-overlay">
    <div class="modal-card">
      <h3>Rename File</h3>
      <p>Đổi tên tab/file hiện tại.</p>
      <input v-model="renameName" type="text" placeholder="weapon_v2" />
      <div class="action-buttons">
        <button type="button" @click="confirmRename">Rename</button>
        <button type="button" @click="cancelRename">Cancel</button>
      </div>
    </div>
  </div>

  <AppTopToolbar
    :import-use-resize="importUseResize"
    :import-width-input="importWidthInput"
    :import-height-input="importHeightInput"
    @new-file="() => createNewDocument()"
    @save-draft="saveDraft"
    @save-draft-as="openSaveAsModal"
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
      <span class="rename-tab" @click.stop="openRenameModal">rename</span>
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
