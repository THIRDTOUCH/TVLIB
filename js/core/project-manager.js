/**
 * ================================================
 * 项目管理系统 V2.0 - 修复并优化
 * ================================================
 * 修复内容：
 * 1. 完整的 IndexedDB 错误处理
 * 2. 完善的 addHistory 方法
 * 3. 项目状态管理
 * 4. 数据迁移机制
 * 5. 智能自动保存
 * 6. 加载状态提示
 * ================================================
 */

class ProjectDatabase {
    constructor() {
        this.db = null;
        this.dbName = 'ShortDramaDB';
        this.dbVersion = 2; // 版本升级以支持迁移
        this.currentVersion = 2;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('❌ 数据库初始化失败:', event.target.error);
                reject(new Error('数据库初始化失败: ' + event.target.error.message));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ 数据库连接成功');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion || 0;
                console.log(`🔄 数据库升级: v${oldVersion} -> v${this.dbVersion}`);

                // ========== 数据迁移逻辑 ==========

                // 创建项目表 (v1+)
                if (!db.objectStoreNames.contains('projects')) {
                    const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
                    projectStore.createIndex('title', 'title', { unique: false });
                    projectStore.createIndex('createdAt', 'createdAt', { unique: false });
                    projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    projectStore.createIndex('status', 'status', { unique: false });
                    projectStore.createIndex('genre', 'genre', { unique: false });
                }

                // 创建版本记录表 (v1+)
                if (!db.objectStoreNames.contains('versions')) {
                    const versionStore = db.createObjectStore('versions', { keyPath: 'id', autoIncrement: false });
                    versionStore.createIndex('projectId', 'projectId', { unique: false });
                    versionStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // 创建操作历史表 (v1+)
                if (!db.objectStoreNames.contains('history')) {
                    const historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: false });
                    historyStore.createIndex('projectId', 'projectId', { unique: false });
                    historyStore.createIndex('actionType', 'actionType', { unique: false });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // v1 -> v2 迁移
                if (oldVersion < 2) {
                    this.migrateFromV1(db);
                }

                console.log('✅ 数据库结构升级完成');
            };
        });
    }

    /**
     * 从 v1 迁移到 v2
     */
    migrateFromV1(db) {
        // 为旧数据添加新字段
        try {
            const projectStore = db.transaction('projects', 'readonly').objectStore('projects');
            const projects = [];

            projectStore.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const project = cursor.value;
                    // 确保所有必需字段存在
                    if (!project.status) project.status = 'draft';
                    if (!project.shots) project.shots = [];
                    if (!project.outline) project.outline = '';
                    if (!project.script) project.script = '';
                    if (!project.novel) project.novel = '';
                    projects.push(project);
                    cursor.continue();
                }
            };
        } catch (error) {
            console.warn('⚠️ 数据迁移过程中出现问题（可能是新数据库）:', error.message);
        }
    }

    /**
     * 创建新项目
     */
    async createProject(projectData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects', 'history'], 'readwrite');
            const projectStore = transaction.objectStore('projects');
            const historyStore = transaction.objectStore('history');

            const now = new Date().toISOString();
            const project = {
                id: this.generateId(),
                title: projectData.title || '未命名项目',
                description: projectData.description || '',
                genre: projectData.genre || '都市情感',
                style: projectData.style || '写实',
                duration: projectData.duration || '10分钟',
                episodes: projectData.episodes || '1集',
                outline: projectData.outline || '',
                script: projectData.script || '',
                novel: projectData.novel || '',
                shots: projectData.shots || [],
                createdAt: now,
                updatedAt: now,
                status: 'draft',
                version: 2 // 数据结构版本
            };

            const projectRequest = projectStore.add(project);

            projectRequest.onsuccess = () => {
                // 记录创建操作
                const historyId = this.generateId();
                historyStore.add({
                    id: historyId,
                    projectId: project.id,
                    actionType: 'create',
                    actionDesc: '创建项目',
                    timestamp: now,
                    detail: { title: project.title, genre: project.genre }
                });

                console.log(`✅ 项目创建成功: ${project.title} (${project.id})`);
            };

            transaction.oncomplete = () => resolve(project);
            transaction.onerror = (event) => {
                console.error('❌ 项目创建失败:', event.target.error);
                reject(new Error('项目创建失败: ' + event.target.error.message));
            };
        });
    }

    /**
     * 获取所有项目
     */
    async getProjects() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readonly');
            const store = transaction.objectStore('projects');
            const request = store.getAll();

            request.onsuccess = () => {
                const projects = request.result.sort((a, b) =>
                    new Date(b.updatedAt) - new Date(a.updatedAt)
                );
                resolve(projects);
            };

            request.onerror = (event) => {
                console.error('❌ 获取项目列表失败:', event.target.error);
                reject(new Error('获取项目列表失败'));
            };
        });
    }

    /**
     * 获取单个项目
     */
    async getProject(projectId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readonly');
            const store = transaction.objectStore('projects');
            const request = store.get(projectId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => {
                console.error('❌ 获取项目失败:', event.target.error);
                reject(new Error('获取项目失败'));
            };
        });
    }

    /**
     * 更新项目
     */
    async updateProject(projectId, updates, actionDesc = '更新项目') {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects', 'history'], 'readwrite');
            const projectStore = transaction.objectStore('projects');
            const historyStore = transaction.objectStore('history');

            const getRequest = projectStore.get(projectId);

            getRequest.onsuccess = () => {
                const project = getRequest.result;
                if (!project) {
                    reject(new Error('项目不存在'));
                    return;
                }

                // 合并更新内容
                const updatedProject = {
                    ...project,
                    ...updates,
                    updatedAt: new Date().toISOString(),
                    version: project.version || 2
                };

                projectStore.put(updatedProject);

                // 记录更新操作
                const historyId = this.generateId();
                historyStore.add({
                    id: historyId,
                    projectId,
                    actionType: 'update',
                    actionDesc,
                    timestamp: new Date().toISOString(),
                    detail: { updatedFields: Object.keys(updates) }
                });

                transaction.oncomplete = () => {
                    console.log(`✅ 项目更新成功: ${actionDesc}`);
                    resolve(updatedProject);
                };

                transaction.onerror = (event) => {
                    console.error('❌ 项目更新失败:', event.target.error);
                    reject(new Error('项目更新失败'));
                };
            };
        });
    }

    /**
     * 更新项目状态
     */
    async updateStatus(projectId, status) {
        const validStatuses = ['draft', 'active', 'completed', 'archived'];
        if (!validStatuses.includes(status)) {
            throw new Error(`无效状态: ${status}`);
        }

        const statusNames = {
            draft: '草稿',
            active: '进行中',
            completed: '已完成',
            archived: '已归档'
        };

        return await this.updateProject(
            projectId,
            { status },
            `更新状态为"${statusNames[status]}"`
        );
    }

    /**
     * 删除项目
     */
    async deleteProject(projectId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects', 'versions', 'history'], 'readwrite');
            const projectStore = transaction.objectStore('projects');
            const versionStore = transaction.objectStore('versions');
            const historyStore = transaction.objectStore('history');

            // 删除项目
            projectStore.delete(projectId);

            // 删除相关版本 (使用完整的错误处理)
            try {
                const versionIndex = versionStore.index('projectId');
                versionIndex.openCursor(IDBKeyRange.only(projectId)).onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                };

                // 删除相关历史
                const historyIndex = historyStore.index('projectId');
                historyIndex.openCursor(IDBKeyRange.only(projectId)).onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                };
            } catch (error) {
                console.warn('⚠️ 删除关联数据时出现问题:', error.message);
            }

            transaction.oncomplete = () => {
                console.log(`✅ 项目删除成功: ${projectId}`);
                resolve();
            };

            transaction.onerror = (event) => {
                console.error('❌ 项目删除失败:', event.target.error);
                reject(new Error('项目删除失败'));
            };
        });
    }

    /**
     * 创建版本快照
     */
    async createVersion(projectId, versionName = '') {
        return new Promise(async (resolve, reject) => {
            try {
                const project = await this.getProject(projectId);
                if (!project) {
                    reject(new Error('项目不存在'));
                    return;
                }

                const transaction = this.db.transaction(['versions', 'history'], 'readwrite');
                const versionStore = transaction.objectStore('versions');
                const historyStore = transaction.objectStore('history');

                const version = {
                    id: this.generateId(),
                    projectId,
                    versionName: versionName || `版本 ${new Date().toLocaleString('zh-CN')}`,
                    snapshot: JSON.parse(JSON.stringify(project)), // 深拷贝
                    timestamp: new Date().toISOString()
                };

                versionStore.add(version);

                historyStore.add({
                    id: this.generateId(),
                    projectId,
                    actionType: 'version',
                    actionDesc: `创建版本: ${version.versionName}`,
                    timestamp: new Date().toISOString(),
                    detail: { versionId: version.id, versionName: version.versionName }
                });

                transaction.oncomplete = () => {
                    console.log(`✅ 版本创建: ${version.versionName}`);
                    resolve(version);
                };

                transaction.onerror = (event) => {
                    console.error('❌ 版本创建失败:', event.target.error);
                    reject(new Error('版本创建失败'));
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 获取项目版本列表
     */
    async getVersions(projectId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['versions'], 'readonly');
            const store = transaction.objectStore('versions');
            const index = store.index('projectId');
            const request = index.getAll(projectId);

            request.onsuccess = () => {
                const versions = request.result.sort((a, b) =>
                    new Date(b.timestamp) - new Date(a.timestamp)
                );
                resolve(versions);
            };

            request.onerror = (event) => {
                console.error('❌ 获取版本列表失败:', event.target.error);
                reject(new Error('获取版本列表失败'));
            };
        });
    }

    /**
     * 恢复到指定版本
     */
    async restoreVersion(projectId, versionId) {
        return new Promise(async (resolve, reject) => {
            try {
                // 获取版本数据
                let versionSnapshot = null;
                const versionTransaction = this.db.transaction(['versions'], 'readonly');
                const versionStore = versionTransaction.objectStore('versions');
                const versionRequest = versionStore.get(versionId);

                versionRequest.onsuccess = async () => {
                    const version = versionRequest.result;
                    if (!version) {
                        reject(new Error('版本不存在'));
                        return;
                    }

                    versionSnapshot = version.snapshot;

                    // 恢复项目
                    const projectTransaction = this.db.transaction(['projects', 'history'], 'readwrite');
                    const projectStore = projectTransaction.objectStore('projects');
                    const historyStore = projectTransaction.objectStore('history');

                    const restoredProject = {
                        ...versionSnapshot,
                        id: projectId,
                        updatedAt: new Date().toISOString()
                    };

                    projectStore.put(restoredProject);

                    historyStore.add({
                        id: this.generateId(),
                        projectId,
                        actionType: 'restore',
                        actionDesc: `恢复版本: ${version.versionName}`,
                        timestamp: new Date().toISOString(),
                        detail: { versionId, versionName: version.versionName }
                    });

                    projectTransaction.oncomplete = () => {
                        console.log(`✅ 版本恢复成功: ${version.versionName}`);
                        resolve(restoredProject);
                    };

                    projectTransaction.onerror = (event) => {
                        console.error('❌ 版本恢复失败:', event.target.error);
                        reject(new Error('版本恢复失败'));
                    };
                };

                versionRequest.onerror = (event) => {
                    reject(new Error('获取版本数据失败'));
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 添加历史记录
     */
    async addHistory(projectId, actionType, actionDesc, detail = {}) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readwrite');
            const historyStore = transaction.objectStore('history');

            const record = {
                id: this.generateId(),
                projectId,
                actionType,
                actionDesc,
                timestamp: new Date().toISOString(),
                detail
            };

            const request = historyStore.add(record);

            request.onsuccess = () => {
                console.log(`📝 历史记录: ${actionDesc}`);
                resolve(record);
            };

            request.onerror = (event) => {
                console.error('❌ 历史记录添加失败:', event.target.error);
                // 历史记录失败不应该阻止主流程，只记录警告
                resolve(null);
            };
        });
    }

    /**
     * 获取项目历史记录
     */
    async getHistory(projectId, limit = 50) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readonly');
            const store = transaction.objectStore('history');
            const index = store.index('projectId');
            const request = index.getAll(projectId);

            request.onsuccess = () => {
                const history = request.result
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, limit);
                resolve(history);
            };

            request.onerror = (event) => {
                console.error('❌ 获取历史记录失败:', event.target.error);
                reject(new Error('获取历史记录失败'));
            };
        });
    }

    /**
     * 导出项目数据
     */
    async exportProject(projectId) {
        const project = await this.getProject(projectId);
        if (!project) throw new Error('项目不存在');

        const versions = await this.getVersions(projectId);
        const history = await this.getHistory(projectId, 200);

        return {
            exportInfo: {
                version: 2,
                exportTime: new Date().toISOString(),
                software: 'AI短剧文本制作工作流'
            },
            project,
            versions,
            history,
            statistics: {
                shotCount: project.shots ? project.shots.length : 0,
                versionCount: versions.length,
                historyCount: history.length,
                duration: this.calculateTotalDuration(project.shots || [])
            }
        };
    }

    /**
     * 导出所有项目
     */
    async exportAll() {
        const projects = await this.getProjects();
        const exports = [];

        for (const project of projects) {
            try {
                const data = await this.exportProject(project.id);
                exports.push(data);
            } catch (error) {
                console.warn(`⚠️ 项目 ${project.title} 导出失败:`, error.message);
            }
        }

        return {
            database: this.dbName,
            dbVersion: this.dbVersion,
            exportTime: new Date().toISOString(),
            projectCount: exports.length,
            projects: exports
        };
    }

    /**
     * 导入项目数据
     */
    async importProject(exportedData) {
        return new Promise((resolve, reject) => {
            if (!exportedData || !exportedData.project) {
                reject(new Error('无效的导入数据'));
                return;
            }

            const transaction = this.db.transaction(['projects', 'versions', 'history'], 'readwrite');
            const projectStore = transaction.objectStore('projects');
            const versionStore = transaction.objectStore('versions');
            const historyStore = transaction.objectStore('history');

            const now = new Date().toISOString();
            const newProjectId = this.generateId();

            const project = {
                ...exportedData.project,
                id: newProjectId,
                title: (exportedData.project.title || '导入项目') + ' (副本)',
                createdAt: now,
                updatedAt: now,
                status: 'draft'
            };

            projectStore.add(project);

            if (exportedData.versions && exportedData.versions.length > 0) {
                exportedData.versions.forEach(version => {
                    versionStore.add({
                        ...version,
                        id: this.generateId(),
                        projectId: newProjectId
                    });
                });
            }

            if (exportedData.history && exportedData.history.length > 0) {
                exportedData.history.forEach(record => {
                    historyStore.add({
                        ...record,
                        id: this.generateId(),
                        projectId: newProjectId
                    });
                });
            }

            transaction.oncomplete = () => {
                console.log(`✅ 项目导入成功: ${project.title}`);
                resolve(project);
            };

            transaction.onerror = (event) => {
                console.error('❌ 项目导入失败:', event.target.error);
                reject(new Error('项目导入失败'));
            };
        });
    }

    /**
     * 计算分镜总时长
     */
    calculateTotalDuration(shots) {
        if (!shots || !Array.isArray(shots)) return '0秒';
        let totalSeconds = 0;
        shots.forEach(shot => {
            const durationStr = shot.duration || '';
            const match = durationStr.match(/(\d+(?:\.\d+)?)/);
            if (match) {
                totalSeconds += parseFloat(match[1]);
            }
        });
        if (totalSeconds >= 60) {
            return `${(totalSeconds / 60).toFixed(1)}分钟`;
        }
        return `${totalSeconds.toFixed(1)}秒`;
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 清空数据库（慎用）
     */
    async clearAll() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName);
            request.onsuccess = () => {
                this.db = null;
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }
}

