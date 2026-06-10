/**
 * ================================================
 * Phase 2 增强功能模块
 * 功能：拖拽排序 / 统一弹窗 / 加载状态 / 撤销重做 / 搜索
 * ================================================
 */

// ===================== Phase 2-1: 分镜拖拽排序 =====================
const DragSortManager = {
    draggedElement: null,
    draggedIndex: null,
    dragOverElement: null,
    dragOverIndex: null,

    init() {
        const container = document.getElementById('shots-list');
        if (!container) return;
        
        // 确保容器支持拖拽
        container.setAttribute('data-drag-container', 'true');
        
        console.log('✅ 拖拽排序系统初始化完成');
    },

    enableDragSort() {
        const container = document.getElementById('shots-list');
        if (!container) return;

        const cards = container.querySelectorAll('.shot-card');
        cards.forEach((card, index) => {
            card.setAttribute('draggable', 'true');
            card.setAttribute('data-index', index);
            card.classList.add('draggable-card');

            card.addEventListener('dragstart', (e) => this.handleDragStart(e, index, card));
            card.addEventListener('dragover', (e) => this.handleDragOver(e, card));
            card.addEventListener('dragleave', (e) => this.handleDragLeave(e, card));
            card.addEventListener('drop', (e) => this.handleDrop(e, index));
            card.addEventListener('dragend', (e) => this.handleDragEnd(e));
        });
    },

    handleDragStart(e, index, card) {
        this.draggedElement = card;
        this.draggedIndex = index;
        card.classList.add('dragging');
        card.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
    },

    handleDragOver(e, card) {
        e.preventDefault();
        if (card === this.draggedElement) return;
        card.classList.add('drag-over');
        this.dragOverElement = card;
    },

    handleDragLeave(e, card) {
        card.classList.remove('drag-over');
    },

    handleDrop(e, targetIndex) {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
        if (sourceIndex === targetIndex) return;

        this.reorderShots(sourceIndex, targetIndex);
    },

    handleDragEnd(e) {
        document.querySelectorAll('.shot-card').forEach(card => {
            card.classList.remove('dragging', 'drag-over');
            card.style.opacity = '';
        });
        this.draggedElement = null;
        this.draggedIndex = null;
    },

    reorderShots(sourceIndex, targetIndex) {
        if (!projectData.shots || projectData.shots.length === 0) return;
        
        const movedItem = projectData.shots.splice(sourceIndex, 1)[0];
        projectData.shots.splice(targetIndex, 0, movedItem);

        // 重新渲染列表
        renderShotList(projectData.shots);
        
        // 标记为已更改
        AppState.hasUnsavedChanges = true;
        updateSaveStatus('unsaved');
        showToast('分镜顺序已更新', 'success');
    },

    // 触摸设备支持（移动端拖拽）
    initTouchSupport() {
        let startY = 0;
        let currentCard = null;
        let startIndex = 0;

        const container = document.getElementById('shots-list');
        if (!container) return;

        container.addEventListener('touchstart', (e) => {
            const card = e.target.closest('.shot-card');
            if (!card) return;

            currentCard = card;
            startY = e.touches[0].clientY;
            startIndex = parseInt(card.getAttribute('data-index'));
            card.classList.add('dragging');
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (!currentCard) return;
            e.preventDefault();

            const touch = e.touches[0];
            const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
            const targetCard = elements.find(el => el.classList.contains('shot-card'));

            document.querySelectorAll('.shot-card').forEach(card => {
                card.classList.remove('drag-over');
            });

            if (targetCard && targetCard !== currentCard) {
                targetCard.classList.add('drag-over');
            }
        }, { passive: false });

        container.addEventListener('touchend', (e) => {
            if (!currentCard) return;

            const touch = e.changedTouches[0];
            const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
            const targetCard = elements.find(el => el.classList.contains('shot-card'));

            if (targetCard && targetCard !== currentCard) {
                const targetIndex = parseInt(targetCard.getAttribute('data-index'));
                this.reorderShots(startIndex, targetIndex);
            }

            currentCard.classList.remove('dragging');
            document.querySelectorAll('.shot-card').forEach(card => {
                card.classList.remove('drag-over');
            });
            currentCard = null;
        });
    },

    // 多选删除功能
    selectedShots: new Set(),
    
    toggleShotSelection(index) {
        if (this.selectedShots.has(index)) {
            this.selectedShots.delete(index);
        } else {
            this.selectedShots.add(index);
        }
        this.updateSelectionUI();
    },

    clearSelection() {
        this.selectedShots.clear();
        this.updateSelectionUI();
    },

    deleteSelected() {
        if (this.selectedShots.size === 0) return;
        
        if (!confirm(`确定删除选中的 ${this.selectedShots.size} 个分镜吗？`)) return;

        const indices = Array.from(this.selectedShots).sort((a, b) => b - a);
        indices.forEach(idx => projectData.shots.splice(idx, 1));
        
        this.clearSelection();
        renderShotList(projectData.shots);
        showToast(`已删除 ${indices.length} 个分镜`, 'success');
    },

    updateSelectionUI() {
        document.querySelectorAll('.shot-card').forEach((card, index) => {
            if (this.selectedShots.has(index)) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }
};

// ===================== Phase 2-2: 统一弹窗系统 =====================
const ModalSystem = {
    modals: {},
    lastFocus: null,

    init() {
        // 注册所有弹窗
        const modalConfigs = {
            'create-project-modal': { title: '创建项目', closable: true },
            'history-modal': { title: '操作历史', closable: true },
            'version-modal': { title: '版本管理', closable: true },
            'shortcuts-modal': { title: '快捷键帮助', closable: true },
            'shot-edit-modal': { title: '编辑分镜', closable: true },
            'onboarding-modal': { title: '欢迎使用', closable: true },
            'search-modal': { title: '搜索', closable: true }
        };

        Object.keys(modalConfigs).forEach(modalId => {
            this.registerModal(modalId, modalConfigs[modalId]);
        });

        // 全局ESC关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAll();
            }
        });

        console.log('✅ 弹窗系统初始化完成');
    },

    registerModal(modalId, config = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        this.modals[modalId] = { element: modal, config };

        // 点击遮罩关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal && config.closable !== false) {
                this.close(modalId);
            }
        });

        // 添加统一关闭按钮
        const closeBtn = modal.querySelector('.modal-close, .close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.close(modalId);
            });
        }
    },

    open(modalId, data = {}) {
        const modal = this.modals[modalId];
        if (!modal) return false;

        // 记录当前焦点
        this.lastFocus = document.activeElement;

        // 显示弹窗
        modal.element.style.display = 'flex';
        modal.element.classList.add('modal-open');

        // 触发动画
        const content = modal.element.querySelector('.modal-content');
        if (content) {
            content.style.animation = 'modalSlideIn 0.3s ease';
        }

        // 聚焦到第一个可交互元素
        setTimeout(() => {
            const focusable = modal.element.querySelector('input, button, select, textarea');
            if (focusable) focusable.focus();
        }, 100);

        // 禁止页面滚动
        document.body.style.overflow = 'hidden';

        return true;
    },

    close(modalId) {
        const modal = this.modals[modalId];
        if (!modal) return false;

        modal.element.style.display = 'none';
        modal.element.classList.remove('modal-open');

        // 恢复页面滚动
        if (this.getOpenModalCount() === 0) {
            document.body.style.overflow = '';
        }

        // 恢复焦点
        if (this.lastFocus) {
            this.lastFocus.focus();
        }

        return true;
    },

    closeAll() {
        Object.keys(this.modals).forEach(modalId => {
            this.close(modalId);
        });
    },

    getOpenModalCount() {
        return Object.values(this.modals).filter(m => m.element.style.display === 'flex').length;
    }
};

