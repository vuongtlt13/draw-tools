<script setup lang="ts">
defineProps<{
  importUseResize: boolean;
  importWidthInput: number;
  importHeightInput: number;
}>();

const emit = defineEmits<{
  newFile: [];
  saveDraft: [];
  loadDraft: [File];
  import: [File];
  export: [];
  "update:importUseResize": [boolean];
  "update:importWidthInput": [number];
  "update:importHeightInput": [number];
}>();

const handleImportFile = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  const selectedFile = input.files?.[0];
  if (!selectedFile) return;
  emit("import", selectedFile);
  input.value = "";
};

const handleLoadDraftFile = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  const selectedFile = input.files?.[0];
  if (!selectedFile) return;
  emit("loadDraft", selectedFile);
  input.value = "";
};

const applyImportPreset = (size: number): void => {
  emit("update:importUseResize", true);
  emit("update:importWidthInput", size);
  emit("update:importHeightInput", size);
};
</script>

<template>
  <section class="top-toolbar">
    <div class="action-buttons">
      <button type="button" @click="emit('newFile')">New File</button>
      <button type="button" @click="emit('saveDraft')">Save Draft</button>
      <label class="file-input-btn">
        Load Draft
        <input type="file" accept=".pxd,application/json" @change="handleLoadDraftFile" />
      </label>
      <label class="file-input-btn">
        Import PNG
        <input type="file" accept=".png,image/png" @change="handleImportFile" />
      </label>
      <button type="button" @click="emit('export')">Export PNG</button>
    </div>

    <div class="action-buttons">
      <label for="importUseResizeTop">
        <input
          id="importUseResizeTop"
          :checked="importUseResize"
          type="checkbox"
          @change="emit('update:importUseResize', ($event.target as HTMLInputElement).checked)"
        />
        Resize import (Nearest)
      </label>
      <input
        :value="importWidthInput"
        type="number"
        min="1"
        max="256"
        :disabled="!importUseResize"
        @input="emit('update:importWidthInput', Number(($event.target as HTMLInputElement).value))"
      />
      <span>x</span>
      <input
        :value="importHeightInput"
        type="number"
        min="1"
        max="256"
        :disabled="!importUseResize"
        @input="emit('update:importHeightInput', Number(($event.target as HTMLInputElement).value))"
      />
      <button type="button" @click="applyImportPreset(16)">16</button>
      <button type="button" @click="applyImportPreset(32)">32</button>
      <button type="button" @click="applyImportPreset(64)">64</button>
    </div>
  </section>
</template>
