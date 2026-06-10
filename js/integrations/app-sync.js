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

class SyncMaterialLibrary {
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
        
        materialLibrary = new SyncMaterialLibrary(enhancedDB);
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