// 添加弹窗动画
const _phase2Style = document.createElement('style');
_phase2Style.textContent = `
@keyframes modalSlideIn {
    from { transform: translateY(-30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

@keyframes modalFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.modal-overlay { animation: modalFadeIn 0.2s ease; }

/* 拖拽样式 */
.draggable-card {
    cursor: move;
    transition: transform 0.2s, box-shadow 0.2s;
}

.draggable-card:hover {
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.draggable-card.dragging {
    opacity: 0.5;
    transform: scale(1.02);
}

.draggable-card.drag-over {
    border: 2px dashed var(--primary) !important;
    background: rgba(99, 102, 241, 0.1) !important;
}

.draggable-card.selected {
    border-color: var(--success) !important;
    background: rgba(16, 185, 129, 0.1) !important;
}

/* 骨架屏样式 */
.skeleton {
    background: linear-gradient(90deg, var(--bg-panel-light) 25%, var(--bg-panel) 50%, var(--bg-panel-light) 75%);
    background-size: 200% 100%;
    animation: skeletonLoading 1.5s infinite;
    border-radius: 4px;
}

@keyframes skeletonLoading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

.skeleton-text {
    height: 14px;
    margin: 8px 0;
}

.skeleton-title {
    height: 20px;
    width: 60%;
    margin-bottom: 16px;
}

.skeleton-card {
    padding: 20px;
    min-height: 200px;
}

/* 进度条 */
.progress-bar {
    width: 100%;
    height: 8px;
    background: var(--bg-panel-light);
    border-radius: 4px;
    overflow: hidden;
    margin: 12px 0;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary), var(--secondary));
    transition: width 0.3s ease;
    border-radius: 4px;
}

.progress-text {
    text-align: center;
    font-size: 12px;
    color: var(--text-dim);
    margin-top: 8px;
}

/* 搜索高亮 */
.search-highlight {
    background: var(--warning);
    color: var(--bg);
    padding: 2px 4px;
    border-radius: 2px;
}

/* 搜索弹窗 */
.search-modal {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.search-input-wrapper {
    position: relative;
}

.search-input-wrapper input {
    width: 100%;
    padding: 12px 16px 12px 44px;
    font-size: 16px;
    background: var(--bg);
    border: 2px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    transition: var(--transition);
}

.search-input-wrapper input:focus {
    border-color: var(--primary);
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 18px;
}

.search-results {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-panel-light);
}

.search-result-item {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: var(--transition);
}

.search-result-item:hover {
    background: var(--bg);
    padding-left: 20px;
}

.search-result-item:last-child {
    border-bottom: none;
}

.search-result-type {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    margin-bottom: 4px;
}

.search-result-content {
    font-size: 14px;
    color: var(--text);
    line-height: 1.5;
}

.search-empty {
    padding: 40px;
    text-align: center;
    color: var(--text-muted);
}

/* 多选工具栏 */
.selection-toolbar {
    position: sticky;
    bottom: 0;
    background: var(--bg-panel-light);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px;
    margin-top: 16px;
    display: none;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.selection-toolbar.active {
    display: flex;
}

/* 命令面板 */
.command-panel {
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 8px;
}

.command-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: var(--transition);
}

.command-item:hover {
    background: var(--bg-panel-light);
}

.command-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    border-radius: var(--radius-sm);
    font-size: 16px;
}

.command-text {
    flex: 1;
    font-size: 14px;
}

.command-shortcut {
    font-size: 11px;
    color: var(--text-muted);
    background: var(--bg);
    padding: 4px 8px;
    border-radius: 4px;
}
`;
document.head.appendChild(_phase2Style);

