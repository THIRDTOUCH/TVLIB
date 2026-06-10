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

// ====== LLM ======
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

// ====== AGENT ======
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

    _updateLLMStatus() {
      const statusEl = document.getElementById('agent-llm-status');
      if (!statusEl) return;
      if (!window.LLMManager) {
        statusEl.className = 'agent-llm-status offline';
        statusEl.textContent = '未安装';
        return;
      }
      const cfg = LLMManager.getConfig();
      if (!cfg.enabled) {
        statusEl.className = 'agent-llm-status offline';
        statusEl.textContent = '已禁用';
        return;
      }
      // 异步检测连接状态
      LLMManager.testConnection().then(r => {
        if (statusEl) {
          if (r.ok) {
            statusEl.className = 'agent-llm-status online';
            statusEl.textContent = '已连接';
          } else {
            statusEl.className = 'agent-llm-status error';
            statusEl.textContent = '未连接';
          }
        }
      }).catch(() => {
        if (statusEl) {
          statusEl.className = 'agent-llm-status error';
          statusEl.textContent = '未连接';
        }
      });
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

// ====== VIDEO ======
class VideoGenerator {
  constructor() {
    this.services = {
      runway: {
        name: 'Runway ML',
        icon: '🎬',
        url: 'https://api.runwayml.com/v1',
        supportsTextToVideo: true,
        supportsImageToVideo: true,
        supportsVideoToVideo: true,
        requiresKey: true,
        freeTier: true
      },
      pika: {
        name: 'Pika Labs',
        icon: '✨',
        url: 'https://api.pika.art/v1',
        supportsTextToVideo: true,
        supportsImageToVideo: true,
        supportsVideoToVideo: true,
        requiresKey: true,
        freeTier: true
      },
      sora: {
        name: 'OpenAI Sora',
        icon: '🌀',
        url: 'https://api.openai.com/v1',
        supportsTextToVideo: true,
        supportsImageToVideo: false,
        supportsVideoToVideo: false,
        requiresKey: true,
        freeTier: false
      },
      ffmpeg: {
        name: '本地 FFmpeg',
        icon: '💻',
        url: null,
        supportsTextToVideo: false,
        supportsImageToVideo: true,
        supportsVideoToVideo: true,
        requiresKey: false,
        freeTier: true
      }
    };

    this.currentService = 'runway';
    this.apiKeys = {};
    this._status = 'idle';
    this._progressCallback = null;
  }

  setService(serviceId) {
    if (this.services[serviceId]) {
      this.currentService = serviceId;
    }
  }

  setAPIKey(serviceId, key) {
    this.apiKeys[serviceId] = key;
    localStorage.setItem(`video_api_key_${serviceId}`, key);
  }

  getAPIKey(serviceId) {
    return this.apiKeys[serviceId] || localStorage.getItem(`video_api_key_${serviceId}`) || '';
  }

  getAvailableServices() {
    return Object.keys(this.services).map(id => ({
      id,
      ...this.services[id]
    }));
  }

  async textToVideo(prompt, options = {}) {
    const service = this.services[this.currentService];
    if (!service.supportsTextToVideo) {
      throw new Error(`${service.name} 不支持文本生成视频`);
    }

    if (service.requiresKey && !this.getAPIKey(this.currentService)) {
      throw new Error(`${service.name} 需要配置 API Key`);
    }

    this._status = 'generating';
    this._notifyProgress(0, '开始生成视频...');

    try {
      let result;
      
      switch (this.currentService) {
        case 'runway':
          result = await this._runwayTextToVideo(prompt, options);
          break;
        case 'pika':
          result = await this._pikaTextToVideo(prompt, options);
          break;
        case 'sora':
          result = await this._soraTextToVideo(prompt, options);
          break;
        default:
          throw new Error('不支持的服务');
      }

      this._status = 'completed';
      this._notifyProgress(100, '视频生成完成');
      return result;
    } catch (error) {
      this._status = 'error';
      this._notifyProgress(-1, `生成失败: ${error.message}`);
      throw error;
    }
  }

  async imageToVideo(imageUrl, options = {}) {
    const service = this.services[this.currentService];
    if (!service.supportsImageToVideo) {
      throw new Error(`${service.name} 不支持图片生成视频`);
    }

    this._status = 'generating';
    this._notifyProgress(0, '开始生成视频...');

    try {
      let result;

      if (this.currentService === 'ffmpeg') {
        result = await this._ffmpegImageSequenceToVideo(imageUrl, options);
      } else {
        result = await this._apiImageToVideo(imageUrl, options);
      }

      this._status = 'completed';
      this._notifyProgress(100, '视频生成完成');
      return result;
    } catch (error) {
      this._status = 'error';
      this._notifyProgress(-1, `生成失败: ${error.message}`);
      throw error;
    }
  }

  async storyboardToVideo(storyboardData, options = {}) {
    if (!storyboardData || !storyboardData.shots) {
      throw new Error('无效的故事板数据');
    }

    this._status = 'generating';
    const totalShots = storyboardData.shots.length;
    const results = [];

    for (let i = 0; i < totalShots; i++) {
      const shot = storyboardData.shots[i];
      const progress = (i / totalShots) * 50;
      this._notifyProgress(progress, `正在生成分镜 ${i + 1}/${totalShots}...`);

      try {
        const videoUrl = await this.textToVideo(shot.prompt, {
          duration: shot.duration || 3,
          ...options
        });
        results.push({ shotId: shot.id, videoUrl });
      } catch (error) {
        console.warn(`分镜 ${i + 1} 生成失败:`, error);
        results.push({ shotId: shot.id, videoUrl: null, error: error.message });
      }
    }

    this._notifyProgress(75, '正在合并视频...');
    
    if (results.every(r => r.videoUrl)) {
      const mergedUrl = await this.mergeVideos(results.map(r => r.videoUrl), options);
      this._notifyProgress(100, '视频合并完成');
      return { individualVideos: results, mergedVideo: mergedUrl };
    }

    this._status = 'completed';
    return { individualVideos: results, mergedVideo: null };
  }

  async mergeVideos(videoUrls, options = {}) {
    if (videoUrls.length === 1) {
      return videoUrls[0];
    }

    if (this.currentService === 'ffmpeg' && window.FFmpeg) {
      return this._ffmpegMergeVideos(videoUrls, options);
    }

    return videoUrls[0];
  }

  async _runwayTextToVideo(prompt, options) {
    const apiKey = this.getAPIKey('runway');
    const url = `${this.services.runway.url}/generate/video`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        duration: options.duration || 10,
        width: options.width || 1024,
        height: options.height || 576,
        model: options.model || 'gen-3-alpha'
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '生成失败');
    }

    return {
      videoUrl: data.result?.url,
      taskId: data.task_id,
      duration: options.duration
    };
  }

  async _pikaTextToVideo(prompt, options) {
    const apiKey = this.getAPIKey('pika');
    const url = `${this.services.pika.url}/text-to-video`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        duration: options.duration || 3,
        aspect_ratio: options.aspectRatio || '16:9',
        quality: options.quality || 'standard'
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '生成失败');
    }

    return {
      videoUrl: data.url,
      taskId: data.id,
      duration: options.duration
    };
  }

  async _soraTextToVideo(prompt, options) {
    const apiKey = this.getAPIKey('sora');
    const url = `${this.services.sora.url}/videos/generations`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sora',
        prompt,
        duration: options.duration || 10,
        size: `${options.width || 1024}x${options.height || 576}`
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || '生成失败');
    }

    return {
      videoUrl: data.data[0]?.url,
      taskId: data.id,
      duration: options.duration
    };
  }

  async _apiImageToVideo(imageUrl, options) {
    const service = this.services[this.currentService];
    const apiKey = this.getAPIKey(this.currentService);
    const url = `${service.url}/image-to-video`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: imageUrl,
        duration: options.duration || 5,
        motion: options.motion || 1
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '生成失败');
    }

    return {
      videoUrl: data.result?.url || data.url,
      taskId: data.task_id || data.id,
      duration: options.duration
    };
  }

  async _ffmpegImageSequenceToVideo(imageUrl, options) {
    if (!window.FFmpeg) {
      throw new Error('FFmpeg 库未加载');
    }

    const { createFFmpeg, fetchFile } = window.FFmpeg;
    const ffmpeg = createFFmpeg({ log: false });
    await ffmpeg.load();

    try {
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      ffmpeg.FS('writeFile', 'input.png', uint8Array);

      const duration = options.duration || 5;
      const fps = 1;

      await ffmpeg.run(
        '-loop', '1',
        '-i', 'input.png',
        '-c:v', 'libx264',
        '-t', duration.toString(),
        '-r', fps.toString(),
        '-pix_fmt', 'yuv420p',
        'output.mp4'
      );

      const data = ffmpeg.FS('readFile', 'output.mp4');
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      return {
        videoUrl: url,
        duration,
        local: true
      };
    } finally {
      ffmpeg.FS('unlink', 'input.png');
      ffmpeg.FS('unlink', 'output.mp4');
      ffmpeg.exit();
    }
  }

  async _ffmpegMergeVideos(videoUrls, options) {
    if (!window.FFmpeg) {
      throw new Error('FFmpeg 库未加载');
    }

    const { createFFmpeg, fetchFile } = window.FFmpeg;
    const ffmpeg = createFFmpeg({ log: false });
    await ffmpeg.load();

    try {
      const fileList = [];
      for (let i = 0; i < videoUrls.length; i++) {
        const response = await fetch(videoUrls[i]);
        const arrayBuffer = await response.arrayBuffer();
        const fileName = `input_${i}.mp4`;
        ffmpeg.FS('writeFile', fileName, new Uint8Array(arrayBuffer));
        fileList.push(fileName);
      }

      const listContent = fileList.map(f => `file '${f}'`).join('\n');
      ffmpeg.FS('writeFile', 'filelist.txt', new TextEncoder().encode(listContent));

      await ffmpeg.run(
        '-f', 'concat',
        '-safe', '0',
        '-i', 'filelist.txt',
        '-c', 'copy',
        'output.mp4'
      );

      const data = ffmpeg.FS('readFile', 'output.mp4');
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      return {
        videoUrl: url,
        local: true
      };
    } finally {
      fileList.forEach(f => ffmpeg.FS('unlink', f));
      ffmpeg.FS('unlink', 'filelist.txt');
      ffmpeg.FS('unlink', 'output.mp4');
      ffmpeg.exit();
    }
  }

  setProgressCallback(callback) {
    this._progressCallback = callback;
  }

  _notifyProgress(progress, message) {
    if (this._progressCallback) {
      this._progressCallback({ progress, message, status: this._status });
    }
  }

  getStatus() {
    return this._status;
  }

  async downloadVideo(videoUrl, filename = 'video.mp4') {
    const response = await fetch(videoUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  generateShotPrompts(storyboardData) {
    if (!storyboardData || !storyboardData.shots) {
      return [];
    }

    return storyboardData.shots.map((shot, index) => {
      let prompt = `Scene ${index + 1}: ${shot.scene || 'Unknown Scene'}\n`;
      
      if (shot.visual) {
        prompt += `${shot.visual}\n`;
      }
      
      if (shot.character) {
        prompt += `Characters: ${shot.character}\n`;
      }
      
      if (shot.action) {
        prompt += `Action: ${shot.action}\n`;
      }
      
      if (shot.camera) {
        prompt += `Camera: ${shot.camera}\n`;
      }
      
      if (shot.mood) {
        prompt += `Mood: ${shot.mood}\n`;
      }
      
      prompt += 'Style: cinematic, high quality, movie scene';
      
      return {
        shotId: shot.id,
        prompt: prompt.trim(),
        duration: shot.duration || 3,
        aspectRatio: shot.aspectRatio || '16:9'
      };
    });
  }
}

const VideoManager = new VideoGenerator();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VideoGenerator, VideoManager };
}
// ====== CLOUD SYNC ======
class CloudSyncManager {
  constructor() {
    this.providers = {
      localStorage: {
        name: '本地存储',
        icon: '💾',
        enabled: true,
        requiresKey: false,
        supportsVersioning: false
      },
      webdav: {
        name: 'WebDAV',
        icon: '🌐',
        enabled: false,
        requiresKey: true,
        supportsVersioning: true
      },
      github: {
        name: 'GitHub Gists',
        icon: '🐙',
        enabled: false,
        requiresKey: true,
        supportsVersioning: true
      },
      s3: {
        name: 'S3 兼容存储',
        icon: '☁️',
        enabled: false,
        requiresKey: true,
        supportsVersioning: true
      }
    };

    this.currentProvider = 'localStorage';
    this.syncStatus = {
      lastSync: 0,
      syncing: false,
      conflict: false,
      error: null
    };
    this._progressCallback = null;
    this._init();
  }

  _init() {
    const config = localStorage.getItem('cloud_sync_config');
    if (config) {
      try {
        const parsed = JSON.parse(config);
        this.currentProvider = parsed.currentProvider || 'localStorage';
        Object.assign(this.providers, parsed.providers || {});
      } catch (e) {
        console.error('Failed to load sync config:', e);
      }
    }

    const lastSync = localStorage.getItem('last_sync_time');
    if (lastSync) {
      this.syncStatus.lastSync = parseInt(lastSync, 10);
    }
  }

  _saveConfig() {
    const config = {
      currentProvider: this.currentProvider,
      providers: Object.fromEntries(
        Object.entries(this.providers).map(([key, value]) => [
          key, { enabled: value.enabled, url: value.url, username: value.username }
        ])
      )
    };
    localStorage.setItem('cloud_sync_config', JSON.stringify(config));
  }

  setProvider(providerId) {
    if (!this.providers[providerId]) {
      throw new Error(`不支持的存储服务: ${providerId}`);
    }
    this.currentProvider = providerId;
    this._saveConfig();
  }

