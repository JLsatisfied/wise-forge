import { ref } from 'vue'

// 浏览器内置的语音合成朗读 hook
export default function useSpeech() {
    const isSpeaking = ref(false)
    const speakingIndex = ref<number | null>(null)
    let utterance: SpeechSynthesisUtterance | null = null

    const getChineseVoice = (): SpeechSynthesisVoice | null => {
        const voices = speechSynthesis.getVoices()
        return voices.find(v => v.lang.startsWith('zh')) || null
    }

    const stripHtml = (html: string): string => {
        const div = document.createElement('div')
        div.innerHTML = html
        return div.textContent || div.innerText || ''
    }

    const speak = (index: number, html: string) => {
        const synth = speechSynthesis

        // 如果正在读同一条消息，则停止
        if (isSpeaking.value && speakingIndex.value === index) {
            synth.cancel()
            isSpeaking.value = false
            speakingIndex.value = null
            return
        }

        // 停止之前的朗读
        synth.cancel()

        const text = stripHtml(html)
        if (!text.trim()) return

        utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'zh-CN'
        utterance.rate = 1.0
        utterance.pitch = 1.0

        const voice = getChineseVoice()
        if (voice) utterance.voice = voice

        utterance.onstart = () => {
            isSpeaking.value = true
            speakingIndex.value = index
        }
        utterance.onend = () => {
            isSpeaking.value = false
            speakingIndex.value = null
        }
        utterance.onerror = () => {
            isSpeaking.value = false
            speakingIndex.value = null
        }

        // 如果 voices 还没加载完（Chrome 异步加载），需要等待
        if (speechSynthesis.getVoices().length === 0) {
            speechSynthesis.addEventListener('voiceschanged', () => {
                const v = getChineseVoice()
                if (v && utterance) utterance.voice = v
                synth.speak(utterance!)
            }, { once: true })
        } else {
            synth.speak(utterance)
        }
    }

    const stop = () => {
        speechSynthesis.cancel()
        isSpeaking.value = false
        speakingIndex.value = null
    }

    return { isSpeaking, speakingIndex, speak, stop }
}
