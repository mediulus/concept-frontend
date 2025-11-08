<script setup>
import { useToast } from "../composables/useToast";

const { toasts, remove } = useToast();
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
        @click="remove(toast.id)"
      >
        <div class="toast-icon">
          <span v-if="toast.type === 'success'">✓</span>
          <span v-if="toast.type === 'error'">✕</span>
          <span v-if="toast.type === 'warning'">⚠</span>
          <span v-if="toast.type === 'info'">ℹ</span>
        </div>
        <div class="toast-message">{{ toast.message }}</div>
        <button class="toast-close" @click.stop="remove(toast.id)">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 500px;
  min-width: 400px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  pointer-events: auto;
  min-width: 300px;
  backdrop-filter: blur(10px);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.toast-success {
  background: #ffffff;
  color: #750014;
  border-left: 4px solid #750014;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast-error {
  background: #ffffff;
  color: #750014;
  border-left: 4px solid #750014;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast-warning {
  background: #ffffff;
  color: #750014;
  border-left: 4px solid #750014;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast-info {
  background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);
  color: #004085;
  border-left: 4px solid #2196f3;
}

.toast-icon {
  font-size: 24px;
  font-weight: bold;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 50%;
  color: #750014;
}

.toast-message {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
}

.toast-close {
  background: none;
  border: none;
  color: inherit;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toast-close:hover {
  background: #f5f5f5;
}

.toast:hover {
  transform: scale(1.02);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

/* Toast transition animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  transform: scale(0.8);
  opacity: 0;
}

.toast-leave-to {
  transform: scale(0.8);
  opacity: 0;
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