// ===================== Phase 2-3: 加载状态反馈 =====================
const LoadingManager = {
    loadingStates: {},

    showLoading(elementId, options = {}) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const { type = 'skeleton', message = '加载中...', progress = 0 } = options;

        // 保存原始内容
        this.loadingStates[elementId] = {
            originalContent: element.innerHTML,
            originalHeight: element.offsetHeight
        };

        // 设置最小高度
        if (options.minHeight) {
            element.style.minHeight = options.minHeight + 'px';
        }

        // 根据类型显示加载动画
        if (type === 'skeleton') {
            element.innerHTML = this.generateSkeletonContent(options);
        } else if (type === 'spinner') {
            element.innerHTML = this.generateSpinnerContent(message, progress);
        } else if (type === 'progress') {
            element.innerHTML = this.generateProgressContent(message, progress);
        }

        element.setAttribute('data-loading', 'true');
    },

    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const state = this.loadingStates[elementId];
        if (state) {
            element.innerHTML = state.originalContent;
            element.style.minHeight = '';
            delete this.loadingStates[elementId];
        }

        element.removeAttribute('data-loading');
    },

    generateSkeletonContent(options) {
        const lines = options.lines || 5;
        let html = '<div class="skeleton-card">';
        html += '<div class="skeleton skeleton-title"></div>';
        for (let i = 0; i < lines; i++) {
            html += '<div class="skeleton skeleton-text"></div>';
        }
        html += '</div>';
        return html;
    },

    generateSpinnerContent(message, progress) {
        return `
            <div style="text-align: center; padding: 40px;">
                <div style="
                    width: 40px; height: 40px;
                    border: 3px solid var(--border);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    margin: 0 auto 16px;
                    animation: spin 1s linear infinite;
                "></div>
                <p style="color: var(--text-dim);">${message}</p>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;
    },

    generateProgressContent(message, progress) {
        return `
            <div style="padding: 20px;">
                <p style="text-align: center; margin-bottom: 12px;">${message}</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="progress-text">${progress}%</div>
            </div>
        `;
    },

    updateProgress(elementId, progress, message) {
        const element = document.getElementById(elementId);
        if (!element || !element.hasAttribute('data-loading')) return;

        const fill = element.querySelector('.progress-fill');
        const text = element.querySelector('.progress-text');
        const msg = element.querySelector('p');

        if (fill) fill.style.width = progress + '%';
        if (text) text.textContent = progress + '%';
        if (msg && message) msg.textContent = message;
    },

    // 模拟AI生成过程
    async simulateAIGeneration(elementId, duration = 3000) {
        this.showLoading(elementId, {
            type: 'spinner',
            message: 'AI正在创作中...'
        });

        await new Promise(resolve => setTimeout(resolve, duration));
        this.hideLoading(elementId);
    }
};

// ===================== Phase 2-4: 撤销/重做 =====================
const UndoRedoManager = {
    history: [],
    currentIndex: -1,
    maxHistory: 50,

    init() {
        // 监听键盘
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redo();
            }
        });

        // 按钮绑定
        document.addEventListener('DOMContentLoaded', () => {
            const undoBtn = document.getElementById('btn-undo');
            const redoBtn = document.getElementById('btn-redo');
            if (undoBtn) undoBtn.addEventListener('click', () => this.undo());
            if (redoBtn) redoBtn.addEventListener('click', () => this.redo());
        });

        console.log('✅ 撤销/重做系统初始化完成');
    },

    // 记录状态
    record(action, dataType, oldValue, newValue) {
        const record = {
            action,
            dataType,
            oldValue,
            newValue,
            timestamp: new Date().toISOString()
        };

        // 如果不是在最新位置记录，删除后面的历史
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }

        this.history.push(record);

        // 限制历史记录数量
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        this.currentIndex = this.history.length - 1;
        this.updateUI();
    },

    undo() {
        if (this.currentIndex < 0) {
            showToast('无可撤销操作', 'info');
            return;
        }

        const record = this.history[this.currentIndex];
        this.restoreState(record.dataType, record.oldValue);
        this.currentIndex--;
        this.updateUI();
        showToast(`已撤销: ${record.action}`, 'info');
    },

    redo() {
        if (this.currentIndex >= this.history.length - 1) {
            showToast('无可重做操作', 'info');
            return;
        }

        this.currentIndex++;
        const record = this.history[this.currentIndex];
        this.restoreState(record.dataType, record.newValue);
        this.updateUI();
        showToast(`已重做: ${record.action}`, 'info');
    },

    restoreState(dataType, value) {
        switch (dataType) {
            case 'outline':
                projectData.outline = value;
                const outlineEl = document.getElementById('outline-result-content');
                if (outlineEl) outlineEl.textContent = value;
                break;
            case 'script':
                projectData.script = value;
                const scriptEl = document.getElementById('script-result-content');
                if (scriptEl) scriptEl.textContent = value;
                break;
            case 'shots':
                projectData.shots = value;
                renderShotList(value);
                break;
        }
        AppState.hasUnsavedChanges = true;
        updateSaveStatus('unsaved');
    },

    updateUI() {
        const undoBtn = document.getElementById('btn-undo');
        const redoBtn = document.getElementById('btn-redo');

        if (undoBtn) undoBtn.disabled = this.currentIndex < 0;
        if (redoBtn) redoBtn.disabled = this.currentIndex >= this.history.length - 1;
    },

    clearHistory() {
        this.history = [];
        this.currentIndex = -1;
        this.updateUI();
    }
};

// ===================== Phase 2-5: 搜索功能 =====================
const SearchSystem = {
    searchIndex: {},
    lastSearchTerm: '',

    init() {
        // 绑定搜索快捷键
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                this.openSearch();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.openSearch();
            }
        });

        console.log('✅ 搜索系统初始化完成');
    },

    openSearch() {
        const modal = document.getElementById('search-modal');
        if (!modal) {
            // 如果搜索弹窗不存在，创建一个
            this.createSearchModal();
        }
        ModalSystem.open('search-modal');
        
        // 聚焦搜索框
        setTimeout(() => {
            const input = document.getElementById('search-input');
            if (input) input.focus();
        }, 100);
    },

    createSearchModal() {
        const modal = document.createElement('div');
        modal.id = 'search-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>🔍 搜索</h3>
                    <button class="btn-icon modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="search-modal">
                        <div class="search-input-wrapper">
                            <span class="search-icon">🔍</span>
                            <input type="text" id="search-input" placeholder="搜索大纲、剧本、分镜、角色..." autocomplete="off">
                        </div>
                        <div id="search-results" class="search-results" style="display: none;"></div>
                    </div>
                    <div style="margin-top: 16px; font-size: 12px; color: var(--text-muted);">
                        <p>💡 提示：使用 Ctrl+F 或 Ctrl+K 快速打开搜索</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        ModalSystem.registerModal('search-modal', { closable: true });

        // 绑定搜索事件
        const searchInput = modal.querySelector('#search-input');
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });
    },

    performSearch(searchTerm) {
        this.lastSearchTerm = searchTerm;
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;

        if (!searchTerm.trim()) {
            resultsContainer.style.display = 'none';
            return;
        }

        const results = [];

        // 搜索大纲
        if (projectData.outline && projectData.outline.toLowerCase().includes(searchTerm.toLowerCase())) {
            const snippet = this.getSnippet(projectData.outline, searchTerm);
            results.push({
                type: '大纲',
                content: snippet,
                action: () => {
                    switchTab('outline');
                    ModalSystem.closeAll();
                }
            });
        }

        // 搜索剧本
        if (projectData.script && projectData.script.toLowerCase().includes(searchTerm.toLowerCase())) {
            const snippet = this.getSnippet(projectData.script, searchTerm);
            results.push({
                type: '剧本',
                content: snippet,
                action: () => {
                    switchTab('script');
                    ModalSystem.closeAll();
                }
            });
        }

        // 搜索分镜
        projectData.shots.forEach((shot, index) => {
            const content = (shot.type || '') + ' ' + (shot.scene || '') + ' ' + (shot.content || '') + ' ' + (shot.dialog || '');
            if (content.toLowerCase().includes(searchTerm.toLowerCase())) {
                const snippet = this.getSnippet(shot.content || shot.scene, searchTerm);
                results.push({
                    type: `分镜 #${index + 1}`,
                    content: snippet,
                    action: () => {
                        switchTab('storyboard');
                        ModalSystem.closeAll();
                    }
                });
            }
        });

        // 显示结果
        if (results.length === 0) {
            resultsContainer.style.display = 'block';
            resultsContainer.innerHTML = `
                <div class="search-empty">
                    <div style="font-size: 48px; margin-bottom: 12px;">🔍</div>
                    <p>未找到与 "${searchTerm}" 相关的内容</p>
                </div>
            `;
        } else {
            resultsContainer.style.display = 'block';
            resultsContainer.innerHTML = results.map(result => `
                <div class="search-result-item">
                    <div class="search-result-type">${result.type}</div>
                    <div class="search-result-content">${this.highlightSearch(result.content, searchTerm)}</div>
                </div>
            `).join('');

            // 绑定点击事件
            resultsContainer.querySelectorAll('.search-result-item').forEach((item, index) => {
                item.addEventListener('click', () => {
                    results[index].action();
                });
            });
        }
    },

    getSnippet(content, searchTerm) {
        const index = content.toLowerCase().indexOf(searchTerm.toLowerCase());
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + searchTerm.length + 50);
        let snippet = content.substring(start, end);
        
        if (start > 0) snippet = '...' + snippet;
        if (end < content.length) snippet = snippet + '...';
        
        return snippet;
    },

    highlightSearch(text, searchTerm) {
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }
};

