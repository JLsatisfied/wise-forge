export default {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-recommended-vue',
    'stylelint-config-standard-scss',
  ],
  overrides: [
    {
      files: ['*.vue', '**/*.vue'],
      customSyntax: 'postcss-html',
    },
    {
      files: ['*.scss', '**/*.scss'],
      customSyntax: 'postcss-scss',
    },
  ],
  rules: {
    // 保持 rgba() 写法，不强制改成 rgb()
    'color-function-alias-notation': null,
    // 保持小数点 alpha 写法，不强制改成百分比
    'alpha-value-notation': 'number',
    // 允许自定义颜色函数
    'color-function-notation': 'legacy',
    // 不限制选择器命名
    'selector-class-pattern': null,
    // 不限制字体家族名称
    'font-family-no-missing-generic-family-keyword': null,
    // 允许未知的 @ 规则（SCSS/Tailwind）
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['tailwind', 'apply', 'layer', 'config', 'variants', 'responsive', 'screen', 'use', 'mixin', 'include', 'extend', 'if', 'else', 'each', 'for', 'while', 'warn', 'error', 'return', 'function'],
      },
    ],
    // 允许空的 <style> 块
    'no-empty-source': null,
    // 允许 Vue :deep() 语法
    'selector-pseudo-element-no-unknown': [
      true,
      { ignorePseudoElements: ['v-deep', 'v-global', 'v-slotted', 'deep'] },
    ],
    'selector-pseudo-class-no-unknown': [
      true,
      { ignorePseudoClasses: ['deep', 'global', 'slotted'] },
    ],
    // 放宽一些过于严格的规则
    'no-descending-specificity': null,
    'declaration-block-no-redundant-longhand-properties': null,
    'declaration-block-no-shorthand-property-overrides': null,
    'scss/load-no-partial-leading-underscore': null,
    // 自动生成的 keyframe 名称
    'keyframes-name-pattern': null,
    // CSS 动画中故意的重复属性（如多层 transform fallback）
    'declaration-block-no-duplicate-properties': null,
    // keyframe 中允许单行多个声明（如 0%, 100% { opacity: 0; transform: ... }）
    'declaration-block-single-line-max-declarations': null,
  },
};
