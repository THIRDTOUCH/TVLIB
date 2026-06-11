/**
 * AI短剧创作工作台 — 智能 Agent 助手系统
 * 功能：智能对话 · 语义搜索 · 快捷操作代理 · 修改建议 · 上下文感知
 *
 * 设计原则：
 *  1) 纯离线，零外部依赖 — 基于关键词+意图分类，无需联网
 *  2) 非侵入式 — 所有动作都经用户点击确认才执行
 *  3) 上下文感知 — 能识别当前所在标签页 / 当前项目 / 当前编辑的内容
 *  4) 可扩展 — 新增指令只需在 AgentCommands 注册
 */

(function () {
  'use strict';

  // ==================== 意图识别词典（离线语义分类器） ====================
  const INTENT_PATTERNS = {
    project_create: {
      label: '新建项目',
      icon: '✨',
      keywords: ['新建项目', '创建项目', '新剧本', '开新项目', '开始一个', '做一个新项目'],
      handler: (ctx) => ActionHandlers.createProject(ctx)
    },
    project_search: {
      label: '搜索项目',
      icon: '🔎',
      keywords: ['搜索', '查找', '找', '有没有', '搜索项目', '查找项目', '包含', '关键词'],
      handler: (ctx, query) => ActionHandlers.searchAll(ctx, query)
    },
    project_list: {
      label: '列出项目',
      icon: '📋',
      keywords: ['有哪些项目', '列出项目', '我的项目', '全部项目', '查看项目', '项目列表'],
      handler: (ctx) => ActionHandlers.listProjects(ctx)
    },
    outline_generate: {
      label: '生成大纲',
      icon: '🧭',
      keywords: ['生成大纲', '做大纲', '写大纲', '剧本大纲', '故事大纲', '大纲生成', '创建大纲'],
      handler: (ctx) => ActionHandlers.generateOutline(ctx)
    },
    outline_guide: {
      label: 'AI引导大纲',
      icon: '🎯',
      keywords: ['AI引导', '帮我设计大纲', '引导大纲', 'AI助手填', '我想创作', '我要创作', '我想写', '我要写'],
      handler: (ctx) => ActionHandlers.outlineGuide(ctx)
    },
    script_generate: {
      label: '生成剧本',
      icon: '📖',
      keywords: ['生成剧本', '写剧本', '剧本文本', '正片剧本', '剧本内容', '写正文'],
      handler: (ctx) => ActionHandlers.generateScript(ctx)
    },
    storyboard_add: {
      label: '添加分镜',
      icon: '🎬',
      keywords: ['加个分镜', '添加分镜', '新分镜', '增加分镜', '做一个镜头', '分镜生成'],
      handler: (ctx) => ActionHandlers.addStoryboard(ctx)
    },
    beat_manage: {
      label: '节拍表',
      icon: '🥁',
      keywords: ['节拍', '节拍表', '节奏', '救猫咪', '三段式', '四幕'],
      handler: (ctx) => ActionHandlers.openBeatSheet(ctx)
    },
    character_manage: {
      label: '角色库',
      icon: '🧑‍🎤',
      keywords: ['角色', '人物', '人物设定', '角色库', '加个角色', '角色设定'],
      handler: (ctx) => ActionHandlers.openCharacterLib(ctx)
    },
    scene_manage: {
      label: '场景库',
      icon: '🏞️',
      keywords: ['场景', '场景库', '地点', '布景', '加个场景'],
      handler: (ctx) => ActionHandlers.openSceneLib(ctx)
    },
    material_search: {
      label: '素材检索',
      icon: '📚',
      keywords: ['素材', '模板', '参考', '案例', '素材库', '模板库'],
      handler: (ctx, query) => ActionHandlers.searchMaterials(ctx, query)
    },
    data_backup: {
      label: '备份/导出',
      icon: '💾',
      keywords: ['备份', '导出', '保存数据', '下载数据', '存一份', '存档'],
      handler: (ctx) => ActionHandlers.exportData(ctx)
    },
    data_restore: {
      label: '恢复/导入',
      icon: '♻️',
      keywords: ['恢复', '还原', '导入', '导入数据', '恢复备份'],
      handler: (ctx) => ActionHandlers.restoreData(ctx)
    },
    version_check: {
      label: '检查更新',
      icon: '🔄',
      keywords: ['更新', '新版本', '升级', '检查更新', '版本管理'],
      handler: (ctx) => ActionHandlers.checkUpdate(ctx)
    },
    free_ai_guide: {
      label: '免费AI指南',
      icon: '🤖',
      keywords: ['免费', '免费使用AI', '如何免费', '怎么免费', 'AI设置', '配置AI', 'ollama', 'groq', '注册AI'],
      handler: (ctx) => ActionHandlers.showFreeAIGuide(ctx)
    },
    setting_dark: {
      label: '切换主题',
      icon: '🌓',
      keywords: ['换主题', '深色', '浅色', '亮一点', '暗一点', '切换主题'],
      handler: (ctx) => ActionHandlers.toggleTheme(ctx)
    },
    help_tutorial: {
      label: '使用教程',
      icon: '📘',
      keywords: ['怎么用', '使用方法', '教程', '帮助', 'guide', 'help', '说明', '介绍', '你能做什么'],
      handler: (ctx) => ActionHandlers.showHelp(ctx)
    },
    ai_suggest: {
      label: 'LLM 内容增强',
      icon: '💡',
      keywords: ['建议', '优化', '怎么改', '帮我改', '点评', '评价', '分析', '看看写得'],
      handler: (ctx, query) => ActionHandlers.llmEnhance(ctx, query)
    },
    goto_tab: {
      label: '切换页面',
      icon: '📑',
      keywords: ['去', '打开', '切换到', '跳到', '进入', '回到', '首页'],
      handler: (ctx, query) => ActionHandlers.gotoTab(ctx, query)
    },
    clear_memory: {
      label: '清空对话',
      icon: '🧹',
      keywords: ['清空', '清空对话', '清除', '重新开始', 'clear'],
      handler: (ctx) => ActionHandlers.clearChat(ctx)
    }
  };

  // 常见同义词归一化（扩大离线语义覆盖）
  const SYNONYM_MAP = {
    'ai短剧': '短剧', '短视频': '短剧', '微短剧': '短剧',
    '分镜脚本': '分镜', '镜头': '分镜',
    '大纲': '大纲', '梗概': '大纲', '简介': '大纲',
    '主角': '角色', '配角': '角色', '人物': '角色'
  };

  // 标签页名称到 DOM data-tab 的映射
  const TAB_NAME_MAP = {
    '首页': 'home', '主页': 'home', '概览': 'home',
    '大纲': 'outline', '剧本大纲': 'outline', '故事大纲': 'outline',
    '剧本': 'script', '正文': 'script', '剧本文本': 'script',
    '分镜': 'storyboard', '分镜脚本': 'storyboard', '镜头': 'storyboard',
    '角色': 'character', '角色库': 'character', '人物': 'character',
    '场景': 'scene', '场景库': 'scene', '地点': 'scene',
    '节拍': 'beat', '节拍表': 'beat', '节奏': 'beat',
    '素材': 'material', '素材库': 'material', '模板': 'material',
    '项目': 'project', '项目管理': 'project'
  };

  // ==================== 上下文收集 ====================
  function collectContext() {
    const projects = safeJSON(localStorage.getItem('projects') || '[]', []);
    const currentId = localStorage.getItem('currentProjectId');
    const currentProject = projects.find((p) => String(p.id) === String(currentId)) || projects[0] || null;
    // 查找当前激活的 tab
    const activeTab = document.querySelector('.tab-btn.active') || document.querySelector('[data-tab].active');
    const tabName = activeTab ? activeTab.getAttribute('data-tab') || activeTab.textContent.trim() : '';
    return {
      projects,
      currentProject,
      activeTab: tabName,
      timestamp: new Date()
    };
  }

  function safeJSON(str, fallback) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return fallback;
    }
  }

  // ==================== 意图匹配引擎 ====================
  function matchIntent(input) {
    const text = String(input || '').toLowerCase();
    if (!text.trim()) return null;

    // 归一化同义词
    let normalized = text;
    Object.keys(SYNONYM_MAP).forEach((k) => {
      if (normalized.includes(k)) normalized = normalized.split(k).join(SYNONYM_MAP[k]);
    });

    // 评分：关键词命中次数 + 位置加权
    let bestMatch = null;
    let bestScore = 0;
    Object.keys(INTENT_PATTERNS).forEach((key) => {
      const p = INTENT_PATTERNS[key];
      let score = 0;
      p.keywords.forEach((kw) => {
        const idx = normalized.indexOf(kw);
        if (idx !== -1) score += kw.length + (idx === 0 ? 2 : 1); // 开头出现加分
      });
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { key, pattern: p };
      }
    });

    // 阈值判断
    if (bestScore >= 2) return bestMatch;

    // 低置信度：作为搜索/通用建议
    return { key: 'fallback_search', pattern: { label: '搜索内容', icon: '🔎', handler: (ctx, q) => ActionHandlers.searchAll(ctx, q) } };
  }

  // ==================== 操作处理器（可一键应用） ====================
  const ActionHandlers = {
    createProject() {
      return {
        title: '✨ 新建一个短剧项目',
        body: '点击下方按钮即可快速创建一个新的短剧项目，之后我会陪你一起生成大纲与分镜。',
        buttons: [
          {
            label: '🚀 立即新建项目',
            primary: true,
            action: () => {
              // 尝试触发项目管理器的新建流程（如果存在），否则手动创建
              if (typeof window.openProjectModal === 'function') {
                window.openProjectModal();
              } else if (typeof window.PM !== 'undefined' && typeof window.PM.openCreateModal === 'function') {
                window.PM.openCreateModal();
              } else {
                // 兜底：直接建一个项目
                const id = 'p_' + Date.now();
                const projects = safeJSON(localStorage.getItem('projects') || '[]', []);
                projects.unshift({
                  id,
                  name: '新项目 ' + new Date().toLocaleDateString(),
                  outline: '',
                  script: '',
                  storyboard: [],
                  characters: [],
                  scenes: [],
                  beats: [],
                  metadata: { createdAt: new Date().toISOString(), createdVersion: (window.UpdateManager && UpdateManager.currentVersion) || '3.1.0' },
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                });
                localStorage.setItem('projects', JSON.stringify(projects));
                localStorage.setItem('currentProjectId', id);
                showToast('✨ 新项目已创建', 'success');
                setTimeout(() => location.reload(), 600);
              }
            }
          }
        ]
      };
    },

    listProjects(ctx) {
      const ps = ctx.projects || [];
      if (!ps.length) {
        return { title: '📋 项目列表', body: '目前还没有项目，点击下方按钮创建第一个吧。', buttons: [{ label: '✨ 新建项目', primary: true, action: () => ActionHandlers.createProject().buttons[0].action() }] };
      }
      const items = ps.slice(0, 8).map((p) => {
        const at = p.updatedAt || p.createdAt || '-';
        const date = new Date(at).toLocaleDateString();
        return `<li style="padding:6px 0;border-bottom:1px dashed var(--border);">
            <strong>${escapeHtml(p.name || '未命名')}</strong>
            <span style="color:var(--text-dim);font-size:12px;"> · ${date}${p.metadata && p.metadata.createdVersion ? ' · v' + p.metadata.createdVersion : ''}</span>
            <div style="color:var(--text-dim);font-size:12px;margin-top:2px;">${(p.outline || '暂无大纲').slice(0, 60)}${(p.outline || '').length > 60 ? '...' : ''}</div>
        </li>`;
      }).join('');
      return {
        title: `📋 共 ${ps.length} 个项目（最近 8 个）`,
        body: `<ul style="margin:0;padding-left:18px;">${items}</ul>`,
        buttons: []
      };
    },

    searchAll(ctx, rawQuery) {
      const query = String(rawQuery || '').trim();
      if (!query) return { title: '🔎 搜索', body: '请告诉我要搜索的关键词，例如："科幻"、"母亲"、"夜场"。', buttons: [] };

      const results = [];
      (ctx.projects || []).forEach((p) => {
        const hit = [];
        const haystack = [
          ['项目名', p.name],
          ['大纲', p.outline],
          ['剧本', p.script],
          ['角色', (p.characters || []).map((c) => c.name + ' ' + (c.description || '')).join(' | ')],
          ['场景', (p.scenes || []).map((s) => s.name + ' ' + (s.description || '')).join(' | ')],
          ['分镜', (p.storyboard || []).map((sb) => sb.sceneType + ' ' + (sb.description || '')).join(' | ')]
        ];
        haystack.forEach(([field, text]) => {
          if (text && text.indexOf(query) !== -1) hit.push({ field, snippet: extractSnippet(text, query) });
        });
        if (hit.length) results.push({ project: p, hits: hit });
      });

      if (!results.length) {
        return {
          title: `🔎 没有找到与 "${escapeHtml(query)}" 相关的内容`,
          body: '你可以：<br>· 试试更宽泛的关键词<br>· 先创建一个新项目<br>· 到素材库/角色库补充数据',
          buttons: [{ label: '✨ 新建项目', action: () => ActionHandlers.createProject().buttons[0].action() }]
        };
      }

      const body = results.slice(0, 6).map((r) => {
        const hits = r.hits.map((h) => `<span style="display:inline-block;background:var(--bg-dark);padding:2px 8px;border-radius:4px;margin:2px;font-size:12px;color:var(--text-dim);">${h.field}: ${escapeHtml(h.snippet)}</span>`).join('');
        return `<div style="padding:10px;background:var(--bg-dark);border-radius:8px;margin-bottom:8px;">
          <div style="font-weight:bold;margin-bottom:4px;">📌 ${escapeHtml(r.project.name || '未命名')}</div>
          <div>${hits}</div>
        </div>`;
      }).join('');

      return {
        title: `🔎 找到 ${results.length} 个相关项目`,
        body,
        buttons: []
      };
    },

    searchMaterials(ctx, query) {
      // 如果素材系统已注册，使用它；否则给出本地角色/场景搜索
      if (window.SyncSystem && typeof window.SyncSystem.getMaterialLibrary === 'function') {
        const lib = SyncSystem.getMaterialLibrary();
        if (lib && typeof lib.search === 'function') {
          const res = lib.search(query);
          return { title: `📚 素材搜索："${escapeHtml(query)}"`, body: `<div>共 ${res.length} 条结果（在素材库中查看）</div>`, buttons: [] };
        }
      }
      // 降级：在当前项目的角色/场景中搜索
      const p = ctx.currentProject;
      if (!p) return { title: '📚 素材搜索', body: '请先选择一个项目，我可以帮你在角色/场景中搜索。', buttons: [] };
      const kw = (query || '').trim();
      const chars = (p.characters || []).filter((c) => (c.name + (c.description || '')).includes(kw));
      const scenes = (p.scenes || []).filter((s) => (s.name + (s.description || '')).includes(kw));
      return {
        title: `📚 在 "${escapeHtml(p.name)}" 中搜索 "${escapeHtml(kw)}"`,
        body: `<div>角色：${chars.length} 条 · 场景：${scenes.length} 条</div>
        <div style="margin-top:6px;color:var(--text-dim);font-size:13px;">${chars.map((c) => '🧑‍🎤 ' + escapeHtml(c.name)).join(' &nbsp; ') || ''}</div>
        <div style="margin-top:4px;color:var(--text-dim);font-size:13px;">${scenes.map((s) => '🏞️ ' + escapeHtml(s.name)).join(' &nbsp; ') || ''}</div>`,
        buttons: []
      };
    },

    generateOutline(ctx) {
      const p = ctx.currentProject;
      if (!p) return { title: '🧭 生成大纲', body: '请先选择或创建一个项目。', buttons: [{ label: '✨ 新建项目', primary: true, action: () => ActionHandlers.createProject().buttons[0].action() }] };
      return {
        title: '🧭 为《' + escapeHtml(p.name) + '》生成大纲',
        body: '大纲是短剧的骨架：<br>· 30 秒钩子（开场吸引）<br>· 人物关系与冲突<br>· 1-3 个关键反转<br>· 结尾情感落点<br><br>下方按钮会跳转到大纲页，点击"AI 生成"即可填充。',
        buttons: [
          { label: '📑 跳转到大纲页', primary: true, action: () => switchTab('outline') },
          { label: '🔎 去素材库找模板', action: () => switchTab('material') }
        ]
      };
    },

    generateScript(ctx) {
      const p = ctx.currentProject;
      if (!p) return { title: '📖 生成剧本', body: '请先选择或创建一个项目。', buttons: [{ label: '✨ 新建项目', primary: true, action: () => ActionHandlers.createProject().buttons[0].action() }] };
      return {
        title: '📖 为《' + escapeHtml(p.name) + '》生成剧本文本',
        body: '剧本在大纲之后创作，建议顺序：<br>1️⃣ 先完善大纲<br>2️⃣ 再用"AI 生成剧本"<br><br>点击下方跳转到剧本页即可开始。',
        buttons: [{ label: '📑 跳转到剧本页', primary: true, action: () => switchTab('script') }]
      };
    },

    addStoryboard(ctx) {
      const p = ctx.currentProject;
      if (!p) return { title: '🎬 添加分镜', body: '请先选择一个项目。', buttons: [{ label: '✨ 新建项目', primary: true, action: () => ActionHandlers.createProject().buttons[0].action() }] };
      return {
        title: '🎬 为《' + escapeHtml(p.name) + '》添加分镜',
        body: '分镜包含：镜别、场景、人物、运镜、AI 图像提示词。<br>建议每 30 秒 3-5 个镜头。',
        buttons: [{ label: '🎬 跳转到分镜页', primary: true, action: () => switchTab('storyboard') }]
      };
    },

    openBeatSheet() {
      return { title: '🥁 节拍表/节奏设计', body: '节拍表用于规划故事节奏：救猫咪 15 节拍 / 三段式 / 四幕 结构。', buttons: [{ label: '🥁 打开节拍表', primary: true, action: () => switchTab('beat') }] };
    },

    openCharacterLib() {
      return { title: '🧑‍🎤 角色库', body: '角色库帮助你沉淀可复用的主角、配角、反派人设。', buttons: [{ label: '🧑‍🎤 打开角色库', primary: true, action: () => switchTab('character') }] };
    },

    openSceneLib() {
      return { title: '🏞️ 场景库', body: '场景库帮助你沉淀可复用的场景设定（时间、地点、氛围、光线）。', buttons: [{ label: '🏞️ 打开场景库', primary: true, action: () => switchTab('scene') }] };
    },

    exportData() {
      return {
        title: '💾 导出全部数据',
        body: '导出当前所有项目/设置/备份为一份 JSON 文件，可用于迁移或备份。',
        buttons: [
          { label: '📦 导出完整数据', primary: true, action: () => { if (window.UpdateManager && UpdateManager.exportFullData) UpdateManager.exportFullData(); else window.exportAllData && window.exportAllData(); } },
          { label: '📋 查看版本面板', action: () => { if (window.UpdateManager && UpdateManager.showVersionPanel) UpdateManager.showVersionPanel(); } }
        ]
      };
    },

    restoreData() {
      return {
        title: '♻️ 恢复数据',
        body: '导入之前的 JSON 文件（会先自动备份当前数据）。',
        buttons: [{ label: '📂 进入版本/备份面板', primary: true, action: () => { if (window.UpdateManager && UpdateManager.showVersionPanel) UpdateManager.showVersionPanel(); } }]
      };
    },

    checkUpdate() {
      return {
        title: '🔄 检查更新',
        body: '当前版本：' + (window.UpdateManager && UpdateManager.currentVersion || '3.1.0') + '<br>点击下方触发更新检测。',
        buttons: [{ label: '🔍 立即检查更新', primary: true, action: () => { if (window.UpdateManager && UpdateManager.checkForUpdates) UpdateManager.checkForUpdates(); } }]
      };
    },

    showFreeAIGuide() {
      return {
        title: '🤖 免费使用 AI 大模型指南',
        body:
          '<div style="margin-bottom:14px;">以下是三种免费使用 AI 的方式，按推荐程度排序：</div>' +

          '<div style="background:rgba(16,185,129,0.08);border:2px solid rgba(16,185,129,0.3);border-radius:10px;padding:14px;margin-bottom:12px;">' +
          '<div style="font-weight:bold;color:#10b981;margin-bottom:6px;">🏠 推荐 #1：Ollama（本地，完全免费无限制）</div>' +
          '<div style="font-size:12px;color:var(--text-dim);line-height:1.6;margin-bottom:8px;">在电脑上安装 Ollama 后直接使用，无需注册账号，完全免费且速度最快。</div>' +
          '<div style="font-size:12px;margin-bottom:8px;">安装步骤：</div>' +
          '<div style="font-size:12px;color:var(--text-dim);line-height:1.7;margin-bottom:8px;">' +
          '1. 访问 <a href="https://ollama.com" target="_blank" style="color:#10b981;">ollama.com</a> 下载安装<br>' +
          '2. 打开终端，运行：<code style="background:#1e293b;padding:2px 8px;border-radius:4px;color:#10b981;">ollama run llama3.3</code><br>' +
          '3. 运行后保持 Ollama 开启，返回这里点"打开 AI 设置"' +
          '</div>' +
          '<button onclick="LLMManager.showSettings()" style="padding:8px 16px;background:#10b981;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:13px;">⚙️ 打开 AI 设置</button>' +
          '</div>' +

          '<div style="background:rgba(249,115,22,0.08);border:2px solid rgba(249,115,22,0.3);border-radius:10px;padding:14px;margin-bottom:12px;">' +
          '<div style="font-weight:bold;color:#f97316;margin-bottom:6px;">⚡ 推荐 #2：Groq（免费云服务，无需信用卡）</div>' +
          '<div style="font-size:12px;color:var(--text-dim);line-height:1.6;margin-bottom:8px;">Llama 3.3 70B 完全免费，速度极快（60+ token/s），无需信用卡，注册即用。</div>' +
          '<div style="font-size:12px;margin-bottom:8px;">注册步骤：</div>' +
          '<div style="font-size:12px;color:var(--text-dim);line-height:1.7;margin-bottom:8px;">' +
          '1. 访问 <a href="https://groq.com" target="_blank" style="color:#f97316;">groq.com</a> 点击 Sign Up<br>' +
          '2. 用 Google 或邮箱注册（无需信用卡）<br>' +
          '3. 进入 Console → API Keys → 创建 Key<br>' +
          '4. 复制 Key，粘贴到 AI 设置中' +
          '</div>' +
          '<button onclick="LLMManager.showSettings()" style="padding:8px 16px;background:#f97316;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:13px;">⚙️ 打开 AI 设置</button>' +
          '</div>' +

          '<div style="background:rgba(99,102,241,0.08);border:2px solid rgba(99,102,241,0.3);border-radius:10px;padding:14px;">' +
          '<div style="font-weight:bold;color:#818cf8;margin-bottom:6px;">🌐 推荐 #3：OpenRouter（聚合多个免费模型）</div>' +
          '<div style="font-size:12px;color:var(--text-dim);line-height:1.6;margin-bottom:8px;">聚合多个模型的免费配额（Claude Haiku / Qwen / DeepSeek 等），注册即送免费额度。</div>' +
          '<div style="font-size:12px;">' +
          '注册地址：<a href="https://openrouter.ai" target="_blank" style="color:#818cf8;">openrouter.ai</a>' +
          '</div>' +
          '</div>'
        ,
        buttons: [
          { label: '⚙️ 打开 AI 设置', primary: true, action: () => { if (window.LLMManager) LLMManager.showSettings(); } },
          { label: '🔍 自动检测可用模型', action: () => { if (window.LLMManager) LLMManager.testConnection().then(r => { showToast(r.ok ? '✅ 已连接成功' : '⚠️ ' + r.message, r.ok ? 'success' : 'warning'); }); } }
        ]
      };
    },

    toggleTheme() {
      return {
        title: '🌓 主题切换',
        body: '点击下方按钮可在浅/深色之间切换（若系统支持）。',
        buttons: [
          {
            label: '🌓 切换深色/浅色', primary: true,
            action: () => {
              document.body.classList.toggle('light-theme');
              showToast('🌓 主题已切换', 'info');
            }
          }
        ]
      };
    },

    showHelp() {
      const quick = [
        '🎯 "搜索 母亲" → 全站搜关键词',
        '✨ "新建一个短剧项目"',
        '🧭 "生成大纲"',
        '🎬 "再加 3 个分镜"',
        '💡 "帮我看看这个剧本哪里要改"',
        '📋 "列出我的项目"',
        '💾 "备份我的数据"',
        '🔄 "检查更新"',
        '🤖 "如何免费使用 AI"'
      ];
      return {
        title: '📘 我能帮你做什么',
        body:
          '<div style="margin-bottom:12px;">你可以直接用自然语言跟我聊天，下面是常用指令：</div>' +
          '<div style="background:var(--bg-dark);border-radius:8px;padding:10px;margin-bottom:12px;">' +
          quick.map((q) => `<div style="padding:3px 0;">· ${q}</div>`).join('') +
          '</div>' +
          '<div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:8px;padding:12px;">' +
          '<div style="font-weight:bold;color:#10b981;margin-bottom:6px;">🤖 免费使用 AI 大模型</div>' +
          '<div style="font-size:12px;color:var(--text-dim);line-height:1.6;">' +
          '· <strong>完全免费</strong>：电脑安装 Ollama（ollama.com）后即可使用，无需注册账号<br>' +
          '· <strong>免费云服务</strong>：Groq（groq.com）注册后免费 Key 无需信用卡<br>' +
          '· 配置方式：点我 → 右上角 ⚙️ 打开 AI 设置' +
          '</div>' +
          '</div>' +
          '<div style="margin-top:10px;font-size:12px;color:var(--text-dim);">💡 所有建议操作都需你<b>手动点击按钮</b>才会执行，不会自动改你的数据。</div>',
        buttons: [
          { label: '⚙️ 打开 AI 设置', primary: true, action: () => { if (window.LLMManager) LLMManager.showSettings(); } },
          { label: '🧠 试试"随机一条建议"', action: () => { const r = quick[Math.floor(Math.random() * quick.length)]; AgentUI.pushUser(r); AgentUI.handleInput(r); } }
        ]
      };
    },

    suggestImprovement(ctx, query) {
      const p = ctx.currentProject;
      if (!p) return { title: '💡 修改建议', body: '请先选择一个项目，我才能给你针对性的建议。', buttons: [] };

      const outlineLen = (p.outline || '').length;
      const scriptLen = (p.script || '').length;
      const storyboardCount = (p.storyboard || []).length;
      const characterCount = (p.characters || []).length;

      const suggestions = [];
      if (outlineLen < 100) suggestions.push('大纲偏短（' + outlineLen + ' 字），建议补充"核心冲突"与"反转点"。');
      if (scriptLen < outlineLen * 3 && outlineLen > 50) suggestions.push('剧本文本量较少，建议把大纲按节拍展开成场景。');
      if (storyboardCount === 0) suggestions.push('还没有分镜，建议每个核心事件至少 1 个镜头。');
      if (characterCount === 0) suggestions.push('角色库为空，建议先建立主角与配角的人设。');
      if (!suggestions.length) suggestions.push('当前《' + escapeHtml(p.name) + '》数据完整，建议下一步：检查节拍表节奏是否紧凑。');

      return {
        title: '💡 对《' + escapeHtml(p.name) + '》的修改建议',
        body:
          `<div style="margin-bottom:8px;">📊 当前项目快照：</div>
           <div style="color:var(--text-dim);font-size:13px;">大纲：${outlineLen} 字 · 剧本：${scriptLen} 字 · 分镜：${storyboardCount} 个 · 角色：${characterCount} 个</div>
           <div style="margin-top:10px;">${suggestions.map((s) => '<div style="padding:4px 0;">· ${s}</div>').join('')}</div>`.replace(/\$\{s\}/g, () => ''), // 兼容性兜底：replace 不嵌套变量
        buttons: [
          { label: '🥁 打开节拍表', action: () => switchTab('beat') },
          { label: '🎬 去加分镜', action: () => switchTab('storyboard') }
        ]
      };
    },

    gotoTab(ctx, query) {
      // 在 query 中查找 tab 名
      const q = String(query || '');
      let matched = null;
      Object.keys(TAB_NAME_MAP).forEach((name) => { if (q.includes(name)) matched = TAB_NAME_MAP[name]; });
      if (!matched) matched = 'home';
      return {
        title: '📑 跳转页面',
        body: '已为你定位到目标页面，点击下方按钮立即跳转。',
        buttons: [{ label: '🚀 立即跳转', primary: true, action: () => switchTab(matched) }]
      };
    },

    llmEnhance(ctx, query) {
      const p = ctx.currentProject;
      const context = p
        ? `项目《${p.name}》，大纲：${(p.outline || '暂无').slice(0, 200)}，剧本：${(p.script || '暂无').slice(0, 200)}，分镜数：${(p.storyboard || []).length}`
        : '暂无打开的项目';
      return {
        title: '💡 正在分析并生成建议…',
        body: '正在调用 AI 分析当前项目，请稍候…',
        buttons: []
      };
    },
    
    outlineGuide(ctx, query) {
      // 引导用户填写大纲
      const step = ctx.outlineStep || 0;
      const questions = [
        '您想创作什么类型的故事？（例如：都市爱情、古装武侠、悬疑推理等）',
        '故事的主角是谁？能简单描述一下他的性格和背景吗？',
        '故事的主要冲突或转折点是什么？',
        '您希望故事传达什么情感或主题？'
      ];
      return {
        title: '🎭 正在引导大纲设计…',
        body: step < questions.length ? questions[step] : '很好！我来帮您整理这些信息，生成完整的大纲。',
        buttons: []
      };
    },

    clearChat() {
      return { title: '🧹 清空对话', body: '已清空对话记录，我们重新开始吧～', buttons: [{ label: '🗑️ 立即清空', primary: true, action: () => AgentUI.clearMessages() }] };
    }
  };

  // ==================== 辅助：切换标签页 / 片段提取 / HTML 转义 ====================
  function switchTab(tabName) {
    // 优先：按 data-tab 属性查找
    let btn = document.querySelector('.tab-btn[data-tab="' + tabName + '"]') || document.querySelector('[data-tab="' + tabName + '"]');
    // 回退：按文字内容近似匹配
    if (!btn) {
      const btns = document.querySelectorAll('.tab-btn, [role="tab"]');
      btns.forEach((b) => { if (!btn && (b.textContent || '').toLowerCase().indexOf(tabName) !== -1) btn = b; });
    }
    if (btn && typeof btn.click === 'function') {
      btn.click();
      showToast('📑 已跳转到：' + (btn.textContent || tabName), 'info');
    } else {
      showToast('未能找到该页面入口，已为你标记：' + tabName, 'warning');
    }
  }

  function extractSnippet(text, query) {
    const idx = text.indexOf(query);
    if (idx === -1) return text.slice(0, 40);
    const start = Math.max(0, idx - 15);
    const end = Math.min(text.length, idx + query.length + 20);
    return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ==================== UI 渲染（浮动助手图标 + 聊天面板） ====================
  const AgentUI = {
    _messages: [],
    _opened: false,

    init() {
      // 恢复历史
      try {
        this._messages = safeJSON(localStorage.getItem('agent_chat_history') || '[]', []);
      } catch (e) { this._messages = []; }

      // 浮动按钮
      const fab = document.createElement('div');
      fab.id = 'agent-fab';
      fab.innerHTML = '<div class="agent-fab-inner">🤖<span class="agent-fab-pulse"></span></div>';
      fab.title = '智能助手：点我聊天 / 搜索 / 快捷操作';
      fab.addEventListener('click', () => this.togglePanel());
      document.body.appendChild(fab);

      // 聊天面板
      const panel = document.createElement('div');
      panel.id = 'agent-panel';
      panel.innerHTML = `
        <div class="agent-panel-header">
          <div class="agent-title">
            <span class="agent-avatar">🤖</span>
            <div>
              <div style="font-weight:bold;font-size:14px;">
                智能助手
                <span id="agent-llm-status" class="agent-llm-status offline">未连接</span>
              </div>
              <div style="font-size:11px;color:var(--text-dim);">离线模式可用 · 配置 AI 可增强创作</div>
            </div>
          </div>
          <div class="agent-actions">
            <button id="agent-llm-settings-btn" title="AI 大模型设置" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:14px;padding:4px 6px;border-radius:6px;">⚙️</button>
            <button id="agent-clear-btn" title="清空对话" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:16px;padding:4px 6px;border-radius:6px;">🧹</button>
            <button id="agent-close-btn" title="关闭" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:16px;padding:4px 6px;border-radius:6px;">✕</button>
          </div>
        </div>
        <div id="agent-messages" class="agent-messages"></div>
        <div class="agent-quick">
          <button data-quick="help">📘 我能做什么</button>
          <button data-quick="list">📋 我的项目</button>
          <button data-quick="suggest">💡 修改建议</button>
          <button data-quick="backup">💾 备份数据</button>
        </div>
        <div class="agent-input">
          <input id="agent-input" type="text" placeholder='例如："搜索 母亲"、"新建项目"、"帮我看看剧本"…'>
          <button id="agent-send-btn">发送</button>
        </div>
      `;
      document.body.appendChild(panel);

      // 拖动功能
      const header = panel.querySelector('.agent-panel-header');
      let isDragging = false, startX, startY, startLeft, startBottom;
      header.style.cursor = 'grab';
      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        header.style.cursor = 'grabbing';
        const rect = panel.getBoundingClientRect();
        startX = e.clientX; startY = e.clientY;
        startLeft = rect.left; startBottom = window.innerHeight - rect.bottom;
        panel.style.right = 'auto';
        panel.style.left = startLeft + 'px';
        panel.style.bottom = startBottom + 'px';
      });
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX, dy = startY - e.clientY;
        panel.style.left = (startLeft + dx) + 'px';
        panel.style.bottom = (startBottom + dy) + 'px';
      });
      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          header.style.cursor = 'grab';
        }
      });

      // 事件绑定
      panel.querySelector('#agent-close-btn').addEventListener('click', () => this.togglePanel(false));
      panel.querySelector('#agent-clear-btn').addEventListener('click', () => this.clearMessages());
      panel.querySelector('#agent-llm-settings-btn')?.addEventListener('click', () => {
        if (window.LLMManager) LLMManager.showSettings();
      });
      panel.querySelector('#agent-send-btn').addEventListener('click', () => {
        const input = panel.querySelector('#agent-input');
        const val = input.value.trim();
        if (val) { this.handleInput(val); input.value = ''; }
      });
      panel.querySelector('#agent-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = e.target.value.trim();
          if (val) { this.handleInput(val); e.target.value = ''; }
        }
      });
      panel.querySelectorAll('.agent-quick button').forEach((b) => {
        b.addEventListener('click', () => {
          const map = { help: '我能做什么', list: '列出我的项目', suggest: '帮我看看当前项目有什么要改', backup: '备份一下数据' };
          const q = map[b.dataset.quick];
          this.handleInput(q);
        });
      });

      // LLM 状态指示器：启动时检测一次
      this._updateLLMStatus();

      // 渲染已有消息
      this.render();

      // 首次进入：欢迎语
      if (!this._messages.length) {
        this.pushBot({
          title: '👋 你好，我是智能助手',
          body:
            '我可以帮你：<br>' +
            '· 🔎 自然语言搜索所有项目/大纲/剧本/分镜<br>' +
            '· ✨ 一键新建项目、跳转到大纲/分镜/角色<br>' +
            '· 💡 给当前项目提出改进建议<br>' +
            '· 💾 备份、恢复、检查更新<br><br>' +
            '🤖 <strong>免费使用 AI 大模型</strong>：<br>' +
            '· <strong>完全免费</strong>：安装 Ollama（ollama.com）后在电脑上运行，无需注册<br>' +
            '· <strong>免费云服务</strong>：Groq / OpenRouter 提供免费 API 额度<br>' +
            '· 点击右上角 ⚙️ 配置 AI，或直接问我"如何免费使用 AI"<br><br>' +
            '试着问我："新建一个短剧项目"，或点下方按钮。',
          buttons: [
            { label: '⚙️ 免费配置 AI', primary: true, action: () => { if (window.LLMManager) LLMManager.showSettings(); } },
            { label: '✨ 新建项目', action: () => this.handleInput('新建项目') },
            { label: '📋 列出项目', action: () => this.handleInput('列出项目') }
          ]
        });
      }

      console.log('🤖 智能 Agent 助手已就绪');
    },

    togglePanel(force) {
      this._opened = typeof force === 'boolean' ? force : !this._opened;
      const panel = document.getElementById('agent-panel');
      const fab = document.getElementById('agent-fab');
      if (!panel) return;
      panel.classList.toggle('open', this._opened);
      fab.classList.toggle('active', this._opened);
      if (this._opened) {
        setTimeout(() => { const inp = document.getElementById('agent-input'); if (inp) inp.focus(); }, 120);
      }
    },

    pushUser(text) {
      this._messages.push({ role: 'user', text, t: Date.now() });
      this.persist();
    },

    pushBot(payload) {
      this._messages.push({ role: 'bot', payload, t: Date.now() });
      this.persist();
      this.render();
    },

    handleInput(text) {
      if (!text || !text.trim()) return;
      this.pushUser(text);
      this.render();

      // 识别意图
      setTimeout(async () => {
        const ctx = collectContext();
        const match = matchIntent(text);
        if (!match) {
          // 未知输入 → 尝试交给 LLM
          await this._tryLLM(text, ctx);
          return;
        }

        // 内容生成类意图 → 优先交给 LLM
        const llmTasks = ['outline_generate', 'script_generate', 'storyboard_add', 'ai_suggest', 'llm_chat'];
        const needsLLM = llmTasks.includes(match.key) || match.key === 'fallback_search';

        if (needsLLM) {
          const llmResult = await this._tryLLM(text, ctx, match.key);
          if (llmResult) return; // LLM 已处理
        }

        // 降级：离线模式
        try {
          const result = match.pattern.handler(ctx, text);
          this.pushBot(result || { title: match.pattern.icon + ' ' + match.pattern.label, body: '已处理。', buttons: [] });
        } catch (err) {
          console.error(err);
          this.pushBot({ title: '⚠️ 出错了', body: '错误信息：' + escapeHtml(err.message), buttons: [] });
        }
      }, 100);
    },

    // 尝试调用 LLM，返回 true 表示已处理
    async _tryLLM(text, ctx, taskType) {
      // 检查 LLM 是否可用
      if (!window.LLMManager) return false;
      const cfg = LLMManager.getConfig();
      if (!cfg.enabled) return false;

      // 先尝试连接测试
      const test = await LLMManager.testConnection().catch(() => ({ ok: false }));
      if (!test.ok) {
        // LLM 不可用，给出引导
        this.pushBot({
          title: '🤖 AI 大模型未连接',
          body: '要使用 AI 生成功能，请先配置大模型连接。',
          buttons: [
            { label: '⚙️ 打开 AI 设置', primary: true, action: () => { if (window.LLMManager) LLMManager.showSettings(); } },
            { label: '🧹 继续离线模式', action: () => {} }
          ]
        });
        return true;
      }

      // LLM 可用，显示流式加载
      const msgId = Date.now();
      const bubbleId = 'llm-bubble-' + msgId;
      this._messages.push({ role: 'bot', payload: { title: '🤖 AI 正在创作…', body: '<span id="' + bubbleId + '" class="llm-stream-text">✍️ 思考中…</span>', buttons: [] }, t: msgId });
      this.render();

      try {
        // 构造上下文
        const p = ctx.currentProject;
        const context = p ? `【当前项目】\n名称：${p.name}\n大纲：${(p.outline || '暂无').slice(0, 300)}\n剧本：${(p.script || '暂无').slice(0, 300)}` : '【无打开的项目】';

        let fullText = '';
        await LLMManager.sendMessage(text, {
          taskType: 'agent_chat',
          onChunk: (chunk, full) => {
            fullText = full;
            const el = document.getElementById(bubbleId);
            if (el) el.textContent = full.slice(-2000); // 限制显示长度
          }
        });

        // 替换气泡内容
        const idx = this._messages.findIndex(m => m.t === msgId);
        if (idx !== -1) {
          this._messages[idx].payload = {
            title: '🤖 AI 回复',
            body: `<div style="white-space:pre-wrap;line-height:1.6;font-size:13px;max-height:320px;overflow-y:auto;">${escapeHtml(fullText)}</div>`,
            buttons: [
              { label: '↻ 重新生成', action: () => this.handleInput(text) },
              { label: '⚙️ AI 设置', action: () => LLMManager.showSettings() }
            ]
          };
        }
        this.render();
        return true;

      } catch (err) {
        // 替换为错误提示
        const idx = this._messages.findIndex(m => m.t === msgId);
        if (idx !== -1) {
          this._messages[idx].payload = {
            title: '⚠️ AI 生成失败',
            body: `错误：${escapeHtml(err.message)}\n\n可以尝试：\n· 检查 API Key 是否有效\n· 在 AI 设置中更换模型\n· 或继续使用离线模式`,
            buttons: [
              { label: '⚙️ AI 设置', primary: true, action: () => LLMManager.showSettings() },
              { label: '🧹 离线模式', action: () => this._skipLLMAndContinue(text, ctx) }
            ]
          };
        }
        this.render();
        return true;
      }
    },

    _skipLLMAndContinue(text, ctx) {
      const match = matchIntent(text);
      if (!match) {
        this.pushBot({ title: '🤔 没听懂，换个说法？', body: '可以试试："新建项目"、"列出项目"等指令。', buttons: [] });
        return;
      }
      try {
        const result = match.pattern.handler(ctx, text);
        this.pushBot(result || { title: match.pattern.icon + ' ' + match.pattern.label, body: '已处理。', buttons: [] });
      } catch (err) {
        this.pushBot({ title: '⚠️ 出错了', body: '错误：' + escapeHtml(err.message), buttons: [] });
      }
    },

    render() {
      const box = document.getElementById('agent-messages');
      if (!box) return;
      box.innerHTML = '';
      this._messages.forEach((msg) => {
        const row = document.createElement('div');
        row.className = 'agent-msg ' + (msg.role === 'user' ? 'agent-msg-user' : 'agent-msg-bot');
        if (msg.role === 'user') {
          row.innerHTML = `<div class="agent-bubble">${escapeHtml(msg.text)}</div><div class="agent-role-tag">你</div>`;
        } else {
          const p = msg.payload || {};
          const buttonsHtml = (p.buttons || []).map((b, i) => {
            const btnId = 'agent-btn-' + msg.t + '-' + i;
            const primary = b.primary ? ' agent-btn-primary' : '';
            setTimeout(() => {
              const el = document.getElementById(btnId);
              if (el && b.action) el.addEventListener('click', () => { try { b.action(); } catch (e) { console.error(e); showToast('操作出错：' + e.message, 'error'); } });
            }, 0);
            return `<button id="${btnId}" class="agent-btn${primary}">${escapeHtml(b.label)}</button>`;
          }).join('');
          row.innerHTML = `<div class="agent-role-tag">🤖</div>
            <div class="agent-bubble agent-bubble-bot">
              ${p.title ? '<div class="agent-bubble-title">' + escapeHtml(p.title) + '</div>' : ''}
              <div class="agent-bubble-body">${p.body || ''}</div>
              ${buttonsHtml ? `<div class="agent-bubble-actions">${buttonsHtml}</div>` : ''}
            </div>`;
        }
        box.appendChild(row);
      });
      box.scrollTop = box.scrollHeight;
    },

    clearMessages() {
      this._messages = [];
      this.persist();
      // 欢迎语
      this.pushBot({
        title: '🧹 对话已清空',
        body: '我们重新开始吧～<br>试试："新建项目"、"搜索 科幻"、"帮我看看剧本"。',
        buttons: [
          { label: '✨ 新建项目', primary: true, action: () => this.handleInput('新建项目') },
          { label: '📘 查看帮助', action: () => this.handleInput('你能做什么') }
        ]
      });
    },

    async _updateLLMStatus() {
      const statusEl = document.getElementById('agent-llm-status');
      if (!statusEl) return;
      if (!window.LLMManager) {
        statusEl.className = 'agent-llm-status offline';
        statusEl.textContent = '未安装';
        return;
      }
      const cfg = LLMManager.getConfig();
      if (!cfg || !cfg.enabled) {
        statusEl.className = 'agent-llm-status offline';
        statusEl.textContent = '未启用';
        return;
      }

      statusEl.className = 'agent-llm-status error';
      statusEl.textContent = '检测中…';

      // 使用 testConnection 统一检测（它会正确检查 API Key）
      const r = await LLMManager.testConnection(cfg.activeProvider).catch(() => ({ ok: false, message: '检测失败' }));
      if (r && r.ok) {
        statusEl.className = 'agent-llm-status online';
        statusEl.textContent = '已连接';
      } else {
        statusEl.className = 'agent-llm-status error';
        statusEl.textContent = '需配置';
      }
    },

    persist() {
      try {
        // 只保留最近 30 条，避免 localStorage 膨胀
        const keep = this._messages.slice(-30);
        localStorage.setItem('agent_chat_history', JSON.stringify(keep));
      } catch (e) { /* ignore quota */ }
    }
  };

  // 暴露到全局，便于调试与扩展
  window.AgentAssistant = {
    handleInput: (text) => AgentUI.handleInput(text),
    open: () => AgentUI.togglePanel(true),
    close: () => AgentUI.togglePanel(false),
    matchIntent,
    collectContext,
    ActionHandlers
  };

  // DOM 就绪后初始化
  function boot() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => AgentUI.init());
    } else {
      AgentUI.init();
    }
  }
  boot();
})();