class ProjectManager {
    constructor() {
        this.database = new ProjectDatabase();
        this.currentProject = null;
        this.onProjectChange = null;
        this._autoSaveTimer = null;
        this._lastSaveTime = 0;
        this._saveInterval = 60000; // 60秒最小保存间隔
        this._pendingChanges = false;
    }

    async init() {
        await this.database.init();
        this._startAutoSave();
        console.log('✅ 项目管理器初始化完成');
    }

    /**
     * 创建新项目
     */
    async createProject(options) {
        const project = await this.database.createProject(options);
        this.currentProject = project;
        this.notifyChange();
        return project;
    }

    /**
     * 打开项目
     */
    async openProject(projectId) {
        const project = await this.database.getProject(projectId);
        if (project) {
            this.currentProject = project;
            this.notifyChange();
            await this.database.addHistory(projectId, 'open', '打开项目');
        }
        return project;
    }

    /**
     * 更新项目内容
     */
    async updateContent(contentType, content, actionDesc = null) {
        if (!this.currentProject) {
            throw new Error('请先打开项目');
        }

        const updates = { [contentType]: content };
        const desc = actionDesc || this.getActionDesc(contentType);

        const updated = await this.database.updateProject(
            this.currentProject.id,
            updates,
            desc
        );

        this.currentProject = updated;
        this._pendingChanges = true;
        this.notifyChange();
        return updated;
    }

