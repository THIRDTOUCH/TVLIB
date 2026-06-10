/**
 * ============================================================
 * AI短剧创作工作台 — 智能 LLM 连接器
 * ============================================================
 * 功能：
 *  · 多 Provider 支持（Ollama / Groq / OpenRouter / Gemini / Cohere / HuggingFace / Cloudflare）
 *  · 免费优先自动路由（本地 Ollama → Groq 免费层 → 其余免费模型）
 *  · 统一接口：llm.generate(prompt, taskType) 即可调用
 *  · 配置面板：设置 API Key / 选择模型 / 查看连接状态
 *  · 内容生成：自动构造角色/场景/剧情相关的专业提示词
 *  · 流式输出：支持 Server-Sent Events
 *  · Agent 联动：Agent 请求 → LLM → 智能回复
 *
 * 免费模型优先级（按延迟/质量/稳定性排序）：
 *  1. Ollama (本地)     — 免费、无需 API key、最快（仅本机部署时）
 *  2. Groq               — Llama-3.3-70B / Mixtral 免费，速度极快
 *  3. OpenRouter         — 汇总多个免费模型（Claude/GPT/Qwen 等）
 *  4. Google Gemini      — Gemini-2.0-flash 免费额度大
 *  5. Cohere             — Command R+ 免费 30 天
 *  6. HuggingFace        — Inference API 免费限速
 *  7. Cloudflare Workers — @cf 系列模型免费
 * ============================================================
 */