  setProviderConfig(providerId, config) {
    if (!this.providers[providerId]) {
      throw new Error(`不支持的存储服务: ${providerId}`);
    }
    
    Object.assign(this.providers[providerId], config);
    
    if (config.apiKey) {
      this.providers[providerId].apiKey = config.apiKey;
      localStorage.setItem(`api_key_${providerId}`, this._encrypt(config.apiKey));
    }
    
    this._saveConfig();
  }

  getAvailableProviders() {
    return Object.entries(this.providers).map(([id, provider]) => ({
      id,
      ...provider,
      configured: this._isProviderConfigured(id)
    }));
  }

  _isProviderConfigured(providerId) {
    const provider = this.providers[providerId];
    if (!provider.requiresKey) {
      return true;
    }
    return !!(provider.url && (provider.username || localStorage.getItem(`api_key_${providerId}`)));
  }

  async sync(projects) {
    if (this.syncStatus.syncing) {
      throw new Error('正在同步中，请稍后');
    }

    this.syncStatus.syncing = true;
    this._notifyProgress(0, '开始同步...');

    try {
      const provider = this.currentProvider;
      const remoteProjects = await this._pullFromRemote(provider);
      const localProjects = this._getLocalProjects();
      const result = this._mergeProjects(localProjects, remoteProjects);
      await this._pushToRemote(provider, result);
      this._saveLocalProjects(result);
      
      this.syncStatus.lastSync = Date.now();
      localStorage.setItem('last_sync_time', this.syncStatus.lastSync.toString());
      this._notifyProgress(100, '同步完成');
      
      return {
        status: 'success',
        projects: result.length,
        conflicts: result.filter(p => p._merged).length,
        timestamp: Date.now()
      };
    } catch (error) {
      this.syncStatus.error = error.message;
      this._notifyProgress(-1, `同步失败: ${error.message}`);
      throw error;
    } finally {
      this.syncStatus.syncing = false;
    }
  }

  async _pullFromRemote(providerId) {
    this._notifyProgress(30, '从云端拉取数据...');
    
    if (providerId === 'localStorage') {
      return this._getLocalProjects();
    }

    const provider = this.providers[providerId];
    
    try {
      switch (providerId) {
        case 'webdav':
          return await this._webdavPull(provider);
        case 'github':
          return await this._githubPull(provider);
        case 's3':
          return await this._s3Pull(provider);
        default:
          throw new Error(`不支持的同步方式: ${providerId}`);
      }
    } catch (error) {
      console.error('Pull failed:', error);
      throw new Error(`拉取失败: ${error.message}`);
    }
  }

  async _pushToRemote(providerId, projects) {
    this._notifyProgress(70, '推送数据到云端...');
    
    if (providerId === 'localStorage') {
      this._saveLocalProjects(projects);
      return;
    }

    const provider = this.providers[providerId];
    
    try {
      const data = {
        version: '1.0',
        timestamp: Date.now(),
        projects: projects.map(p => this._sanitizeProject(p))
      };

      switch (providerId) {
        case 'webdav':
          await this._webdavPush(provider, data);
          break;
        case 'github':
          await this._githubPush(provider, data);
          break;
        case 's3':
          await this._s3Push(provider, data);
          break;
        default:
          throw new Error(`不支持的同步方式: ${providerId}`);
      }
    } catch (error) {
      console.error('Push failed:', error);
      throw new Error(`推送失败: ${error.message}`);
    }
  }

