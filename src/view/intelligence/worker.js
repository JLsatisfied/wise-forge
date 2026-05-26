import MarkdownIt from 'markdown-it'
import mdKatex from '@traptitech/markdown-it-katex'
import hljs from 'highlight.js';
import vue from 'highlight.js/lib/languages/xml';
import react from 'highlight.js/lib/languages/xml';
import xml from 'highlight.js/lib/languages/xml';

hljs.registerLanguage('vue', vue);
hljs.registerLanguage('react', react);
hljs.registerLanguage('xml', xml);

const highlightBlock = (str, lang, word) => {
  const codeIndex = Date.now() + Math.floor(Math.random() * 10000000)
  const encodedCode = btoa(new TextEncoder().encode(word).reduce((data, byte) => data + String.fromCharCode(byte), ''))
  return `<pre class="pre-code-box"><div class="pre-code-header"><span class="code-block-header__lang">${lang}</span><div class="code-block-header__actions"><span class="code-block-header__copy" data-clipboard-action="copy" data-clipboard-target="#copy${codeIndex}">复制代码</span><span class="code-block-header__download" data-code="${encodedCode}" data-lang="${lang}">下载代码</span></div></div><div class="pre-code"><code class="hljs code-block-body ${lang}">${str}</code></div></pre><textarea style="position: absolute;top: -9999px;left: -9999px;z-index: -9999;" id="copy${codeIndex}">${word}</textarea>`
}

const mdi = new MarkdownIt({
  linkify: true,
  highlight(code, language) {
    const validLang = !!(language && hljs.getLanguage(language))
    if (validLang) {
      const lang = language ?? ''
      return highlightBlock(hljs.highlightAuto(code, [lang]).value, lang, code)
    }
    return highlightBlock(hljs.highlightAuto(code).value, '', code)
  }
})

mdi.use(mdKatex, { blockClass: 'katexmath-block rounded-md p-[10px]', errorColor: ' #cc0000' })

self.onmessage = function(e) {
  if (!e.data) {
    self.postMessage('')
    return
  }
  const result = mdi.render(e.data)
  self.postMessage(result)
}