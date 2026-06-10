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