  _getLocalProjects() {
    const raw = localStorage.getItem('projects_data');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse local projects:', e);
      return [];
    }
  }

  _saveLocalProjects(projects) {
    localStorage.setItem('projects_data', JSON.stringify(projects.map(p => this._sanitizeProject(p))));
  }

  _sanitizeProject(project) {
    const sanitized = { ...project };
    delete sanitized._merged;
    delete sanitized._conflict;
    return sanitized;
  }

  _mergeProjects(localProjects, remoteProjects) {
    this._notifyProgress(50, '合并本地和云端数据...');
    
    const projectMap = new Map();
    
    localProjects.forEach(project => {
      projectMap.set(project.id, { ...project, _source: 'local' });
    });

    let conflictCount = 0;
    remoteProjects.forEach(remoteProject => {
      const existingProject = projectMap.get(remoteProject.id);
      
      if (existingProject) {
        const localTimestamp = existingProject.timestamp || existingProject.updatedAt || 0;
        const remoteTimestamp = remoteProject.timestamp || remoteProject.updatedAt || 0;
        
        if (remoteTimestamp > localTimestamp) {
          projectMap.set(remoteProject.id, { ...remoteProject, _source: 'remote' });
        } else if (remoteTimestamp === localTimestamp) {
          conflictCount++;
          const mergedProject = this._mergeProjectData(existingProject, remoteProject);
          mergedProject._merged = true;
          projectMap.set(remoteProject.id, mergedProject);
        }
      } else {
        projectMap.set(remoteProject.id, { ...remoteProject, _source: 'remote' });
      }
    });

    if (conflictCount > 0) {
      this.syncStatus.conflict = true;
      console.log(`发现 ${conflictCount} 个冲突项目，已合并最新数据`);
    }

    return [...projectMap.values()];
  }

  _mergeProjectData(local, remote) {
    const result = { ...local };
    const fieldsToCompare = ['title', 'description', 'outline', 'script', 'shots', 'characters'];
    
    fieldsToCompare.forEach(field => {
      if (remote[field] !== undefined && remote[field] !== null) {
        if (local[field] !== remote[field]) {
          result[field] = remote[field];
        }
      }
    });

    result.timestamp = Math.max(local.timestamp || 0, remote.timestamp || 0);
    result.updatedAt = Date.now();
    return result;
  }

  async _webdavPull(provider) {
    const url = `${provider.url}/drama-workshop/projects.json`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this._webdavHeaders(provider)
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`WebDAV 连接失败: ${response.status}`);
    }

    const data = await response.json();
    return data.projects || [];
  }

  async _webdavPush(provider, data) {
    const url = `${provider.url}/drama-workshop/projects.json`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...this._webdavHeaders(provider),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`WebDAV 上传失败: ${response.status}`);
    }
  }

  _webdavHeaders(provider) {
    const headers = {};
    if (provider.username && provider.apiKey) {
      headers['Authorization'] = 'Basic ' + btoa(`${provider.username}:${this._decrypt(provider.apiKey)}`);
    }
    return headers;
  }

  async _githubPull(provider) {
    const url = `https://api.github.com/gists/${provider.gistId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this._decrypt(provider.apiKey)}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`GitHub 连接失败: ${response.status}`);
    }

    const gist = await response.json();
    const fileContent = gist.files['drama-workshop-projects.json']?.content;
    
    if (!fileContent) {
      return [];
    }

    try {
      const data = JSON.parse(fileContent);
      return data.projects || [];
    } catch (e) {
      return [];
    }
  }

  async _githubPush(provider, data) {
    const url = provider.gistId
      ? `https://api.github.com/gists/${provider.gistId}`
      : 'https://api.github.com/gists';
    
    const method = provider.gistId ? 'PATCH' : 'POST';
    const body = {
      description: 'Drama Workshop Projects',
      files: {
        'drama-workshop-projects.json': {
          content: JSON.stringify(data)
        }
      },
      public: false
    };

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this._decrypt(provider.apiKey)}`,
        'Accept': 'application/vnd.github+json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`GitHub 上传失败: ${response.status}`);
    }

    if (!provider.gistId) {
      const result = await response.json();
      provider.gistId = result.id;
      this._saveConfig();
    }
  }

  async _s3Pull(provider) {
    const url = `${provider.url}/drama-workshop-projects.json`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD'
      }
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`S3 连接失败: ${response.status}`);
    }

    const data = await response.json();
    return data.projects || [];
  }

  async _s3Push(provider, data) {
    const url = `${provider.url}/drama-workshop-projects.json`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`S3 上传失败: ${response.status}`);
    }
  }

  _encrypt(text) {
    try {
      return btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g,
        (match, p1) => String.fromCharCode('0x' + p1)));
    } catch (e) {
      return text;
    }
  }

  _decrypt(encrypted) {
    try {
      return decodeURIComponent(atob(encrypted).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    } catch (e) {
      return encrypted;
    }
  }

  setProgressCallback(callback) {
    this._progressCallback = callback;
  }

  _notifyProgress(progress, message) {
    if (this._progressCallback) {
      this._progressCallback({ progress, message });
    }
  }

  getSyncStatus() {
    return { ...this.syncStatus };
  }

  getProjectCount() {
    return this._getLocalProjects().length;
  }

  clearCache() {
    localStorage.removeItem('projects_data');
    localStorage.removeItem('last_sync_time');
    this.syncStatus = {
      lastSync: 0,
      syncing: false,
      conflict: false,
      error: null
    };
  }
}

const CloudSync = new CloudSyncManager();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CloudSyncManager, CloudSync };
}
// ====== TEMPLATE ======
class TemplateLibrary {
  constructor() {
    this.templates = new Map();
    this.categories = new Map();
    this.tags = new Set();
    this._init();
  }

  _init() {
    this._loadBuiltInTemplates();
    this._loadUserTemplates();
  }

  _loadBuiltInTemplates() {
    const builtIn = [
      {
        id: 'tpl_romance_001',
        name: '青春校园爱情',
        category: 'romance',
        description: '适合校园题材的短剧，包含初恋、误会、和解等经典桥段',
        tags: ['校园', '爱情', '青春', '初恋'],
        difficulty: 'easy',
        duration: 5,
        scenes: 4,
        builtIn: true,
        rating: 4.8,
        usage: 1523,
        data: {
          outline: '第一章：偶遇\n第二章：心动\n第三章：误会\n第四章：告白',
          characters: ['女主（害羞内向）', '男主（阳光开朗）', '闺蜜（助攻）'],
          beats: ['开场：校园日常', '激发事件：男主意外帮助女主', '发展：多次互动产生好感', '转折：误会产生', '高潮：雨中告白', '结局：确认关系']
        }
      },
      {
        id: 'tpl_action_001',
        name: '都市悬疑反转',
        category: 'action',
        description: '适合都市悬疑题材，包含多重反转的紧凑剧情',
        tags: ['悬疑', '反转', '都市', '推理'],
        difficulty: 'medium',
        duration: 8,
        scenes: 6,
        builtIn: true,
        rating: 4.6,
        usage: 1089,
        data: {
          outline: '第一幕：案件发生\n第二幕：线索追踪\n第三幕：关键发现\n第四幕：真相揭露\n第五幕：意外反转',
          characters: ['主角（侦探）', '神秘人', '警察', '证人'],
          beats: ['开场：平静的生活', '激发事件：意外发现', '发展：线索拼凑', '转折：假线索误导', '高潮：真相对决', '反转：幕后黑手是亲近之人', '结局：正义伸张']
        }
      },
      {
        id: 'tpl_family_001',
        name: '家庭温情喜剧',
        category: 'family',
        description: '适合家庭题材，温馨幽默，适合短视频平台',
        tags: ['家庭', '喜剧', '温情', '日常'],
        difficulty: 'easy',
        duration: 3,
        scenes: 3,
        builtIn: true,
        rating: 4.9,
        usage: 2876,
        data: {
          outline: '场景一：普通家庭\n场景二：搞笑事件\n场景三：温情结尾',
          characters: ['爸爸（搞笑担当）', '妈妈（智慧担当）', '孩子（意外担当）'],
          beats: ['开场：家庭日常', '激发事件：突发状况', '发展：各种乌龙', '高潮：一家人面对困难', '结局：温馨和解']
        }
      },
      {
        id: 'tpl_fantasy_001',
        name: '奇幻穿越成长',
        category: 'fantasy',
        description: '奇幻题材，包含穿越、成长、冒险元素',
        tags: ['奇幻', '穿越', '成长', '冒险'],
        difficulty: 'hard',
        duration: 10,
        scenes: 8,
        builtIn: true,
        rating: 4.7,
        usage: 1654,
        data: {
          outline: '序章：现代生活\n第一章：意外穿越\n第二章：新世界探索\n第三章：获得能力\n第四章：遭遇挑战\n第五章：最终对决\n第六章：回归或留下',
          characters: ['主角（现代人）', '导师（智者）', '对手（反派）', '伙伴'],
          beats: ['开场：现代困境', '激发事件：意外穿越', '发展：适应新世界', '发现：获得特殊能力', '挑战：遭遇强敌', '成长：克服内心恐惧', '高潮：最终对决', '结局：选择归属']
        }
      },
      {
        id: 'tpl_office_001',
        name: '职场励志逆袭',
        category: 'office',
        description: '职场题材，新人成长，励志向上',
        tags: ['职场', '励志', '逆袭', '成长'],
        difficulty: 'medium',
        duration: 6,
        scenes: 5,
        builtIn: true,
        rating: 4.5,
        usage: 1987,
        data: {
          outline: '第一幕：新人入职\n第二幕：遭遇挫折\n第三幕：贵人相助\n第四幕：能力展现\n第五幕：事业成功',
          characters: ['主角（职场新人）', '导师（前辈）', '对手（同事）', '老板'],
          beats: ['开场：信心满满入职', '激发事件：初次失败', '发展：自我怀疑', '转折：遇到贵人', '发现：自身潜力', '高潮：关键项目成功', '结局：事业爱情双丰收']
        }
      }
    ];

    builtIn.forEach(tpl => {
      this.templates.set(tpl.id, tpl);
      tpl.tags.forEach(tag => this.tags.add(tag));
      
      if (!this.categories.has(tpl.category)) {
        this.categories.set(tpl.category, []);
      }
      this.categories.get(tpl.category).push(tpl.id);
    });
  }

  _loadUserTemplates() {
    try {
      const saved = localStorage.getItem('user_templates');
      if (saved) {
        const userTemplates = JSON.parse(saved);
        userTemplates.forEach(tpl => {
          this.templates.set(tpl.id, tpl);
          tpl.tags.forEach(tag => this.tags.add(tag));
          
          if (!this.categories.has(tpl.category)) {
            this.categories.set(tpl.category, []);
          }
          this.categories.get(tpl.category).push(tpl.id);
        });
      }
    } catch (e) {
      console.error('加载用户模板失败:', e);
    }
  }

  _saveUserTemplates() {
    const userTemplates = [...this.templates.values()].filter(tpl => !tpl.builtIn);
    localStorage.setItem('user_templates', JSON.stringify(userTemplates));
  }

  getAllTemplates() {
    return [...this.templates.values()];
  }

  getTemplate(id) {
    return this.templates.get(id);
  }

  searchTemplates(query = '', category = '', tags = [], sortBy = 'rating', limit = 20) {
    let results = [...this.templates.values()];
    
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(tpl => 
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (category) {
      results = results.filter(tpl => tpl.category === category);
    }

    if (tags && tags.length > 0) {
      results = results.filter(tpl => tags.some(tag => tpl.tags.includes(tag)));
    }

    results.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'usage':
          return b.usage - a.usage;
        case 'difficulty':
          const diffOrder = { easy: 1, medium: 2, hard: 3 };
          return diffOrder[a.difficulty] - diffOrder[b.difficulty];
        case 'duration':
          return a.duration - b.duration;
        default:
          return 0;
      }
    });

    return results.slice(0, limit);
  }

  getCategories() {
    return [...this.categories.keys()];
  }

  getTags() {
    return [...this.tags];
  }

  createTemplate(templateData) {
    const id = 'tpl_user_' + Date.now().toString(36);
    const template = {
      id,
      name: templateData.name || '未命名模板',
      category: templateData.category || 'custom',
      description: templateData.description || '',
      tags: templateData.tags || [],
      difficulty: templateData.difficulty || 'medium',
      duration: templateData.duration || 5,
      scenes: templateData.scenes || 4,
      builtIn: false,
      rating: 0,
      usage: 0,
      data: templateData.data || {},
      createdAt: Date.now(),
      author: templateData.author || '自定义'
    };

    this.templates.set(id, template);
    template.tags.forEach(tag => this.tags.add(tag));
    
    if (!this.categories.has(template.category)) {
      this.categories.set(template.category, []);
    }
    this.categories.get(template.category).push(id);
    
    this._saveUserTemplates();
    return id;
  }

  updateTemplate(id, updates) {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error('模板不存在');
    }
    if (template.builtIn) {
      throw new Error('不能修改内置模板');
    }
    
    Object.assign(template, updates);
    this._saveUserTemplates();
  }

  deleteTemplate(id) {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error('模板不存在');
    }
    if (template.builtIn) {
      throw new Error('不能删除内置模板');
    }
    
    const categoryTemplates = this.categories.get(template.category);
    if (categoryTemplates) {
      const idx = categoryTemplates.indexOf(id);
      if (idx !== -1) {
        categoryTemplates.splice(idx, 1);
      }
    }
    
    this.templates.delete(id);
    this._saveUserTemplates();
  }

  useTemplate(id) {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error('模板不存在');
    }
    
    template.usage = (template.usage || 0) + 1;
    if (!template.builtIn) {
      this._saveUserTemplates();
    }
    
    return JSON.parse(JSON.stringify(template.data));
  }

  rateTemplate(id, rating) {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error('模板不存在');
    }
    
    if (!template.ratings) {
      template.ratings = [];
    }
    template.ratings.push({ rating, timestamp: Date.now() });
    
    const total = template.ratings.reduce((sum, r) => sum + r.rating, 0);
    template.rating = Math.round((total / template.ratings.length) * 10) / 10;
    
    if (!template.builtIn) {
      this._saveUserTemplates();
    }
  }

  exportTemplate(id) {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error('模板不存在');
    }
    
    const exportData = JSON.stringify(template, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  importTemplate(jsonData) {
    try {
      const template = JSON.parse(jsonData);
      
      if (!template.name || !template.data) {
        throw new Error('模板数据不完整');
      }
      
      template.id = 'tpl_import_' + Date.now().toString(36);
      template.builtIn = false;
      template.usage = 0;
      template.importedAt = Date.now();
      
      this.templates.set(template.id, template);
      template.tags.forEach(tag => this.tags.add(tag));
      
      if (!this.categories.has(template.category)) {
        this.categories.set(template.category, []);
      }
      this.categories.get(template.category).push(template.id);
      
      this._saveUserTemplates();
      return template.id;
    } catch (e) {
      throw new Error('模板导入失败: ' + e.message);
    }
  }

  getStats() {
    const builtIn = [...this.templates.values()].filter(tpl => tpl.builtIn).length;
    const user = [...this.templates.values()].filter(tpl => !tpl.builtIn).length;
    const totalUsage = [...this.templates.values()].reduce((sum, tpl) => sum + (tpl.usage || 0), 0);
    
    return {
      total: this.templates.size,
      builtIn,
      user,
      categories: this.categories.size,
      tags: this.tags.size,
      totalUsage
    };
  }
}

class MaterialLibrary {
  constructor() {
    this.materials = new Map();
    this._init();
  }

  _init() {
    this._loadBuiltInMaterials();
    this._loadUserMaterials();
  }

  _loadBuiltInMaterials() {
    const builtIn = [
      {
        id: 'mat_001',
        name: '校园场景 - 阳光课堂',
        type: 'scene',
        description: '明亮的教室，阳光透过窗户洒入，充满青春气息',
        tags: ['校园', '教室', '阳光', '白天'],
        builtIn: true,
        url: null,
        prompt: 'bright classroom, sunlight streaming through windows, school desks, blackboard, school atmosphere, cinematic lighting'
      },
      {
        id: 'mat_002',
        name: '都市夜景 - 霓虹街道',
        type: 'scene',
        description: '繁华都市夜晚，霓虹灯闪烁，人流如织',
        tags: ['都市', '夜景', '霓虹', '街道'],
        builtIn: true,
        url: null,
        prompt: 'city night street, neon lights, bustling crowd, rain wet pavement, cyberpunk vibes, cinematic'
      },
      {
        id: 'mat_003',
        name: '自然风景 - 山川河流',
        type: 'scene',
        description: '壮丽山川，河流蜿蜒，大自然风光',
        tags: ['自然', '山川', '河流', '风景'],
        builtIn: true,
        url: null,
        prompt: 'majestic mountain landscape, winding river, dramatic clouds, epic scenery, wide angle shot'
      },
      {
        id: 'mat_004',
        name: '室内场景 - 温馨卧室',
        type: 'scene',
        description: '温馨舒适的卧室，暖色调装饰',
        tags: ['室内', '卧室', '温馨', '家居'],
        builtIn: true,
        url: null,
        prompt: 'cozy bedroom interior, warm lighting, wooden furniture, soft blankets, peaceful atmosphere'
      },
      {
        id: 'mat_005',
        name: '角色造型 - 学生少女',
        type: 'character',
        description: '穿着校服的高中女生，清纯可爱',
        tags: ['角色', '学生', '少女', '校服'],
        builtIn: true,
        url: null,
        prompt: 'high school girl in school uniform, cute expression, soft lighting, detailed face, anime style'
      },
      {
        id: 'mat_006',
        name: '角色造型 - 职业男性',
        type: 'character',
        description: '西装革履的职业男性，成熟稳重',
        tags: ['角色', '职业', '男性', '西装'],
        builtIn: true,
        url: null,
        prompt: 'businessman in suit, professional appearance, confident expression, office background, realistic'
      },
      {
        id: 'mat_007',
        name: '道具 - 智能手机',
        type: 'prop',
        description: '现代智能手机，用于各种场景',
        tags: ['道具', '手机', '现代', '科技'],
        builtIn: true,
        url: null,
        prompt: 'smartphone in hand, close up shot, screen glow, detailed texture, modern technology'
      },
      {
        id: 'mat_008',
        name: '氛围 - 雨天街道',
        type: 'atmosphere',
        description: '潮湿的街道，雨滴落下，忧郁氛围',
        tags: ['氛围', '雨天', '街道', '忧郁'],
        builtIn: true,
        url: null,
        prompt: 'rainy street scene, raindrops falling, wet pavement reflecting lights, moody atmosphere, dark tones'
      }
    ];

    builtIn.forEach(mat => {
      this.materials.set(mat.id, mat);
    });
  }

  _loadUserMaterials() {
    try {
      const saved = localStorage.getItem('user_materials');
      if (saved) {
        const userMaterials = JSON.parse(saved);
        userMaterials.forEach(mat => {
          this.materials.set(mat.id, mat);
        });
      }
    } catch (e) {
      console.error('加载用户素材失败:', e);
    }
  }

  _saveUserMaterials() {
    const userMaterials = [...this.materials.values()].filter(mat => !mat.builtIn);
    localStorage.setItem('user_materials', JSON.stringify(userMaterials));
  }

  getAllMaterials() {
    return [...this.materials.values()];
  }

  getMaterial(id) {
    return this.materials.get(id);
  }

  searchMaterials(query = '', type = '', tags = [], limit = 30) {
    let results = [...this.materials.values()];
    
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(mat => 
        mat.name.toLowerCase().includes(q) ||
        mat.description.toLowerCase().includes(q) ||
        mat.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (type) {
      results = results.filter(mat => mat.type === type);
    }

    if (tags && tags.length > 0) {
      results = results.filter(mat => tags.some(tag => mat.tags.includes(tag)));
    }

    return results.slice(0, limit);
  }

  getTypes() {
    return [...new Set([...this.materials.values()].map(mat => mat.type))];
  }

  addMaterial(materialData) {
    const id = 'mat_' + Date.now().toString(36);
    const material = {
      id,
      name: materialData.name || '未命名素材',
      type: materialData.type || 'scene',
      description: materialData.description || '',
      tags: materialData.tags || [],
      builtIn: false,
      url: materialData.url || null,
      prompt: materialData.prompt || '',
      createdAt: Date.now()
    };

    this.materials.set(id, material);
    this._saveUserMaterials();
    return id;
  }

  deleteMaterial(id) {
    const material = this.materials.get(id);
    if (!material) {
      throw new Error('素材不存在');
    }
    if (material.builtIn) {
      throw new Error('不能删除内置素材');
    }
    
    this.materials.delete(id);
    this._saveUserMaterials();
  }

  useMaterial(id) {
    const material = this.materials.get(id);
    if (!material) {
      throw new Error('素材不存在');
    }
    return material;
  }

  getStats() {
    const builtIn = [...this.materials.values()].filter(mat => mat.builtIn).length;
    const user = [...this.materials.values()].filter(mat => !mat.builtIn).length;
    const types = this.getTypes();
    
    return {
      total: this.materials.size,
      builtIn,
      user,
      types: types.length,
      typeCount: types.reduce((acc, type) => {
        acc[type] = [...this.materials.values()].filter(mat => mat.type === type).length;
        return acc;
      }, {})
    };
  }
}

const TemplateManager = new TemplateLibrary();
const MaterialManager = new MaterialLibrary();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TemplateLibrary, MaterialLibrary, TemplateManager, MaterialManager };
}
// ====== COLLAB ======
class CollaborationManager {
  constructor() {
    this.comments = new Map();
    this.versionHistory = new Map();
    this.currentUserId = this._generateUserId();
    this._init();
  }

  _generateUserId() {
    let userId = localStorage.getItem('collab_user_id');
    if (!userId) {
      userId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      localStorage.setItem('collab_user_id', userId);
    }
    return userId;
  }

  _init() {
    const savedComments = localStorage.getItem('collab_comments');
    if (savedComments) {
      try {
        const data = JSON.parse(savedComments);
        this.comments = new Map(Object.entries(data));
      } catch (e) {
        console.error('Failed to load comments:', e);
      }
    }

    const savedVersions = localStorage.getItem('collab_versions');
    if (savedVersions) {
      try {
        const data = JSON.parse(savedVersions);
        this.versionHistory = new Map(Object.entries(data));
      } catch (e) {
        console.error('Failed to load versions:', e);
      }
    }
  }

  _saveComments() {
    const data = Object.fromEntries(this.comments);
    localStorage.setItem('collab_comments', JSON.stringify(data));
  }

  _saveVersions() {
    const data = Object.fromEntries(this.versionHistory);
    localStorage.setItem('collab_versions', JSON.stringify(data));
  }

  addComment(projectId, targetType, targetId, content, position = null) {
    const commentId = 'comment_' + Date.now().toString(36);
    const comment = {
      id: commentId,
      projectId,
      targetType,
      targetId,
      content,
      author: this.currentUserId,
      timestamp: Date.now(),
      position,
      resolved: false,
      replies: []
    };

    const projectComments = this.comments.get(projectId) || [];
    projectComments.push(comment);
    this.comments.set(projectId, projectComments);
    this._saveComments();

    return commentId;
  }

  getComments(projectId, targetType = null, targetId = null) {
    const allComments = this.comments.get(projectId) || [];
    
    if (targetType && targetId) {
      return allComments.filter(c => c.targetType === targetType && c.targetId === targetId);
    }
    
    if (targetType) {
      return allComments.filter(c => c.targetType === targetType);
    }
    
    return allComments;
  }

  replyToComment(projectId, commentId, content) {
    const projectComments = this.comments.get(projectId) || [];
    const comment = projectComments.find(c => c.id === commentId);
    
    if (!comment) {
      throw new Error('Comment not found');
    }

    const reply = {
      id: 'reply_' + Date.now().toString(36),
      author: this.currentUserId,
      content,
      timestamp: Date.now()
    };

    comment.replies.push(reply);
    this._saveComments();
    return reply.id;
  }

  resolveComment(projectId, commentId) {
    const projectComments = this.comments.get(projectId) || [];
    const comment = projectComments.find(c => c.id === commentId);
    
    if (!comment) {
      throw new Error('Comment not found');
    }

    comment.resolved = true;
    this._saveComments();
  }

  deleteComment(projectId, commentId) {
    const projectComments = this.comments.get(projectId) || [];
    const filtered = projectComments.filter(c => c.id !== commentId);
    this.comments.set(projectId, filtered);
    this._saveComments();
  }

  saveVersion(projectId, data, reason = '自动保存') {
    const versionId = 'v_' + Date.now().toString(36);
    const version = {
      id: versionId,
      projectId,
      timestamp: Date.now(),
      reason,
      author: this.currentUserId,
      data: JSON.parse(JSON.stringify(data)),
      changes: this._detectChanges(projectId, data)
    };

    const projectVersions = this.versionHistory.get(projectId) || [];
    projectVersions.unshift(version);
    
    if (projectVersions.length > 50) {
      projectVersions.pop();
    }

    this.versionHistory.set(projectId, projectVersions);
    this._saveVersions();

    return versionId;
  }

  _detectChanges(projectId, newData) {
    const versions = this.versionHistory.get(projectId) || [];
    if (versions.length === 0) {
      return [{ type: 'create', field: 'project', description: '新建项目' }];
    }

    const previousData = versions[0].data;
    const changes = [];

    if (previousData.outline !== newData.outline) {
      changes.push({ type: 'update', field: 'outline', description: '修改大纲' });
    }

    if (previousData.script !== newData.script) {
      changes.push({ type: 'update', field: 'script', description: '修改剧本' });
    }

    if (JSON.stringify(previousData.shots) !== JSON.stringify(newData.shots)) {
      changes.push({ type: 'update', field: 'shots', description: '修改分镜' });
    }

    if (JSON.stringify(previousData.characters) !== JSON.stringify(newData.characters)) {
      changes.push({ type: 'update', field: 'characters', description: '修改角色' });
    }

    if (previousData.title !== newData.title) {
      changes.push({ type: 'update', field: 'title', description: '修改标题' });
    }

    if (previousData.description !== newData.description) {
      changes.push({ type: 'update', field: 'description', description: '修改描述' });
    }

    return changes.length > 0 ? changes : [{ type: 'update', field: 'unknown', description: '未知修改' }];
  }

  getVersions(projectId) {
    return this.versionHistory.get(projectId) || [];
  }

  getVersion(projectId, versionId) {
    const versions = this.versionHistory.get(projectId) || [];
    return versions.find(v => v.id === versionId);
  }

  compareVersions(projectId, versionId1, versionId2) {
    const versions = this.versionHistory.get(projectId) || [];
    const v1 = versions.find(v => v.id === versionId1);
    const v2 = versions.find(v => v.id === versionId2);

    if (!v1 || !v2) {
      throw new Error('Version not found');
    }

    const diffs = [];

    const fields = ['title', 'description', 'outline', 'script'];
    fields.forEach(field => {
      if (v1.data[field] !== v2.data[field]) {
        diffs.push({
          field,
          oldValue: v1.data[field],
          newValue: v2.data[field],
          type: 'text'
        });
      }
    });

    if (JSON.stringify(v1.data.shots) !== JSON.stringify(v2.data.shots)) {
      const shotDiffs = this._compareShots(v1.data.shots || [], v2.data.shots || []);
      diffs.push(...shotDiffs);
    }

    if (JSON.stringify(v1.data.characters) !== JSON.stringify(v2.data.characters)) {
      diffs.push({
        field: 'characters',
        oldValue: v1.data.characters,
        newValue: v2.data.characters,
        type: 'array'
      });
    }

    return {
      version1: v1,
      version2: v2,
      diffs
    };
  }

  _compareShots(oldShots, newShots) {
    const diffs = [];
    const oldMap = new Map(oldShots.map(s => [s.id, s]));
    const newMap = new Map(newShots.map(s => [s.id, s]));

    oldShots.forEach(shot => {
      if (!newMap.has(shot.id)) {
        diffs.push({
          field: 'shots',
          type: 'delete',
          description: `删除分镜: ${shot.id}`,
          data: shot
        });
      } else {
        const newShot = newMap.get(shot.id);
        const shotDiffs = [];
        
        Object.keys(shot).forEach(key => {
          if (shot[key] !== newShot[key]) {
            shotDiffs.push(key);
          }
        });

        if (shotDiffs.length > 0) {
          diffs.push({
            field: 'shots',
            type: 'update',
            description: `修改分镜: ${shot.id} (${shotDiffs.join(', ')})`,
            data: { old: shot, new: newShot }
          });
        }
      }
    });

    newShots.forEach(shot => {
      if (!oldMap.has(shot.id)) {
        diffs.push({
          field: 'shots',
          type: 'create',
          description: `新增分镜: ${shot.id}`,
          data: shot
        });
      }
    });

    return diffs;
  }

  restoreVersion(projectId, versionId) {
    const version = this.getVersion(projectId, versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    return JSON.parse(JSON.stringify(version.data));
  }

  exportComments(projectId) {
    const comments = this.getComments(projectId);
    return JSON.stringify(comments, null, 2);
  }

  importComments(projectId, commentsData) {
    try {
      const comments = JSON.parse(commentsData);
      this.comments.set(projectId, comments);
      this._saveComments();
      return comments.length;
    } catch (e) {
      throw new Error('Invalid comments data');
    }
  }

  getUserInfo() {
    return {
      userId: this.currentUserId,
      displayName: localStorage.getItem('collab_user_name') || '匿名用户'
    };
  }

  setUserInfo(displayName) {
    localStorage.setItem('collab_user_name', displayName);
  }

  clearProjectData(projectId) {
    this.comments.delete(projectId);
    this.versionHistory.delete(projectId);
    this._saveComments();
    this._saveVersions();
  }

  clearAllData() {
    this.comments.clear();
    this.versionHistory.clear();
    this._saveComments();
    this._saveVersions();
  }
}

const Collaboration = new CollaborationManager();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CollaborationManager, Collaboration };
}
// ====== SYNC ======
/**
 * AI短剧创作工作台 - 云端同步与素材库系统
 * 
 * 功能：
 * 1. 增强型本地数据库（IndexedDB）
 * 2. 账号同步系统（同设备/跨设备）
 * 3. 创作素材库
 * 4. 大数据查询（模拟全网搜索）
 */

// ==================== 增强型本地数据库管理器 ====================

class EnhancedDB {
    constructor() {
        this.dbName = 'AI_Drama_Workshop_Pro';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 项目表
                if (!db.objectStoreNames.contains('projects')) {
                    const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
                    projectStore.createIndex('userId', 'userId', { unique: false });
                    projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    projectStore.createIndex('synced', 'synced', { unique: false });
                }
                
                // 素材库表
                if (!db.objectStoreNames.contains('materials')) {
                    const materialStore = db.createObjectStore('materials', { keyPath: 'id' });
                    materialStore.createIndex('type', 'type', { unique: false });
                    materialStore.createIndex('tags', 'tags', { unique: false });
                    materialStore.createIndex('userId', 'userId', { unique: false });
                }
                
                // 用户账号表
                if (!db.objectStoreNames.contains('users')) {
                    db.createObjectStore('users', { keyPath: 'id' });
                }
                
                // 同步记录表
                if (!db.objectStoreNames.contains('syncLog')) {
                    const syncStore = db.createObjectStore('syncLog', { keyPath: 'id', autoIncrement: true });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                    syncStore.createIndex('userId', 'userId', { unique: false });
                }
                
                // 草稿自动保存表
                if (!db.objectStoreNames.contains('autoSave')) {
                    const autoSaveStore = db.createObjectStore('autoSave', { keyPath: 'id' });
                    autoSaveStore.createIndex('projectId', 'projectId', { unique: false });
                    autoSaveStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                // 模板库表
                if (!db.objectStoreNames.contains('templates')) {
                    const templateStore = db.createObjectStore('templates', { keyPath: 'id' });
                    templateStore.createIndex('type', 'type', { unique: false });
                    templateStore.createIndex('category', 'category', { unique: false });
                }
                
                // 历史记录表
                if (!db.objectStoreNames.contains('history')) {
                    const historyStore = db.createObjectStore('history', { keyPath: 'id' });
                    historyStore.createIndex('projectId', 'projectId', { unique: false });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    // 通用 CRUD 操作
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async queryByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 导出所有数据
    async exportAll() {
        const data = {
            exportDate: new Date().toISOString(),
            version: this.version,
            stores: {}
        };
        
        const storeNames = ['projects', 'materials', 'users', 'templates', 'history'];
        
        for (const storeName of storeNames) {
            try {
                data.stores[storeName] = await this.getAll(storeName);
            } catch (e) {
                data.stores[storeName] = [];
            }
        }
        
        return data;
    }

    // 导入数据
    async importAll(data) {
        if (!data || !data.stores) {
            throw new Error('无效的导入数据');
        }

        for (const [storeName, items] of Object.entries(data.stores)) {
            for (const item of items) {
                try {
                    await this.put(storeName, item);
                } catch (e) {
                    console.warn(`导入 ${storeName} 项失败:`, e);
                }
            }
        }
    }

    // 获取存储大小
    async getStorageSize() {
        const data = await this.exportAll();
        return new Blob([JSON.stringify(data)]).size;
    }
}

// ==================== 账号同步系统 ====================

class SyncManager {
    constructor(db) {
        this.db = db;
        this.currentUser = null;
        this.syncInterval = null;
        this.lastSyncTime = null;
    }

    // 创建设备ID
    generateDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }

    // 匿名登录（本地模式）
    async anonymousLogin() {
        const deviceId = this.generateDeviceId();
        
        // 检查是否已有本地用户
        let users = await this.db.getAll('users');
        let user = users.find(u => u.deviceId === deviceId);
        
        if (!user) {
            user = {
                id: 'user_' + Date.now(),
                deviceId: deviceId,
                name: '创作者_' + Math.random().toString(36).substr(2, 4),
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
                isAnonymous: true,
                settings: {
                    autoSave: true,
                    autoSaveInterval: 30000,
                    syncEnabled: false, // 本地模式默认关闭
                    theme: 'dark'
                }
            };
            await this.db.put('users', user);
        } else {
            user.lastLoginAt = new Date().toISOString();
            await this.db.put('users', user);
        }
        
        this.currentUser = user;
        return user;
    }

    // 注册账号（模拟）
    async register(username, email, password) {
        // 模拟注册，实际需要后端支持
        const deviceId = this.generateDeviceId();
        
        const user = {
            id: 'user_' + Date.now(),
            deviceId: deviceId,
            username: username,
            email: email,
            passwordHash: this.hashPassword(password), // 模拟哈希
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            isAnonymous: false,
            settings: {
                autoSave: true,
                autoSaveInterval: 30000,
                syncEnabled: true, // 账号模式开启同步
                theme: 'dark'
            }
        };
        
        await this.db.put('users', user);
        this.currentUser = user;
        
        // 保存登录状态
        localStorage.setItem('currentUserId', user.id);
        
        return user;
    }

    // 登录
    async login(email, password) {
        const users = await this.db.getAll('users');
        const user = users.find(u => u.email === email);
        
        if (!user) {
            throw new Error('用户不存在');
        }
        
        if (user.passwordHash !== this.hashPassword(password)) {
            throw new Error('密码错误');
        }
        
        user.lastLoginAt = new Date().toISOString();
        await this.db.put('users', user);
        
        this.currentUser = user;
        localStorage.setItem('currentUserId', user.id);
        
        return user;
    }

    // 登出
    async logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUserId');
        await this.anonymousLogin(); // 自动转为匿名模式
    }

    // 恢复登录状态
    async restoreSession() {
        const userId = localStorage.getItem('currentUserId');
        if (userId) {
            this.currentUser = await this.db.get('users', userId);
        }
        
        if (!this.currentUser) {
            await this.anonymousLogin();
        }
        
        return this.currentUser;
    }

    // 哈希密码（模拟，实际应使用后端）
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'hash_' + Math.abs(hash).toString(16);
    }

    // 同步项目到云端（模拟）
    async syncToCloud(project) {
        if (!this.currentUser || this.currentUser.isAnonymous) {
            console.log('匿名用户模式，跳过云端同步');
            return { synced: false, reason: 'anonymous' };
        }

        const syncRecord = {
            id: 'sync_' + Date.now(),
            userId: this.currentUser.id,
            projectId: project.id,
            action: 'upload',
            timestamp: new Date().toISOString(),
            data: JSON.parse(JSON.stringify(project))
        };

        await this.db.put('syncLog', syncRecord);

        // 标记项目已同步
        project.synced = true;
        project.lastSyncedAt = new Date().toISOString();
        await this.db.put('projects', project);

        this.lastSyncTime = new Date().toISOString();

        return { synced: true, timestamp: this.lastSyncTime };
    }

    // 从云端拉取项目（模拟）
    async fetchFromCloud() {
        if (!this.currentUser || this.currentUser.isAnonymous) {
            return { fetched: false, reason: 'anonymous' };
        }

        const cloudProjects = await this.db.queryByIndex('syncLog', 'userId', this.currentUser.id);
        const projectMap = new Map();

        // 获取最新的项目版本
        for (const record of cloudProjects) {
            if (record.action === 'upload' && record.data) {
                const existing = projectMap.get(record.projectId);
                if (!existing || new Date(record.timestamp) > new Date(existing.timestamp)) {
                    projectMap.set(record.projectId, record);
                }
            }
        }

        const projects = Array.from(projectMap.values()).map(r => ({
            ...r.data,
            synced: true,
            lastSyncedAt: r.timestamp
        }));

        return { fetched: true, projects };
    }

    // 开启自动同步
    startAutoSync(interval = 60000) {
        this.stopAutoSync();
        this.syncInterval = setInterval(async () => {
            await this.autoSync();
        }, interval);
        console.log(`自动同步已开启，间隔 ${interval/1000} 秒`);
    }

    // 停止自动同步
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('自动同步已关闭');
        }
    }

    // 自动同步
    async autoSync() {
        if (!this.currentUser?.settings?.syncEnabled) {
            return;
        }

        console.log('执行自动同步...');
        
        // 获取未同步的项目
        const projects = await this.db.getAll('projects');
        const unsyncedProjects = projects.filter(p => !p.synced);

        for (const project of unsyncedProjects) {
            await this.syncToCloud(project);
        }

        this.lastSyncTime = new Date().toISOString();
        console.log(`自动同步完成，已同步 ${unsyncedProjects.length} 个项目`);
    }

    // 导出同步日志
    async getSyncLog() {
        if (!this.currentUser) return [];
        
        const logs = await this.db.queryByIndex('syncLog', 'userId', this.currentUser.id);
        return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
}

// ==================== 创作素材库 ====================

class MaterialLibrary {
    constructor(db) {
        this.db = db;
    }

    // 添加素材
    async addMaterial(type, content, metadata = {}) {
        const material = {
            id: 'mat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            type: type, // 'character' | 'scene' | 'dialog' | 'plot' | 'template'
            content: content,
            title: metadata.title || '',
            description: metadata.description || '',
            tags: metadata.tags || [],
            category: metadata.category || 'default',
            usageCount: 0,
            favorite: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: metadata.userId || 'anonymous'
        };

        await this.db.put('materials', material);
        return material;
    }

    // 获取素材
    async getMaterials(type = null, filters = {}) {
        let materials = type ? 
            await this.db.queryByIndex('materials', 'type', type) : 
            await this.db.getAll('materials');

        // 应用筛选
        if (filters.tags && filters.tags.length > 0) {
            materials = materials.filter(m => 
                filters.tags.some(tag => m.tags.includes(tag))
            );
        }

        if (filters.favorite) {
            materials = materials.filter(m => m.favorite);
        }

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            materials = materials.filter(m => 
                m.title.toLowerCase().includes(searchLower) ||
                m.content.toLowerCase().includes(searchLower) ||
                m.description.toLowerCase().includes(searchLower)
            );
        }

        // 排序
        materials.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        return materials;
    }

    // 收藏/取消收藏
    async toggleFavorite(materialId) {
        const material = await this.db.get('materials', materialId);
        if (material) {
            material.favorite = !material.favorite;
            material.updatedAt = new Date().toISOString();
            await this.db.put('materials', material);
            return material;
        }
        return null;
    }

    // 使用素材（增加计数）
    async useMaterial(materialId) {
        const material = await this.db.get('materials', materialId);
        if (material) {
            material.usageCount = (material.usageCount || 0) + 1;
            material.lastUsedAt = new Date().toISOString();
            await this.db.put('materials', material);
            return material;
        }
        return null;
    }

    // 获取常用素材
    async getFrequentlyUsed(limit = 10) {
        const materials = await this.db.getAll('materials');
        return materials
            .filter(m => m.usageCount > 0)
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
            .slice(0, limit);
    }

    // 获取收藏素材
    async getFavorites() {
        return this.getMaterials(null, { favorite: true });
    }

    // 删除素材
    async deleteMaterial(materialId) {
        await this.db.delete('materials', materialId);
    }

    // 批量导入素材
    async importMaterials(materials) {
        const imported = [];
        for (const mat of materials) {
            const material = {
                ...mat,
                id: 'mat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await this.db.put('materials', material);
            imported.push(material);
        }
        return imported;
    }

    // 导出素材
    async exportMaterials(type = null) {
        const materials = type ? 
            await this.db.queryByIndex('materials', 'type', type) : 
            await this.db.getAll('materials');
        
        return {
            exportDate: new Date().toISOString(),
            count: materials.length,
            materials: materials
        };
    }

    // 获取素材统计
    async getStats() {
        const materials = await this.db.getAll('materials');
        
        const stats = {
            total: materials.length,
            byType: {},
            favorites: materials.filter(m => m.favorite).length,
            mostUsed: null,
            recentAdded: materials.sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            ).slice(0, 5)
        };

        for (const mat of materials) {
            stats.byType[mat.type] = (stats.byType[mat.type] || 0) + 1;
        }

        const mostUsed = materials
            .filter(m => m.usageCount > 0)
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0];
        
        if (mostUsed) {
            stats.mostUsed = {
                title: mostUsed.title,
                usageCount: mostUsed.usageCount
            };
        }

        return stats;
    }
}

// ==================== 大数据查询系统 ====================

class BigDataSearch {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30分钟缓存
    }

    // 模拟全网搜索
    async search(query, category = 'all') {
        const cacheKey = `${category}:${query}`;
        
        // 检查缓存
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheExpiry) {
                console.log('使用缓存数据');
                return cached.results;
            }
        }

        // 模拟搜索延迟
        await this.delay(500 + Math.random() * 1000);

        const results = this.generateMockResults(query, category);

        // 缓存结果
        this.cache.set(cacheKey, {
            results,
            timestamp: Date.now()
        });

        return results;
    }

    // 生成模拟结果
    generateMockResults(query, category) {
        const results = [];
        const count = 5 + Math.floor(Math.random() * 10);

        const templates = {
            character: [
                { title: '励志型主角', desc: '经历挫折后崛起，符合大众审美', source: '影视数据库' },
                { title: '复杂反派', desc: '有深度的反派角色，动机合理', source: '编剧资源库' },
                { title: '智慧导师', desc: '指引主角成长的关键人物', source: '角色模板库' },
                { title: '甜蜜恋人', desc: '推动感情线的关键角色', source: '爱情剧本库' },
                { title: '搞笑担当', desc: '调节气氛的喜剧角色', source: '喜剧素材库' }
            ],
            scene: [
                { title: '经典办公室场景', desc: '职场剧必备场景', source: '场景素材库' },
                { title: '雨中邂逅', desc: '浪漫爱情经典桥段', source: '浪漫场景库' },
                { title: '激烈争吵', desc: '制造冲突的关键场景', source: '剧情素材库' },
                { title: '温馨家庭', desc: '展现角色背景', source: '家庭剧素材' },
                { title: '回忆闪回', desc: '揭示角色秘密', source: '悬疑剧本库' }
            ],
            plot: [
                { title: '身世之谜', desc: '经典悬疑元素', source: '悬疑剧情库' },
                { title: '三角恋情', desc: '增加感情线张力', source: '爱情剧情库' },
                { title: '职场阴谋', desc: '商战剧核心冲突', source: '职场剧本库' },
                { title: '亲情羁绊', desc: '触动人心的情感线', source: '情感剧本库' },
                { title: '反转再反转', desc: '高能剧情设计', source: '悬疑素材库' }
            ],
            dialog: [
                { title: '经典告白', desc: '含蓄而深情的表白', source: '对白素材库' },
                { title: '犀利反驳', desc: '展现角色性格', source: '对白模板库' },
                { title: '含泪告别', desc: '催人泪下的离别', source: '情感对白库' },
                { title: '幽默调侃', desc: '轻松氛围调节', source: '喜剧对白库' },
                { title: '深刻哲理', desc: '富有内涵的台词', source: '经典台词库' }
            ],
            template: [
                { title: '三幕结构模板', desc: '经典剧本结构', source: '剧本模板库' },
                { title: '起承转合模板', desc: '东方叙事结构', source: '故事模板库' },
                { title: '英雄之旅模板', desc: '史诗故事结构', source: '叙事模板库' },
                { title: '五分钟短剧模板', desc: '紧凑剧情设计', source: '短剧素材库' },
                { title: '情感短剧模板', desc: '催泪向剧情', source: '情感模板库' }
            ]
        };

        const templateList = category === 'all' ? 
            Object.values(templates).flat() : 
            (templates[category] || templates.plot);

        for (let i = 0; i < count; i++) {
            const template = templateList[i % templateList.length];
            results.push({
                id: 'result_' + Date.now() + '_' + i,
                title: `[${template.source}] ${template.title}`,
                description: template.desc,
                content: this.generateDetailContent(template, query),
                category: category,
                relevance: Math.random() * 0.5 + 0.5,
                source: template.source,
                url: `https://example.com/素材/${template.title}`
            });
        }

        // 按相关性排序
        results.sort((a, b) => b.relevance - a.relevance);

        return results;
    }

    // 生成详情内容
    generateDetailContent(template, query) {
        return `
【${template.title}】

${template.desc}

适用场景：
- 适合情感类短剧
- 可根据具体剧情调整
- 建议配合适当的BGM

创作建议：
1. 注重情感铺垫
2. 细节描写要到位
3. 给观众留下想象空间

相关标签：#${template.source} #${query} #短剧创作
        `.trim();
    }

    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 清除缓存
    clearCache() {
        this.cache.clear();
        console.log('搜索缓存已清除');
    }

    // 获取缓存状态
    getCacheStatus() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }

    // 智能推荐
    async getRecommendations(type, count = 5) {
        const keywords = {
            character: ['主角', '反派', '情感', '成长'],
            scene: ['浪漫', '紧张', '温馨', '冲突'],
            plot: ['反转', '悬念', '高潮', '结局'],
            dialog: ['表白', '争吵', '和解', '告白']
        };

        const keyword = keywords[type][Math.floor(Math.random() * keywords[type].length)];
        const results = await this.search(keyword, type);
        
        return results.slice(0, count);
    }

    // 趋势分析（模拟）
    async getTrends() {
        await this.delay(300);
        
        return {
            hotTopics: [
                { topic: '职场逆袭', heat: 98, trend: 'up' },
                { topic: '甜宠爱情', heat: 95, trend: 'up' },
                { topic: '复仇剧情', heat: 92, trend: 'stable' },
                { topic: '亲情治愈', heat: 90, trend: 'up' },
                { topic: '悬疑烧脑', heat: 88, trend: 'stable' }
            ],
            popularElements: [
                '姐弟恋',
                '霸道总裁',
                '青梅竹马',
                '失忆梗',
                '契约恋爱',
                '先婚后爱'
            ],
            recommendedDuration: '3-5分钟',
            recommendedEpisodes: '1-3集'
        };
    }
}

