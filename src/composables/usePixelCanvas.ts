import { computed, onMounted, onUnmounted, ref, watch, type Ref } from "vue";

type Tool = "draw" | "erase";
type Pixel = string | null;
type Cell = { cellX: number; cellY: number };
type DraftData = {
  version: 1;
  documentName?: string;
  gridWidth: number;
  gridHeight: number;
  previewPixelSize: number;
  showGrid: boolean;
  tool: Tool;
  color: string;
  importUseResize: boolean;
  importWidthInput: number;
  importHeightInput: number;
  pixels: Pixel[][];
};
const MAX_GRID_SIZE = 256;
const MIN_PREVIEW_PIXEL_SIZE = 8;
const MAX_PREVIEW_PIXEL_SIZE = 30;

type PixelDocument = {
  id: string;
  name: string;
  tool: Tool;
  color: string;
  gridWidth: number;
  gridHeight: number;
  gridWidthInput: number;
  gridHeightInput: number;
  previewPixelSize: number;
  showGrid: boolean;
  importUseResize: boolean;
  importWidthInput: number;
  importHeightInput: number;
  pixels: Pixel[][];
  undoStack: Pixel[][][];
  redoStack: Pixel[][][];
};

function createBlankPixels(width: number, height: number): Pixel[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null),
  );
}

function clonePixelsWithResize(
  oldPixels: Pixel[][],
  nextWidth: number,
  nextHeight: number,
): Pixel[][] {
  const next = createBlankPixels(nextWidth, nextHeight);

  for (let y = 0; y < Math.min(oldPixels.length, nextHeight); y += 1) {
    const oldRow = oldPixels[y];
    const nextRow = next[y];
    if (!oldRow || !nextRow) continue;

    for (let x = 0; x < Math.min(oldRow.length, nextWidth); x += 1) {
      nextRow[x] = oldRow[x] ?? null;
    }
  }

  return next;
}

