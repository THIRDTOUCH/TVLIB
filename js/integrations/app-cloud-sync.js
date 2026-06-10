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