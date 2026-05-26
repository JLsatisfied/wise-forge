<script setup lang="ts">
defineOptions({ name: 'UserProfileModal' })

defineProps<{
  showUserProfile: boolean
  editAll: { img_url?: string; nickname?: string; username?: string }
  nickAll: { userNickname: string }
}>()

const emit = defineEmits<{
  'close': []
  'save': []
  'select-file': []
  'upload-img': [event: Event]
}>()
</script>

<template>
  <Transition name="profile-modal">
    <div v-if="showUserProfile" class="profile-modal__backdrop fixed inset-0 flex items-center justify-center z-50">
      <div class="profile-modal__panel pixel-profile-card w-[min(92vw,420px)] p-7 sm:p-8" @click.stop>
        <div class="flex justify-between items-center mb-5">
          <h3 class="pixel-profile-title text-lg font-semibold">冒险者档案</h3>
          <button type="button" @click="emit('close')" class="pixel-profile-close w-9 h-9 flex items-center justify-center cursor-pointer" aria-label="关闭">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="flex flex-col items-center">
          <div class="relative group mb-6 imgEdit pixel-profile-avatar-wrap" @click="emit('select-file')">
            <img :src="editAll.img_url" class="w-24 h-24 object-cover pixel-profile-avatar" alt="用户头像"/>
            <input type="file" @change="(e) => emit('upload-img', e as Event)">
            <div class="absolute inset-0 pixel-profile-avatar-shade opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer">
              <i class="fas fa-camera text-white text-xl"></i>
            </div>
          </div>
          <div class="w-full space-y-4">
            <div>
              <label class="block text-sm pixel-label mb-1.5">昵称</label>
              <input type="text" :value="editAll.nickname" @input="(e) => editAll.nickname = (e.target as HTMLInputElement).value" class="w-full px-4 py-2.5 pixel-input name-border"/>
            </div>
            <div>
              <label class="block text-sm pixel-label mb-1.5">冒险者账号</label>
              <div class="px-4 py-2.5 pixel-readonly text-sm">{{ nickAll.userNickname }}</div>
            </div>
          </div>
          <div class="flex gap-3 mt-7 w-full">
            <button type="button" @click="emit('close')" class="pixel-btn pixel-btn-ghost flex-1 py-2.5 cursor-pointer">
              取消
            </button>
            <button type="button" @click="emit('save')" class="pixel-btn pixel-btn-primary flex-1 py-2.5 cursor-pointer">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
@use '@/styles/pixel-theme' as *;

.profile-modal__backdrop {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
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

.pixel-profile-card {
  background: $pixel-dialog-bg;
  border: 2px solid $pixel-border;
  box-shadow:
    0 0 30px rgba($neon-cyan, 0.2),
    0 0 60px rgba($neon-magenta, 0.15),
    0 20px 50px rgba(0, 0, 0, 0.5);
  clip-path: polygon(
    0 8px, 8px 8px, 8px 0,
    calc(100% - 8px) 0, calc(100% - 8px) 8px, 100% 8px,
    100% calc(100% - 8px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%,
    8px 100%, 8px calc(100% - 8px), 0 calc(100% - 8px)
  );
}

.pixel-profile-title {
  font-family: myFirstFont, "VT323", ui-monospace, monospace;
  font-size: 1.35rem;
  font-weight: normal;
  color: #fff;
  letter-spacing: 0.06em;
  text-shadow: 0 0 10px $neon-cyan;
}

.pixel-profile-close {
  border: 2px solid transparent;
  color: $pixel-text-muted;
  background: transparent;
  transition:
    transform 0.07s ease-out,
    box-shadow 0.07s ease-out,
    color 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    color: $pixel-text;
    background: rgba($neon-cyan, 0.14);
    border-color: rgba($neon-cyan, 0.3);
  }

  &:active {
    transform: translate(1px, 2px);

    @include pixel-press-shadow;

    color: $pixel-text;
  }
}

.pixel-profile-avatar-wrap {
  cursor: pointer;
}

.pixel-profile-avatar {
  border: 2px solid $neon-cyan;
  box-shadow: 0 0 15px rgba($neon-cyan, 0.3), 0 0 30px rgba($neon-cyan, 0.1);
  clip-path: polygon(
    0 6px, 6px 6px, 6px 0,
    calc(100% - 6px) 0, calc(100% - 6px) 6px, 100% 6px,
    100% calc(100% - 6px), calc(100% - 6px) calc(100% - 6px), calc(100% - 6px) 100%,
    6px 100%, 6px calc(100% - 6px), 0 calc(100% - 6px)
  );
}

.pixel-profile-avatar-shade {
  background: rgba(42, 36, 56, 0.5);
  transition: opacity 0.2s ease;
}

.pixel-label {
  color: $pixel-text-muted;
  font-weight: 600;
}

.pixel-input {
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba($neon-cyan, 0.3);
  color: $pixel-text;
  outline: none;
  box-shadow: inset 2px 2px 0 rgba(0, 0, 0, 0.3);

  &:focus {
    border-color: $neon-cyan;
    box-shadow:
      inset 2px 2px 0 rgba(0, 0, 0, 0.3),
      0 0 10px rgba($neon-cyan, 0.3);
  }
}

.pixel-readonly {
  background: rgba($neon-cyan, 0.08);
  border: 2px dashed rgba($neon-cyan, 0.25);
  color: $pixel-text;
}

.imgEdit input {
    display: none;
}
</style>
