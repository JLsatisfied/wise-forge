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

const HTML_ESCAPE = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

// 代码块内容会原样写进 textarea 和属性，必须转义，避免代码里的标签被执行
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => HTML_ESCAPE[char])

// 统一生成代码块结构；str 是已经处理好的（高亮或转义的）代码 HTML
const highlightBlock = (str, lang, word) => {
  const codeIndex = Date.now() + Math.floor(Math.random() * 10000000)
  const encodedCode = btoa(
    new TextEncoder().encode(word).reduce((data, byte) => data + String.fromCharCode(byte), '')
  )
  const safeLang = escapeHtml(lang)
  const previewAction = PREVIEW_LANGUAGES.includes(String(lang).toLowerCase())
    ? '<span class="code-block-header__preview" data-preview="html"><i class="fas fa-eye"></i>预览</span>'
    : ''
  return `<pre class="pre-code-box"><div class="pre-code-header"><span class="code-block-header__lang">${safeLang}</span><div class="code-block-header__actions">${previewAction}<span class="code-block-header__copy" data-clipboard-action="copy" data-clipboard-target="#copy${codeIndex}"><i class="fas fa-copy"></i>复制代码</span><span class="code-block-header__download" data-code="${encodedCode}" data-lang="${safeLang}"><i class="fas fa-download"></i>下载代码</span></div></div><div class="pre-code"><code class="hljs code-block-body ${safeLang}">${str}</code></div></pre><textarea style="position: absolute;top: -9999px;left: -9999px;z-index: -9999;" id="copy${codeIndex}">${escapeHtml(word)}</textarea>`
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

// 最终渲染：完整高亮
const highlightCode = (code, language) => {
  const lang = language ?? ''
  if (language && hljs.getLanguage(language)) {
    return highlightBlock(
      hljs.highlight(code, { language: lang, ignoreIllegals: true }).value,
      lang,
      code
    )
  }
  return highlightBlock(hljs.highlightAuto(code, AUTO_LANGUAGES).value, '', code)
}

// 流式渲染：只转义不高亮，避免每个分片都对整段代码重新生成上百个 span
const plainCode = (code, language) => {
  const lang = language ?? ''
  return highlightBlock(escapeHtml(code), lang, code)
}

const createMarkdown = highlight => {
  const md = new MarkdownIt({ linkify: true, highlight })
  md.use(mdKatex, { blockClass: 'katexmath-block rounded-md p-[10px]', errorColor: ' #cc0000' })
  return md
}

const mdHighlight = createMarkdown(highlightCode)
const mdPlain = createMarkdown(plainCode)

/**
 * 把 markdown 渲染成按顶层块切分的 HTML 数组。
 *
 * 流式输出时只有最后一个块会变化，前端按块渲染后可以保留前面已经稳定的 DOM，
 * 不必每次都整体替换整棵子树。
 */
const renderBlocks = (md, content) => {
  const env = {}
  const tokens = md.parse(content, env)
  const groups = []
  let current = []

  for (const token of tokens) {
    // 顶层块开始（level 0 且不是闭合标记）时，先把上一块收尾
    if (token.level === 0 && token.nesting >= 0 && current.length) {
      groups.push(current)
      current = []
    }
    current.push(token)
  }
  if (current.length) groups.push(current)

  return groups.map(group => md.renderer.render(group, md.options, env))
}

self.onmessage = function (e) {
  const data = e.data
  if (!data) {
    self.postMessage({ html: '', blocks: [] })
    return
  }

  // 兼容旧的纯字符串消息
  if (typeof data === 'string') {
    const html = mdHighlight.render(data)
    self.postMessage({ html, blocks: [html] })
    return
  }

  const content = typeof data.content === 'string' ? data.content : ''
  const options = data.options || {}
  // 流式过程中关闭高亮，结束后再做一次完整高亮
  const md = options.highlight === false ? mdPlain : mdHighlight

  if (options.blocks) {
    const blocks = renderBlocks(md, content)
    self.postMessage({ html: blocks.join(''), blocks })
    return
  }

  self.postMessage({ html: md.render(content), blocks: [] })
}
