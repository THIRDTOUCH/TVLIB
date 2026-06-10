# TVLIB - AI 短剧创作工作台

> 一个功能完整的短剧创作流程管理工具，面向自媒体、编剧、导演团队设计。支持从剧本构思、角色设定、分镜拆解到外部 AI 平台（ComfyUI、LLM）的一站式工作流对接。

## 项目特性

- 📝 **剧本大纲生成** - 主题、类型、风格驱动的 AI 辅助剧本构思
- 🎭 **角色与场景管理** - 独立的角色库与场景库，支持复用
- 🎬 **分镜脚本生成** - 自动拆解剧本为分镜，包含镜位、运镜、打光、情绪
- 🎨 **ComfyUI 对接** - 一键将分镜提示词发送到本地 ComfyUI 生成图片
- 🤖 **LLM 集成** - 支持 Groq、OpenRouter、Gemini、豆包、通义千问、DeepSeek 等
- ☁️ **云端同步** - WebDAV / GitHub / S3 多种同步方式
- 🔒 **离线优先** - 100% 纯前端实现，本地存储 + AES 加密，可部署为 PWA
- 🔄 **版本管理** - 自动备份、版本历史、对比与回滚
- 📦 **多格式导出** - HTML / Markdown / TXT / CSV / Fountain / JSON

## 快速开始

### 1. 本地运行

```bash
# 方式一：直接用浏览器打开
# 双击 index.html

# 方式二：本地 HTTP 服务（推荐，避免部分浏览器本地限制）
python3 -m http.server 8000
# 然后访问 http://localhost:8000
```

### 2. 连接 ComfyUI

1. 在本机启动 ComfyUI（默认端口 `8188`）
2. 点击页面顶部 **🎨 ComfyUI** 按钮
3. 在弹窗中填写服务器地址（如 `http://localhost:8188`），点击 **测试连接**
4. 生成分镜后，在分镜卡片上点击 **🎨 发送到 ComfyUI** 即可生成图片

### 3. 配置 LLM（可选）

点击页面内的 AI 相关按钮即可进入 LLM 配置面板。支持免 Key 的本地 Ollama 与云端 API。

## 目录结构

```
TVLIB/
├── index.html                 # 主页面 (单页应用)
├── style.css                  # 主样式
├── manifest.json              # PWA 清单
├── service-worker.js          # PWA 离线缓存
├── favicon.svg                # 图标
├── version.json               # 版本信息
│
├── js/
│   ├── core/                  # 核心逻辑
│   │   ├── app.js             # 主应用：生成/渲染/状态管理
│   │   └── project-manager.js # 项目数据与持久化
│   │
│   ├── modules/               # 功能模块 - 四阶段创作流程
│   │   ├── app-phase1.js      # 阶段1：大纲与故事构思
│   │   ├── app-phase2.js      # 阶段2：剧本生成与编辑
│   │   ├── app-phase2-render.js # 分镜渲染
│   │   ├── app-phase3.js      # 阶段3：角色/场景/节拍表
│   │   ├── app-phase4.js      # 阶段4：导出与发布
│   │   ├── storyboard-templates.js # 分镜模板库
│   │   └── advanced-modules.js # 高级模块
│   │
│   ├── integrations/          # 外部平台集成
│   │   ├── app-comfyui.js     # ComfyUI 连接器 + 提示词翻译
│   │   ├── app-llm.js         # LLM Provider 管理 + 调用
│   │   ├── app-api.js         # REST API 定义与导出
│   │   ├── app-video.js       # 视频生成平台对接
│   │   ├── app-agent.js       # AI 助手（自然语言操作）
│   │   ├── app-template.js    # 模板库与素材库
│   │   ├── app-collab.js      # 协作/评论/版本历史
│   │   ├── app-cloud-sync.js  # 云端同步（WebDAV/GitHub/S3）
│   │   ├── app-sync.js        # 设备间同步
│   │   └── app-update.js      # 自动更新检查
│   │
│   ├── core-lib/              # 基础库
│   │   ├── app-error.js       # 统一错误处理
│   │   ├── app-secure.js      # AES-256-GCM 加密
│   │   ├── app-perf.js        # 性能优化工具
│   │   ├── app-mobile.js      # 移动端适配
│   │   └── app-prompt.js      # 提示词模板引擎
│   │
│   ├── tools/                 # 工具脚本
│   │   └── generate-icons.js  # 图标生成工具
│   │
│   └── test/                  # 自动化测试
│       ├── test-framework.js  # 测试框架
│       ├── test-runner.html   # 测试运行器页面
│       ├── test-simulation.js # 模拟运行测试
│       ├── test-system.js     # 系统测试
│       └── test-system-v2.js  # 系统测试 v2
│
├── icons/                     # PWA 图标集 (SVG)
└── docs/                      # 文档与报告
    ├── README.md              # 详细功能说明
    ├── issue-report.md        # 问题报告与修复记录
    └── test-report.md         # 测试报告
```