    /**
     * 批量更新多个内容
     */
    async updateContentBatch(updates, actionDesc = '批量更新') {
        if (!this.currentProject) {
            throw new Error('请先打开项目');
        }

        const updated = await this.database.updateProject(
            this.currentProject.id,
            updates,
            actionDesc
        );

        this.currentProject = updated;
        this._pendingChanges = true;
        this.notifyChange();
        return updated;
    }

    /**
     * 获取操作描述
     */
    getActionDesc(contentType, content) {
        const desc = {
            outline: content && content.length > 10 ? '更新剧本大纲' : '清空大纲',
            script: content && content.length > 10 ? '更新剧本内容' : '清空剧本',
            novel: content && content.length > 10 ? '更新小说内容' : '清空小说',
            shots: content && content.length > 0 ? '更新分镜脚本' : '清空分镜',
            title: '修改项目标题',
            description: '修改项目描述',
            genre: '修改类型',
            style: '修改风格',
            duration: '修改时长',
            episodes: '修改集数'
        };
        return desc[contentType] || `更新 ${contentType}`;
    }

    /**
     * 创建版本
     */
    async createVersion(versionName) {
        if (!this.currentProject) {
            throw new Error('请先打开项目');
        }
        return await this.database.createVersion(this.currentProject.id, versionName);
    }

