# 未来智匠 (Wise Forge)

基于 Vue 3 + TypeScript + Vite 的 AI 对话平台。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3.4 (Composition API + `<script setup>`) |
| 语言 | TypeScript |
| 构建 | Vite 5 |
| 状态 | Pinia |
| 路由 | Vue Router 4 |
| UI | Element Plus + Tailwind CSS |
| HTTP | Axios |
| 样式 | Sass (SCSS) |
| Markdown | markdown-it + highlight.js |
| 加密 | node-forge (RSA) |
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
│   │   └── SkeletonLoader.vue  # 骨架屏
│   ├── composables/            # 组合式函数
│   │   ├── useContextMenu.ts   # 右键菜单逻辑
│   │   ├── useFileUpload.ts    # 文件上传
│   │   └── useSpeech.ts        # 语音合成
│   ├── plugins/                # Vite 插件
│   ├── router/
│   │   └── index.ts            # 路由配置 + 鉴权守卫
│   ├── store/
│   │   └── index.ts            # Pinia 状态管理
│   ├── styles/                 # 全局样式
│   │   ├── _pixel-theme.scss   # 像素主题变量 & mixins
│   │   └── pixel-utilities.scss# 共享工具类
│   ├── utils/
│   │   ├── http/
│   │   │   ├── axios.ts        # Axios 实例 + 拦截器
│   │   │   └── config.ts       # HTTP 配置
│   │   └── types/
│   │       └── ai.ts           # 类型定义
│   ├── view/
│   │   ├── home/               # 首页（登录/注册）
│   │   │   ├── index.vue
│   │   │   └── images/         # 首页图片
│   │   ├── intelligence/       # AI 对话页
│   │   │   ├── index.vue       # 主组件（编排者）
│   │   │   ├── worker.js       # Markdown 渲染 Worker
│   │   │   └── components/     # 子组件
│   │   │       ├── SideBar.vue
│   │   │       ├── NavBar.vue
│   │   │       ├── ChatInput.vue
│   │   │       ├── ChatMessageItem.vue
│   │   │       ├── TemplateDialog.vue
│   │   │       └── UserProfileModal.vue
│   │   ├── customer-service/   # AI 客服页面
│   │   │   └── index.vue
│   │   └── error/              # 404 页面
│   │       └── 404.vue
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
| `/` | 首页（登录/注册） | ❌ |
| `/intelligence` | AI 对话 | ✅ |
| `/customer-service` | AI 客服 | ✅ |
| `/:pathMatch` | 404 | ❌ |

## 启动

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装 & 运行

```bash
npm install       # 安装依赖
npm run dev       # 启动开发服务器
```

默认运行在 `http://localhost:5173`。

### 构建

```bash
npm run build     # 构建到 dist/
npm run preview   # 预览构建结果
```

### 代码质量

```bash
npm run format         # Prettier 格式化
npm run format:check   # 检查格式
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_APP_API_URL` | 后端 API 地址（默认 `/aicg/`） |

开发环境配置见 `.env.development`。