// ===================== 命令面板（Command Palette） =====================
const CommandPalette = {
    commands: [
        { id: 'create-project', icon: '📂', text: '创建新项目', shortcut: 'Ctrl+N', action: () => createNewProject() },
        { id: 'save-project', icon: '💾', text: '保存项目', shortcut: 'Ctrl+S', action: () => saveProject() },
        { id: 'search', icon: '🔍', text: '搜索内容', shortcut: 'Ctrl+F', action: () => SearchSystem.openSearch() },
        { id: 'undo', icon: '↩️', text: '撤销', shortcut: 'Ctrl+Z', action: () => UndoRedoManager.undo() },
        { id: 'redo', icon: '↪️', text: '重做', shortcut: 'Ctrl+Y', action: () => UndoRedoManager.redo() },
        { id: 'switch-outline', icon: '📝', text: '切换到大纲', shortcut: 'Ctrl+1', action: () => switchTab('outline') },
        { id: 'switch-script', icon: '🎭', text: '切换到剧本', shortcut: 'Ctrl+2', action: () => switchTab('script') },
        { id: 'switch-storyboard', icon: '🎞️', text: '切换到分镜', shortcut: 'Ctrl+3', action: () => switchTab('storyboard') },
        { id: 'switch-board', icon: '🖼️', text: '切换到故事板', shortcut: 'Ctrl+4', action: () => switchTab('board') },
        { id: 'shortcuts', icon: '⌨️', text: '快捷键帮助', shortcut: 'Ctrl+?', action: () => showKeyboardShortcuts() },
        { id: 'templates', icon: '📚', text: '查看模板', shortcut: '-', action: () => showTemplates() },
        { id: 'history', icon: '📜', text: '查看历史', shortcut: '-', action: () => document.getElementById('history-modal').style.display = 'flex' }
    ],

    init() {
        console.log('✅ 命令面板初始化完成');
    },

    show() {
        let modal = document.getElementById('command-palette-modal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'command-palette-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>⚡ 命令面板</h3>
                        <button class="btn-icon modal-close">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="search-input-wrapper" style="margin-bottom: 16px;">
                            <span class="search-icon">⚡</span>
                            <input type="text" id="command-input" placeholder="输入命令名称..." autocomplete="off">
                        </div>
                        <div id="command-list" style="max-height: 400px; overflow-y: auto;"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            ModalSystem.registerModal('command-palette-modal', { closable: true });

            const input = modal.querySelector('#command-input');
            input.addEventListener('input', (e) => this.filterCommands(e.target.value));
            this.renderCommands(this.commands);
        }

        ModalSystem.open('command-palette-modal');
        setTimeout(() => {
            const input = document.getElementById('command-input');
            if (input) { input.focus(); input.value = ''; }
            this.renderCommands(this.commands);
        }, 100);
    },

    renderCommands(commands) {
        const list = document.getElementById('command-list');
        if (!list) return;
        list.innerHTML = commands.map((cmd, index) => `
            <div class="command-item" data-index="${index}">
                <div class="command-icon">${cmd.icon}</div>
                <div class="command-text">${cmd.text}</div>
                <div class="command-shortcut">${cmd.shortcut}</div>
            </div>
        `).join('');

        list.querySelectorAll('.command-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                commands[index].action();
                ModalSystem.closeAll();
            });
        });
    },

    filterCommands(searchTerm) {
        const filtered = this.commands.filter(cmd => 
            cmd.text.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderCommands(filtered);
    }
};