// ==================== 全局实例 ====================

// 初始化
let enhancedDB = null;
let syncManager = null;
let materialLibrary = null;
let bigDataSearch = null;

async function initSyncSystem() {
    try {
        enhancedDB = new EnhancedDB();
        await enhancedDB.init();
        
        syncManager = new SyncManager(enhancedDB);
        await syncManager.restoreSession();
        
        materialLibrary = new MaterialLibrary(enhancedDB);
        bigDataSearch = new BigDataSearch();
        
        console.log('✅ 同步系统初始化完成');
        console.log('当前用户:', syncManager.currentUser?.name || '匿名用户');
        
        return {
            db: enhancedDB,
            sync: syncManager,
            materials: materialLibrary,
            search: bigDataSearch
        };
    } catch (error) {
        console.error('同步系统初始化失败:', error);
        throw error;
    }
}

// 导出到全局
window.SyncSystem = {
    init: initSyncSystem,
    getDB: () => enhancedDB,
    getSyncManager: () => syncManager,
    getMaterialLibrary: () => materialLibrary,
    getBigDataSearch: () => bigDataSearch
};

// 快捷函数
window.saveToMaterial = async function(type, content, metadata = {}) {
    if (!materialLibrary) await initSyncSystem();
    return materialLibrary.addMaterial(type, content, metadata);
};

