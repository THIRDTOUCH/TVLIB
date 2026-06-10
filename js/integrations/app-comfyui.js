/**
 * ============================================================
 * ComfyUI 连接器 — 短剧创作工作台对接外部 AI 绘画平台
 * ============================================================
 * 功能：
 *   1. ComfyUIConnector - 连接本地/远程 ComfyUI，支持 REST API + WebSocket
 *   2. PromptTranslator - 中文分镜描述 → 英文 SD 提示词
 *   3. WorkflowBuilder - 组装符合 ComfyUI API 的 prompt JSON
 *   4. ComfyUIManager - UI 管理（配置面板、发送按钮、队列状态）
 *
 * ComfyUI API 规范（发送到 /api/prompt 的格式）:
 *   {
 *     "prompt": {
 *       "<node_id>": { "inputs": { ... }, "class_type": "..." }
 *     }
 *   }
 *
 * 使用流程：
 *   1. 用户在「设置 / ComfyUI 配置」中填入服务器地址（如 http://localhost:8188）
 *   2. 点击分镜卡片上的「发送到 ComfyUI」按钮
 *   3. 系统调用 WorkflowBuilder 生成 API 格式 JSON 并排队执行
 *   4. WebSocket 监听执行进度，完成后显示生成结果预览
 * ============================================================
 */