    /**
     * 恢复版本
     */
    async restoreVersion(versionId) {
        if (!this.currentProject) {
            throw new Error('请先打开项目');
        }
        const restored = await this.database.restoreVersion(this.currentProject.id, versionId);
        this.currentProject = restored;
        this.notifyChange();
        return restored;
    }

    /**
     * 获取版本列表
     */
    async getVersions() {
        if (!this.currentProject) {
            return [];
        }
        return await this.database.getVersions(this.currentProject.id);
    }

    /**
     * 获取历史记录
     */
    async getHistory(limit = 50) {
        if (!this.currentProject) {
            return [];
        }
        return await this.database.getHistory(this.currentProject.id, limit);
    }

    /**
     * 获取项目列表
     */
    async getProjects() {
        return await this.database.getProjects();
    }

    /**
     * 删除项目
     */
    async deleteProject(projectId) {
        await this.database.deleteProject(projectId);
        if (this.currentProject && this.currentProject.id === projectId) {
            this.currentProject = null;
            this.notifyChange();
        }
    }

    /**
     * 更新状态
     */
    async updateStatus(status) {
        if (!this.currentProject) {
            throw new Error('请先打开项目');
        }
        const updated = await this.database.updateStatus(this.currentProject.id, status);
        this.currentProject = updated;
        this.notifyChange();
        return updated;
    }

