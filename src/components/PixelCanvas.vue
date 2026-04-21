<script setup lang="ts">
defineEmits<{
  mousedown: [MouseEvent];
  mousemove: [MouseEvent];
}>();

const canvasRef = defineModel<HTMLCanvasElement | null>("canvasRef", { required: true });
</script>

<template>
  <section class="canvas-wrap">
    <canvas
      ref="canvasRef"
      @mousedown="$emit('mousedown', $event)"
      @mousemove="$emit('mousemove', $event)"
    />
  </section>
</template>
