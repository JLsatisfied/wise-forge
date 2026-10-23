<script setup lang="ts">
defineOptions({ name: 'UserProfileModal' })

defineProps<{
  showUserProfile: boolean
  editAll: { img_url?: string; nickname?: string; username?: string }
  nickAll: { userNickname: string }
}>()

const emit = defineEmits<{
  close: []
  save: []
  'select-file': []
  'upload-img': [event: Event]
  'update:nickname': [value: string]
}>()
</script>

<template>
  <Transition name="profile-modal">
    <div
      v-if="showUserProfile"
      class="profile-modal__backdrop fixed inset-0 flex items-center justify-center z-50"
    >
      <div
        class="profile-modal__panel w-[min(92vw,420px)] p-7 sm:p-8"
        @click.stop
      >
        <div class="flex justify-between items-center mb-5">
          <h3 class="profile-modal__title text-lg font-semibold">冒险者档案</h3>
          <button
            type="button"
            @click="emit('close')"
            class="profile-modal__close w-9 h-9 flex items-center justify-center cursor-pointer"
            aria-label="关闭"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="flex flex-col items-center">
          <div
            class="relative group mb-6 profile-modal__avatar-wrap"
            @click="emit('select-file')"
          >
            <img
              :src="editAll.img_url"
              class="w-24 h-24 object-cover profile-modal__avatar"
              alt="用户头像"
            />
            <input type="file" @change="e => emit('upload-img', e as Event)" />
            <div
              class="absolute inset-0 profile-modal__avatar-shade opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer"
            >
              <i class="fas fa-camera text-white text-xl"></i>
            </div>
          </div>
          <div class="w-full space-y-4">
            <div>
              <label class="block text-sm profile-modal__label mb-1.5">昵称</label>
              <input
                type="text"
                :value="editAll.nickname"
                @input="e => emit('update:nickname', (e.target as HTMLInputElement).value)"
                class="w-full px-4 py-2.5 profile-modal__input"
              />
            </div>
            <div>
              <label class="block text-sm profile-modal__label mb-1.5">冒险者账号</label>
              <div class="px-4 py-2.5 profile-modal__readonly text-sm">{{ nickAll.userNickname }}</div>
            </div>
          </div>
          <div class="profile-modal__actions flex gap-3 mt-7 w-full">
            <button
              type="button"
              @click="emit('close')"
              class="pixel-btn pixel-btn-ghost flex-1 py-2.5 cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              @click="emit('save')"
              class="pixel-btn pixel-btn-primary flex-1 py-2.5 cursor-pointer"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.profile-modal__backdrop {
  background: rgba(15, 18, 25, 0.45);
  backdrop-filter: blur(4px);
}

.profile-modal-enter-active {
  transition: opacity 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.profile-modal-leave-active {
  transition: opacity 0.26s cubic-bezier(0.4, 0, 0.2, 1);
}

.profile-modal-enter-active .profile-modal__panel {
  transition:
    transform 0.38s cubic-bezier(0.34, 1.2, 0.64, 1),
    opacity 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.profile-modal-leave-active .profile-modal__panel {
  transition:
    transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}

.profile-modal-enter-from,
.profile-modal-leave-to {
  opacity: 0;
}

.profile-modal-enter-from .profile-modal__panel,
.profile-modal-leave-to .profile-modal__panel {
  opacity: 0;
  transform: translateY(14px) scale(0.96);
}

.profile-modal-enter-to .profile-modal__panel,
.profile-modal-leave-from .profile-modal__panel {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.profile-modal__panel {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-lg);
}

.profile-modal__title {
  color: var(--text);
  font-weight: 600;
}

.profile-modal__close {
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--text-3);
  transition:
    background-color 0.15s var(--ease),
    color 0.15s var(--ease);

  &:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  &:active {
    background: var(--surface-3);
  }
}

.profile-modal__avatar-wrap {
  cursor: pointer;
}

.profile-modal__avatar {
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--surface-2);
}

.profile-modal__avatar-shade {
  border-radius: 50%;
  background: rgba(15, 18, 25, 0.45);
  transition: opacity 0.2s var(--ease);
}

.profile-modal__label {
  color: var(--text-2);
  font-weight: 500;
}

.profile-modal__input {
  border: 1px solid transparent;
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text);
  outline: none;
  transition:
    background-color 0.18s var(--ease),
    border-color 0.18s var(--ease),
    box-shadow 0.18s var(--ease);

  &::placeholder {
    color: var(--text-3);
  }

  &:hover {
    border-color: var(--border);
  }

  &:focus {
    border-color: var(--accent);
    background: var(--surface);
    box-shadow: 0 0 0 3px var(--accent-ring);
  }
}

.profile-modal__readonly {
  border: 1px dashed var(--border-strong);
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text-3);
}

.profile-modal__actions .pixel-btn {
  border-radius: 10px;
}

.profile-modal__avatar-wrap input {
  display: none;
}
</style>