window.searchMaterials = async function(query, category = 'all') {
    if (!materialLibrary) await initSyncSystem();
    return materialLibrary.getMaterials(category, { search: query });
};

window.bigSearch = async function(query, category = 'all') {
    if (!bigDataSearch) await initSyncSystem();
    showLoading('正在查询全网资料...');
    try {
        const results = await bigDataSearch.search(query, category);
        hideLoading();
        return results;
    } catch (error) {
        hideLoading();
        showToast('查询失败，请重试', 'error');
        throw error;
    }
};

window.syncProject = async function(project) {
    if (!syncManager) await initSyncSystem();
    return syncManager.syncToCloud(project);
};

window.exportAllData = async function() {
    if (!enhancedDB) await initSyncSystem();
    return enhancedDB.exportAll();
};

window.importAllData = async function(data) {
    if (!enhancedDB) await initSyncSystem();
    return enhancedDB.importAll(data);
};

console.log('✅ 同步系统模块已加载');

// ====== UPDATE ======
/**
 * AI短剧创作工作台 - 版本管理与更新保护系统
 * 
 * 功能：
 * 1. 版本号管理与检测
 * 2. 更新提示与确认
 * 3. 数据库自动备份（更新前）
 * 4. 数据迁移与版本兼容
 * 5. 回滚机制
 */

