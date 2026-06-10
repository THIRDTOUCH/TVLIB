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