(function () {
  'use strict';

  // ==================== 中文 → 英文 提示词词典 ====================
  // 轻量离线翻译：常用景别、运镜、情绪、场景词汇
  const PROMPT_DICT = {
    // 景别
    '远景': 'extreme long shot, wide angle',
    '全景': 'wide shot, full shot',
    '中景': 'medium shot',
    '中近景': 'medium close-up',
    '近景': 'close-up shot',
    '特写': 'close-up',
    '大特写': 'extreme close-up, ECU',
    '主观镜头': 'POV shot, first person view',
    '客观镜头': 'third person view',
    '反应镜头': 'reaction shot',
    '过肩镜头': 'over the shoulder shot, OTS',
    '双人镜头': 'two shot',
    '三人镜头': 'three shot',
    '群像镜头': 'group shot',
    '空镜头': 'empty shot, scenery only',
    '插入镜头': 'insert shot',
    '俯拍': 'high angle, bird eye view',
    '仰拍': 'low angle, looking up',
    '平拍': 'eye level shot',
    '顶拍': 'top down shot, overhead view',
    '反打': 'reverse shot',
    // 运镜
    '固定': 'static shot, locked off',
    '推镜': 'push in, dolly in',
    '拉镜': 'pull out, dolly out',
    '摇镜': 'pan shot, panning',
    '移镜': 'tracking shot, lateral move',
    '升降镜': 'crane shot, jib up down',
    '跟拍': 'follow shot, tracking',
    '环绕': 'orbit shot, 360 camera',
    '手持抖动': 'handheld camera, shaky cam',
    '稳定器': 'smooth gimbal, steady cam',
    '无人机': 'aerial drone shot',
    '变焦': 'zoom lens',
    '快速变焦': 'crash zoom, fast zoom',
    '慢动作': 'slow motion, high speed',
    '延时摄影': 'time lapse',
    '升格': 'high frame rate, slow motion',
    '降格': 'low frame rate, fast motion',
    '旋转': 'rotating shot, dutch angle',
    '甩镜': 'whiplash pan, fast pan',
    '滑动': 'slide shot, dolly move',
    // 情绪
    '紧张': 'tense atmosphere, dramatic',
    '悬疑': 'mysterious mood, suspenseful',
    '温馨': 'warm atmosphere, cozy',
    '浪漫': 'romantic mood, soft lighting',
    '悲伤': 'sad, melancholic atmosphere',
    '愤怒': 'angry, intense mood',
    '恐惧': 'horror, dark and eerie',
    '喜悦': 'joyful, bright and happy',
    '平静': 'calm, serene, peaceful',
    '孤独': 'lonely, isolated mood',
    '希望': 'hopeful, uplifting',
    '绝望': 'desperate, gloomy',
    '兴奋': 'exciting, energetic',
    '压抑': 'oppressive, heavy mood',
    '温暖': 'warm golden lighting',
    '冰冷': 'cold blue tone, icy',
    '怀旧': 'nostalgic, vintage',
    '梦幻': 'dreamy, ethereal',
    '诡异': 'uncanny, eerie mood',
    '热血': 'passionate, heroic',
    '肃杀': 'grim, serious atmosphere',
    '蓄势': 'tension building, dramatic pause',
    '决绝': 'determined, resolute mood',
    '悲壮': 'solemn and stirring',
    '结束': 'final shot, ending scene',
    // 常见场景
    '咖啡馆': 'cozy cafe interior',
    '办公室': 'modern office',
    '街道': 'urban street',
    '公园': 'city park, green trees',
    '竹林': 'bamboo forest, misty',
    '古代戏台': 'ancient chinese opera stage, traditional',
    '古代皇宫': 'ancient chinese palace, grand hall',
    '家': 'home interior, warm domestic',
    '卧室': 'bedroom, private space',
    '雨天': 'rainy day, wet street',
    '雪景': 'snowy scene, winter',
    '黄昏': 'golden hour, sunset',
    '夜晚': 'night scene, dark lighting',
    '黎明': 'dawn, early morning light',
    '回忆': 'flashback, dream sequence',
    '梦境': 'dream world, surreal',
    // 人物描述增强
    '25岁': '25 years old',
    '30岁': '30 years old',
    '女性': 'woman, female',
    '男性': 'man, male',
    '长发': 'long flowing hair',
    '短发': 'short hair',
    '优雅': 'elegant, graceful',
    '气质': 'charismatic presence',
    '英俊': 'handsome',
    '美丽': 'beautiful, attractive',
    '西装': 'business suit',
    '连衣裙': 'dress',
    '休闲': 'casual clothing',
    '古装': 'ancient chinese clothing, traditional hanfu',
    '剑客': 'swordsman, warrior with sword',
    // 光照
    '自然光': 'natural light, soft lighting',
    '侧逆光': 'rim light, backlit',
    '聚光': 'spotlight, dramatic lighting',
    '暖光': 'warm golden lighting',
    '冷光': 'cool blue lighting',
    '胶片': 'film grain, cinematic',
    '柔光': 'soft diffused light',
    '硬光': 'hard light, sharp shadows',
    '顶光': 'overhead lighting',
    '追光': 'follow spot light',
    '舞台光': 'stage lighting, dramatic',
    '室内灯光': 'indoor lighting, warm lamps',
    '日光灯': 'fluorescent office light'
  };

  // 默认的负向提示词（SD 通用）
  const DEFAULT_NEGATIVE =
    'blurry, low quality, distorted, deformed, bad anatomy, bad hands, ' +
    'watermark, text, logo, signature, extra fingers, extra limbs, ' +
    'cropped, out of frame, worst quality, jpeg artifacts, ugly, ' +
    'duplicate, morbid, mutilated, poorly drawn face, mutation, ' +
    'cartoon, anime if photo style';

  // ==================== 提示词翻译器 ====================
  class PromptTranslator {
    /**
     * 将中文分镜数据翻译为英文 SD 正向/负向提示词
     * @param {Object} shot - 分镜数据（scene, characters, content, cameraMove, lighting, mood, imagePrompt）
     * @returns {Object} { positive: string, negative: string }
     */
    translateShot(shot) {
      if (!shot) return { positive: DEFAULT_NEGATIVE.replace(/[^,]+, /, '').slice(0, -2), negative: DEFAULT_NEGATIVE };

      const parts = [];

      // 1. 景别/镜头类型
      if (shot.type) {
        const translated = this._lookup(shot.type);
        if (translated !== shot.type) parts.push(translated);
      }

      // 2. 画面内容描述（最优先使用已经是英文的 imagePrompt）
      if (shot.imagePrompt && /[a-zA-Z]{3,}/.test(shot.imagePrompt)) {
        // imagePrompt 已经是英文，直接用
        parts.push(shot.imagePrompt);
      } else if (shot.content) {
        // 简单翻译：提取中文关键词并映射到常见英文
        const content = shot.content;
        const translated = this._translateChinese(content);
        parts.push(translated);
      }

      // 3. 场景
      if (shot.scene) {
        const s = this._lookup(shot.scene);
        if (s !== shot.scene) parts.push(s);
      }

      // 4. 人物
      if (shot.characters) {
        const c = this._lookup(shot.characters);
        if (c !== shot.characters) parts.push(c);
      }

      // 5. 运镜
      if (shot.cameraMove) {
        const m = this._lookup(shot.cameraMove);
        if (m !== shot.cameraMove) parts.push(m);
      }

      // 6. 情绪
      if (shot.mood) {
        const md = this._lookup(shot.mood);
        if (md !== shot.mood) parts.push(md);
      }

      // 7. 光照
      if (shot.lighting) {
        const lt = this._lookup(shot.lighting);
        if (lt !== shot.lighting) parts.push(lt);
      }

      // 8. 通用质量词
      parts.push('cinematic, high quality, detailed, 8k, professional photography, sharp focus, depth of field');

      // 组装正向提示词（去重、去中文、去空）
      let positive = parts
        .join(', ')
        .replace(/[\u4e00-\u9fa5]/g, '') // 移除残留的中文
        .replace(/\s+/g, ' ')
        .replace(/,\s*,/g, ',')
        .trim();

      // 如果最终几乎没有英文，则退回使用通用提示
      if (positive.length < 20 || !/[a-zA-Z]/.test(positive)) {
        positive = 'cinematic scene, dramatic lighting, professional photography, high quality, detailed, 8k';
      }

      // 负向提示词
      let negative = DEFAULT_NEGATIVE;
      if (shot.negative_prompt) negative += ', ' + shot.negative_prompt;

      return { positive, negative };
    }

    /**
     * 简单中文 → 英文：基于词典查找 + 英文兜底（如果是英文直接返回）
     */
    _lookup(text) {
      if (!text) return '';
      // 纯英文直接返回
      if (/^[a-zA-Z0-9\s,_\-\.]+$/.test(text.trim())) return text.trim();

      let result = text;
      let matched = false;
      // 按 key 长度排序（长优先，避免短词替换长词）
      const keys = Object.keys(PROMPT_DICT).sort((a, b) => b.length - a.length);
      for (const key of keys) {
        if (text.includes(key)) {
          result = PROMPT_DICT[key];
          matched = true;
          break;
        }
      }
      return matched ? result : text;
    }

    _translateChinese(text) {
      if (!text) return '';
      // 移除标点
      const cleaned = text.replace(/[，。！？、；：""'（）\(\)\[\]【】]/g, ' ');
      // 尝试词典查找替换
      const keys = Object.keys(PROMPT_DICT).sort((a, b) => b.length - a.length);
      let result = cleaned;
      let foundAny = false;
      for (const key of keys) {
        if (result.includes(key)) {
          result = result.split(key).join(PROMPT_DICT[key]);
          foundAny = true;
        }
      }
      // 若完全未匹配任何关键词，且还有大量中文残留，添加描述词
      const hasChinese = /[\u4e00-\u9fa5]/.test(result);
      if (hasChinese) {
        result = result.replace(/[\u4e00-\u9fa5]+/g, 'scene details').replace(/\s+/g, ' ').trim();
      }
      return foundAny ? result : 'detailed scene composition, cinematic';
    }
  }

  // ==================== ComfyUI 连接器 ====================
  class ComfyUIConnector {
    constructor() {
      this.serverUrl = '';
      this.wsUrl = '';
      this.connected = false;
      this.ws = null;
      this.pendingTasks = new Map(); // promptId -> { shots, resolve, reject }
      this._init();
    }

    _init() {
      const saved = localStorage.getItem('comfyui_config');
      if (saved) {
        try {
          const config = JSON.parse(saved);
          this.serverUrl = config.serverUrl || '';
          this.wsUrl = config.wsUrl || '';
        } catch (e) {
          console.warn('ComfyUI 配置解析失败:', e);
        }
      }
    }

    _saveConfig() {
      localStorage.setItem('comfyui_config', JSON.stringify({
        serverUrl: this.serverUrl,
        wsUrl: this.wsUrl
      }));
    }

    configure(serverUrl, wsUrl = null) {
      this.serverUrl = serverUrl.replace(/\/+$/, '');
      if (wsUrl) {
        this.wsUrl = wsUrl.replace(/\/+$/, '');
      } else {
        // 默认从 http 推导出 ws 地址
        try {
          const u = new URL(this.serverUrl);
          this.wsUrl = (u.protocol === 'https:' ? 'wss://' : 'ws://') + u.host;
        } catch (e) {
          this.wsUrl = this.serverUrl.replace('http://', 'ws://').replace('https://', 'wss://');
        }
      }
      this._saveConfig();
    }

    isConfigured() {
      return !!this.serverUrl;
    }

    async checkConnection() {
      if (!this.serverUrl) {
        return { ok: false, error: '未配置 ComfyUI 服务器地址' };
      }
      try {
        const resp = await fetch(`${this.serverUrl}/system_stats`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        if (resp.ok) {
          const stats = await resp.json();
          this.connected = true;
          return { ok: true, stats };
        }
        this.connected = false;
        return { ok: false, error: `HTTP ${resp.status}` };
      } catch (err) {
        this.connected = false;
        return { ok: false, error: err.message || '连接失败' };
      }
    }

    async getModels() {
      if (!this.serverUrl) throw new Error('未配置服务器');
      const resp = await fetch(`${this.serverUrl}/api/models`, { headers: { 'Accept': 'application/json' } });
      if (!resp.ok) throw new Error(`获取模型列表失败: ${resp.status}`);
      return resp.json();
    }

    /**
     * 提交一个 ComfyUI 工作流（API prompt 格式）
     * @param {Object} workflowJSON - ComfyUI API 格式 JSON: { "3": { "inputs": {...}, "class_type": "..." } }
     * @returns {Promise<string>} promptId
     */
    async queuePrompt(workflowJSON) {
      if (!this.serverUrl) throw new Error('未配置 ComfyUI 服务器');

      const resp = await fetch(`${this.serverUrl}/api/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ prompt: workflowJSON })
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`提交任务失败 [HTTP ${resp.status}]: ${text.slice(0, 200)}`);
      }

      const data = await resp.json();
      return data.prompt_id || data.number || String(Date.now());
    }

    /**
     * 查看历史（获取已完成的图片）
     */
    async getHistory(promptId) {
      if (!this.serverUrl) throw new Error('未配置服务器');
      const url = promptId
        ? `${this.serverUrl}/api/history/${promptId}`
        : `${this.serverUrl}/api/history`;
      const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!resp.ok) throw new Error(`获取历史失败: ${resp.status}`);
      return resp.json();
    }

    /**
     * 下载图片（通过 /view 接口）
     */
    async getImageUrl(filename, subfolder, type) {
      if (!this.serverUrl) throw new Error('未配置服务器');
      const params = new URLSearchParams({ filename, subfolder: subfolder || '', type: type || 'output' });
      return `${this.serverUrl}/view?${params.toString()}`;
    }

    /**
     * 连接 WebSocket，监听执行进度
     */
    connectWebSocket(onProgress, onExecuted) {
      if (!this.wsUrl) throw new Error('WebSocket 地址未配置');
      if (this.ws) {
        try { this.ws.close(); } catch (e) {}
        this.ws = null;
      }

      const clientId = 'duanju_' + Math.random().toString(36).slice(2, 10);
      const url = `${this.wsUrl}/ws?clientId=${clientId}`;

      try {
        this.ws = new WebSocket(url);
      } catch (e) {
        throw new Error('WebSocket 创建失败: ' + e.message);
      }

      this.ws.onopen = () => console.log('[ComfyUI] WebSocket 已连接');
      this.ws.onerror = (e) => console.warn('[ComfyUI] WebSocket 错误', e);
      this.ws.onclose = () => { this.ws = null; console.log('[ComfyUI] WebSocket 已断开'); };

      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          // 进度
          if (msg.type === 'progress' && onProgress) {
            onProgress({ node: msg.data?.node, value: msg.data?.value, max: msg.data?.max });
          }
          // 节点执行中
          if (msg.type === 'executing') {
            // 通知
          }
          // 执行完成
          if (msg.type === 'executed' && msg.data?.output?.images && onExecuted) {
            onExecuted({
              promptId: msg.data.prompt_id,
              node: msg.data.node,
              images: msg.data.output.images
            });
          }
          // 队列执行结束
          if (msg.type === 'execution_success' || msg.type === 'execution_cached') {
            // 完成
          }
        } catch (e) {
          // 非 JSON 消息忽略
        }
      };
    }

    disconnectWebSocket() {
      if (this.ws) {
        try { this.ws.close(); } catch (e) {}
        this.ws = null;
      }
    }
  }

  // ==================== Workflow 构建器 ====================
  // 构建 ComfyUI API 格式 JSON（即 /api/prompt 接受的 {"3": {"inputs":{},"class_type":"..."} 格式）
  class WorkflowBuilder {
    constructor() {
      this.defaultModel = 'sd_xl_base_1.0.safetensors';
      this.defaultSampler = 'dpmpp_2m';
      this.defaultScheduler = 'karras';
      this.defaultSteps = 30;
      this.defaultCFG = 7;
      this.defaultWidth = 1024;
      this.defaultHeight = 1024;
      this.defaultDenoise = 1.0;
    }

    /**
     * 根据分镜数据 + 提示词 → 生成 ComfyUI prompt JSON
     * @param {Object} shot - 分镜数据
     * @param {Object} prompts - { positive, negative }
     * @param {Object} options - { modelName, sampler, steps, cfg, width, height, seed }
     * @returns {Object} ComfyUI API 格式 { "<id>": { "inputs": {...}, "class_type": "..." } }
     */
    buildSDXLWorkflow(shot, prompts, options = {}) {
      const modelName = options.modelName || this.defaultModel;
      const steps = options.steps || shot.steps || this.defaultSteps;
      const cfg = options.cfg || shot.cfg || this.defaultCFG;
      const sampler = options.sampler || this.defaultSampler;
      const scheduler = options.scheduler || this.defaultScheduler;
      const width = options.width || shot.width || this.defaultWidth;
      const height = options.height || shot.height || this.defaultHeight;
      const seed = options.seed !== undefined ? options.seed
        : (shot.seed !== undefined ? shot.seed : Math.floor(Math.random() * 9999999999));
      const denoise = options.denoise !== undefined ? options.denoise
        : (shot.denoise !== undefined ? shot.denoise : this.defaultDenoise);

      // ComfyUI API 格式：以字符串数字为 key
      // 3: CheckpointLoaderSimple
      // 4: CLIPTextEncode (positive)
      // 5: CLIPTextEncode (negative)
      // 6: EmptyLatentImage
      // 7: KSampler
      // 8: VAEDecode
      // 9: SaveImage
      return {
        '3': {
          inputs: { ckpt_name: modelName },
          class_type: 'CheckpointLoaderSimple'
        },
        '4': {
          inputs: {
            text: prompts.positive || 'beautiful scene, cinematic',
            clip: ['3', 1]
          },
          class_type: 'CLIPTextEncode'
        },
        '5': {
          inputs: {
            text: prompts.negative || DEFAULT_NEGATIVE,
            clip: ['3', 1]
          },
          class_type: 'CLIPTextEncode'
        },
        '6': {
          inputs: { width, height, batch_size: 1 },
          class_type: 'EmptyLatentImage'
        },
        '7': {
          inputs: {
            seed,
            steps,
            cfg,
            sampler_name: sampler,
            scheduler,
            denoise,
            model: ['3', 0],
            positive: ['4', 0],
            negative: ['5', 0],
            latent_image: ['6', 0]
          },
          class_type: 'KSampler'
        },
        '8': {
          inputs: { samples: ['7', 0], vae: ['3', 2] },
          class_type: 'VAEDecode'
        },
        '9': {
          inputs: {
            filename_prefix: 'duanju_shot_' + (shot.id || 'x'),
            images: ['8', 0]
          },
          class_type: 'SaveImage'
        }
      };
    }

    /**
     * 根据 aspectRatio（如 "16:9"）计算像素尺寸
     */
    _parseAspectRatio(ratio) {
      if (!ratio) return { width: this.defaultWidth, height: this.defaultHeight };
      const m = ratio.match(/(\d+)\s*[:：/]\s*(\d+)/);
      if (!m) return { width: this.defaultWidth, height: this.defaultHeight };
      const w = parseInt(m[1]);
      const h = parseInt(m[2]);
      const total = 1024 * 1024; // SDXL 推荐总像素约 1M
      const scale = Math.sqrt(total / (w * h));
      return {
        width: Math.round(w * scale / 8) * 8,
        height: Math.round(h * scale / 8) * 8
      };
    }

    /**
     * 直接从分镜构建完整工作流
     */
    buildFromShot(shot, options = {}) {
      const translator = new PromptTranslator();
      const prompts = translator.translateShot(shot);

      // 计算尺寸
      const size = this._parseAspectRatio(shot.aspectRatio);
      const opts = Object.assign({}, size, options);

      return {
        workflow: this.buildSDXLWorkflow(shot, prompts, opts),
        prompts,
        size
      };
    }
  }

  // ==================== UI 管理器 ====================
  class ComfyUIManager {
    constructor() {
      this.connector = new ComfyUIConnector();
      this.builder = new WorkflowBuilder();
      this.queue = []; // 待处理分镜
      this.activeTasks = 0;
      this.maxParallel = 2;
      this._uiInited = false;
    }

    /**
     * 初始化 UI：配置模态、分镜发送按钮、队列状态显示
     */
    initUI() {
      if (this._uiInited) return;
      this._uiInited = true;
      this._buildConfigModal();
      this._injectHeaderButton();
      this._buildTaskModal();
    }

    _injectHeaderButton() {
      // 在顶部栏添加 ComfyUI 配置按钮
      const targetContainer = document.querySelector('.app-header');
      if (!targetContainer) return;

      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.style.marginLeft = '8px';
      btn.innerHTML = '🎨 ComfyUI';
      btn.title = '配置 ComfyUI 并发送分镜';
      btn.onclick = () => this.showConfig();
      targetContainer.appendChild(btn);
    }

    _buildConfigModal() {
      const existing = document.getElementById('comfyui-config-modal');
      if (existing) return;

      const modal = document.createElement('div');
      modal.id = 'comfyui-config-modal';
      modal.style.cssText =
        'display:none;position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:rgba(0,0,0,0.8);z-index:10000;justify-content:center;align-items:center;';

      modal.innerHTML = `
        <div style="background:var(--bg-panel,#fff);border-radius:12px;padding:24px;max-width:500px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,0.5);color:var(--text,#222);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="margin:0;font-size:18px;">🎨 ComfyUI 配置</h3>
            <button onclick="document.getElementById('comfyui-config-modal').style.display='none'"
                    style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text,#666);">×</button>
          </div>
          <div style="margin-bottom:12px;font-size:13px;color:var(--text-dim,#888);line-height:1.6;">
            本系统不内置 AI 绘图模型，而是将设计好的分镜（提示词）发送到 <b>ComfyUI</b> 执行生成。<br>
            请先本地启动 ComfyUI（默认地址 http://localhost:8188），然后填入地址进行连接。
          </div>
          <div style="margin-bottom:12px;">
            <label style="display:block;font-size:13px;margin-bottom:6px;">服务器地址</label>
            <input id="comfyui-server-input" type="text" placeholder="http://localhost:8188"
                   value="${this.connector.serverUrl}"
                   style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--border,#ccc);background:var(--bg-dark,#f5f5f5);color:var(--text,#222);font-size:14px;">
          </div>
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:13px;margin-bottom:6px;">WebSocket 地址（可选）</label>
            <input id="comfyui-ws-input" type="text" placeholder="自动推导，或手动填写 ws://localhost:8188"
                   value="${this.connector.wsUrl}"
                   style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--border,#ccc);background:var(--bg-dark,#f5f5f5);color:var(--text,#222);font-size:14px;">
          </div>
          <div id="comfyui-status" style="margin-bottom:16px;padding:10px;border-radius:6px;font-size:13px;"></div>
          <div style="display:flex;gap:8px;">
            <button id="comfyui-save-btn" style="flex:1;padding:10px 16px;background:var(--primary,#6366f1);color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">保存配置</button>
            <button id="comfyui-test-btn" style="flex:1;padding:10px 16px;background:var(--success,#10b981);color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">测试连接</button>
            <button id="comfyui-send-btn" style="flex:1;padding:10px 16px;background:#f59e0b;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">📤 发送当前分镜</button>
          </div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px dashed var(--border,#ddd);">
            <div style="font-size:12px;color:var(--text-dim,#888);line-height:1.6;">
              ✅ 保存后，每个分镜卡片都会出现「🎨 发送到 ComfyUI」按钮。<br>
              🌐 必须在浏览器能访问 ComfyUI 地址时才可用。<br>
              📋 提示：也支持「导出工作流 JSON」手动粘贴到 ComfyUI 面板。
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);

      // 事件绑定
      modal.querySelector('#comfyui-save-btn').onclick = () => {
        const url = modal.querySelector('#comfyui-server-input').value.trim();
        const ws = modal.querySelector('#comfyui-ws-input').value.trim();
        if (!url) { this._setStatus('请输入服务器地址', 'error'); return; }
        this.connector.configure(url, ws);
        this._setStatus('已保存配置: ' + this.connector.serverUrl, 'success');
        this._addSendButtonsToShots();
      };

      modal.querySelector('#comfyui-test-btn').onclick = async () => {
        this._setStatus('测试中...', 'info');
        const result = await this.connector.checkConnection();
        if (result.ok) {
          const gpu = (result.stats && result.stats.system && result.stats.system.gpu_device) || 'GPU';
          this._setStatus(`✅ 连接成功 · ${gpu}`, 'success');
        } else {
          this._setStatus(`❌ 连接失败: ${result.error}`, 'error');
        }
      };

      modal.querySelector('#comfyui-send-btn').onclick = () => {
        if (!projectData.shots || projectData.shots.length === 0) {
          this._setStatus('先生成分镜后再发送', 'error');
          return;
        }
        this.sendShotBatch(projectData.shots);
        modal.style.display = 'none';
      };
    }

    _buildTaskModal() {
      let modal = document.getElementById('comfyui-tasks-modal');
      if (modal) return;

      modal = document.createElement('div');
      modal.id = 'comfyui-tasks-modal';
      modal.style.cssText =
        'display:none;position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:rgba(0,0,0,0.8);z-index:10001;justify-content:center;align-items:center;';

      modal.innerHTML = `
        <div style="background:var(--bg-panel,#fff);border-radius:12px;padding:24px;max-width:700px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0,0,0,0.5);color:var(--text,#222);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="margin:0;font-size:18px;">📤 ComfyUI 执行队列</h3>
            <button onclick="document.getElementById('comfyui-tasks-modal').style.display='none'"
                    style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text,#666);">×</button>
          </div>
          <div id="comfyui-tasks-list" style="display:grid;gap:10px;"></div>
        </div>`;
      document.body.appendChild(modal);
    }

    _setStatus(text, level = 'info') {
      const el = document.querySelector('#comfyui-config-modal #comfyui-status');
      if (!el) return;
      const colors = {
        info: 'background:#dbeafe;color:#1e40af;',
        success: 'background:#d1fae5;color:#065f46;',
        error: 'background:#fee2e2;color:#991b1b;',
        warning: 'background:#fef3c7;color:#92400e;'
      };
      el.style.cssText = colors[level] || colors.info;
      el.textContent = text;
    }

    showConfig() {
      const modal = document.getElementById('comfyui-config-modal');
      if (modal) {
        modal.style.display = 'flex';
        modal.querySelector('#comfyui-server-input').value = this.connector.serverUrl;
        modal.querySelector('#comfyui-ws-input').value = this.connector.wsUrl;
        this._setStatus(
          this.connector.serverUrl ? '已保存配置: ' + this.connector.serverUrl : '尚未配置',
          this.connector.serverUrl ? 'info' : 'warning'
        );
      }
      // 添加分镜卡片上的发送按钮（确保）
      this._addSendButtonsToShots();
    }

    /**
     * 为每个分镜卡片注入「发送到 ComfyUI」和「导出 JSON」按钮
     */
    _addSendButtonsToShots() {
      if (!this.connector.isConfigured()) return;

      // 找到所有分镜卡片的操作区
      const shotCards = document.querySelectorAll('[data-shot-id], .shot-card, .shots-grid > div');
      shotCards.forEach((card, idx) => {
        if (card.dataset.comfyuiInjected) return;
        card.dataset.comfyuiInjected = '1';

        // 找到操作区或创建一个
        let actions = card.querySelector('.shot-actions, .card-actions, [data-role="shot-actions"]');
        if (!actions) {
          actions = document.createElement('div');
          actions.style.cssText = 'margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;';
          card.appendChild(actions);
        }

        const sendBtn = document.createElement('button');
        sendBtn.innerHTML = '🎨 发送到 ComfyUI';
        sendBtn.style.cssText = 'padding:6px 10px;font-size:12px;background:#f59e0b;color:white;border:none;border-radius:6px;cursor:pointer;';
        sendBtn.onclick = (e) => {
          e.stopPropagation();
          const shot = projectData.shots && projectData.shots[idx];
          if (!shot) { alert('未找到分镜数据'); return; }
          this.sendShot(shot);
        };
        actions.appendChild(sendBtn);

        const exportBtn = document.createElement('button');
        exportBtn.innerHTML = '📋 导出 JSON';
        exportBtn.style.cssText = 'padding:6px 10px;font-size:12px;background:#6366f1;color:white;border:none;border-radius:6px;cursor:pointer;';
        exportBtn.onclick = (e) => {
          e.stopPropagation();
          const shot = projectData.shots && projectData.shots[idx];
          if (!shot) { alert('未找到分镜数据'); return; }
          this.exportWorkflowJSON(shot);
        };
        actions.appendChild(exportBtn);
      });
    }

    /**
     * 发送单个分镜到 ComfyUI
     */
    async sendShot(shot) {
      if (!this.connector.isConfigured()) {
        alert('请先配置 ComfyUI 服务器地址（点击顶部 🎨 ComfyUI 按钮）');
        this.showConfig();
        return;
      }

      const { workflow, prompts, size } = this.builder.buildFromShot(shot);

      // 显示任务窗口
      const tasksModal = document.getElementById('comfyui-tasks-modal');
      if (tasksModal) tasksModal.style.display = 'flex';
      const list = document.getElementById('comfyui-tasks-list');

      const taskEl = document.createElement('div');
      taskEl.style.cssText =
        'padding:12px;border-radius:8px;background:var(--bg-dark,#f0f0f0);border-left:4px solid #f59e0b;font-size:13px;';
      taskEl.innerHTML = `
        <div style="font-weight:bold;margin-bottom:6px;">🎬 分镜 ${shot.id || ''} · ${(shot.type || '').slice(0, 20)}</div>
        <div style="color:var(--text-dim,#666);margin-bottom:6px;">状态: 排队中...</div>
        <div style="font-size:11px;color:var(--text-dim,#888);">尺寸: ${size.width}×${size.height}</div>
        <div style="margin-top:6px;font-size:11px;word-break:break-all;color:var(--text-dim,#666);">正向提示词: ${prompts.positive.slice(0, 120)}...</div>`;
      list.prepend(taskEl);

      try {
        taskEl.querySelector('div:nth-child(2)').textContent = '状态: 发送中...';
        taskEl.style.borderLeftColor = '#3b82f6';

        const promptId = await this.connector.queuePrompt(workflow);
        taskEl.querySelector('div:nth-child(2)').textContent = `状态: 执行中 (ID: ${promptId.slice(0, 8)}...)`;
        taskEl.style.borderLeftColor = '#6366f1';

        // 轮询结果（简化版，最多等待 120 秒）
        const imageUrl = await this._pollResult(promptId, taskEl);

        taskEl.querySelector('div:nth-child(2)').textContent = '状态: ✅ 完成';
        taskEl.style.borderLeftColor = '#10b981';

        // 渲染预览
        const preview = document.createElement('div');
        preview.style.cssText = 'margin-top:10px;';
        preview.innerHTML = `
          <img src="${imageUrl}" style="max-width:100%;border-radius:8px;border:2px solid #10b981;" />
          <div style="margin-top:6px;"><a href="${imageUrl}" target="_blank" style="color:#10b981;font-size:12px;">🔗 在新窗口打开</a></div>`;
        taskEl.appendChild(preview);

      } catch (err) {
        console.error(err);
        taskEl.querySelector('div:nth-child(2)').textContent = '状态: ❌ 失败 - ' + (err.message || err).slice(0, 80);
        taskEl.style.borderLeftColor = '#ef4444';
        const tip = document.createElement('div');
        tip.style.cssText = 'margin-top:8px;font-size:11px;color:var(--text-dim,#888);line-height:1.6;';
        tip.innerHTML = `
          常见原因:<br>
          ① ComfyUI 服务未启动<br>
          ② 模型 <code>sd_xl_base_1.0.safetensors</code> 未安装（可在「导出 JSON」后手动粘贴）<br>
          ③ 地址错误，请检查配置页中的服务器地址`;
        taskEl.appendChild(tip);
      }
    }

    /**
     * 批量发送分镜
     */
    async sendShotBatch(shots) {
      const tasksModal = document.getElementById('comfyui-tasks-modal');
      if (tasksModal) tasksModal.style.display = 'flex';
      for (const shot of shots) {
        await this.sendShot(shot);
      }
    }

    /**
     * 轮询获取执行结果
     */
    async _pollResult(promptId, taskEl) {
      const maxWaitMs = 180000;
      const intervalMs = 3000;
      const started = Date.now();

      while (Date.now() - started < maxWaitMs) {
        await new Promise(r => setTimeout(r, intervalMs));
        try {
          const history = await this.connector.getHistory(promptId);
          const entry = history[promptId];
          if (entry && entry.outputs) {
            // 找到最后一个 SaveImage 节点的输出
            for (const nodeId in entry.outputs) {
              const output = entry.outputs[nodeId];
              if (output.images && output.images.length > 0) {
                const img = output.images[0];
                return await this.connector.getImageUrl(img.filename, img.subfolder || '', img.type || 'output');
              }
            }
          }
        } catch (e) {
          // 还没完成就会失败
        }
        const elapsed = Math.floor((Date.now() - started) / 1000);
        const el = taskEl.querySelector('div:nth-child(2)');
        if (el) el.textContent = `状态: 执行中... (${elapsed}s)`;
      }
      throw new Error('等待超时（180s），请在 ComfyUI 面板查看');
    }

    /**
     * 导出分镜对应的工作流 JSON，供用户手动在 ComfyUI 粘贴
     */
    exportWorkflowJSON(shot) {
      const { workflow, prompts, size } = this.builder.buildFromShot(shot);

      const wrapper = {
        source: '短剧创作工作台',
        shot: { id: shot.id, type: shot.type, scene: shot.scene, content: shot.content },
        positive_prompt: prompts.positive,
        negative_prompt: prompts.negative,
        size,
        exported_at: new Date().toISOString(),
        // ComfyUI API 格式：直接粘贴到 ComfyUI 的 "Load API JSON"
        prompt_api_json: workflow,
        // 友好提示
        _usage: '将 prompt_api_json 的内容整体复制，在 ComfyUI 菜单点击 "Load" → "Load API JSON" 粘贴即可。'
      };

      const blob = new Blob([JSON.stringify(wrapper, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comfyui_workflow_shot_${shot.id || 'x'}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // 预览提示
      alert('✅ 工作流 JSON 已导出。\n\n使用方法：\n1. 打开导出的 .json 文件\n2. 复制其中 "prompt_api_json" 部分\n3. 打开 ComfyUI 页面，点击菜单 Load → Load API JSON 粘贴即可\n\n正向提示词：\n' + prompts.positive.slice(0, 300));
    }
  }

  // ==================== 全局暴露 ====================
  window.ComfyUIConnector = ComfyUIConnector;
  window.WorkflowBuilder = WorkflowBuilder;
  window.PromptTranslator = PromptTranslator;
  window.ComfyUIManager = new ComfyUIManager();

  // 页面加载后自动初始化 UI 并注入按钮
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => window.ComfyUIManager.initUI(), 500);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => window.ComfyUIManager.initUI(), 500);
    });
  }

})();
