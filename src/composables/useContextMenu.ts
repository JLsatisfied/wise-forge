import { onMounted, onBeforeUnmount, ref, type Ref } from "vue";
export default function (containerRef: Ref<HTMLElement | null>) {
  const showMenu = ref(false);
  const x = ref(0);
  const y = ref(0);
    // 事件处理函数
    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault(); // 阻止浏览器的默认行为
        e.stopPropagation(); // 阻止冒泡
        showMenu.value = true;
        x.value = e.clientX;
        y.value = e.clientY;
    };
      // 注册一个事件函数用来关闭菜单
  function closeMenu() {
    showMenu.value = false;
  }
  onMounted(() => {
    const div = containerRef.value;
    if (!div) return;
    div.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("click", closeMenu, true);
    window.addEventListener("contextmenu", closeMenu, true);
  });
  onBeforeUnmount(() => {
    const div = containerRef.value;
    if (!div) return;
    div.removeEventListener("contextmenu", handleContextMenu);
    window.removeEventListener("click", closeMenu, true);
    window.removeEventListener("contextmenu", closeMenu, true);
  });
  return {
    showMenu,
    x,
    y,
  };
}