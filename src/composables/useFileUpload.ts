import { Ref } from 'vue'

export default function useFileUpload(el: Ref<HTMLInputElement | null>, refValue: any, index: number) {
    const selectFile = () => {
        el.value?.click();
    }

    const upImg = (e: Event) => {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0]
            const maxSize = 2 * 1024 * 1024
            const imgType = ['image/png', 'image/jpeg', 'image/jpg']
            if (!imgType.includes(file.type)) {
            (el.value as HTMLInputElement).value = ''
            return ElMessage({
                        message: '仅支持 JPG / JPEG / PNG 格式的图片',
                        type: 'error',
                        offset: 200,
                        plain: true
                    })
            }
            if (file.size > maxSize) {
            // 解决同一个文件上传浏览器默认没有改变触发change事件的问题
            (el.value as HTMLInputElement).value = ''
            return ElMessage({
                        message: '图片大小不能超过 2MB',
                        type: 'error',
                        offset: 200,
                        plain: true
                    })
            }
            const reader = new FileReader()
            reader.onload = (event) => {
                switch (index) {
                    case 0:
                        refValue.img_url! = event.target?.result as string
                        break;
                    case 1:
                        refValue.value.img_url = event.target?.result as string
                        break;
                }
            }
            reader.readAsDataURL(file);
        }
    }
    return {
        selectFile,
        upImg
    }
}