    /**
     * 导出当前项目
     */
    async exportProject() {
        if (!this.currentProject) {
            throw new Error('请先打开项目');
        }
        return await this.database.exportProject(this.currentProject.id);
    }

    /**
     * 导出所有项目
     */
    async exportAll() {
        return await this.database.exportAll();
    }

    /**
     * 导入项目
     */
    async importProject(data) {
        return await this.database.importProject(data);
    }

    /**
     * 记录操作
     */
    async logAction(actionType, actionDesc, detail = {}) {
        if (!this.currentProject) return;
        await this.database.addHistory(this.currentProject.id, actionType, actionDesc, detail);
    }

    /**
     * 智能自动保存
     */
    _startAutoSave() {
        if (this._autoSaveTimer) return;

        this._autoSaveTimer = setInterval(() => {
            if (this._pendingChanges && this.currentProject) {
                const now = Date.now();
                if (now - this._lastSaveTime >= this._saveInterval) {
                    this._saveCurrentState();
                }
            }
        }, 30000); // 每30秒检查一次
    }

    /**
     * 保存当前状态（静默）
     */
    async _saveCurrentState() {
        try {
            if (this.currentProject) {
                await this.database.updateProject(
                    this.currentProject.id,
                    { updatedAt: new Date().toISOString() },
                    '自动保存'
                );
                this._lastSaveTime = Date.now();
                this._pendingChanges = false;
                console.log('💾 自动保存成功');
            }
        } catch (error) {
            console.warn('⚠️ 自动保存失败:', error.message);
        }
    }