export function usePixelCanvas(canvasRef: Ref<HTMLCanvasElement | null>) {
  const documents = ref<PixelDocument[]>([]);
  const activeDocumentId = ref<string>("");
  const documentCounter = ref(1);
  const isPainting = ref(false);

  const clonePixels = (source: Pixel[][]): Pixel[][] =>
    source.map((row) => row.map((value) => value));

  const normalizeDocumentName = (value: string): string => {
    const cleaned = value.replace(/\.pxd$/i, "").trim();
    return cleaned || "Untitled";
  };

  const createDocument = (name: string, width = 32, height = 32): PixelDocument => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    tool: "draw",
    color: "#ff3b30",
    gridWidth: width,
    gridHeight: height,
    gridWidthInput: width,
    gridHeightInput: height,
    previewPixelSize: 16,
    showGrid: true,
    importUseResize: false,
    importWidthInput: width,
    importHeightInput: height,
    pixels: createBlankPixels(width, height),
    undoStack: [],
    redoStack: [],
  });

  const activeDocument = computed(() => {
    return documents.value.find((doc) => doc.id === activeDocumentId.value) ?? null;
  });

  const isDocumentBlank = (doc: PixelDocument): boolean => {
    if (doc.undoStack.length > 0 || doc.redoStack.length > 0) return false;
    for (const row of doc.pixels) {
      for (const pixel of row) {
        if (pixel !== null) return false;
      }
    }
    return true;
  };

  const isActiveUntitledBlank = computed(() => {
    const doc = activeDocument.value;
    if (!doc) return false;
    return doc.name.toLowerCase().startsWith("untitled-") && isDocumentBlank(doc);
  });

  const withActiveDocument = <T>(fn: (doc: PixelDocument) => T): T | undefined => {
    const doc = activeDocument.value;
    if (!doc) return undefined;
    return fn(doc);
  };

  const pushHistorySnapshot = (): void => {
    withActiveDocument((doc) => {
      doc.undoStack.push(clonePixels(doc.pixels));
      if (doc.undoStack.length > 200) {
        doc.undoStack.shift();
      }
      doc.redoStack = [];
    });
  };

  const tool = computed<Tool>({
    get: () => activeDocument.value?.tool ?? "draw",
    set: (value) => withActiveDocument((doc) => void (doc.tool = value)),
  });

  const color = computed<string>({
    get: () => activeDocument.value?.color ?? "#ff3b30",
    set: (value) => withActiveDocument((doc) => void (doc.color = value)),
  });

  const gridWidthInput = computed<number>({
    get: () => activeDocument.value?.gridWidthInput ?? 32,
    set: (value) => withActiveDocument((doc) => void (doc.gridWidthInput = value)),
  });

  const gridHeightInput = computed<number>({
    get: () => activeDocument.value?.gridHeightInput ?? 32,
    set: (value) => withActiveDocument((doc) => void (doc.gridHeightInput = value)),
  });

  const importUseResize = computed<boolean>({
    get: () => activeDocument.value?.importUseResize ?? false,
    set: (value) => withActiveDocument((doc) => void (doc.importUseResize = value)),
  });

  const importWidthInput = computed<number>({
    get: () => activeDocument.value?.importWidthInput ?? 32,
    set: (value) => withActiveDocument((doc) => void (doc.importWidthInput = value)),
  });

  const importHeightInput = computed<number>({
    get: () => activeDocument.value?.importHeightInput ?? 32,
    set: (value) => withActiveDocument((doc) => void (doc.importHeightInput = value)),
  });

  const previewPixelSize = computed<number>({
    get: () => activeDocument.value?.previewPixelSize ?? 16,
    set: (value) =>
      withActiveDocument((doc) => {
        doc.previewPixelSize = Math.min(
          MAX_PREVIEW_PIXEL_SIZE,
          Math.max(MIN_PREVIEW_PIXEL_SIZE, Math.trunc(value)),
        );
      }),
  });

  const showGrid = computed<boolean>({
    get: () => activeDocument.value?.showGrid ?? true,
    set: (value) => withActiveDocument((doc) => void (doc.showGrid = value)),
  });

  const canvasWidth = computed(() => {
    const doc = activeDocument.value;
    if (!doc) return 0;
    return doc.gridWidth * doc.previewPixelSize;
  });

  const canvasHeight = computed(() => {
    const doc = activeDocument.value;
    if (!doc) return 0;
    return doc.gridHeight * doc.previewPixelSize;
  });

  const canUndo = computed(() => (activeDocument.value?.undoStack.length ?? 0) > 0);
  const canRedo = computed(() => (activeDocument.value?.redoStack.length ?? 0) > 0);

  const setActiveDocument = (id: string): void => {
    if (!documents.value.some((doc) => doc.id === id)) return;
    activeDocumentId.value = id;
    render();
  };

  const createNewDocument = (name?: string): void => {
    const doc = createDocument(name ?? `Untitled-${documentCounter.value}`);
    documentCounter.value += 1;
    documents.value.push(doc);
    activeDocumentId.value = doc.id;
    render();
  };

  const closeDocument = (id: string): void => {
    if (documents.value.length <= 1) return;
    const index = documents.value.findIndex((doc) => doc.id === id);
    if (index < 0) return;
    documents.value.splice(index, 1);
    if (activeDocumentId.value === id) {
      const nextDoc = documents.value[Math.max(0, index - 1)] ?? documents.value[0];
      if (nextDoc) {
        activeDocumentId.value = nextDoc.id;
      }
    }
    render();
  };

  const renameActiveDocument = (nextName: string): void => {
    const doc = activeDocument.value;
    if (!doc) return;
    doc.name = normalizeDocumentName(nextName);
  };

  const render = (): void => {
    const doc = activeDocument.value;
    if (!doc) return;
    const canvas = canvasRef.value;
    if (!canvas) return;

    canvas.width = canvasWidth.value;
    canvas.height = canvasHeight.value;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < doc.gridHeight; y += 1) {
      const row = doc.pixels[y];
      if (!row) continue;

      for (let x = 0; x < doc.gridWidth; x += 1) {
        const currentColor = row[x];
        if (!currentColor) continue;

        ctx.fillStyle = currentColor;
        ctx.fillRect(
          x * doc.previewPixelSize,
          y * doc.previewPixelSize,
          doc.previewPixelSize,
          doc.previewPixelSize,
        );
      }
    }

    if (!doc.showGrid) return;

    ctx.strokeStyle = "rgba(50, 60, 90, 0.45)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= doc.gridWidth; x += 1) {
      const px = x * doc.previewPixelSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= doc.gridHeight; y += 1) {
      const py = y * doc.previewPixelSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(canvas.width, py);
      ctx.stroke();
    }
  };

  const getCellFromPointer = (event: MouseEvent): Cell | null => {
    const doc = activeDocument.value;
    if (!doc) return null;
    const canvas = canvasRef.value;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const cellX = Math.floor(x / doc.previewPixelSize);
    const cellY = Math.floor(y / doc.previewPixelSize);

    if (
      cellX < 0 ||
      cellY < 0 ||
      cellX >= doc.gridWidth ||
      cellY >= doc.gridHeight
    ) {
      return null;
    }

    return { cellX, cellY };
  };

  const paintAt = (event: MouseEvent): void => {
    const doc = activeDocument.value;
    if (!doc) return;
    const cell = getCellFromPointer(event);
    if (!cell) return;

    const nextColor: Pixel = doc.tool === "draw" ? doc.color : null;
    const row = doc.pixels[cell.cellY];
    if (!row) return;
    row[cell.cellX] = nextColor;
    render();
  };

  const startPainting = (event: MouseEvent): void => {
    pushHistorySnapshot();
    isPainting.value = true;
    paintAt(event);
  };

  const continuePainting = (event: MouseEvent): void => {
    if (!isPainting.value) return;
    paintAt(event);
  };

  const stopPainting = (): void => {
    isPainting.value = false;
  };

  const applyResizeGrid = (): void => {
    const doc = activeDocument.value;
    if (!doc) return;
    const nextWidth = Math.trunc(doc.gridWidthInput);
    const nextHeight = Math.trunc(doc.gridHeightInput);

    if (nextWidth < 4 || nextHeight < 4 || nextWidth > MAX_GRID_SIZE || nextHeight > MAX_GRID_SIZE) {
      window.alert(`Grid size must be between 4 and ${MAX_GRID_SIZE}.`);
      return;
    }

    pushHistorySnapshot();
    doc.pixels = clonePixelsWithResize(doc.pixels, nextWidth, nextHeight);
    doc.gridWidth = nextWidth;
    doc.gridHeight = nextHeight;
    doc.importWidthInput = nextWidth;
    doc.importHeightInput = nextHeight;
    render();
  };

  const clearCanvas = (): void => {
    const doc = activeDocument.value;
    if (!doc) return;
    pushHistorySnapshot();
    doc.pixels = createBlankPixels(doc.gridWidth, doc.gridHeight);
    render();
  };

  const undo = (): void => {
    const doc = activeDocument.value;
    if (!doc || doc.undoStack.length === 0) return;
    const previous = doc.undoStack.pop();
    if (!previous) return;
    doc.redoStack.push(clonePixels(doc.pixels));
    doc.pixels = previous;
    render();
  };

  const redo = (): void => {
    const doc = activeDocument.value;
    if (!doc || doc.redoStack.length === 0) return;
    const next = doc.redoStack.pop();
    if (!next) return;
    doc.undoStack.push(clonePixels(doc.pixels));
    doc.pixels = next;
    render();
  };

  const exportPng = (): void => {
    const doc = activeDocument.value;
    if (!doc) return;
    const outCanvas = document.createElement("canvas");
    outCanvas.width = doc.gridWidth;
    outCanvas.height = doc.gridHeight;

    const outCtx = outCanvas.getContext("2d");
    if (!outCtx) return;
    const imageData = outCtx.createImageData(doc.gridWidth, doc.gridHeight);

    for (let y = 0; y < doc.gridHeight; y += 1) {
      const row = doc.pixels[y];
      if (!row) continue;

      for (let x = 0; x < doc.gridWidth; x += 1) {
        const offset = (y * doc.gridWidth + x) * 4;
        const currentColor = row[x];

        if (!currentColor) {
          imageData.data[offset + 0] = 0;
          imageData.data[offset + 1] = 0;
          imageData.data[offset + 2] = 0;
          imageData.data[offset + 3] = 0;
          continue;
        }

        imageData.data[offset + 0] = Number.parseInt(currentColor.slice(1, 3), 16);
        imageData.data[offset + 1] = Number.parseInt(currentColor.slice(3, 5), 16);
        imageData.data[offset + 2] = Number.parseInt(currentColor.slice(5, 7), 16);
        imageData.data[offset + 3] = 255;
      }
    }

    outCtx.putImageData(imageData, 0, 0);

    const link = document.createElement("a");
    const safeName = doc.name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
    link.download = `${safeName || "pixel-asset"}-${doc.gridWidth}x${doc.gridHeight}.png`;
    link.href = outCanvas.toDataURL("image/png");
    link.click();
  };

  const importFromPng = async (file: File): Promise<void> => {
    const doc = activeDocument.value;
    if (!doc) return;
    if (!file.type.startsWith("image/png")) {
      window.alert("Please choose a PNG file.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load image."));
        img.src = objectUrl;
      });

      const sourceWidth = image.naturalWidth;
      const sourceHeight = image.naturalHeight;
      const targetWidth = doc.importUseResize
        ? Math.trunc(doc.importWidthInput)
        : sourceWidth;
      const targetHeight = doc.importUseResize
        ? Math.trunc(doc.importHeightInput)
        : sourceHeight;

      if (
        targetWidth < 1 ||
        targetHeight < 1 ||
        targetWidth > MAX_GRID_SIZE ||
        targetHeight > MAX_GRID_SIZE
      ) {
        window.alert(
          `PNG size must be between 1x1 and ${MAX_GRID_SIZE}x${MAX_GRID_SIZE}.`,
        );
        return;
      }

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = targetWidth;
      tempCanvas.height = targetHeight;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;
      tempCtx.imageSmoothingEnabled = false;

      tempCtx.clearRect(0, 0, targetWidth, targetHeight);
      tempCtx.drawImage(image, 0, 0, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
      const data = tempCtx.getImageData(0, 0, targetWidth, targetHeight).data;

      const importedPixels = createBlankPixels(targetWidth, targetHeight);
      for (let y = 0; y < targetHeight; y += 1) {
        const row = importedPixels[y];
        if (!row) continue;

        for (let x = 0; x < targetWidth; x += 1) {
          const offset = (y * targetWidth + x) * 4;
          const alpha = data[offset + 3] ?? 0;

          if (alpha < 16) {
            row[x] = null;
            continue;
          }

          const red = data[offset + 0] ?? 0;
          const green = data[offset + 1] ?? 0;
          const blue = data[offset + 2] ?? 0;
          row[x] = `#${red.toString(16).padStart(2, "0")}${green
            .toString(16)
            .padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
        }
      }

      pushHistorySnapshot();
      doc.pixels = importedPixels;
      doc.gridWidth = targetWidth;
      doc.gridHeight = targetHeight;
      doc.gridWidthInput = targetWidth;
      doc.gridHeightInput = targetHeight;
      doc.importWidthInput = targetWidth;
      doc.importHeightInput = targetHeight;
      render();
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const saveDraft = (): void => {
    const doc = activeDocument.value;
    if (!doc) return;
    const draft: DraftData = {
      version: 1,
      documentName: doc.name,
      gridWidth: doc.gridWidth,
      gridHeight: doc.gridHeight,
      previewPixelSize: doc.previewPixelSize,
      showGrid: doc.showGrid,
      tool: doc.tool,
      color: doc.color,
      importUseResize: doc.importUseResize,
      importWidthInput: doc.importWidthInput,
      importHeightInput: doc.importHeightInput,
      pixels: clonePixels(doc.pixels),
    };

    const blob = new Blob([JSON.stringify(draft)], { type: "application/json" });
    const link = document.createElement("a");
    const safeName = doc.name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
    link.download = `${safeName || "pixel-draft"}-${doc.gridWidth}x${doc.gridHeight}.pxd`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const saveDraftAs = (nextName: string): void => {
    const doc = activeDocument.value;
    if (!doc) return;
    doc.name = normalizeDocumentName(nextName);
    saveDraft();
  };

  const loadDraft = async (file: File): Promise<void> => {
    if (!file.name.toLowerCase().endsWith(".pxd")) {
      window.alert("Please choose a .pxd draft file.");
      return;
    }

    const raw = await file.text();
    let draft: DraftData;

    try {
      draft = JSON.parse(raw) as DraftData;
    } catch {
      window.alert("Invalid draft file.");
      return;
    }

    const width = Math.trunc(draft.gridWidth);
    const height = Math.trunc(draft.gridHeight);
    if (width < 1 || height < 1 || width > MAX_GRID_SIZE || height > MAX_GRID_SIZE) {
      window.alert("Draft grid size is out of supported range.");
      return;
    }

    if (!Array.isArray(draft.pixels) || draft.pixels.length !== height) {
      window.alert("Draft pixel data is invalid.");
      return;
    }

    const restoredPixels = createBlankPixels(width, height);
    for (let y = 0; y < height; y += 1) {
      const sourceRow = draft.pixels[y];
      const targetRow = restoredPixels[y];
      if (!Array.isArray(sourceRow) || !targetRow) {
        window.alert("Draft pixel data is invalid.");
        return;
      }
      for (let x = 0; x < width; x += 1) {
        const value = sourceRow[x];
        targetRow[x] = typeof value === "string" ? value : null;
      }
    }

    const draftName =
      typeof draft.documentName === "string" && draft.documentName.trim().length > 0
        ? draft.documentName
        : file.name;
    const nextDoc = createDocument(normalizeDocumentName(draftName), width, height);
    nextDoc.pixels = restoredPixels;
    nextDoc.previewPixelSize = Math.min(
      MAX_PREVIEW_PIXEL_SIZE,
      Math.max(MIN_PREVIEW_PIXEL_SIZE, Math.trunc(draft.previewPixelSize)),
    );
    nextDoc.showGrid = Boolean(draft.showGrid);
    nextDoc.tool = draft.tool === "erase" ? "erase" : "draw";
    nextDoc.color = typeof draft.color === "string" ? draft.color : "#ff3b30";
    nextDoc.importUseResize = Boolean(draft.importUseResize);
    nextDoc.importWidthInput = Math.min(
      MAX_GRID_SIZE,
      Math.max(1, Math.trunc(draft.importWidthInput)),
    );
    nextDoc.importHeightInput = Math.min(
      MAX_GRID_SIZE,
      Math.max(1, Math.trunc(draft.importHeightInput)),
    );
    nextDoc.gridWidthInput = width;
    nextDoc.gridHeightInput = height;
    documents.value.push(nextDoc);
    activeDocumentId.value = nextDoc.id;
    render();
  };

  watch([previewPixelSize, showGrid, activeDocumentId], render);

  const handleShortcutKey = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    const isModifierPressed = event.ctrlKey || event.metaKey;
    if (!isModifierPressed) return;

    if (key === "s") {
      event.preventDefault();
      saveDraft();
      return;
    }

    const isUndoRedoKey = key === "z" || key === "y";
    if (!isUndoRedoKey) return;

    event.preventDefault();

    const isRedo = key === "y" || (key === "z" && event.shiftKey);
    if (isRedo) {
      redo();
      return;
    }

    undo();
  };

  onMounted(() => {
    const initialDoc = createDocument(`Untitled-${documentCounter.value}`);
    documentCounter.value += 1;
    documents.value = [initialDoc];
    activeDocumentId.value = initialDoc.id;
    window.addEventListener("mouseup", stopPainting);
    window.addEventListener("keydown", handleShortcutKey);
    render();
  });

  onUnmounted(() => {
    window.removeEventListener("mouseup", stopPainting);
    window.removeEventListener("keydown", handleShortcutKey);
  });

  return {
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
    canvasWidth,
    canvasHeight,
    canUndo,
    canRedo,
    setTool: (nextTool: Tool) => {
      tool.value = nextTool;
    },
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
  };
}

export type { Tool };