## 核心架构

### 数据流

```
用户输入 ──► LLM/本地模板 ──► projectData (内存) ──► localStorage
                                    │                    │
                                    ▼                    ▼
                           角色库 / 场景库 / 分镜    project-manager (IndexedDB)
                                    │
                                    ▼
                          ComfyUI / LLM 调用 ──► 外部平台返回结果
```

### ComfyUI 对接流程

1. `app-comfyui.js` 中的 `ComfyUIConnector` 负责连接与队列管理
2. `PromptTranslator` 将中文分镜字段翻译为英文 SD 提示词
3. `WorkflowBuilder` 组装符合 ComfyUI API 格式的 JSON 工作流
4. 通过 `POST /api/prompt` 发送，WebSocket 监听进度
5. 完成后通过 `/view` 拉取生成图片预览

### 统一项目数据结构

```javascript
projectData = {
  outline: '',        // 大纲内容
  script: '',         // 剧本正文
  novel: '',          // 小说原文 (可选)
  shots: [ Shot ],    // 分镜列表
  characters: [],     // 角色库
  scenes: [],         // 场景库
  beats: { structure, beats: [] }, // 节拍表
  metadata: { title, genre, style, duration, episodes, createdAt, updatedAt, version }
}
```

分镜 Shot 对象字段：

```javascript
{
  id, type, scene, characters, cameraMove, duration,
  content, dialog, imagePrompt, videoPrompt, characterPrompt,
  lighting, mood, aspectRatio
}
```

## 运行测试

```bash
# 在浏览器中打开
open js/test/test-runner.html

# 或用 HTTP 服务器
python3 -m http.server 8000
# 访问 http://localhost:8000/js/test/test-runner.html
```

## 技术栈

- **纯前端**：原生 JavaScript (ES6+) + HTML5 + CSS3
- **无构建步骤**：直接用浏览器打开即可运行
- **存储**：localStorage (KV) + IndexedDB (项目库)
- **加密**：Web Crypto API (AES-256-GCM)
- **PWA**：Service Worker + Manifest.json
- **外部 API**：Fetch API / WebSocket API

## 贡献指南

1. **添加新的 LLM Provider** → 修改 `js/integrations/app-llm.js` 的 `PROVIDERS` 对象
2. **添加新的导出格式** → 在 `js/modules/app-phase4.js` 的 `ExportManager` 中新增方法
3. **添加新的外部平台集成** → 在 `js/integrations/` 下创建新模块，仿照 `app-comfyui.js` 的三组件架构（Connector / Builder / Manager）
4. **分镜模板扩展** → `js/modules/storyboard-templates.js` 中新增模板对象

## 许可

MIT License - 详见文件头部

## 文档索引

- [详细功能文档](docs/README.md)
- [问题与修复记录](docs/issue-report.md)
- [测试报告](docs/test-report.md)
