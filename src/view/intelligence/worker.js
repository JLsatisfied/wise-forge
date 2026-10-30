import MarkdownIt from 'markdown-it'
import mdKatex from '@traptitech/markdown-it-katex'
import hljs from 'highlight.js'
import vue from 'highlight.js/lib/languages/xml'
import react from 'highlight.js/lib/languages/xml'
import xml from 'highlight.js/lib/languages/xml'

hljs.registerLanguage('vue', vue)
hljs.registerLanguage('react', react)
hljs.registerLanguage('xml', xml)

// 可以在沙箱 iframe 里预览的代码块语言
const PREVIEW_LANGUAGES = ['html', 'htm']

const highlightBlock = (str, lang, word) => {
  const codeIndex = Date.now() + Math.floor(Math.random() * 10000000)
  const encodedCode = btoa(
    new TextEncoder().encode(word).reduce((data, byte) => data + String.fromCharCode(byte), '')
  )
  const previewAction = PREVIEW_LANGUAGES.includes(lang.toLowerCase())
    ? '<span class="code-block-header__preview" data-preview="html"><i class="fas fa-eye"></i>预览</span>'
    : ''
  return `<pre class="pre-code-box"><div class="pre-code-header"><span class="code-block-header__lang">${lang}</span><div class="code-block-header__actions">${previewAction}<span class="code-block-header__copy" data-clipboard-action="copy" data-clipboard-target="#copy${codeIndex}"><i class="fas fa-copy"></i>复制代码</span><span class="code-block-header__download" data-code="${encodedCode}" data-lang="${lang}"><i class="fas fa-download"></i>下载代码</span></div></div><div class="pre-code"><code class="hljs code-block-body ${lang}">${str}</code></div></pre><textarea style="position: absolute;top: -9999px;left: -9999px;z-index: -9999;" id="copy${codeIndex}">${word}</textarea>`
}

// 没有标注语言的代码块只在这几种常见语言里自动识别，
// 避免流式重渲染时把上百种语言全部试一遍
const AUTO_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'go',
  'c',
  'cpp',
  'csharp',
  'bash',
  'json',
  'yaml',
  'xml',
  'css',
  'sql',
  'php',
  'rust'
]

const mdi = new MarkdownIt({
  linkify: true,
  highlight(code, language) {
    if (language && hljs.getLanguage(language)) {
      // 已知语言直接高亮：highlightAuto 会把上百种语言都试一遍，
      // 长代码块在流式过程中反复渲染时开销非常大
      const lang = language ?? ''
      return highlightBlock(
        hljs.highlight(code, { language: lang, ignoreIllegals: true }).value,
        lang,
        code
      )
    }
    return highlightBlock(hljs.highlightAuto(code, AUTO_LANGUAGES).value, '', code)
  }
})

mdi.use(mdKatex, { blockClass: 'katexmath-block rounded-md p-[10px]', errorColor: ' #cc0000' })

self.onmessage = function (e) {
  if (!e.data) {
    self.postMessage('')
    return
  }
  const result = mdi.render(e.data)
  self.postMessage(result)
}
