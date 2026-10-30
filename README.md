# 未来智匠 Wise Forge

多模型 AI 对话与创作平台。前端基于 Vue 3 + TypeScript + Vite，后端为 Node.js / Express（见同级目录 `ai-core`）。

在线体验：<!-- TODO: 填入部署地址 --> `https://your-demo-url.com`
测试账号：<!-- TODO: 填入演示账号 --> `demo / demo-password`

> 截图待补充：登录页、AI 对话页、智能客服配置页、冒险模式。

## 功能

- **多模型对话**：DeepSeek Chat / Coder、讯飞 Spark Pro 等模型切换，SSE 流式输出。
- **深度思考**：开启后先输出推理过程，再给出回答（DeepSeek `thinking` 模式）。
- **联网搜索**：检索网页摘要并作为上下文交给模型。
- **PDF 解析**：上传 PDF（≤1MB），提取正文后基于文档提问。
- **对话版本回溯**：以分支树保存每次重新生成的结果，可在版本间切换。
- **对话管理**：本地 IndexedDB 保存历史，支持搜索、重命名、删除、导出为 HTML。
- **角色模板**：预设角色一键套用，快速开始一段对话。
- **智能客服**：配置欢迎语、署名、主题色与模型参数，生成嵌入代码接入任意网页。
- **冒险模式**：以文字冒险形式体验 AI 叙事，验证多轮上下文与结构化提示词。
- **账号体系**：注册 / 登录 / 修改密码 / 邮箱重置密码，RSA 加密传输，JWT 鉴权。
- **主题**：亮色 / 暗色跟随系统，可手动切换。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3.4（Composition API + `<script setup>`） |
| 语言 | TypeScript |
| 构建 | Vite 5 |
| 状态 | Pinia |
| 路由 | Vue Router 4 |
| UI | Element Plus + Tailwind CSS |
| HTTP | Axios |
| 流式请求 | @microsoft/fetch-event-source |
| 样式 | Sass (SCSS) |
| Markdown | markdown-it + highlight.js（Web Worker 渲染） |
| 加密 | node-forge（RSA-OAEP） |
| 提交规范 | Commitlint + Husky |

## 项目结构

```
wise-forge/
├── public/                     # 静态资源
├── src/
│   ├── api/                    # API 接口
│   │   ├── aicg.ts             # AI 对话相关接口
│   │   └── user.ts             # 用户相关接口
│   ├── assets/
│   │   └── font/               # 字体文件
│   ├── components/             # 全局公共组件
│   │   ├── ContextMenu.vue     # 右键菜单
│   │   ├── SkeletonLoader.vue  # 骨架屏
│   │   └── ThemeToggle.vue     # 主题切换
│   ├── composables/            # 组合式函数
│   │   ├── useContextMenu.ts   # 右键菜单逻辑
│   │   ├── useDeepseekHistory.ts    # 对话历史（IndexedDB）
│   │   ├── useConversationBranches.ts # 对话版本分支
│   │   ├── useFileUpload.ts    # 头像上传
│   │   └── useSpeech.ts        # 语音合成
│   ├── plugins/                # Vite 插件
│   ├── router/
│   │   └── index.ts            # 路由配置 + 鉴权守卫 + 页面标题
│   ├── store/
│   │   └── index.ts            # Pinia 状态管理
│   ├── styles/
│   │   └── theme.scss          # 主题变量（亮色/暗色）& 共享样式
│   ├── utils/
│   │   ├── http/
│   │   │   ├── axios.ts        # Axios 实例 + 拦截器
│   │   │   └── config.ts       # HTTP 配置
│   │   └── types/
│   │       └── ai.ts           # 类型定义
│   ├── view/
│   │   ├── home/               # 首页（登录/注册）
│   │   ├── intelligence/       # AI 对话页
│   │   │   ├── index.vue       # 主组件（编排者）
│   │   │   ├── worker.js       # Markdown 渲染 Worker
│   │   │   └── components/     # 子组件
│   │   ├── customer-service/   # 智能客服配置与预览
│   │   ├── adventure/          # 冒险模式
│   │   └── error/              # 404 页面
│   ├── App.vue                 # 根组件
│   ├── main.ts                 # 入口文件
│   └── style.css               # 全局基础样式
├── .env.development            # 开发环境变量
├── commitlint.config.js        # Commit 规范
├── eslint.config.js            # ESLint 配置
├── stylelint.config.js         # Stylelint 配置
├── .prettierrc                 # Prettier 配置
├── tsconfig.json               # TypeScript 配置
└── vite.config.ts              # Vite 配置
```

## 路由

| 路径 | 页面 | 需要登录 |
|------|------|:--------:|
| `/` | 首页（登录 / 注册） | ❌ |
| `/intelligence` | AI 对话 | ✅ |
| `/customer-service` | 智能客服 | ✅ |
| `/adventure` | 冒险模式 | ✅ |
| `/:pathMatch(.*)*` | 404 | ❌ |

## 启动

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装 & 运行

```bash
npm install       # 安装依赖
npm run dev       # 启动开发服务器
```

默认运行在 `http://localhost:5173`。对话功能需要同时启动后端 `ai-core`（默认 `http://localhost:5002`）。

### 构建

```bash
npm run build     # 构建到 dist/
npm run preview   # 预览构建结果
```

### 代码质量

```bash
npm run format         # Prettier 格式化
npm run format:check   # 检查格式
npx eslint src         # ESLint
npx vue-tsc -b         # 类型检查
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_APP_API_URL` | 后端 API 地址（默认 `/aicg/`） |

开发环境配置见 `.env.development`。

## 设计说明

界面以「冒险」作为世界观副线，但功能文案全部使用直白表达：按钮写「新建对话」而不是「开启冒险」，参数直接写 `temperature` / `max_tokens`。奇幻设定只出现在视觉和欢迎语中，不参与功能命名，避免用户需要额外翻译。