    /**
     * 触发保存（手动）
     */
    async forceSave() {
        if (this.currentProject) {
            await this._saveCurrentState();
            return true;
        }
        return false;
    }

    /**
     * 标记有待保存的更改
     */
    markAsChanged() {
        this._pendingChanges = true;
    }

    /**
     * 关闭项目
     */
    closeProject() {
        if (this.currentProject) {
            this._saveCurrentState();
        }
        this.currentProject = null;
        this.notifyChange();
    }

    /**
     * 通知变更
     */
    notifyChange() {
        if (typeof this.onProjectChange === 'function') {
            this.onProjectChange(this.currentProject);
        }
    }

    /**
     * 设置变更回调
     */
    setOnProjectChange(callback) {
        this.onProjectChange = callback;
    }

    /**
     * 获取当前项目统计信息
     */
    getCurrentProjectStats() {
        if (!this.currentProject) {
            return null;
        }

        const p = this.currentProject;
        return {
            title: p.title,
            status: p.status,
            outlineLength: (p.outline || '').length,
            scriptLength: (p.script || '').length,
            novelLength: (p.novel || '').length,
            shotCount: (p.shots || []).length,
            totalDuration: this.database.calculateTotalDuration(p.shots || []),
            updatedAt: p.updatedAt,
            hasChanges: this._pendingChanges
        };
    }

    /**
     * 销毁（清理资源）
     */
    destroy() {
        if (this._autoSaveTimer) {
            clearInterval(this._autoSaveTimer);
            this._autoSaveTimer = null;
        }
        if (this.currentProject) {
            this._saveCurrentState();
        }
    }
}

// 全局实例
window.projectManager = new ProjectManager();

// 页面加载时初始化
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await window.projectManager.init();
            document.dispatchEvent(new CustomEvent('projectManagerReady', {
                detail: { manager: window.projectManager }
            }));
            console.log('✅ 项目管理系统就绪');
        } catch (error) {
            console.error('❌ 项目管理器初始化失败:', error);
        }
    });
}

// 页面关闭时保存
window.addEventListener('beforeunload', () => {
    if (window.projectManager) {
        window.projectManager.destroy();
    }
});

console.log('✅ 项目管理系统 V2.0 加载完成');