// ===================== 初始化 Phase 2 系统 =====================
function initPhase2() {
    console.log('🚀 初始化 Phase 2 系统...');

    // 初始化所有子系统
    setTimeout(() => {
        DragSortManager.init();
        DragSortManager.initTouchSupport();
        ModalSystem.init();
        LoadingManager.showLoading = LoadingManager.showLoading.bind(LoadingManager);
        UndoRedoManager.init();
        SearchSystem.init();
        CommandPalette.init();

        // 启用分镜拖拽
        setTimeout(() => {
            DragSortManager.enableDragSort();
        }, 500);

        console.log('✅ Phase 2 系统初始化完成');
    }, 100);
}

// 监听 DOM 加载
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPhase2);
} else {
    initPhase2();
}

// ===================== 更新分镜渲染以支持拖拽 =====================
const originalRenderShotList = window.renderShotList;
window.renderShotList = function(shots) {
    // 调用原始渲染逻辑
    if (typeof originalRenderShotList === 'function') {
        originalRenderShotList(shots);
    }
    
    // 启用拖拽
    setTimeout(() => {
        DragSortManager.enableDragSort();
    }, 100);
};

// 导出到全局
window.DragSortManager = DragSortManager;
window.ModalSystem = ModalSystem;
window.LoadingManager = LoadingManager;
window.UndoRedoManager = UndoRedoManager;
window.SearchSystem = SearchSystem;
window.CommandPalette = CommandPalette;