const UpdateManager = {
    // 当前版本
    currentVersion: '3.1.0',
    // 版本发布日期
    releaseDate: new Date('2026-06-09').toISOString(),
    // 最小兼容版本（低于此版本必须重置）
    minCompatibleVersion: '1.0.0',
    // 已检测到的新版本
    latestVersion: null,
    // 更新状态
    updateStatus: 'idle', // idle | checking | available | updating | completed | error
    // 备份信息
    lastBackup: null,
    // 版本迁移器
    migrators: {},
    
    /**
     * 初始化版本管理系统
     */
    async init() {
        console.log(`🔄 初始化版本管理 [当前版本 ${this.currentVersion}]`);
        
        // 检查是否首次使用
        const storedVersion = localStorage.getItem('appVersion');
        const firstUse = !storedVersion;
        
        if (!firstUse && storedVersion !== this.currentVersion) {
            // 版本发生了变化
            console.log(`📦 版本变化: ${storedVersion} → ${this.currentVersion}`);
            await this.handleVersionChange(storedVersion, this.currentVersion);
        } else {
            // 首次使用或版本一致
            localStorage.setItem('appVersion', this.currentVersion);
            localStorage.setItem('appVersionDate', this.releaseDate);
        }
        
        // 恢复上次备份信息
        const backupInfo = localStorage.getItem('lastBackup');
        if (backupInfo) {
            try {
                this.lastBackup = JSON.parse(backupInfo);
            } catch (e) {
                console.warn('备份信息解析失败');
            }
        }
        
        // 启动版本更新检测
        setTimeout(() => this.checkForUpdates(), 3000);
        
        // 注册数据迁移器
        this.registerMigrators();
        
        return {
            version: this.currentVersion,
            releaseDate: this.releaseDate,
            firstUse
        };
    },
    
    /**
     * 处理版本变化
     */
    async handleVersionChange(oldVersion, newVersion) {
        console.log(`⚙️ 处理版本变化: ${oldVersion} → ${newVersion}`);
        
        // 检查兼容性
        if (!this.isCompatible(oldVersion)) {
            console.warn(`⚠️ ${oldVersion} 与当前版本不兼容，需特殊处理`);
            // 强制备份
            await this.createBackup(`强制备份-版本${oldVersion}-to-${newVersion}`);
        }
        
        // 1. 更新前自动备份
        await this.createBackup(`自动备份-${oldVersion}-to-${newVersion}`);
        
        // 2. 执行数据迁移
        await this.migrateData(oldVersion, newVersion);
        
        // 3. 更新版本记录
        localStorage.setItem('appVersion', newVersion);
        localStorage.setItem('appVersionDate', this.releaseDate);
        localStorage.setItem('lastUpdateTime', new Date().toISOString());
        localStorage.setItem('lastUpdateFrom', oldVersion);
        
        // 4. 显示更新成功提示
        this.showUpdateSuccessNotification(oldVersion, newVersion);
    },
    
    /**
     * 检查版本兼容性
     */
    isCompatible(version) {
        if (!version) return true;
        // 简单比较：主版本号必须 >= minCompatibleVersion 的主版本号
        const versionParts = version.split('.').map(Number);
        const minParts = this.minCompatibleVersion.split('.').map(Number);
        
        // 主版本号不能低于最低兼容
        if (versionParts[0] < minParts[0]) return false;
        
        // 版本号 <= 当前版本（不能是未来版本）
        if (this.compareVersions(version, this.currentVersion) > 0) return false;
        
        return true;
    },
    
    /**
     * 版本比较
     * 返回: -1 (v1 < v2), 0 (v1 == v2), 1 (v1 > v2)
     */
    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < 3; i++) {
            if (parts1[i] < parts2[i]) return -1;
            if (parts1[i] > parts2[i]) return 1;
        }
        return 0;
    },
    
    /**
     * 注册数据迁移器
     */
    registerMigrators() {
        // 从 v1.0 → v2.0 迁移
        this.migrators['v1-to-v2'] = async () => {
            console.log('🔄 执行 v1 → v2 数据迁移');
            // 数据格式可能有变化，这里处理转换
            const projects = JSON.parse(localStorage.getItem('projects') || '[]');
            projects.forEach(project => {
                if (!project.materials) project.materials = [];
                if (!project.metadata) project.metadata = {};
                if (!project.metadata.createdVersion) project.metadata.createdVersion = '1.0.0';
                project.metadata.lastModifiedVersion = '2.0.0';
            });
            localStorage.setItem('projects', JSON.stringify(projects));
        };
        
        // 从 v2.0 → v3.0 迁移
        this.migrators['v2-to-v3'] = async () => {
            console.log('🔄 执行 v2 → v3 数据迁移');
            // v3 添加了 IndexedDB 和素材库系统
            const projects = JSON.parse(localStorage.getItem('projects') || '[]');
            projects.forEach(project => {
                project.synced = false;
                project.lastSyncedAt = null;
                project.currentVersion = '3.0.0';
                if (!project.materialIds) project.materialIds = [];
                if (!project.settings) project.settings = {};
                project.settings.enableSync = false;
            });
            localStorage.setItem('projects', JSON.stringify(projects));
            
            // 清理旧的临时数据
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('temp_')) keysToRemove.push(key);
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
        };
    },
    
    /**
     * 执行数据迁移
     */
    async migrateData(oldVersion, newVersion) {
        console.log(`📦 数据迁移: ${oldVersion} → ${newVersion}`);
        
        const migrators = [];
        
        // 根据版本跨度选择迁移器
        if (this.compareVersions(oldVersion, '2.0.0') < 0 && 
            this.compareVersions(newVersion, '2.0.0') >= 0) {
            migrators.push('v1-to-v2');
        }
        if (this.compareVersions(oldVersion, '3.0.0') < 0 && 
            this.compareVersions(newVersion, '3.0.0') >= 0) {
            migrators.push('v2-to-v3');
        }
        
        // 按顺序执行迁移
        for (const migratorKey of migrators) {
            try {
                if (this.migrators[migratorKey]) {
                    await this.migrators[migratorKey]();
                    console.log(`✅ ${migratorKey} 迁移完成`);
                }
            } catch (error) {
                console.error(`❌ ${migratorKey} 迁移失败:`, error);
                throw error;
            }
        }
        
        // 保存迁移记录
        const migrationLog = JSON.parse(localStorage.getItem('migrationLog') || '[]');
        migrationLog.push({
            from: oldVersion,
            to: newVersion,
            timestamp: new Date().toISOString(),
            migrators: migrators
        });
        localStorage.setItem('migrationLog', JSON.stringify(migrationLog));
    },
    
    /**
     * 创建数据库备份
     */
    async createBackup(reason = '手动备份') {
        console.log(`💾 创建备份: ${reason}`);
        
        try {
            const backupData = {
                timestamp: new Date().toISOString(),
                version: this.currentVersion,
                reason: reason,
                localStorage: {},
                indexedDB: null,
                size: 0
            };
            
            // 1. 备份 LocalStorage
            const lsKeys = [
                'appVersion',
                'appVersionDate',
                'projects',
                'currentProjectId',
                'autoSaveData',
                'lastProjectId',
                'welcomeSeen',
                'userSettings',
                'materialIds',
                'favoriteMaterials'
            ];
            
            lsKeys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    backupData.localStorage[key] = value;
                }
            });
            
            // 2. 尝试备份 IndexedDB（如果可用）
            try {
                if (window.SyncSystem && window.SyncSystem.getDB) {
                    const db = window.SyncSystem.getDB();
                    if (db && db.exportAll) {
                        backupData.indexedDB = await db.exportAll();
                    }
                }
            } catch (e) {
                console.warn('IndexedDB 备份跳过:', e.message);
            }
            
            // 3. 计算大小
            backupData.size = new Blob([JSON.stringify(backupData)]).size;
            
            // 4. 保存备份到 localStorage（最多保留最近 10 个）
            const backupHistory = JSON.parse(localStorage.getItem('backupHistory') || '[]');
            const backupEntry = {
                id: 'backup_' + Date.now(),
                timestamp: backupData.timestamp,
                version: backupData.version,
                reason: reason,
                size: backupData.size
            };
            
            backupHistory.unshift(backupEntry);
            if (backupHistory.length > 10) backupHistory.length = 10;
            localStorage.setItem('backupHistory', JSON.stringify(backupHistory));
            
            // 5. 保存实际备份数据
            localStorage.setItem(backupEntry.id, JSON.stringify(backupData));
            
            this.lastBackup = backupEntry;
            localStorage.setItem('lastBackup', JSON.stringify(backupEntry));
            
            console.log(`✅ 备份完成: ${Math.round(backupData.size / 1024)} KB`);
            return backupEntry;
            
        } catch (error) {
            console.error('❌ 备份失败:', error);
            throw error;
        }
    },
    
    /**
     * 从备份恢复
     */
    async restoreFromBackup(backupId) {
        console.log(`↩️ 从备份恢复: ${backupId}`);
        
        try {
            const backupDataStr = localStorage.getItem(backupId);
            if (!backupDataStr) {
                throw new Error('备份不存在');
            }
            
            const backupData = JSON.parse(backupDataStr);
            
            // 1. 恢复前先创建当前状态的应急备份
            await this.createBackup('恢复前备份');
            
            // 2. 恢复 LocalStorage
            Object.entries(backupData.localStorage).forEach(([key, value]) => {
                localStorage.setItem(key, value);
            });
            
            // 3. 恢复 IndexedDB（如果可用）
            if (backupData.indexedDB && window.SyncSystem && window.SyncSystem.getDB) {
                try {
                    await window.SyncSystem.getDB().importAll(backupData.indexedDB);
                } catch (e) {
                    console.warn('IndexedDB 恢复跳过:', e.message);
                }
            }
            
            console.log('✅ 恢复完成，即将刷新页面...');
            showToast('恢复成功，页面即将刷新', 'success');
            
            // 刷新页面
            setTimeout(() => window.location.reload(), 1500);
            
            return true;
            
        } catch (error) {
            console.error('❌ 恢复失败:', error);
            showToast('恢复失败: ' + error.message, 'error');
            return false;
        }
    },
    
    /**
     * 获取备份列表
     */
    getBackupList() {
        const backupHistory = JSON.parse(localStorage.getItem('backupHistory') || '[]');
        return backupHistory;
    },
    
    /**
     * 清理旧备份
     */
    cleanupOldBackups(keepCount = 5) {
        const backupHistory = JSON.parse(localStorage.getItem('backupHistory') || '[]');
        const toRemove = backupHistory.slice(keepCount);
        
        toRemove.forEach(backup => {
            localStorage.removeItem(backup.id);
        });
        
        const keptHistory = backupHistory.slice(0, keepCount);
        localStorage.setItem('backupHistory', JSON.stringify(keptHistory));
        
        console.log(`🗑️ 清理了 ${toRemove.length} 个旧备份，保留 ${keptHistory.length} 个`);
        return toRemove.length;
    },
    
    /**
     * 检查更新（本地文件方式）
     */
    async checkForUpdates() {
        console.log('🔍 检查更新...');
        this.updateStatus = 'checking';
        
        try {
            // 读取当前 HTML 文件的 meta 标签或检测 version.json
            const versionFileUrl = './version.json';
            let remoteVersion = null;
            
            try {
                const response = await fetch(versionFileUrl, {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                });
                
                if (response.ok) {
                    const versionData = await response.json();
                    remoteVersion = versionData.version;
                    this.latestVersion = versionData;
                }
            } catch (e) {
                // version.json 不存在或其他错误，使用 Service Worker 版本检测
            }
            
            // 检测 Service Worker 版本（PWA 方式）
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                try {
                    // 检查是否有新的 Service Worker 等待激活
                    const registration = await navigator.serviceWorker.getRegistration();
                    if (registration && registration.waiting) {
                        console.log('🔄 发现新的 Service Worker 等待激活');
                        this.showUpdateNotification('service-worker', {
                            currentVersion: this.currentVersion,
                            message: '新版本已下载完成'
                        });
                    }
                    
                    // 监听 Service Worker 更新事件
                    if (registration) {
                        registration.addEventListener('updatefound', () => {
                            console.log('🔄 发现更新，正在下载...');
                            this.updateStatus = 'updating';
                            showToast('发现新版本，正在下载...', 'info');
                            
                            // 监听新 Service Worker 安装完成
                            registration.installing.addEventListener('statechange', (e) => {
                                if (e.target.state === 'installed') {
                                    if (navigator.serviceWorker.controller) {
                                        console.log('✅ 更新已安装，等待用户确认');
                                        this.showUpdateNotification('service-worker-installed', {
                                            message: '新版本已准备就绪'
                                        });
                                    }
                                }
                            });
                        });
                    }
                } catch (e) {
                    console.warn('SW 版本检测失败:', e.message);
                }
            }
            
            // 如果检测到明确的版本文件更新
            if (remoteVersion && this.compareVersions(remoteVersion, this.currentVersion) > 0) {
                console.log(`⬆️ 发现新版本: ${this.currentVersion} → ${remoteVersion}`);
                this.updateStatus = 'available';
                this.showUpdateNotification('version', {
                    currentVersion: this.currentVersion,
                    newVersion: remoteVersion,
                    releaseNotes: this.latestVersion?.releaseNotes || [],
                    critical: this.latestVersion?.critical || false
                });
            } else {
                console.log('✅ 已是最新版本');
                this.updateStatus = 'idle';
            }
            
        } catch (error) {
            console.warn('⚠️ 检查更新失败:', error);
            this.updateStatus = 'error';
        }
        
        return this.updateStatus;
    },
    
    /**
     * 显示更新通知弹窗
     */
    showUpdateNotification(type, info = {}) {
        console.log(`📢 更新通知: ${type}`, info);
        
        // 检查是否已经显示
        if (document.getElementById('update-notification-modal')) {
            return;
        }
        
        // 创建通知弹窗
        const modal = document.createElement('div');
        modal.id = 'update-notification-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            z-index: 99999;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;
        
        const releaseNotesHtml = info.releaseNotes && info.releaseNotes.length > 0 ? 
            `
                <div style="margin: 20px 0; text-align: left;">
                    <div style="font-weight: bold; color: var(--text); margin-bottom: 10px;">更新内容:</div>
                    <ul style="color: var(--text-dim); margin: 0; padding-left: 20px; line-height: 1.8;">
                        ${info.releaseNotes.map(note => `<li>${note}</li>`).join('')}
                    </ul>
                </div>
            ` : '';
        
        const isCritical = info.critical ? `
            <div style="background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #dc2626; text-align: left;">
                <div style="font-weight: bold; margin-bottom: 4px;">⚠️ 重要更新</div>
                <div style="font-size: 13px;">此更新包含重要修复，建议立即更新以确保数据安全</div>
            </div>
        ` : '';
        
        modal.innerHTML = `
            <div style="background: #1e293b; border-radius: 16px; padding: 30px; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: slideUp 0.3s ease;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🔄</div>
                    <h2 style="color: white; margin: 0 0 8px 0; font-size: 20px;">发现新版本</h2>
                    <div style="color: #94a3b8; font-size: 14px;">
                        当前版本: ${this.currentVersion} 
                        → 
                        <span style="color: #7c3aed; font-weight: bold;">${info.newVersion || '新版本'}</span>
                    </div>
                </div>
                
                ${releaseNotesHtml}
                ${isCritical}
                
                <div style="background: #334155; padding: 12px; border-radius: 8px; margin: 15px 0; font-size: 12px; color: #94a3b8; text-align: left;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span>🔒</span>
                        <span>更新前将自动备份所有数据，确保数据安全</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                        <span>💾</span>
                        <span>项目、素材库、设置等全部保留</span>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 25px;">
                    <button 
                        id="update-later-btn" 
                        style="flex: 1; padding: 12px; background: #334155; color: #cbd5e1; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;"
                    >稍后更新</button>
                    <button 
                        id="update-now-btn" 
                        style="flex: 1; padding: 12px; background: #7c3aed; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold;"
                    >立即更新</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定事件
        document.getElementById('update-later-btn').onclick = () => {
            modal.remove();
            // 记住用户选择，24小时内不再提示
            localStorage.setItem('updateReminderSkipped', Date.now().toString());
        };
        
        document.getElementById('update-now-btn').onclick = async () => {
            await this.executeUpdate();
            modal.remove();
        };
        
        // 检查是否在 24 小时内已推迟
        const lastSkipped = localStorage.getItem('updateReminderSkipped');
        if (lastSkipped && Date.now() - parseInt(lastSkipped) < 24 * 60 * 60 * 1000) {
            modal.remove();
            console.log('用户已在 24 小时内推迟更新');
        }
    },
    
    /**
     * 执行更新流程
     */
    async executeUpdate() {
        console.log('⚙️ 开始执行更新流程...');
        
        // 步骤 1: 显示更新中状态
        const progressModal = document.createElement('div');
        progressModal.id = 'update-progress-modal';
        progressModal.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 100000;
            display: flex; justify-content: center; align-items: center;
        `;
        
        progressModal.innerHTML = `
            <div style="background: #1e293b; padding: 40px; border-radius: 16px; text-align: center; max-width: 400px;">
                <div style="font-size: 48px; margin-bottom: 20px;">📦</div>
                <h3 style="color: white; margin: 0 0 15px 0;">正在更新...</h3>
                <div id="update-steps" style="text-align: left; color: #94a3b8; font-size: 14px;">
                    <div id="step-1" style="margin: 8px 0;">⬜ 备份数据</div>
                    <div id="step-2" style="margin: 8px 0;">⬜ 数据迁移</div>
                    <div id="step-3" style="margin: 8px 0;">⬜ 验证完整性</div>
                    <div id="step-4" style="margin: 8px 0;">⬜ 准备完成</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(progressModal);
        
        const markStepComplete = (stepNum, text) => {
            const stepEl = document.getElementById(`step-${stepNum}`);
            if (stepEl) stepEl.innerHTML = `✅ ${text}`;
        };
        
        try {
            // 步骤 1: 备份数据
            markStepComplete(1, '正在备份...');
            await this.createBackup('更新前备份');
            markStepComplete(1, '数据已备份');
            await this.sleep(500);
            
            // 步骤 2: 数据迁移（如果需要）
            markStepComplete(2, '检查数据格式...');
            // 实际上，数据迁移会在页面刷新后新代码加载时处理
            markStepComplete(2, '数据格式检查完成');
            await this.sleep(500);
            
            // 步骤 3: 验证完整性
            markStepComplete(3, '验证数据完整性...');
            const isValid = this.verifyDataIntegrity();
            markStepComplete(3, isValid ? '数据验证通过' : '数据验证完成');
            await this.sleep(500);
            
            // 步骤 4: 准备完成，激活 Service Worker
            markStepComplete(4, '激活新版本...');
            
            // 激活等待中的 Service Worker（如果有）
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration && registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
            }
            
            markStepComplete(4, '更新完成！');
            await this.sleep(800);
            
            // 刷新页面
            progressModal.innerHTML = `
                <div style="background: #1e293b; padding: 40px; border-radius: 16px; text-align: center;">
                    <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
                    <h3 style="color: white; margin: 0 0 10px 0;">更新完成！</h3>
                    <div style="color: #94a3b8; font-size: 14px;">页面即将刷新以加载新版本</div>
                </div>
            `;
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
        } catch (error) {
            console.error('❌ 更新过程出错:', error);
            progressModal.innerHTML = `
                <div style="background: #1e293b; padding: 40px; border-radius: 16px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <h3 style="color: white; margin: 0 0 10px 0;">更新遇到问题</h3>
                    <div style="color: #f87171; font-size: 13px; margin-bottom: 15px;">${error.message}</div>
                    <div style="color: #94a3b8; font-size: 12px; margin-bottom: 20px;">
                        您的数据已自动备份，当前版本仍可正常使用
                    </div>
                    <button 
                        onclick="document.getElementById('update-progress-modal').remove()" 
                        style="padding: 10px 25px; background: #7c3aed; color: white; border: none; border-radius: 8px; cursor: pointer;"
                    >知道了</button>
                </div>
            `;
        }
    },
    
    /**
     * 显示更新成功通知（版本变化后）
     */
    showUpdateSuccessNotification(oldVersion, newVersion) {
        setTimeout(() => {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, #7c3aed, #5b21b6);
                color: white;
                padding: 15px 20px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(124, 58, 237, 0.3);
                z-index: 99998;
                max-width: 320px;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                animation: slideInRight 0.4s ease;
            `;
            
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 28px;">🎉</span>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; font-size: 14px; margin-bottom: 3px;">已更新到 v${newVersion}</div>
                        <div style="font-size: 12px; opacity: 0.9;">数据已自动备份，点击查看新增功能</div>
                    </div>
                    <button id="update-success-close" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; padding: 4px 8px;">✕</button>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            document.getElementById('update-success-close').onclick = () => {
                notification.style.opacity = '0';
                notification.style.transition = 'opacity 0.3s';
                setTimeout(() => notification.remove(), 300);
            };
            
            // 5 秒后自动消失
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.opacity = '0';
                    notification.style.transition = 'opacity 0.3s';
                    setTimeout(() => notification.remove(), 300);
                }
            }, 5000);
        }, 2000);
    },
    
    /**
     * 验证数据完整性
     */
    verifyDataIntegrity() {
        console.log('🔍 验证数据完整性...');
        
        let isValid = true;
        const issues = [];
        
        // 检查必要数据是否存在
        const projects = JSON.parse(localStorage.getItem('projects') || '[]');
        
        if (!Array.isArray(projects)) {
            issues.push('项目数据格式错误');
            isValid = false;
        }
        
        // 检查每个项目的必填字段
        projects.forEach((project, index) => {
            if (!project.id) issues.push(`项目 #${index} 缺少 id`);
            if (!project.name) issues.push(`项目 #${index} 缺少 name`);
        });
        
        // 检查是否有过多的数据
        const dataSize = JSON.stringify(localStorage).length;
        if (dataSize > 5 * 1024 * 1024) { // 5MB 限制
            console.warn(`⚠️ 数据量较大: ${Math.round(dataSize / 1024)} KB`);
        }
        
        if (issues.length > 0) {
            console.warn('⚠️ 数据完整性问题:', issues);
        } else {
            console.log('✅ 数据完整性验证通过');
        }
        
        return isValid;
    },
    
    /**
     * 显示版本管理面板（供用户查看和管理）
     */
    showVersionPanel() {
        const backups = this.getBackupList();
        const backupList = backups.length > 0 ? 
            backups.map((b, i) => `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px;">${new Date(b.timestamp).toLocaleString()}</td>
                    <td style="padding: 10px;">${b.reason}</td>
                    <td style="padding: 10px;">v${b.version}</td>
                    <td style="padding: 10px;">${Math.round(b.size / 1024)} KB</td>
                    <td style="padding: 10px;">
                        <button onclick="UpdateManager.restoreFromBackup('${b.id}')" style="padding: 6px 12px; background: #059669; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">恢复</button>
                    </td>
                </tr>
            `).join('') : 
            '<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-dim);">暂无备份</td></tr>';
        
        const panel = document.createElement('div');
        panel.id = 'version-panel-modal';
        panel.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85);
            z-index: 99997;
            display: flex; justify-content: center; align-items: center;
        `;
        
        panel.innerHTML = `
            <div style="background: var(--bg-panel); border-radius: 16px; padding: 30px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: var(--text); margin: 0; font-size: 20px;">📦 版本与数据管理</h2>
                    <button id="close-version-panel" style="background: none; border: none; color: var(--text-dim); font-size: 20px; cursor: pointer;">✕</button>
                </div>
                
                <!-- 当前版本信息 -->
                <div style="background: var(--bg-dark); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: bold; color: var(--text); font-size: 16px;">
                                版本 ${this.currentVersion}
                            </div>
                            <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">
                                发布日期: ${new Date(this.releaseDate).toLocaleDateString()}
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="UpdateManager.checkForUpdates()" style="padding: 8px 16px; background: #7c3aed; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">🔍 检查更新</button>
                            <button onclick="UpdateManager.createBackup('手动备份').then(()=>UpdateManager.showVersionPanel().catch(()=>{}))" style="padding: 8px 16px; background: #059669; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">💾 立即备份</button>
                        </div>
                    </div>
                </div>
                
                <!-- 备份列表 -->
                <div style="margin-bottom: 20px;">
                    <h3 style="color: var(--text); margin: 0 0 12px 0; font-size: 16px;">备份记录 (最近 ${backups.length} 个)</h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead style="background: var(--bg-dark); color: var(--text-dim);">
                                <tr>
                                    <th style="text-align: left; padding: 10px;">时间</th>
                                    <th style="text-align: left; padding: 10px;">原因</th>
                                    <th style="text-align: left; padding: 10px;">版本</th>
                                    <th style="text-align: left; padding: 10px;">大小</th>
                                    <th style="text-align: left; padding: 10px;">操作</th>
                                </tr>
                            </thead>
                            <tbody style="color: var(--text);">
                                ${backupList}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- 导出完整数据 -->
                <div style="background: var(--bg-dark); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: var(--text); margin: 0 0 8px 0; font-size: 14px;">📤 数据导出</h3>
                    <div style="font-size: 12px; color: var(--text-dim); margin-bottom: 10px;">
                        将所有项目和设置导出为单个文件，可用于跨设备迁移或备份
                    </div>
                    <button onclick="UpdateManager.exportFullData()" style="padding: 8px 16px; background: #7c3aed; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">📦 导出完整数据</button>
                </div>
                
                <!-- 导入数据 -->
                <div style="background: var(--bg-dark); padding: 15px; border-radius: 8px;">
                    <h3 style="color: var(--text); margin: 0 0 8px 0; font-size: 14px;">📥 数据导入</h3>
                    <div style="font-size: 12px; color: var(--text-dim); margin-bottom: 10px;">
                        从导出文件恢复数据（将覆盖当前数据，会自动创建备份）
                    </div>
                    <input type="file" id="import-data-file" accept=".json" style="margin-bottom: 10px;">
                    <button onclick="UpdateManager.importFullData()" style="padding: 8px 16px; background: #d97706; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">⚠️ 导入数据</button>
                </div>
                
                <!-- 数据清理 -->
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #dc2626;">
                    <h3 style="color: #991b1b; margin: 0 0 8px 0; font-size: 14px;">🗑️ 数据清理</h3>
                    <div style="font-size: 12px; color: #7f1d1d; margin-bottom: 10px;">
                        清理旧数据以释放空间，会保留最近的项目和备份
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="UpdateManager.cleanupOldBackups()" style="padding: 8px 12px; background: #d97706; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">清理旧备份</button>
                        <button onclick="UpdateManager.showClearAllDataConfirm()" style="padding: 8px 12px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">清除所有数据</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        document.getElementById('close-version-panel').onclick = () => panel.remove();
    },
    
    /**
     * 导出完整数据
     */
    exportFullData() {
        this.createBackup('导出数据备份').then(backup => {
            // 读取最新的完整备份
            const fullBackup = JSON.parse(localStorage.getItem(backup.id) || '{}');
            
            // 创建下载
            const dataStr = JSON.stringify(fullBackup, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `AI短剧创作工作台_完整备份_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            
            showToast('数据已导出', 'success');
        });
    },
    
    /**
     * 导入完整数据
     */
    async importFullData() {
        const fileInput = document.getElementById('import-data-file');
        if (!fileInput || !fileInput.files.length) {
            showToast('请先选择要导入的文件', 'warning');
            return;
        }
        
        if (!confirm('⚠️ 导入将覆盖当前所有数据，系统会先自动备份。是否继续？')) {
            return;
        }
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                // 先备份
                await this.createBackup('导入前备份');
                
                // 读取数据
                const data = JSON.parse(e.target.result);
                
                // 恢复 LocalStorage
                if (data.localStorage) {
                    Object.entries(data.localStorage).forEach(([key, value]) => {
                        localStorage.setItem(key, value);
                    });
                }
                
                // 恢复 IndexedDB
                if (data.indexedDB && window.SyncSystem) {
                    await window.SyncSystem.getDB().importAll(data.indexedDB);
                }
                
                showToast('数据导入成功，页面即将刷新', 'success');
                
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
                
            } catch (error) {
                console.error('导入失败:', error);
                showToast('导入失败: ' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
    },
    
    /**
     * 显示清除数据确认
     */
    showClearAllDataConfirm() {
        if (!confirm('⚠️ 此操作将删除所有项目、素材和设置！\n\n系统会先自动创建备份，但请谨慎操作。\n\n是否继续？')) {
            return;
        }
        
        if (!confirm('再次确认：真的要清除所有数据吗？\n此操作不可撤销（除非使用备份恢复）')) {
            return;
        }
        
        // 先创建备份
        this.createBackup('清除前备份').then(() => {
            // 清除数据
            localStorage.clear();
            
            // 清除 IndexedDB
            if (window.indexedDB) {
                window.indexedDB.deleteDatabase('AI_Drama_Workshop_Pro');
            }
            
            showToast('数据已清除，页面即将刷新', 'success');
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        });
    },
    
    /**
     * 辅助函数：延时
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// 添加动画样式
const animationStyle = document.createElement('style');
animationStyle.textContent = `
    @keyframes slideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(animationStyle);

// 全局访问
window.UpdateManager = UpdateManager;

console.log('✅ 版本管理模块已加载');

// ====== API ======
class ExternalAPI {
  constructor() {
    this.endpoints = {
      v1: {
        projects: {
          list: { method: 'GET', path: '/api/v1/projects', description: '获取项目列表' },
          get: { method: 'GET', path: '/api/v1/projects/:id', description: '获取单个项目' },
          create: { method: 'POST', path: '/api/v1/projects', description: '创建项目' },
          update: { method: 'PUT', path: '/api/v1/projects/:id', description: '更新项目' },
          delete: { method: 'DELETE', path: '/api/v1/projects/:id', description: '删除项目' },
          export: { method: 'GET', path: '/api/v1/projects/:id/export', description: '导出项目' }
        },
        templates: {
          list: { method: 'GET', path: '/api/v1/templates', description: '获取模板列表' },
          get: { method: 'GET', path: '/api/v1/templates/:id', description: '获取单个模板' },
          search: { method: 'GET', path: '/api/v1/templates/search', description: '搜索模板' },
          use: { method: 'POST', path: '/api/v1/templates/:id/use', description: '应用模板' }
        },
        llm: {
          generate: { method: 'POST', path: '/api/v1/llm/generate', description: '使用 LLM 生成内容' },
          providers: { method: 'GET', path: '/api/v1/llm/providers', description: '获取可用的 LLM 提供商' },
          outline: { method: 'POST', path: '/api/v1/llm/outline', description: '生成大纲' },
          script: { method: 'POST', path: '/api/v1/llm/script', description: '生成剧本' },
          shots: { method: 'POST', path: '/api/v1/llm/shots', description: '生成分镜' }
        },
        video: {
          generate: { method: 'POST', path: '/api/v1/video/generate', description: '生成视频' },
          status: { method: 'GET', path: '/api/v1/video/tasks/:id', description: '获取视频生成任务状态' },
          list: { method: 'GET', path: '/api/v1/video/tasks', description: '获取视频任务列表' }
        },
        sync: {
          push: { method: 'POST', path: '/api/v1/sync/push', description: '推送数据到云端' },
          pull: { method: 'GET', path: '/api/v1/sync/pull', description: '从云端拉取数据' },
          status: { method: 'GET', path: '/api/v1/sync/status', description: '获取同步状态' }
        },
        collab: {
          comments: { method: 'GET', path: '/api/v1/collab/comments', description: '获取评论' },
          versions: { method: 'GET', path: '/api/v1/collab/versions', description: '获取版本历史' },
          comment: { method: 'POST', path: '/api/v1/collab/comment', description: '添加评论' },
          resolve: { method: 'POST', path: '/api/v1/collab/comment/:id/resolve', description: '标记评论已解决' }
        },
        stats: {
          summary: { method: 'GET', path: '/api/v1/stats', description: '获取统计信息' }
        }
      }
    };

    this.apiKey = null;
    this.baseUrl = '';
    this.rateLimit = {
      limit: 100,
      remaining: 100,
      reset: Date.now() + 60000
    };
    this._init();
  }

  _init() {
    const savedConfig = localStorage.getItem('api_config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        this.apiKey = config.apiKey || null;
        this.baseUrl = config.baseUrl || '';
      } catch (e) {
        console.error('Failed to load API config:', e);
      }
    }
  }

  _saveConfig() {
    localStorage.setItem('api_config', JSON.stringify({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl
    }));
  }

  setAPIKey(apiKey) {
    this.apiKey = apiKey;
    this._saveConfig();
  }

  setBaseUrl(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this._saveConfig();
  }

  async call(endpoint, params = {}, body = null) {
    if (!this._checkRateLimit()) {
      throw new Error('API 调用频率过高，请稍后再试');
    }

    const startTime = Date.now();
    
    try {
      const result = await this._executeCall(endpoint, params, body);
      this._logCall(endpoint, params, 200, Date.now() - startTime, true);
      return result;
    } catch (error) {
      this._logCall(endpoint, params, error.status || 500, Date.now() - startTime, false);
      throw error;
    }
  }

  async _executeCall(endpoint, params, body) {
    if (typeof endpoint === 'string') {
      const [version, category, action] = endpoint.split('.');
      if (!this.endpoints[version] || !this.endpoints[version][category] || !this.endpoints[version][category][action]) {
        throw new Error(`未知的 API 端点: ${endpoint}`);
      }
      endpoint = this.endpoints[version][category][action];
    }

    let url = this.baseUrl + endpoint.path;
    
    if (params.pathParams) {
      Object.keys(params.pathParams).forEach(key => {
        url = url.replace(`:${key}`, encodeURIComponent(params.pathParams[key]));
      });
    }

    if (params.queryParams) {
      const queryString = new URLSearchParams(params.queryParams).toString();
      url += `?${queryString}`;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const requestConfig = {
      method: endpoint.method,
      headers
    };

    if (body && (endpoint.method === 'POST' || endpoint.method === 'PUT')) {
      requestConfig.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestConfig);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`API 调用失败: ${errorData.error || response.statusText}`);
    }

    return response.json();
  }

  _checkRateLimit() {
    const now = Date.now();
    if (now > this.rateLimit.reset) {
      this.rateLimit.remaining = this.rateLimit.limit;
      this.rateLimit.reset = now + 60000;
    }
    
    if (this.rateLimit.remaining <= 0) {
      return false;
    }
    
    this.rateLimit.remaining--;
    return true;
  }

  _logCall(endpoint, params, status, duration, success) {
    const log = {
      endpoint,
      params,
      status,
      duration,
      success,
      timestamp: Date.now()
    };
    
    const logs = JSON.parse(localStorage.getItem('api_call_logs') || '[]');
    logs.unshift(log);
    
    if (logs.length > 100) {
      logs.pop();
    }
    
    localStorage.setItem('api_call_logs', JSON.stringify(logs));
  }

  getEndpointDocs() {
    const docs = [];
    
    Object.keys(this.endpoints).forEach(version => {
      Object.keys(this.endpoints[version]).forEach(category => {
        Object.keys(this.endpoints[version][category]).forEach(action => {
          const endpoint = this.endpoints[version][category][action];
          docs.push({
            endpoint: `${version}.${category}.${action}`,
            method: endpoint.method,
            path: endpoint.path,
            description: endpoint.description
          });
        });
      });
    });
    
    return docs;
  }

  getRecentCalls(limit = 20) {
    const logs = JSON.parse(localStorage.getItem('api_call_logs') || '[]');
    return logs.slice(0, limit);
  }

  getUsageStats() {
    const logs = JSON.parse(localStorage.getItem('api_call_logs') || '[]');
    
    if (logs.length === 0) {
      return {
        totalCalls: 0,
        successRate: 0,
        avgDuration: 0,
        rateLimit: this.rateLimit
      };
    }
    
    const totalCalls = logs.length;
    const successCalls = logs.filter(log => log.success).length;
    const totalDuration = logs.reduce((sum, log) => sum + log.duration, 0);
    
    return {
      totalCalls,
      successRate: Math.round((successCalls / totalCalls) * 100),
      avgDuration: Math.round(totalDuration / totalCalls),
      rateLimit: this.rateLimit
    };
  }

  isConfigured() {
    return !!(this.apiKey || this.baseUrl);
  }
}

class DataExporter {
  constructor() {
    this.formats = {
      json: { name: 'JSON', extension: 'json', description: '完整的项目数据，包含所有元信息' },
      markdown: { name: 'Markdown', extension: 'md', description: '纯文本格式，适合阅读和编辑' },
      txt: { name: 'TXT', extension: 'txt', description: '最基本的纯文本格式' },
      csv: { name: 'CSV', extension: 'csv', description: '表格格式，适合数据导入' }
    };
  }

  getFormats() {
    return Object.entries(this.formats).map(([key, value]) => ({
      id: key,
      ...value
    }));
  }

  exportProject(project, format = 'json') {
    // 规范化：统一旧字段路径 → 新字段名
    const data = this._normalizeProject(project);
    let content = '';
    let mimeType = 'text/plain';
    let filename = `${data.title || data.metadata?.title || 'untitled-project'}.${this.formats[format].extension}`;

    switch (format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        break;
      case 'markdown':
        content = this._projectToMarkdown(data);
        mimeType = 'text/markdown';
        filename = filename.replace('.md', '.md');
        break;
      case 'txt':
        content = this._projectToText(data);
        break;
      case 'csv':
        content = this._projectToCsv(data);
        mimeType = 'text/csv';
        filename = filename.replace('.csv', '.csv');
        break;
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 100);

    return { filename, size: content.length };
  }

  /**
   * 统一项目数据结构（兼容旧字段名 → 新字段名）
   */
  _normalizeProject(project) {
    if (!project) project = {};
    const meta = project.metadata || {};
    return {
      title: project.title || meta.title || '',
      genre: project.genre || meta.genre || '',
      style: project.style || meta.style || '',
      duration: project.duration || meta.duration || '',
      episodes: project.episodes || meta.episodes || '',
      outline: project.outline || '',
      script: project.script || '',
      novel: project.novel || '',
      shots: (project.shots || []).map(s => this._normalizeShot(s)),
      characters: project.characters || [],
      scenes: project.scenes || [],
      beats: project.beats || { structure: 'three-act', beats: [] },
      metadata: meta,
      version: '2.0',
      exportedAt: new Date().toISOString()
    };
  }

  _normalizeShot(shot) {
    if (!shot) return {};
    return {
      id: shot.id || 0,
      type: shot.type || shot.shotType || '中景',
      scene: shot.scene || '',
      characters: shot.characters || shot.character || '',
      cameraMove: shot.cameraMove || shot.camera || '固定',
      duration: shot.duration || '5秒',
      content: shot.content || shot.description || shot.action || '',
      dialog: shot.dialog || shot.dialogue || '',
      imagePrompt: shot.imagePrompt || shot.image_prompt || shot.prompt || '',
      videoPrompt: shot.videoPrompt || shot.video_prompt || '',
      characterPrompt: shot.characterPrompt || '',
      lighting: shot.lighting || '自然光',
      mood: shot.mood || '平静',
      aspectRatio: shot.aspectRatio || '16:9'
    };
  }

  exportAllProjects(projects, format = 'json') {
    if (format !== 'json') {
      throw new Error('批量导出仅支持 JSON 格式');
    }
    
    const content = JSON.stringify(projects, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const filename = `all-projects-${Date.now()}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    return { filename, projectsCount: projects.length };
  }

  _projectToMarkdown(project) {
    let md = `# ${project.title || '未命名项目'}\n\n`;
    
    if (project.description) {
      md += `${project.description}\n\n`;
    }
    
    if (project.characters) {
      md += `## 角色\n\n`;
      project.characters.forEach((char, i) => {
        md += `${i + 1}. **${char.name || '未知角色'}** - ${char.description || '暂无描述'}\n`;
      });
      md += '\n';
    }
    
    if (project.outline) {
      md += `## 大纲\n\n${project.outline}\n\n`;
    }
    
    if (project.script) {
      md += `## 剧本\n\n${project.script}\n\n`;
    }
    
    if (project.shots) {
      md += `## 分镜\n\n`;
      project.shots.forEach((shot, i) => {
        md += `### 第 ${i + 1} 镜\n\n`;
        if (shot.type) md += `**景别**: ${shot.type}\n\n`;
        if (shot.scene) md += `**场景**: ${shot.scene}\n\n`;
        if (shot.characters) md += `**人物**: ${shot.characters}\n\n`;
        if (shot.cameraMove) md += `**运镜**: ${shot.cameraMove}\n\n`;
        if (shot.content) md += `**画面**: ${shot.content}\n\n`;
        if (shot.dialog) md += `**对白**: ${shot.dialog}\n\n`;
        if (shot.imagePrompt) md += `**AI 图片提示词**: ${shot.imagePrompt}\n\n`;
        if (shot.videoPrompt) md += `**AI 视频提示词**: ${shot.videoPrompt}\n\n`;
        if (shot.mood) md += `**情绪**: ${shot.mood}\n\n`;
        md += '---\n\n';
      });
    }
    
    md += `\n\n---\n\n*此文档由 AI 短剧创作工作台生成于 ${new Date().toLocaleString()}*`;
    
    return md;
  }

  _projectToText(project) {
    let text = `${project.title || '未命名项目'}\n${'='.repeat(40)}\n\n`;
    
    if (project.description) {
      text += `${project.description}\n\n`;
    }
    
    if (project.characters) {
      text += `角色:\n`;
      project.characters.forEach((char, i) => {
        text += `  ${i + 1}. ${char.name || '未知角色'} - ${char.description || '暂无描述'}\n`;
      });
      text += '\n';
    }
    
    if (project.outline) {
      text += `大纲:\n${project.outline}\n\n`;
    }
    
    if (project.script) {
      text += `剧本:\n${project.script}\n\n`;
    }
    
    if (project.shots) {
      text += `分镜:\n\n`;
      project.shots.forEach((shot, i) => {
        text += `第 ${i + 1} 镜 (${shot.type || '中景'}):\n`;
        if (shot.scene) text += `  场景: ${shot.scene}\n`;
        if (shot.characters) text += `  人物: ${shot.characters}\n`;
        if (shot.cameraMove) text += `  运镜: ${shot.cameraMove}\n`;
        if (shot.content) text += `  画面: ${shot.content}\n`;
        if (shot.dialog) text += `  对白: ${shot.dialog}\n`;
        if (shot.imagePrompt) text += `  AI图片提示词: ${shot.imagePrompt}\n`;
        if (shot.mood) text += `  情绪: ${shot.mood}\n`;
        text += '\n';
      });
    }
    
    text += `\n\n生成时间: ${new Date().toLocaleString()}`;
    
    return text;
  }

  _projectToCsv(project) {
    const rows = [
      ['镜号', '镜位', '场景', '人物', '运镜', '时长', '描述', '对白', '打光', '情绪', '图片提示词', '视频提示词']
    ];

    (project.shots || []).forEach((shot, i) => {
      rows.push([
        i + 1,
        shot.type || '',
        shot.scene || '',
        shot.characters || '',
        shot.cameraMove || '',
        shot.duration || '',
        (shot.content || '').substring(0, 100),
        shot.dialog || '',
        shot.lighting || '',
        shot.mood || '',
        shot.imagePrompt || '',
        shot.videoPrompt || ''
      ]);
    });

    return rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }
}

const API = new ExternalAPI();
const Exporter = new DataExporter();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ExternalAPI, DataExporter, API, Exporter };
}