(function () {
  'use strict';

  // ==================== 配置存储键名 ====================
  const CONFIG_KEYS = {
    activeProvider: 'llm_active_provider',
    apiKeys: 'llm_api_keys',       // { groq: '...', openrouter: '...', gemini: '...', cohere: '...', hf: '...' }
    selectedModel: 'llm_selected_model', // { groq: 'llama-3.3-70b-versatile', ... }
    ollamaHost: 'llm_ollama_host',  // 默认 http://localhost:11434
    enabled: 'llm_enabled',         // 是否启用 LLM
    autoFallback: 'llm_auto_fallback' // 免费优先自动切换
  };

  // ==================== Provider 定义 ====================
  const PROVIDERS = {
    ollama: {
      id: 'ollama',
      name: 'Ollama (本地)',
      icon: '🏠',
      free: true,
      requiresKey: false,
      defaultModel: 'llama3.3',
      description: '本机部署，完全免费，最快，无需网络',
      setup: '请先在电脑安装 Ollama：ollama.com，然后运行 "ollama run llama3.3"',
      color: '#10b981',
      docs: [
        { label: 'Llama 3.3 70B', model: 'llama3.3', desc: '最新开源大模型，能力最强' },
        { label: 'Qwen 2.5', model: 'qwen2.5', desc: '阿里开源，中文优秀' },
        { label: 'DeepSeek V3', model: 'deepseek-v3', desc: '国产开源，性价比高' },
        { label: 'Gemma 3', model: 'gemma3', desc: 'Google 开源，轻量快速' }
      ],
      apiBase: () => localStorage.getItem(CONFIG_KEYS.ollamaHost) || 'http://localhost:11434',
      buildRequest: (model, messages) => ({
        url: () => `${PROVIDERS.ollama.apiBase()}/api/chat`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { model, messages, stream: true }
      })
    },

    groq: {
      id: 'groq',
      name: 'Groq (免费层)',
      icon: '⚡',
      free: true,
      requiresKey: true,
      defaultModel: 'llama-3.3-70b-versatile',
      description: 'Llama 3.3 70B 免费，速度极快（60+ token/s）',
      setup: '免费注册 groq.com 获取 API Key，无需信用卡',
      color: '#f97316',
      docs: [
        { label: 'Llama 3.3 70B', model: 'llama-3.3-70b-versatile', desc: '速度快，质量高，推荐首选' },
        { label: 'Mixtral 8x7B', model: 'mixtral-8x7b-32768', desc: 'MoE 模型，推理快' },
        { label: 'Llama 3.1 8B', model: 'llama-3.1-8b-instant', desc: '轻量快速，节省额度' }
      ],
      apiBase: () => 'https://api.groq.com/openai/v1',
      buildRequest: (model, messages) => ({
        url: () => `${PROVIDERS.groq.apiBase()}/chat/completions`,
        method: 'POST',
        headers: (key) => ({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        }),
        body: { model, messages, temperature: 0.7, max_tokens: 2048, stream: true }
      })
    },

    openrouter: {
      id: 'openrouter',
      name: 'OpenRouter (聚合免费)',
      icon: '🌐',
      free: true,
      requiresKey: true,
      defaultModel: 'anthropic/claude-3.5-haiku',
      description: '汇总多个模型的免费配额（Claude/GPT/Qwen）',
      setup: '免费注册 openrouter.ai 获取 API Key',
      color: '#8b5cf6',
      docs: [
        { label: 'Claude 3.5 Haiku', model: 'anthropic/claude-3.5-haiku', desc: '快速、便宜、有免费额度' },
        { label: 'Qwen 2.5 72B', model: 'qwen/qwen2.5-72b-instruct', desc: '阿里开源，免费额度大' },
        { label: 'DeepSeek V3', model: 'deepseek/deepseek-chat-v3-0324', desc: '国产免费模型' },
        { label: 'Mistral Small', model: 'mistralai/mistral-small-3.1-24b', desc: 'Mistral 免费版' }
      ],
      apiBase: () => 'https://openrouter.ai/api/v1',
      buildRequest: (model, messages) => ({
        url: () => `${PROVIDERS.openrouter.apiBase()}/chat/completions`,
        method: 'POST',
        headers: (key) => ({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI短剧创作工作台'
        }),
        body: { model, messages, temperature: 0.7, max_tokens: 2048, stream: true }
      })
    },

    gemini: {
      id: 'gemini',
      name: 'Google Gemini (免费)',
      icon: '✨',
      free: true,
      requiresKey: true,
      defaultModel: 'gemini-2.0-flash',
      description: 'Gemini 2.0 Flash 免费额度大，支持 1M token',
      setup: '免费注册 aistudio.google.com 获取 API Key',
      color: '#4285f4',
      docs: [
        { label: 'Gemini 2.0 Flash', model: 'gemini-2.0-flash', desc: '最新高速模型，推荐首选' },
        { label: 'Gemini 1.5 Flash', model: 'gemini-1.5-flash', desc: '稳定可靠，免费额度多' },
        { label: 'Gemini 1.5 Pro', model: 'gemini-1.5-pro', desc: '能力更强，有免费额度' }
      ],
      apiBase: () => 'https://generativelanguage.googleapis.com/v1beta',
      buildRequest: (model, messages) => {
        const apiKey = LLMManager.getAPIKey('gemini');
        return {
          url: () => `${PROVIDERS.gemini.apiBase()}/models/${model}:generateContent?key=${apiKey}`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            contents: messages.map(m => ({
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }]
            })),
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
          }
        };
      }
    },

    cohere: {
      id: 'cohere',
      name: 'Cohere (免费层)',
      icon: '🌊',
      free: true,
      requiresKey: true,
      defaultModel: 'command-r-plus-08-2024',
      description: 'Command R+ 免费 30 天，企业级搜索增强',
      setup: '免费注册 cohere.com 获取 API Key',
      color: '#06b6d4',
      docs: [
        { label: 'Command R+', model: 'command-r-plus-08-2024', desc: '最新旗舰，免费 30 天' },
        { label: 'Command R', model: 'command-r-08-2024', desc: '稳定版，有免费额度' }
      ],
      apiBase: () => 'https://api.cohere.ai/v2',
      buildRequest: (model, messages) => ({
        url: () => `${PROVIDERS.cohere.apiBase()}/chat`,
        method: 'POST',
        headers: (key) => ({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        }),
        body: (model, messages) => ({
          model,
          messages: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'chatbot', content: m.content })),
          temperature: 0.7, max_tokens: 2048, stream: true
        })
      })
    },

    // ========== 国产模型（支持本地部署） ==========
    doubao: {
      id: 'doubao',
      name: '豆包 (Doubao)',
      icon: '🟢',
      free: true,
      requiresKey: true,
      defaultModel: 'doubao-3',
      description: '字节跳动豆包，支持本地部署或云API',
      setup: '获取 API Key: www.doubao.com',
      color: '#22c55e',
      docs: [
        { label: '豆包 3.0', model: 'doubao-3', desc: '最新版本，推荐使用' },
        { label: '豆包 2.0', model: 'doubao-2', desc: '稳定版本' },
        { label: '豆包 Mini', model: 'doubao-mini', desc: '轻量快速' }
      ],
      apiBase: () => localStorage.getItem('llm_doubao_host') || 'https://api.doubao.com/v1',
      buildRequest: (model, messages) => ({
        url: () => `${PROVIDERS.doubao.apiBase()}/chat/completions`,
        method: 'POST',
        headers: (key) => ({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        }),
        body: { model, messages, temperature: 0.7, max_tokens: 2048, stream: true }
      })
    },

    qwen: {
      id: 'qwen',
      name: '阿里云千问 (Qwen)',
      icon: '🔵',
      free: true,
      requiresKey: true,
      defaultModel: 'qwen-2.5-72b',
      description: '阿里达摩院千问，支持本地部署',
      setup: '获取 API Key: dashscope.aliyun.com',
      color: '#3b82f6',
      docs: [
        { label: 'Qwen 2.5 72B', model: 'qwen-2.5-72b', desc: '最强版本，推荐首选' },
        { label: 'Qwen 2.5 14B', model: 'qwen-2.5-14b', desc: '平衡速度与质量' },
        { label: 'Qwen 2.5 7B', model: 'qwen-2.5-7b', desc: '轻量快速' },
        { label: 'Qwen 2', model: 'qwen-2', desc: '稳定版本' }
      ],
      apiBase: () => localStorage.getItem('llm_qwen_host') || 'https://dashscope.aliyuncs.com/api/text/v1',
      buildRequest: (model, messages) => ({
        url: () => `${PROVIDERS.qwen.apiBase()}/chat/completions`,
        method: 'POST',
        headers: (key) => ({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        }),
        body: { model, messages, temperature: 0.7, max_tokens: 2048, stream: true }
      })
    },

    deepseek: {
      id: 'deepseek',
      name: '深度求索 (DeepSeek)',
      icon: '🟣',
      free: true,
      requiresKey: true,
      defaultModel: 'deepseek-chat',
      description: '深度求索，支持本地部署（DeepSeek-R1）',
      setup: '云API: platform.deepseek.com | 本地: 部署后配置地址',
      color: '#a855f7',
      docs: [
        { label: 'DeepSeek R1', model: 'deepseek-chat', desc: '最新旗舰模型' },
        { label: 'DeepSeek V3', model: 'deepseek-v3', desc: '稳定版本' },
        { label: 'DeepSeek MoE', model: 'deepseek-moe', desc: 'Mixture of Experts' }
      ],
      apiBase: () => localStorage.getItem('llm_deepseek_host') || 'https://api.deepseek.com/v1',
      buildRequest: (model, messages) => ({
        url: () => `${PROVIDERS.deepseek.apiBase()}/chat/completions`,
        method: 'POST',
        headers: (key) => ({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        }),
        body: { model, messages, temperature: 0.7, max_tokens: 2048, stream: true }
      })
    },

    custom: {
      id: 'custom',
      name: '自定义 API',
      icon: '🔧',
      free: true,
      requiresKey: true,
      defaultModel: 'default',
      description: '自定义任意 OpenAI 兼容的 API 端点',
      setup: '填入 API 地址和 Key，支持本地部署的任意模型',
      color: '#64748b',
      docs: [
        { label: '默认模型', model: 'default', desc: '根据服务端配置' },
        { label: '自定义模型', model: 'custom-model', desc: '自定义模型名称' }
      ],
      apiBase: () => localStorage.getItem('llm_custom_host') || 'http://localhost:8080/v1',
      buildRequest: (model, messages) => ({
        url: () => `${PROVIDERS.custom.apiBase()}/chat/completions`,
        method: 'POST',
        headers: (key) => ({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        }),
        body: { model, messages, temperature: 0.7, max_tokens: 2048, stream: true }
      })
    },

    hf: {
      id: 'hf',
      name: 'HuggingFace (限速免费)',
      icon: '🤗',
      free: true,
      requiresKey: true,
      defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
      description: '开源模型免费限速，适合轻量任务',
      setup: '免费注册 huggingface.co 获取 API Key',
      color: '#ff9f1c',
      docs: [
        { label: 'Llama 3.3 70B', model: 'meta-llama/Llama-3.3-70B-Instruct', desc: '最强开源模型' },
        { label: 'Qwen 2.5 72B', model: 'Qwen/Qwen2.5-72B-Instruct', desc: '阿里开源，中文好' }
      ],
      apiBase: () => 'https://api-inference.huggingface.co/cohere-chat',
      buildRequest: (model, messages) => ({
        url: () => `${PROVIDERS.hf.apiBase()}/chat`,
        method: 'POST',
        headers: (key) => ({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        }),
        body: (model, messages) => ({
          model: 'meta-llama/Llama-3.3-70B-Instruct',
          messages: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
          temperature: 0.7, max_tokens: 2048, stream: true
        })
      })
    }
  };

  // ==================== 内容生成提示词模板库 ====================
  const PROMPT_TEMPLATES = {
    outline: {
      system: `你是一位专业的短剧编剧，擅长创作有爆点的短视频剧本。你的风格是：
1. 开场（前3秒）必须制造强悬念或冲突，吸引眼球
2. 人物关系清晰，主角有明确的目标和障碍
3. 情节节奏快，每个场景都要推动故事发展
4. 结尾有反转或情感落点，让观众有获得感
5. 控制在500-800字，适合3-5分钟短剧`,
      user: (brief) => `根据以下题材/想法，帮我写一份短剧大纲：

题材：${brief}

要求：
- 包含：开场钩子、人物设定、核心冲突、3-5个关键情节点、反转设计
- 风格适合抖音/快手短视频平台
- 目标受众：普通大众，有情感共鸣
- 格式清晰，分段落呈现`
    },
    script: {
      system: `你是一位抖音短剧金牌编剧，精通短视频节奏和爆款逻辑：
1. 每句话不超过15字，节奏快
2. 对话要有潜台词，制造张力
3. 场景描写简洁，用（）包裹
4. 每30秒一个小高潮
5. 善用"扎心台词"和"反转金句"`,
      user: (outline) => `根据以下大纲，帮我写完整的分集剧本：

${outline}

要求：
- 每集2-3分钟，对话为主
- 包含场景描述（括号内）、人物动作、台词
- 结尾留悬念或情感钩子
- 加入2-3句高传播性的"金句"`
    },
    character: {
      system: `你是一位资深影视策划师，擅长设计有记忆点的角色：
1. 外在标签鲜明（一句话概括）
2. 内在有矛盾和层次
3. 有独特的说话方式或口头禅
4. 角色弧线清晰（从X到Y）
5. 配套2-3个配角形成关系网`,
      user: (outline) => `根据以下故事背景，设计3-5个主要角色：

${outline}

要求：
- 每个角色包含：姓名、年龄、外形标签、性格关键词、职业/身份
- 主要角色给出：目标、障碍、关系网络、一句经典台词
- 格式清晰，用表格或列表呈现`
    },
    scene: {
      system: `你是一位专业分镜设计师，精通影视场景美学：
1. 场景要有视觉特色（光线、色调、空间感）
2. 每个场景服务于叙事
3. 善用环境暗示情绪
4. 考虑拍摄可行性和成本`,
      user: (outline) => `根据以下故事，为每个情节点设计拍摄场景：

${outline}

要求：
- 每个场景包含：场景名称、时间、空间描述、视觉氛围、光线色调
- 配套道具和环境细节
- 格式清晰，标注拍摄注意事项`
    },
    storyboard: {
      system: `你是一位专业分镜师，擅长将剧本转化为可视化分镜：
1. 每个镜头有明确的叙事功能
2. 运镜术语专业（推拉摇移跟甩）
3. 景别序列有节奏（远全中近特递进）
4. 配套 AI 图像生成提示词（英文，详细）`,
      user: (outline, script) => `根据以下剧本，帮我设计分镜脚本：

【剧本】
${script || outline}

要求为每个关键场景输出：
1. 镜号（SHOT_01, SHOT_02...）
2. 景别（大远/远/全/中/近/特/大特）
3. 运镜（固定/推/拉/摇/移/跟/甩/航拍）
4. 场景描述（2-3句话）
5. 画面内容（谁在做什么）
6. AI绘图提示词（英文，50词左右，cinematic, film still风格）
7. 台词/旁白（如有）`
    },
    agent_chat: {
      system: `你是"AI短剧创作工作台"的智能助手，风格友好专业：
1. 回答简洁有力，直接给出可操作的建议
2. 用列表/表格让信息更清晰
3. 善用 emoji 增强可读性
4. 需要用户确认的操作明确说明
5. 遇到不确定的问题，坦诚说明并给出备选方案`,
      user: (question, context) => `【当前项目信息】
${context || '暂无打开的项目，请引导用户新建或打开项目'}

【用户问题】
${question}

请给出专业、直接、有帮助的回答。如果涉及操作，给出具体步骤。`
    }
  };

  // ==================== LLM 管理器核心 ====================
  const LLMManager = {
    _status: 'idle', // idle | connecting | connected | error | disabled
    _currentProvider: null,
    _activeModel: null,
    _listeners: [],

    // ---------- 初始化 ----------
    init() {
      const savedProvider = localStorage.getItem(CONFIG_KEYS.activeProvider) || 'groq';
      this._currentProvider = savedProvider;
      this._status = localStorage.getItem(CONFIG_KEYS.enabled) !== 'false' ? 'idle' : 'disabled';
      console.log(`🤖 LLM 管理器已就绪，当前 Provider: ${this._currentProvider}`);
      return this;
    },

    // ---------- 配置存取 ----------
    getConfig() {
      return {
        activeProvider: localStorage.getItem(CONFIG_KEYS.activeProvider) || 'groq',
        apiKeys: safeJSON(localStorage.getItem(CONFIG_KEYS.apiKeys) || '{}', {}),
        selectedModels: safeJSON(localStorage.getItem(CONFIG_KEYS.selectedModel) || '{}', {}),
        ollamaHost: localStorage.getItem(CONFIG_KEYS.ollamaHost) || 'http://localhost:11434',
        enabled: localStorage.getItem(CONFIG_KEYS.enabled) !== 'false'
      };
    },

    async getAPIKey(provider) {
      if (window.SecureStorageManager) {
        const keys = await SecureStorageManager.getItem(CONFIG_KEYS.apiKeys) || {};
        return keys[provider] || '';
      }
      const keys = safeJSON(localStorage.getItem(CONFIG_KEYS.apiKeys) || '{}', {});
      return keys[provider] || '';
    },

    async setAPIKey(provider, key) {
      if (window.SecureStorageManager) {
        const keys = await SecureStorageManager.getItem(CONFIG_KEYS.apiKeys) || {};
        keys[provider] = key.trim();
        await SecureStorageManager.setItem(CONFIG_KEYS.apiKeys, keys);
      } else {
        const keys = safeJSON(localStorage.getItem(CONFIG_KEYS.apiKeys) || '{}', {});
        keys[provider] = key.trim();
        localStorage.setItem(CONFIG_KEYS.apiKeys, JSON.stringify(keys));
      }
      localStorage.removeItem(`llm_err_${provider}`);
    },

    setActiveProvider(providerId) {
      this._currentProvider = providerId;
      localStorage.setItem(CONFIG_KEYS.activeProvider, providerId);
    },

    setModel(providerId, modelId) {
      const models = safeJSON(localStorage.getItem(CONFIG_KEYS.selectedModel) || '{}', {});
      models[providerId] = modelId;
      localStorage.setItem(CONFIG_KEYS.selectedModel, JSON.stringify(models));
    },

    getModel(providerId) {
      const models = safeJSON(localStorage.getItem(CONFIG_KEYS.selectedModel) || '{}', {});
      const p = PROVIDERS[providerId || this._currentProvider];
      return models[providerId || this._currentProvider] || (p && p.defaultModel) || 'default';
    },

    setOllamaHost(host) {
      localStorage.setItem(CONFIG_KEYS.ollamaHost, host);
    },

    setEnabled(enabled) {
      this._status = enabled ? 'idle' : 'disabled';
      localStorage.setItem(CONFIG_KEYS.enabled, String(enabled));
    },

    getStatus() { return this._status; },
    getProvider() { return this._currentProvider; },

    // ---------- 状态监听 ----------
    onStatusChange(cb) {
      this._listeners.push(cb);
    },

    _notify(status, extra = {}) {
      this._status = status;
      this._listeners.forEach((cb) => cb(status, extra));
    },

    // ---------- 连接测试 ----------
    async testConnection(providerId) {
      const p = providerId || this._currentProvider;
      const model = this.getModel(p);
      const req = PROVIDERS[p]?.buildRequest(model, [
        { role: 'user', content: 'Hi' }
      ]);
      if (!req) throw new Error('不支持的 Provider: ' + p);

      try {
        if (p === 'ollama') {
          // Ollama 直接 GET 健康检测
          const base = PROVIDERS.ollama.apiBase();
          const r = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(5000) });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return { ok: true, message: `✅ Ollama 已连接，版本 OK` };
        }

        // 其余 Provider 用实际 API 调用测试
        const key = this.getAPIKey(p);
        if (PROVIDERS[p].requiresKey && !key) throw new Error('需要先填写 API Key');

        const headers = typeof req.headers === 'function' ? req.headers(key) : req.headers;
        const body = typeof req.body === 'function' ? req.body(model, [{ role: 'user', content: 'Hi' }]) : req.body;

        const r = await fetch(req.url(), {
          method: req.method,
          headers,
          body: JSON.stringify({ ...body, stream: false }),
          signal: AbortSignal.timeout(15000)
        });

        if (!r.ok) {
          const txt = await r.text().catch(() => '');
          throw new Error(`HTTP ${r.status}: ${txt.slice(0, 100)}`);
        }
        return { ok: true, message: `✅ ${PROVIDERS[p].name} 连接成功` };
      } catch (e) {
        return { ok: false, message: `❌ 连接失败: ${e.message}` };
      }
    },

    // ---------- 核心：发送消息 ----------
    async sendMessage(prompt, options = {}) {
      const { taskType = 'agent_chat', system = null, temperature = 0.7, maxTokens = 2048, onChunk } = options;

      if (this._status === 'disabled') {
        throw new Error('LLM 功能已禁用，请在设置中开启');
      }

      const provider = this._currentProvider;
      const model = this.getModel(provider);
      const p = PROVIDERS[provider];
      if (!p) throw new Error('无效的 Provider');

      // 检查 API Key
      if (p.requiresKey && !this.getAPIKey(provider)) {
        throw new Error(`${p.name} 需要配置 API Key，请先在设置中填写`);
      }

      this._notify('connecting', { provider, model });

      // 构建消息（使用高级提示词系统）
      let systemPrompt = '';
      let userContent = '';

      if (window.PromptManager) {
        // 使用高级提示词引擎
        try {
          const builtPrompt = PromptManager.buildPrompt(taskType, prompt);
          systemPrompt = '你是一位专业的短剧创作助手，擅长创作大纲、剧本和分镜脚本。';
          userContent = builtPrompt;
        } catch (e) {
          // 回退到简单模板
          const template = PROMPT_TEMPLATES[taskType];
          systemPrompt = system || (template ? template.system : '');
          userContent = typeof prompt === 'string' ? prompt : (template ? template.user(prompt) : JSON.stringify(prompt));
        }
      } else {
        // 回退到简单模板
        const template = PROMPT_TEMPLATES[taskType];
        systemPrompt = system || (template ? template.system : '');
        userContent = typeof prompt === 'string' ? prompt : (template ? template.user(prompt) : JSON.stringify(prompt));
      }

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ];

      try {
        const req = p.buildRequest(model, messages);

        const headers = typeof req.headers === 'function'
          ? req.headers(this.getAPIKey(provider))
          : req.headers;

        const rawBody = typeof req.body === 'function'
          ? req.body(model, messages)
          : req.body;

        const body = { ...rawBody, temperature, max_tokens: maxTokens, stream: true };

        this._notify('connecting', { provider, model });

        const response = await fetch(req.url(), {
          method: req.method,
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(60000)
        });

        if (!response.ok) {
          const errTxt = await response.text().catch(() => '');
          throw new Error(`API 错误 ${response.status}: ${errTxt.slice(0, 200)}`);
        }

        // 流式处理
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(Boolean);

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              let text = '';
              let parsed = null;

              // 通用 OpenAI 兼容格式 (Groq, OpenRouter, Cohere, HF)
              try {
                parsed = JSON.parse(data);
                text = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.text || '';
              } catch {}

              // Gemini 格式
              if (!text && data.startsWith('{')) {
                try {
                  parsed = JSON.parse(data);
                  text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                } catch {}
              }

              if (text) {
                fullText += text;
                if (onChunk) onChunk(text, fullText);
              }
            } catch { /* 跳过无效行 */ }
          }
        }

        this._notify('connected', { provider, model });
        return fullText;

      } catch (err) {
        this._notify('error', { provider, error: err.message });

        // 自动降级到免费 provider
        if (localStorage.getItem(CONFIG_KEYS.autoFallback) !== 'false') {
          const fallback = this._findFallbackProvider(provider);
          if (fallback && fallback !== provider) {
            console.log(`🔄 自动降级到 ${fallback}`);
            this._currentProvider = fallback;
            localStorage.setItem(CONFIG_KEYS.activeProvider, fallback);
            return this.sendMessage(prompt, options); // 递归重试
          }
        }

        throw err;
      }
    },

    // ---------- 自动发现可用 Provider ----------
    async discoverProviders() {
      const results = [];
      for (const id of ['ollama', 'groq', 'openrouter', 'gemini', 'cohere', 'doubao', 'qwen', 'deepseek', 'custom']) {
        const p = PROVIDERS[id];
        if (p.requiresKey && !this.getAPIKey(id)) {
          results.push({ id, status: 'no_key', name: p.name });
          continue;
        }
        const r = await this.testConnection(id);
        results.push({ id, status: r.ok ? 'ok' : 'error', message: r.message, name: p.name });
      }
      return results;
    },

    // ---------- 降级查找 ----------
    _findFallbackProvider(skip) {
      const order = ['ollama', 'groq', 'openrouter', 'gemini', 'doubao', 'qwen', 'deepseek', 'custom'];
      for (const id of order) {
        if (id === skip) continue;
        const p = PROVIDERS[id];
        if (!p.requiresKey || this.getAPIKey(id)) return id;
      }
      return null;
    },

    // ---------- 快速生成方法 ----------
    async generateOutline(brief) {
      return this.sendMessage(brief, { taskType: 'outline' });
    },

    async generateScript(outline) {
      return this.sendMessage(outline, { taskType: 'script' });
    },

    async generateCharacters(outline) {
      return this.sendMessage(outline, { taskType: 'character' });
    },

    async generateScenes(outline) {
      return this.sendMessage(outline, { taskType: 'scene' });
    },

    async generateStoryboard(outline, script) {
      return this.sendMessage({ outline, script }, { taskType: 'storyboard' });
    },

    async chat(question, context) {
      return this.sendMessage(question, { taskType: 'agent_chat', system: null });
    },

    // ---------- 获取 Provider 信息 ----------
    getProviderInfo(id) {
      return PROVIDERS[id] || null;
    },

    getAllProviders() {
      return Object.entries(PROVIDERS).map(([id, p]) => ({
        id,
        name: p.name,
        icon: p.icon,
        free: p.free,
        requiresKey: p.requiresKey,
        hasKey: !!this.getAPIKey(id),
        defaultModel: p.defaultModel,
        selectedModel: this.getModel(id),
        docs: p.docs
      }));
    }
  };

  // ==================== 辅助函数 ====================
  function safeJSON(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
  }

  // ==================== LLM 设置面板 ====================
  LLMManager.showSettings = function () {
    const existing = document.getElementById('llm-settings-modal');
    if (existing) { existing.remove(); return; }

    const config = LLMManager.getConfig();
    const providers = LLMManager.getAllProviders();
    const active = config.activeProvider;

    const modal = document.createElement('div');
    modal.id = 'llm-settings-modal';
    modal.className = 'modal-overlay';

    // 按优先级排序：免 Key 免费 > 已配置 Key > 未配置 Key
    const sortedProviders = [...providers].sort((a, b) => {
      const aNoKey = !a.requiresKey ? 0 : (a.hasKey ? 1 : 2);
      const bNoKey = !b.requiresKey ? 0 : (b.hasKey ? 1 : 2);
      return aNoKey - bNoKey;
    });

    const providerCards = sortedProviders.map(p => {
      const isActive = p.id === active;
      const noKey = !p.requiresKey;
      const hasKey = p.hasKey;
      const isRecommended = noKey || (p.id === 'groq');
      const borderColor = isActive ? (p.docs[0]?.color || '#6366f1') : (isRecommended ? '#10b981' : 'var(--border)');
      const bgColor = isActive ? 'rgba(16,185,129,0.1)' : (isRecommended ? 'rgba(16,185,129,0.04)' : 'transparent');
      return `
        <div class="llm-provider-card ${isActive ? 'active' : ''} ${isRecommended ? 'recommended' : ''}" data-provider="${p.id}"
             style="border: 2px solid ${borderColor}; background: ${bgColor};">
          <div class="llm-provider-header">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:22px;">${p.icon}</span>
              <div>
                <div style="font-weight:bold;font-size:14px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                  ${p.name}
                  ${p.free ? '<span style="background:#10b981;color:white;font-size:10px;padding:1px 6px;border-radius:8px;">免费</span>' : ''}
                  ${noKey ? '<span style="background:#6366f1;color:white;font-size:10px;padding:1px 6px;border-radius:8px;">免 Key</span>' : ''}
                  ${isRecommended ? '<span style="background:#f59e0b;color:white;font-size:10px;padding:1px 6px;border-radius:8px;">推荐</span>' : ''}
                </div>
                <div style="font-size:11px;color:var(--text-dim);margin-top:2px;">${PROVIDERS[p.id].description}</div>
              </div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              ${hasKey && !noKey ? '<span style="background:#3b82f6;color:white;font-size:11px;padding:2px 8px;border-radius:10px;">已配置</span>' : ''}
              <button class="llm-select-btn" data-provider="${p.id}" style="${isActive ? 'background:#10b981;opacity:0.8;' : ''}">
                ${isActive ? '✓ 使用中' : '选用'}
              </button>
            </div>
          </div>
          ${noKey ? `
            <div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);border-radius:8px;padding:10px;margin-top:8px;">
              <div style="font-size:12px;color:#10b981;font-weight:bold;margin-bottom:4px;">🎉 完全免费 · 无需注册账号 · 无需 API Key</div>
              <div style="font-size:11px;color:var(--text-dim);">${p.id === 'ollama' ? '在电脑上安装 Ollama 后即可使用' : '直接连接，无需任何配置'}</div>
              ${p.id === 'ollama' ? `
                <div style="margin-top:8px;">
                  <a href="https://ollama.com" target="_blank" style="display:inline-block;padding:5px 14px;background:#10b981;color:white;text-decoration:none;border-radius:6px;font-size:12px;font-weight:bold;margin-right:6px;">
                    📥 下载 Ollama（免费）
                  </a>
                  <span style="font-size:11px;color:var(--text-dim);">安装后运行 <code style="background:#334155;padding:1px 5px;border-radius:4px;">ollama run llama3.3</code></span>
                </div>
              ` : ''}
              <button class="llm-test-btn" data-provider="${p.id}" style="margin-top:8px;padding:6px 14px;background:#059669;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">
                🔍 测试连接
              </button>
            </div>
          ` : ''}
          <div style="margin-top:10px;margin-bottom:6px;">
            <div style="font-size:12px;color:var(--text-dim);margin-bottom:6px;">可用模型：</div>
            <select class="llm-model-select" data-provider="${p.id}" style="width:100%;padding:6px 8px;background:var(--bg-dark);border:1px solid var(--border);color:var(--text);border-radius:6px;font-size:12px;">
              ${(PROVIDERS[p.id].docs || []).map(m => `<option value="${m.model}" ${p.selectedModel === m.model ? 'selected' : ''}>${m.label} — ${m.desc}</option>`).join('')}
            </select>
          </div>
          ${p.requiresKey ? `
            <div>
              ${['doubao', 'qwen', 'deepseek', 'custom'].includes(p.id) ? `
                <input type="text" class="llm-api-host-input" data-provider="${p.id}"
                       placeholder="API 地址（如 http://localhost:8000/v1）"
                       value="${localStorage.getItem('llm_' + p.id + '_host') || ''}"
                       style="width:100%;padding:7px 10px;background:var(--bg-dark);border:1px solid var(--border);color:var(--text);border-radius:6px;font-size:12px;margin-bottom:6px;">
                <button class="llm-save-host-btn" data-provider="${p.id}"
                        style="padding:5px 12px;background:#059669;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">
                  保存地址
                </button>
              ` : ''}
              <input type="password" class="llm-api-key-input" data-provider="${p.id}"
                     placeholder="输入 ${p.name} API Key"
                     value="${p.hasKey ? '••••••••' : ''}"
                     style="width:100%;padding:7px 10px;background:var(--bg-dark);border:1px solid var(--border);color:var(--text);border-radius:6px;font-size:12px;margin-bottom:6px;">
              <button class="llm-save-key-btn" data-provider="${p.id}"
                      style="padding:5px 12px;background:#6366f1;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">
                保存 Key
              </button>
              <button class="llm-test-btn" data-provider="${p.id}"
                      style="padding:5px 12px;background:#334155;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;margin-left:6px;">
                测试连接
              </button>
            </div>
          ` : `
            <div>
              <button class="llm-test-btn" data-provider="${p.id}"
                      style="padding:5px 12px;background:#334155;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">
                🔍 测试连接
              </button>
            </div>
          `}
          <div class="llm-test-result" data-provider="${p.id}" style="font-size:12px;margin-top:6px;min-height:18px;"></div>
        </div>
      `;
    }).join('');

    modal.innerHTML = `
      <div class="modal-content llm-modal" style="max-width:720px;width:95%;max-height:88vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div>
            <h2 style="margin:0;color:var(--text);display:flex;align-items:center;gap:8px;">
              🤖 AI 大模型设置
              <span style="font-size:12px;font-weight:normal;color:var(--text-dim);background:var(--bg-dark);padding:2px 10px;border-radius:10px;">免费优先</span>
            </h2>
            <div style="font-size:12px;color:var(--text-dim);margin-top:4px;">已按免费程度自动排序，Ollama 无需注册即可使用</div>
          </div>
          <button id="llm-close-btn" style="background:none;border:none;color:var(--text-dim);font-size:20px;cursor:pointer;">✕</button>
        </div>

        <!-- 快速开始引导（置顶） -->
        <div style="background:linear-gradient(135deg, #059669, #10b981);padding:16px;border-radius:12px;margin-bottom:20px;box-shadow:0 4px 16px rgba(16,185,129,0.2);">
          <div style="font-weight:bold;font-size:15px;color:white;margin-bottom:10px;">🚀 完全免费 · 无需注册</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.9);line-height:1.7;">
            <div style="margin-bottom:6px;">🏠 <strong>Ollama（本地）</strong>：在电脑上安装后即可使用，完全免费，最快</div>
            <div style="margin-bottom:6px;">⚡ <strong>Groq</strong>：注册 groq.com 获取免费 Key，无需信用卡</div>
            <div style="margin-bottom:6px;">🌐 <strong>OpenRouter</strong>：聚合多个免费模型（Claude/Qwen 等）</div>
          </div>
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
            <a href="https://ollama.com" target="_blank" style="padding:8px 16px;background:white;color:#059669;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">
              📥 下载 Ollama（免费）
            </a>
            <a href="https://groq.com" target="_blank" style="padding:8px 16px;background:rgba(255,255,255,0.2);color:white;text-decoration:none;border-radius:8px;font-size:13px;border:1px solid rgba(255,255,255,0.3);">
              ⚡ 获取 Groq 免费 Key
            </a>
            <button id="llm-auto-config-btn" style="padding:8px 16px;background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:8px;font-size:13px;cursor:pointer;">
              🔍 自动检测可用模型
            </button>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:13px;color:var(--text);">
            当前：<strong>${PROVIDERS[active]?.name || '未选择'}</strong>
            · 模型：<strong>${LLMManager.getModel(active)}</strong>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-dim);">
              <input type="checkbox" id="llm-enabled-cb" ${config.enabled ? 'checked' : ''}>
              启用 LLM
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-dim);">
              <input type="checkbox" id="llm-fallback-cb" ${config.enabled ? 'checked' : ''}>
              故障自动切换
            </label>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-bottom:20px;">
          ${providerCards}
        </div>

        <!-- 使用建议 -->
        <div style="background:var(--bg-dark);padding:14px;border-radius:10px;margin-bottom:16px;">
          <div style="font-weight:bold;font-size:13px;margin-bottom:8px;">💡 配置提示</div>
          <div style="font-size:12px;color:var(--text-dim);line-height:1.7;">
            <div>• API Key 仅保存在你的浏览器 localStorage，不会上传到任何服务器</div>
            <div style="margin-top:4px;">• 豆包/千问/DeepSeek 支持本地部署：填入 Ollama 或 vLLM 等服务的地址即可</div>
            <div style="margin-top:4px;">• 开启"故障自动切换"后，主 Provider 不可用时自动尝试其他服务</div>
          </div>
        </div>

        <!-- 常见问题 -->
        <div style="background:#fef3c7;padding:14px;border-radius:10px;border-left:4px solid #f59e0b;">
          <div style="font-weight:bold;font-size:13px;color:#92400e;margin-bottom:8px;">❓ 常见问题</div>
          <div style="font-size:12px;color:#b45309;line-height:1.6;">
            <div><strong>Q: 手机上的豆包/千问 app 可以用吗？</strong></div>
            <div style="margin-top:2px;margin-left:12px;">A: 不可以。手机 app 是封闭应用，不提供 API 接口。需使用官方云 API 或本地部署服务。</div>
            <div style="margin-top:6px;"><strong>Q: 哪些完全免费且无需注册？</strong></div>
            <div style="margin-top:2px;margin-left:12px;">A: 本地部署的模型（Ollama/vLLM 等）完全免费无限制。云服务需要注册获取免费额度。</div>
            <div style="margin-top:6px;"><strong>Q: API Key 安全吗？</strong></div>
            <div style="margin-top:2px;margin-left:12px;">A: 完全安全。Key 仅存在你的浏览器中，不会经过任何第三方服务器。</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // ---- 事件绑定 ----
    document.getElementById('llm-close-btn').onclick = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    document.getElementById('llm-enabled-cb').onchange = (e) => {
      LLMManager.setEnabled(e.target.checked);
      document.getElementById('llm-fallback-cb').disabled = !e.target.checked;
    };
    document.getElementById('llm-fallback-cb').onchange = (e) => {
      localStorage.setItem(CONFIG_KEYS.autoFallback, String(e.target.checked));
    };

    // 自动检测可用模型
    document.getElementById('llm-auto-config-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('llm-auto-config-btn');
      btn.textContent = '🔍 检测中...';
      btn.disabled = true;
      
      const results = await LLMManager.discoverProviders();
      const available = results.filter(r => r.status === 'ok');
      
      if (available.length > 0) {
        // 优先选择第一个可用的
        const firstAvailable = available[0];
        LLMManager.setActiveProvider(firstAvailable.id);
        showToast(`✅ 发现可用模型: ${firstAvailable.name}，已自动配置`, 'success');
        modal.remove();
        LLMManager.showSettings();
      } else {
        showToast('⚠️ 未发现可用模型，请手动配置', 'warning');
      }
      
      btn.textContent = '🔍 自动检测可用模型';
      btn.disabled = false;
    });

    // 选用 Provider
    modal.querySelectorAll('.llm-select-btn').forEach(btn => {
      btn.onclick = () => {
        const pid = btn.dataset.provider;
        LLMManager.setActiveProvider(pid);
        modal.remove();
        LLMManager.showSettings();
      };
    });

    // 模型切换
    modal.querySelectorAll('.llm-model-select').forEach(sel => {
      sel.onchange = () => {
        LLMManager.setModel(sel.dataset.provider, sel.value);
      };
    });

    // 保存 API Key
    modal.querySelectorAll('.llm-save-key-btn').forEach(btn => {
      btn.onclick = () => {
        const pid = btn.dataset.provider;
        const input = modal.querySelector(`.llm-api-key-input[data-provider="${pid}"]`);
        const key = input.value.trim();
        if (!key || key === '••••••••') {
          showToast('请输入有效的 API Key', 'warning');
          return;
        }
        LLMManager.setAPIKey(pid, key);
        showToast('✅ API Key 已保存', 'success');
      };
    });

    // 保存 API 地址（用于本地部署的模型）
    modal.querySelectorAll('.llm-save-host-btn').forEach(btn => {
      btn.onclick = () => {
        const pid = btn.dataset.provider;
        const input = modal.querySelector(`.llm-api-host-input[data-provider="${pid}"]`);
        const host = input.value.trim();
        if (!host) {
          showToast('请输入 API 地址', 'warning');
          return;
        }
        localStorage.setItem('llm_' + pid + '_host', host);
        showToast('✅ API 地址已保存', 'success');
      };
    });

    // 测试连接
    modal.querySelectorAll('.llm-test-btn').forEach(btn => {
      btn.onclick = async () => {
        const pid = btn.dataset.provider;
        const result = modal.querySelector(`.llm-test-result[data-provider="${pid}"]`);
        result.textContent = '⏳ 连接中...';
        result.style.color = 'var(--text-dim)';
        const r = await LLMManager.testConnection(pid);
        result.textContent = r.message;
        result.style.color = r.ok ? '#10b981' : '#f87171';
      };
    });
  };

  // ==================== 流式输出到元素 ====================
  LLMManager.streamToElement = async function (element, prompt, options = {}) {
    const { placeholder = 'AI 正在思考...', taskType = 'agent_chat' } = options;
    element.value = placeholder;
    element.disabled = true;

    try {
      const full = await LLMManager.sendMessage(prompt, {
        taskType,
        onChunk: (chunk, full) => {
          element.value = full;
          element.dispatchEvent(new Event('input'));
        }
      });
      element.value = full;
      element.disabled = false;
      element.dispatchEvent(new Event('input'));
      return full;
    } catch (err) {
      console.error('LLM 错误:', err);
      element.value = `❌ 生成失败: ${err.message}\n\n💡 提示：请检查 AI 设置，确保已配置有效的 API Key`;
      element.disabled = false;
      element.dispatchEvent(new Event('input'));
      showToast('LLM 生成失败: ' + err.message, 'error');
      return null;
    }
  };

  // ==================== 全局导出 ====================
  window.LLMManager = LLMManager;

  // 初始化
  LLMManager.init();

  console.log('🤖 LLM 连接器模块已加载 — 免费 Provider: Ollama / Groq / OpenRouter / Gemini');
})();