// 添加快捷工具栏按钮
function addToolbarButtons() {
    const headerRight = document.querySelector('.header-right');
    if (!headerRight) return;

    const toolbarHTML = `
        <button class="btn btn-secondary" onclick="UndoRedoManager.undo()" title="撤销 (Ctrl+Z)" id="btn-undo" style="padding: 10px;">↩️</button>
        <button class="btn btn-secondary" onclick="UndoRedoManager.redo()" title="重做 (Ctrl+Y)" id="btn-redo" style="padding: 10px;">↪️</button>
        <button class="btn btn-secondary" onclick="SearchSystem.openSearch()" title="搜索 (Ctrl+F)" style="padding: 10px;">🔍</button>
        <button class="btn btn-primary" onclick="CommandPalette.show()" title="命令面板 (Ctrl+P)" style="padding: 10px;">⚡</button>
    `;
    
    // 插入到现有按钮之前
    if (!document.getElementById('btn-undo')) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = toolbarHTML;
        const buttons = tempDiv.querySelectorAll('button');
        buttons.forEach((btn, index) => {
            headerRight.insertBefore(btn, headerRight.children[index]);
        });
    }
}

// 页面加载完成后添加工具栏
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(addToolbarButtons, 200);
});

console.log('✅ Phase 2 系统加载完成');
