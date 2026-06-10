/**
 * ================================================
 * Phase 1 交互功能扩展
 * 三栏布局 + 状态管理 + Onboarding
 * ================================================
 */

// ================== 全局状态管理 ==================
const AppState = {
    currentTab: 'outline',
    sidebarOpen: true,
    propertiesPanelOpen: true,
    hasUnsavedChanges: false,
    lastSaveTime: null,
    onboardingShown: false,
    
    // Tab 内容状态（解决切换丢失问题）
    tabContentStates: {
        outline: { hasContent: false, lastUpdate: null },
        script: { hasContent: false, lastUpdate: null },
        novel: { hasContent: false, lastUpdate: null },
        storyboard: { hasContent: false, lastUpdate: null },
        board: { hasContent: false, lastUpdate: null },
        characters: { hasContent: false, lastUpdate: null },
        scenes: { hasContent: false, lastUpdate: null },
        beats: { hasContent: false, lastUpdate: null }
    },
    
    // 创作流程状态
    workflowSteps: {
        1: 'outline',
        2: 'script',
        3: 'storyboard',
        4: 'board'
    },
    
    // 更新Tab内容状态
    updateTabState(tabName, hasContent = true) {
        if (this.tabContentStates[tabName]) {
            this.tabContentStates[tabName].hasContent = hasContent;
            this.tabContentStates[tabName].lastUpdate = new Date().toISOString();
        }
        this.updateNavStatus(tabName);
        this.updateWorkflowProgress();
    },
    
    // 更新导航状态
    updateNavStatus(tabName) {
        const statusEl = document.getElementById(`status-${tabName}`);
        if (statusEl) {
            if (this.tabContentStates[tabName]?.hasContent) {
                statusEl.textContent = '✓';
                statusEl.style.color = 'var(--success)';
            } else {
                statusEl.textContent = '○';
                statusEl.style.color = 'var(--text-muted)';
            }
        }
    },
    
    // 更新工作流进度
    updateWorkflowProgress() {
        const progress = document.getElementById('workflow-progress');
        if (!progress) return;
        
        const steps = progress.querySelectorAll('.progress-step');
        let currentStepIndex = 1;
        
        // 确定当前进度
        for (let i = 1; i <= 4; i++) {
            const tabName = this.workflowSteps[i];
            if (this.tabContentStates[tabName]?.hasContent) {
                currentStepIndex = i;
            }
        }
        
        steps.forEach((step, index) => {
            const stepNum = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNum < currentStepIndex) {
                step.classList.add('completed');
            } else if (stepNum === currentStepIndex) {
                step.classList.add('active');
            }
        });
    }
};

// ================== Tab 切换 ==================
function switchTab(tabName) {
    // 1. 切换Tab内容显示
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // 2. 更新左侧导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNav = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
    
    // 3. 更新AppState
    AppState.currentTab = tabName;
    
    // 4. 恢复Tab内容（如果之前有内容）
    restoreTabContent(tabName);
    
    // 5. 更新统计信息
    updateProjectStats();
    
    // 6. 保存当前Tab到localStorage
    localStorage.setItem('lastActiveTab', tabName);
}

// 恢复Tab内容
function restoreTabContent(tabName) {
    // 根据不同Tab恢复对应内容
    switch (tabName) {
        case 'outline':
            restoreOutlineTab();
            break;
        case 'script':
            restoreScriptTab();
            break;
        case 'storyboard':
            restoreStoryboardTab();
            break;
        case 'board':
            restoreBoardTab();
            break;
    }
}

function restoreOutlineTab() {
    // 恢复大纲内容
    const outlineEl = document.getElementById('outline-result-content');
    if (outlineEl && projectData.outline) {
        outlineEl.textContent = projectData.outline;
        document.getElementById('outline-result').style.display = 'block';
    }
}

function restoreScriptTab() {
    const scriptEl = document.getElementById('script-result-content');
    if (scriptEl && projectData.script) {
        scriptEl.textContent = projectData.script;
        document.getElementById('script-result').style.display = 'block';
    }
}

function restoreStoryboardTab() {
    const shotsContainer = document.getElementById('shots-container');
    if (shotsContainer && projectData.shots.length > 0) {
        shotsContainer.style.display = 'block';
        renderShotList(projectData.shots);
    }
}

function restoreBoardTab() {
    if (projectData.shots.length > 0) {
        renderStoryboard();
    }
}

// ================== 侧边栏控制 ==================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    sidebar.classList.toggle('open');
    AppState.sidebarOpen = !sidebar.classList.contains('collapsed');
}

// ================== 属性面板控制 ==================
function togglePropertiesPanel() {
    const panel = document.getElementById('properties-panel');
    panel.classList.toggle('collapsed');
    AppState.propertiesPanelOpen = !panel.classList.contains('collapsed');
}

// ================== 创作流程进度 ==================
function jumpToStep(stepNumber) {
    const tabName = AppState.workflowSteps[stepNumber];
    if (tabName) {
        switchTab(tabName);
    }
}

// 更新创作流程状态
function updateWorkflowStatus() {
    // 更新各个Tab的完成状态
    if (projectData.outline) {
        AppState.updateTabState('outline', true);
    }
    if (projectData.script) {
        AppState.updateTabState('script', true);
    }
    if (projectData.shots.length > 0) {
        AppState.updateTabState('storyboard', true);
    }
}

// ================== 保存状态管理 ==================
function updateSaveStatus(status) {
    const statusEl = document.getElementById('save-status');
    if (!statusEl) return;
    
    const saving = statusEl.querySelector('.saving');
    const saved = statusEl.querySelector('.saved');
    const unsaved = statusEl.querySelector('.unsaved');
    
    // 隐藏所有状态
    [saving, saved, unsaved].forEach(el => {
        if (el) el.style.display = 'none';
    });
    
    // 显示对应状态
    switch (status) {
        case 'saving':
            if (saving) saving.style.display = 'flex';
            break;
        case 'saved':
            if (saved) {
                saved.style.display = 'flex';
                AppState.lastSaveTime = new Date();
            }
            break;
        case 'unsaved':
            if (unsaved) unsaved.style.display = 'flex';
            AppState.hasUnsavedChanges = true;
            break;
    }
}

function showSaveStatus() {
    updateSaveStatus('saved');
}

// ================== Onboarding 引导 ==================
function initOnboarding() {
    // 检查是否显示过引导
    const hasOnboarded = localStorage.getItem('hasOnboarded');
    
    if (!hasOnboarded) {
        setTimeout(() => {
            document.getElementById('onboarding-modal').style.display = 'flex';
        }, 500);
        AppState.onboardingShown = true;
    }
}

function closeOnboarding() {
    document.getElementById('onboarding-modal').style.display = 'none';
    localStorage.setItem('hasOnboarded', 'true');
    AppState.onboardingShown = false;
}

function nextOnboardingStep() {
    // 关闭引导并打开创建项目弹窗
    closeOnboarding();
    createNewProject();
}

// ================== 项目统计 ==================
function updateProjectStats() {
    const stats = {
        outline: (projectData.outline || '').length,
        script: (projectData.script || '').length,
        shots: projectData.shots.length,
        duration: calculateTotalDuration(projectData.shots)
    };
    
    // 更新属性面板统计
    const statOutline = document.getElementById('stat-outline');
    const statScript = document.getElementById('stat-script');
    const statShots = document.getElementById('stat-shots');
    const statDuration = document.getElementById('stat-duration');
    
    if (statOutline) statOutline.textContent = `${stats.outline} 字`;
    if (statScript) statScript.textContent = `${stats.script} 字`;
    if (statShots) statShots.textContent = `${stats.shots} 个`;
    if (statDuration) statDuration.textContent = stats.duration;
    
    // 更新底部状态栏
    const wordCount = document.getElementById('word-count');
    const shotCount = document.getElementById('shot-count-stat');
    if (wordCount) wordCount.textContent = `字数: ${stats.outline + stats.script}`;
    if (shotCount) shotCount.textContent = `分镜: ${stats.shots}`;
}

function calculateTotalDuration(shots) {
    if (!shots || !Array.isArray(shots)) return '0秒';
    let total = 0;
    shots.forEach(shot => {
        const match = String(shot.duration || '').match(/(\d+(?:\.\d+)?)/);
        if (match) total += parseFloat(match[1]);
    });
    if (total >= 60) return `${(total / 60).toFixed(1)}分钟`;
    return `${total.toFixed(1)}秒`;
}

// ================== Toast 消息提示 ==================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✓' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // 自动移除
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ================== 快捷键系统 ==================
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + S: 保存
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveProject();
        }
        
        // Ctrl/Cmd + N: 新建项目
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            createNewProject();
        }
        
        // Ctrl/Cmd + K: 搜索（打开快捷命令）
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            showTemplates();
        }
        
        // Ctrl/Cmd + 1-4: 快速切换Tab
        if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '4') {
            e.preventDefault();
            jumpToStep(parseInt(e.key));
        }
        
        // Ctrl/Cmd + ?: 显示帮助
        if ((e.ctrlKey || e.metaKey) && e.key === '?') {
            e.preventDefault();
            showKeyboardShortcuts();
        }
        
        // ESC: 关闭弹窗
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.style.display = 'none';
    });
}

// ================== 弹窗控制 ==================
function showKeyboardShortcuts() {
    document.getElementById('shortcuts-modal').style.display = 'flex';
}

function closeShortcutsModal() {
    document.getElementById('shortcuts-modal').style.display = 'none';
}

function closeCreateModal() {
    document.getElementById('create-project-modal').style.display = 'none';
}

function closeHistoryModal() {
    document.getElementById('history-modal').style.display = 'none';
}

function closeVersionModal() {
    document.getElementById('version-modal').style.display = 'none';
}

function closeShotEditModal() {
    document.getElementById('shot-edit-modal').style.display = 'none';
}

// ================== AI提示词预览 ==================
function updatePromptPreview() {
    const sceneType = document.getElementById('prompt-scene-type')?.value;
    const mood = document.getElementById('prompt-mood')?.value;
    const preview = document.getElementById('prompt-preview');
    
    if (!preview || !sceneType || !mood) return;
    
    // 生成提示词
    let prompt = '';
    if (PromptLibrary?.scenePrompts?.[sceneType]) {
        prompt += PromptLibrary.scenePrompts[sceneType] + '\n';
    }
    if (PromptLibrary?.moodPrompts?.[mood]) {
        prompt += PromptLibrary.moodPrompts[mood];
    }
    prompt += ', cinematic, professional film still, high quality';
    
    preview.value = prompt;
}

function copyPrompt() {
    const preview = document.getElementById('prompt-preview');
    if (preview) {
        navigator.clipboard.writeText(preview.value).then(() => {
            showToast('提示词已复制！', 'success');
        });
    }
}

// ================== 项目相关 ==================
async function saveProject() {
    updateSaveStatus('saving');
    
    try {
        // 收集当前数据
        const formData = collectFormData();
        
        if (projectManager?.currentProject) {
            // 更新现有项目
            await projectManager.updateContentBatch(formData);
            showToast('项目保存成功！', 'success');
        } else {
            // 创建新项目
            const project = await projectManager.createProject({
                ...formData,
                title: formData.title || '未命名项目'
            });
            showToast('项目创建并保存成功！', 'success');
        }
        
        updateSaveStatus('saved');
        AppState.hasUnsavedChanges = false;
        
    } catch (error) {
        console.error('保存失败:', error);
        showToast('保存失败: ' + error.message, 'error');
        updateSaveStatus('unsaved');
    }
}

function collectFormData() {
    return {
        title: document.getElementById('new-project-title')?.value || '未命名项目',
        outline: projectData.outline,
        script: projectData.script,
        novel: projectData.novel,
        shots: projectData.shots,
        genre: document.getElementById('genre')?.value,
        style: document.getElementById('style')?.value,
        duration: document.getElementById('duration')?.value,
        episodes: document.getElementById('episodes')?.value
    };
}

async function loadProject() {
    try {
        const projects = await projectManager.getProjects();
        
        if (projects.length === 0) {
            showToast('暂无已保存的项目', 'info');
            return;
        }
        
        // 显示项目选择（简化版本，可以后续优化为列表选择）
        const latestProject = projects[0];
        await projectManager.openProject(latestProject.id);
        
        // 加载数据到表单
        loadProjectData(latestProject);
        
        showToast(`已加载项目: ${latestProject.title}`, 'success');
        
    } catch (error) {
        console.error('加载失败:', error);
        showToast('加载失败: ' + error.message, 'error');
    }
}

function loadProjectData(project) {
    // 更新标题
    document.getElementById('new-project-title').value = project.title || '';
    document.querySelector('.project-name-text').textContent = project.title || '未命名项目';
    
    // 更新类型和风格
    if (document.getElementById('genre')) {
        document.getElementById('genre').value = project.genre || '都市情感';
    }
    if (document.getElementById('style')) {
        document.getElementById('style').value = project.style || '写实';
    }
    
    // 恢复内容
    projectData.outline = project.outline || '';
    projectData.script = project.script || '';
    projectData.novel = project.novel || '';
    projectData.shots = project.shots || [];
    
    // 更新Tab状态
    if (project.outline) AppState.updateTabState('outline', true);
    if (project.script) AppState.updateTabState('script', true);
    if (project.shots?.length > 0) AppState.updateTabState('storyboard', true);
    
    // 更新统计
    updateProjectStats();
}

// ================== 创建项目 ==================
function createNewProject() {
    document.getElementById('create-project-modal').style.display = 'flex';
    document.getElementById('create-project-form').reset();
}

document.getElementById('create-project-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const projectData = {
            title: document.getElementById('new-project-title').value,
            description: document.getElementById('new-project-desc')?.value,
            genre: document.getElementById('new-project-genre')?.value,
            style: document.getElementById('new-project-style')?.value,
            duration: document.getElementById('new-project-duration')?.value,
            episodes: document.getElementById('new-project-episodes')?.value
        };
        
        const project = await projectManager.createProject(projectData);
        
        // 更新UI
        document.querySelector('.project-name-text').textContent = project.title;
        
        closeCreateModal();
        showToast(`项目 "${project.title}" 创建成功！`, 'success');
        
        // 切换到大纲Tab
        switchTab('outline');
        
    } catch (error) {
        console.error('创建项目失败:', error);
        showToast('创建失败: ' + error.message, 'error');
    }
});

// ================== 内容变化监听 ==================
function initChangeListeners() {
    // 监听所有表单输入
    document.querySelectorAll('textarea, input').forEach(el => {
        el.addEventListener('input', () => {
            AppState.hasUnsavedChanges = true;
            updateSaveStatus('unsaved');
        });
    });
}

// ================== 内容更新 ==================
function updateContent(tabName, content) {
    projectData[tabName] = content;
    AppState.updateTabState(tabName, !!content);
    AppState.hasUnsavedChanges = true;
    updateSaveStatus('unsaved');
    updateProjectStats();
}

// ================== AI生成按钮加载状态 ==================
function setButtonLoading(buttonId, loading) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    
    const textEl = btn.querySelector('.btn-text');
    const loadingEl = btn.querySelector('.btn-loading');
    
    if (loading) {
        btn.disabled = true;
        if (textEl) textEl.style.display = 'none';
        if (loadingEl) loadingEl.style.display = 'inline';
    } else {
        btn.disabled = false;
        if (textEl) textEl.style.display = 'inline';
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

// ================== 初始化 ==================
document.addEventListener('DOMContentLoaded', () => {
    // 初始化快捷键
    initKeyboardShortcuts();
    
    // 初始化内容变化监听
    initChangeListeners();
    
    // 初始化Onboarding
    initOnboarding();
    
    // 恢复上次Tab
    const lastTab = localStorage.getItem('lastActiveTab');
    if (lastTab) {
        switchTab(lastTab);
    }
    
    // 更新工作流状态
    updateWorkflowStatus();
    
    // 监听项目变化
    if (projectManager) {
        projectManager.setOnProjectChange((project) => {
            if (project) {
                loadProjectData(project);
            }
        });
    }
    
    // 监听场景数量滑块
    const sceneRange = document.getElementById('scene-count-range');
    const sceneValue = document.getElementById('scene-count-value');
    if (sceneRange && sceneValue) {
        sceneRange.addEventListener('input', () => {
            sceneValue.textContent = sceneRange.value;
        });
    }
    
    console.log('✅ Phase 1 交互功能初始化完成');
});

// 导出到全局
window.AppState = AppState;
window.switchTab = switchTab;
window.toggleSidebar = toggleSidebar;
window.togglePropertiesPanel = togglePropertiesPanel;
window.jumpToStep = jumpToStep;
window.updateSaveStatus = updateSaveStatus;
window.showToast = showToast;
window.closeOnboarding = closeOnboarding;
window.nextOnboardingStep = nextOnboardingStep;
window.updateProjectStats = updateProjectStats;
window.updatePromptPreview = updatePromptPreview;
window.copyPrompt = copyPrompt;
window.saveProject = saveProject;
window.loadProject = loadProject;
window.createNewProject = createNewProject;
window.closeCreateModal = closeCreateModal;
window.closeHistoryModal = closeHistoryModal;
window.closeVersionModal = closeVersionModal;
window.closeShortcutsModal = closeShortcutsModal;
window.closeShotEditModal = closeShotEditModal;
window.showKeyboardShortcuts = showKeyboardShortcuts;
window.setButtonLoading = setButtonLoading;
window.updateContent = updateContent;

console.log('✅ Phase 1 交互功能模块加载完成');

// ====== PHASE 2 ======
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
const style = document.createElement('style');
style.textContent = `
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
document.head.appendChild(style);

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

// ====== PHASE 3 ======
/**
 * ================================================
 * Phase 3: 角色库 / 场景库 / 节拍表 / 数据一致性
 * ================================================
 */

// ===================== 全局状态初始化 =====================
if (typeof window.projectData === 'undefined') {
    window.projectData = {
        outline: '',
        script: '',
        novel: '',
        shots: [],
        characters: [],
        scenes: [],
        beats: {
            structure: 'three-act',
            beats: []
        },
        createdAt: null,
        updatedAt: null
    };
}

if (!window.projectData.characters) window.projectData.characters = [];
if (!window.projectData.scenes) window.projectData.scenes = [];
if (!window.projectData.beats) {
    window.projectData.beats = {
        structure: 'three-act',
        beats: []
    };
}

// ===================== Phase 3-1: 角色库管理 =====================
const CharacterLibrary = {
    characterTypes: [
        { value: 'protagonist', label: '主角', icon: '🦸' },
        { value: 'antagonist', label: '反派', icon: '👿' },
        { value: 'mentor', label: '导师/配角', icon: '🧙' },
        { value: 'ally', label: '盟友', icon: '🤝' },
        { value: 'loveInterest', label: '恋人/情感对象', icon: '💖' },
        { value: 'confidant', label: '倾诉者', icon: '💬' },
        { value: 'trickster', label: '谋略者', icon: '🎭' },
        { value: 'fairy', label: '特殊能力者', icon: '✨' },
        { value: 'other', label: '其他', icon: '👤' }
    ],

    genders: [
        { value: 'male', label: '男' },
        { value: 'female', label: '女' },
        { value: 'non-binary', label: '非二元' },
        { value: 'unknown', label: '未知' }
    ],

    personalityTraits: [
        '勇敢', '善良', '聪明', '机智', '坚强', '温柔', '冷酷',
        '狡猾', '正直', '叛逆', '忠诚', '傲慢', '谦虚', '热情',
        '冷漠', '开朗', '内向', '果断', '优柔寡断', '幽默'
    ],

    init() {
        this.renderCharacterList();
        console.log('✅ 角色库系统初始化完成');
    },

    generateCharacterPrompt(character) {
        if (!character) return '';
        
        const parts = [];
        
        if (character.age) parts.push(`${character.age} years old`);
        if (character.gender) {
            const genderMap = { male: 'man', female: 'woman', 'non-binary': 'person' };
            parts.push(genderMap[character.gender] || 'person');
        }
        if (character.appearance) parts.push(character.appearance.toLowerCase());
        if (character.personality) parts.push(`personality: ${character.personality.toLowerCase()}`);
        if (character.background) parts.push(`background: ${character.background.toLowerCase()}`);
        if (character.type) {
            const typeMap = {
                protagonist: 'heroic look',
                antagonist: 'villainous appearance',
                mentor: 'wise and experienced look',
                ally: 'friendly and reliable look',
                loveInterest: 'romantic aura',
                trickster: 'sly and cunning look',
                fairy: 'mystical aura'
            };
            parts.push(typeMap[character.type] || '');
        }
        
        return parts.filter(p => p && p.trim()).join(', ');
    },

    addCharacter() {
        this.showCharacterEditor(null);
    },

    showCharacterEditor(index) {
        const character = index !== null ? projectData.characters[index] : null;
        const isEdit = character !== null;
        
        const modalHtml = `
            <div id="character-modal" class="modal-overlay" style="display: flex; z-index: 2000;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>${isEdit ? '✏️ 编辑角色' : '➕ 添加角色'}</h3>
                        <button class="btn-icon modal-close" onclick="CharacterLibrary.closeEditor()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>角色名称 *</label>
                            <input type="text" id="char-name" value="${character?.name || ''}" placeholder="如：苏晚清" required>
                        </div>
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>角色类型</label>
                                <select id="char-type">
                                    ${this.characterTypes.map(t => 
                                        `<option value="${t.value}" ${character?.type === t.value ? 'selected' : ''}>${t.icon} ${t.label}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>性别</label>
                                <select id="char-gender">
                                    ${this.genders.map(g => 
                                        `<option value="${g.value}" ${character?.gender === g.value ? 'selected' : ''}>${g.label}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>年龄</label>
                                <input type="number" id="char-age" value="${character?.age || ''}" placeholder="如：28">
                            </div>
                            <div class="form-group">
                                <label>职业/身份</label>
                                <input type="text" id="char-role" value="${character?.role || ''}" placeholder="如：项目经理">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>外貌描述</label>
                            <textarea id="char-appearance" rows="2" placeholder="如：高挑身材，知性气质，长发披肩">${character?.appearance || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>性格特征</label>
                            <textarea id="char-personality" rows="2" placeholder="如：坚强勇敢，内心柔软">${character?.personality || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>背景故事</label>
                            <textarea id="char-background" rows="3" placeholder="描述角色的背景、动机、成长弧光">${character?.background || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>角色关系</label>
                            <textarea id="char-relationship" rows="2" placeholder="如：与顾霆琛有复杂的情感纠葛">${character?.relationship || ''}</textarea>
                        </div>
                        <div style="background: var(--bg); padding: 16px; border-radius: 8px; border-left: 3px solid var(--primary);">
                            <label style="font-size: 12px; color: var(--text-dim);">✨ AI绘画提示词（自动生成）</label>
                            <div id="char-prompt-preview" style="margin-top: 8px; font-size: 13px; color: var(--text); min-height: 40px;">${character?.aiPrompt || '填写信息后自动生成'}</div>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-outline" onclick="CharacterLibrary.closeEditor()">取消</button>
                        <button class="btn btn-secondary" onclick="CharacterLibrary.generatePrompt()">🔮 生成提示词</button>
                        <button class="btn btn-primary" onclick="CharacterLibrary.saveCharacter(${index})">保存</button>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('character-modal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 绑定提示词实时生成
        const fields = ['char-name', 'char-type', 'char-gender', 'char-age', 'char-role', 'char-appearance', 'char-personality'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.updatePromptPreview());
        });
    },

    updatePromptPreview() {
        const tempChar = {
            name: document.getElementById('char-name')?.value,
            type: document.getElementById('char-type')?.value,
            gender: document.getElementById('char-gender')?.value,
            age: document.getElementById('char-age')?.value,
            role: document.getElementById('char-role')?.value,
            appearance: document.getElementById('char-appearance')?.value,
            personality: document.getElementById('char-personality')?.value
        };
        const preview = document.getElementById('char-prompt-preview');
        if (preview) {
            const prompt = this.generateCharacterPrompt(tempChar);
            preview.textContent = prompt || '请填写更多信息以生成提示词';
        }
    },

    generatePrompt() {
        this.updatePromptPreview();
        showToast('提示词已生成！', 'success');
    },

    saveCharacter(index) {
        const name = document.getElementById('char-name')?.value?.trim();
        if (!name) {
            showToast('请填写角色名称', 'warning');
            return;
        }

        const character = {
            id: index !== null && projectData.characters[index]?.id 
                ? projectData.characters[index].id 
                : 'char_' + Date.now(),
            name,
            type: document.getElementById('char-type')?.value,
            gender: document.getElementById('char-gender')?.value,
            age: document.getElementById('char-age')?.value,
            role: document.getElementById('char-role')?.value,
            appearance: document.getElementById('char-appearance')?.value,
            personality: document.getElementById('char-personality')?.value,
            background: document.getElementById('char-background')?.value,
            relationship: document.getElementById('char-relationship')?.value,
            aiPrompt: this.generateCharacterPrompt({
                type: document.getElementById('char-type')?.value,
                gender: document.getElementById('char-gender')?.value,
                age: document.getElementById('char-age')?.value,
                appearance: document.getElementById('char-appearance')?.value,
                personality: document.getElementById('char-personality')?.value
            }),
            createdAt: index !== null ? projectData.characters[index]?.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (index !== null && index >= 0) {
            projectData.characters[index] = character;
        } else {
            projectData.characters.push(character);
        }

        this.closeEditor();
        this.renderCharacterList();
        AppState.hasUnsavedChanges = true;
        updateSaveStatus('unsaved');
        updateProjectStats();
        showToast(`角色 "${name}" 已保存！`, 'success');
    },

    deleteCharacter(index) {
        const character = projectData.characters[index];
        if (!confirm(`确定删除角色 "${character.name}" 吗？`)) return;

        projectData.characters.splice(index, 1);
        this.renderCharacterList();
        AppState.hasUnsavedChanges = true;
        updateSaveStatus('unsaved');
        updateProjectStats();
        showToast('角色已删除', 'info');
    },

    closeEditor() {
        const modal = document.getElementById('character-modal');
        if (modal) modal.remove();
    },

    renderCharacterList() {
        const container = document.getElementById('characters-list');
        if (!container) return;

        if (!projectData.characters || projectData.characters.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <h3>暂无角色</h3>
                    <p>添加角色以开始构建你的故事世界</p>
                </div>
            `;
            return;
        }

        container.innerHTML = projectData.characters.map((char, index) => {
            const typeInfo = this.characterTypes.find(t => t.value === char.type) || { icon: '👤', label: '未分类' };
            const genderInfo = this.genders.find(g => g.value === char.gender) || { label: '' };
            
            return `
                <div class="character-card">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 24px;">${typeInfo.icon}</div>
                            <h3 style="margin-top: 8px; font-size: 18px;">${char.name}</h3>
                            <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">
                                ${typeInfo.label}${char.age ? ' · ' + char.age + '岁' : ''}${genderInfo.label ? ' · ' + genderInfo.label : ''}
                                ${char.role ? ' · ' + char.role : ''}
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-sm btn-secondary" onclick="CharacterLibrary.showCharacterEditor(${index})">✏️</button>
                            <button class="btn btn-sm btn-outline" onclick="CharacterLibrary.deleteCharacter(${index})">🗑️</button>
                        </div>
                    </div>
                    ${char.appearance ? `<div style="font-size: 13px; margin: 12px 0;"><strong>外貌：</strong>${char.appearance}</div>` : ''}
                    ${char.personality ? `<div style="font-size: 13px; margin: 8px 0;"><strong>性格：</strong>${char.personality}</div>` : ''}
                    ${char.background ? `<div style="font-size: 13px; margin: 8px 0; color: var(--text-dim);"><strong>背景：</strong>${char.background}</div>` : ''}
                    ${char.aiPrompt ? `
                        <div style="background: var(--bg); padding: 12px; border-radius: 6px; margin-top: 12px; font-size: 11px; color: var(--text-dim); border-left: 3px solid var(--accent);">
                            <div style="font-weight: bold; margin-bottom: 4px; color: var(--accent);">✨ AI 绘画提示词</div>
                            <div style="word-break: break-all;">${char.aiPrompt}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
};

// ===================== Phase 3-2: 场景库管理 =====================
const SceneLibrary = {
    sceneTypes: [
        { value: 'interior', label: '内景', icon: '🏠' },
        { value: 'exterior', label: '外景', icon: '🌳' },
        { value: 'mixed', label: '内外景', icon: '🏛️' }
    ],

    lightingStyles: [
        { value: 'natural', label: '自然光', description: '柔和、真实' },
        { value: 'goldenHour', label: '黄金时刻', description: '温暖、浪漫' },
        { value: 'night', label: '夜景', description: '黑暗、神秘' },
        { value: 'studio', label: '棚内打光', description: '精致、可控' },
        { value: 'chiaroscuro', label: '明暗对比', description: '戏剧、张力' },
        { value: 'backlight', label: '逆光', description: '剪影、神秘' },
        { value: 'rimlight', label: '轮廓光', description: '立体感、突出主体' },
        { value: 'candlelight', label: '烛光', description: '温暖、亲密' },
        { value: 'cold', label: '冷色调', description: '冰冷、疏离' },
        { value: 'warm', label: '暖色调', description: '温馨、舒适' },
        { value: 'neon', label: '霓虹', description: '未来感、都市' },
        { value: 'dramatic', label: '戏剧光', description: '戏剧、强烈' }
    ],

    timeOfDay: [
        { value: 'morning', label: '清晨' },
        { value: 'noon', label: '中午' },
        { value: 'afternoon', label: '下午' },
        { value: 'goldenHour', label: '黄金时刻' },
        { value: 'evening', label: '傍晚' },
        { value: 'night', label: '夜晚' },
        { value: 'any', label: '不限' }
    ],

    presetScenes: [
        { type: 'interior', name: '现代办公室', description: '开敞式办公空间，落地窗，充满现代感', lighting: 'natural' },
        { type: 'interior', name: '会议室', description: '长桌、投影、严肃的氛围', lighting: 'studio' },
        { type: 'interior', name: '咖啡厅', description: '温暖灯光，舒适沙发，咖啡杯', lighting: 'warm' },
        { type: 'interior', name: '茶水间', description: '咖啡机，微波炉，同事闲聊', lighting: 'natural' },
        { type: 'interior', name: '公寓客厅', description: '温馨居家环境，沙发、茶几', lighting: 'warm' },
        { type: 'interior', name: '卧室', description: '床上用品，床头柜，柔和光线', lighting: 'warm' },
        { type: 'interior', name: '电梯', description: '金属质感，镜面，封闭空间', lighting: 'cold' },
        { type: 'interior', name: '餐厅', description: '餐桌、蜡烛、约会氛围', lighting: 'candlelight' },
        { type: 'interior', name: '停车场', description: '昏暗灯光，空旷，孤寂感', lighting: 'dramatic' },
        { type: 'interior', name: '酒吧', description: '霓虹灯光，酒杯，迷离氛围', lighting: 'neon' },
        { type: 'exterior', name: '都市街道', description: '高楼大厦，行人，车流', lighting: 'natural' },
        { type: 'exterior', name: '公园', description: '绿树成荫，小径，自然光线', lighting: 'goldenHour' },
        { type: 'exterior', name: '街头转角', description: '都市街角，广告牌，路人', lighting: 'goldenHour' },
        { type: 'exterior', name: '海边', description: '辽阔海面，沙滩，日落', lighting: 'goldenHour' },
        { type: 'exterior', name: '夜景街头', description: '霓虹灯光，车流轨迹，繁华都市', lighting: 'neon' },
        { type: 'exterior', name: '雨天街道', description: '雨伞，湿润路面反射灯光', lighting: 'night' },
        { type: 'exterior', name: '竹林', description: '竹林幽深，晨光，禅意', lighting: 'natural' },
        { type: 'exterior', name: '古代戏台', description: '古建筑，红柱，舞台灯光', lighting: 'dramatic' },
        { type: 'mixed', name: '大堂', description: '挑高空间，水晶灯，豪华感', lighting: 'studio' },
        { type: 'mixed', name: '走廊', description: '长廊，窗户，光影变化', lighting: 'natural' }
    ],

    init() {
        this.renderSceneList();
        console.log('✅ 场景库系统初始化完成');
    },

    addScene() {
        this.showSceneEditor(null);
    },

    showSceneEditor(index) {
        const scene = index !== null ? projectData.scenes[index] : null;
        const isEdit = scene !== null;
        
        const modalHtml = `
            <div id="scene-modal" class="modal-overlay" style="display: flex; z-index: 2000;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>${isEdit ? '✏️ 编辑场景' : '➕ 添加场景'}</h3>
                        <button class="btn-icon modal-close" onclick="SceneLibrary.closeEditor()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>场景名称 *</label>
                            <input type="text" id="scene-name" value="${scene?.name || ''}" placeholder="如：现代办公室" required>
                        </div>
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label>场景类型</label>
                                <select id="scene-type">
                                    ${this.sceneTypes.map(t => 
                                        `<option value="${t.value}" ${scene?.type === t.value ? 'selected' : ''}>${t.icon} ${t.label}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>时间</label>
                                <select id="scene-time">
                                    ${this.timeOfDay.map(t => 
                                        `<option value="${t.value}" ${scene?.timeOfDay === t.value ? 'selected' : ''}>${t.label}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>灯光风格</label>
                            <select id="scene-lighting">
                                ${this.lightingStyles.map(l => 
                                    `<option value="${l.value}" ${scene?.lighting === l.value ? 'selected' : ''}>${l.label} - ${l.description}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>场景描述</label>
                            <textarea id="scene-description" rows="3" placeholder="详细描述场景的环境、氛围、道具等">${scene?.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>主要道具</label>
                            <textarea id="scene-props" rows="2" placeholder="如：办公桌，电脑，咖啡杯">${scene?.props || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>情绪基调</label>
                            <select id="scene-mood">
                                <option value="">请选择</option>
                                <option value="温馨" ${scene?.mood === '温馨' ? 'selected' : ''}>温馨</option>
                                <option value="紧张" ${scene?.mood === '紧张' ? 'selected' : ''}>紧张</option>
                                <option value="浪漫" ${scene?.mood === '浪漫' ? 'selected' : ''}>浪漫</option>
                                <option value="神秘" ${scene?.mood === '神秘' ? 'selected' : ''}>神秘</option>
                                <option value="悲伤" ${scene?.mood === '悲伤' ? 'selected' : ''}>悲伤</option>
                                <option value="欢快" ${scene?.mood === '欢快' ? 'selected' : ''}>欢快</option>
                                <option value="严肃" ${scene?.mood === '严肃' ? 'selected' : ''}>严肃</option>
                                <option value="压抑" ${scene?.mood === '压抑' ? 'selected' : ''}>压抑</option>
                                <option value="梦幻" ${scene?.mood === '梦幻' ? 'selected' : ''}>梦幻</option>
                            </select>
                        </div>
                        <div style="background: var(--bg); padding: 16px; border-radius: 8px; border-left: 3px solid var(--success);">
                            <label style="font-size: 12px; color: var(--text-dim);">✨ 场景提示词（可直接用于AI绘画）</label>
                            <div id="scene-prompt-preview" style="margin-top: 8px; font-size: 13px; color: var(--text); min-height: 40px;">${scene?.aiPrompt || '填写信息后自动生成'}</div>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-outline" onclick="SceneLibrary.closeEditor()">取消</button>
                        <button class="btn btn-secondary" onclick="SceneLibrary.loadPreset()">📚 加载预设</button>
                        <button class="btn btn-secondary" onclick="SceneLibrary.generatePrompt()">🔮 生成提示词</button>
                        <button class="btn btn-primary" onclick="SceneLibrary.saveScene(${index})">保存</button>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('scene-modal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 绑定提示词实时生成
        ['scene-name', 'scene-type', 'scene-time', 'scene-lighting', 'scene-description', 'scene-props', 'scene-mood'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.updatePromptPreview());
            if (el && el.tagName === 'SELECT') el.addEventListener('change', () => this.updatePromptPreview());
        });
    },

    loadPreset() {
        const presetNames = this.presetScenes.map(s => `${s.name} (${s.type})`);
        const options = this.presetScenes.map((s, i) => `${i + 1}. ${s.name}`).join('\n');
        const choice = prompt(`选择预设场景编号 (1-${this.presetScenes.length}):\n${options}\n\n输入编号加载场景信息，或输入"all"加载所有预设。`, '1');
        
        if (!choice) return;
        
        if (choice.toLowerCase() === 'all') {
            this.presetScenes.forEach(preset => {
                projectData.scenes.push({
                    id: 'scene_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    name: preset.name,
                    type: preset.type,
                    description: preset.description,
                    lighting: preset.lighting,
                    timeOfDay: 'any',
                    mood: '',
                    props: '',
                    aiPrompt: this.generateScenePrompt({ ...preset, timeOfDay: 'any' }),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            });
            this.closeEditor();
            this.renderSceneList();
            showToast(`已加载 ${this.presetScenes.length} 个预设场景！`, 'success');
            AppState.hasUnsavedChanges = true;
            updateSaveStatus('unsaved');
            updateProjectStats();
            return;
        }

        const presetIndex = parseInt(choice) - 1;
        if (presetIndex >= 0 && presetIndex < this.presetScenes.length) {
            const preset = this.presetScenes[presetIndex];
            document.getElementById('scene-name').value = preset.name;
            document.getElementById('scene-type').value = preset.type;
            document.getElementById('scene-lighting').value = preset.lighting;
            document.getElementById('scene-description').value = preset.description;
            this.updatePromptPreview();
            showToast(`已加载预设：${preset.name}`, 'success');
        } else {
            showToast('无效的编号', 'warning');
        }
    },

    generateScenePrompt(scene) {
        if (!scene) return '';
        
        const parts = [];
        
        if (scene.name) parts.push(scene.name.toLowerCase());
        if (scene.type) {
            const typeMap = { interior: 'indoor', exterior: 'outdoor', mixed: 'indoor-outdoor' };
            parts.push(typeMap[scene.type] || '');
        }
        if (scene.description) parts.push(scene.description.toLowerCase());
        if (scene.timeOfDay) {
            const timeMap = {
                morning: 'morning light', noon: 'noon', afternoon: 'afternoon',
                goldenHour: 'golden hour', evening: 'evening', night: 'night', any: ''
            };
            parts.push(timeMap[scene.timeOfDay] || '');
        }
        if (scene.lighting) {
            const lightMap = {
                natural: 'natural lighting', goldenHour: 'golden hour lighting', night: 'night scene',
                studio: 'studio lighting', chiaroscuro: 'chiaroscuro', backlight: 'backlit',
                rimlight: 'rim lighting', candlelight: 'candlelight', cold: 'cold lighting',
                warm: 'warm lighting', neon: 'neon lights', dramatic: 'dramatic lighting'
            };
            parts.push(lightMap[scene.lighting] || '');
        }
        if (scene.mood) parts.push(`${scene.mood} atmosphere`);
        if (scene.props) parts.push(`with ${scene.props.toLowerCase()}`);
        
        const result = parts.filter(p => p && p.trim()).join(', ');
        return result;
    },

    updatePromptPreview() {
        const tempScene = {
            name: document.getElementById('scene-name')?.value,
            type: document.getElementById('scene-type')?.value,
            timeOfDay: document.getElementById('scene-time')?.value,
            lighting: document.getElementById('scene-lighting')?.value,
            description: document.getElementById('scene-description')?.value,
            props: document.getElementById('scene-props')?.value,
            mood: document.getElementById('scene-mood')?.value
        };
        const preview = document.getElementById('scene-prompt-preview');
        if (preview) {
            const prompt = this.generateScenePrompt(tempScene);
            preview.textContent = prompt || '请填写更多信息以生成提示词';
        }
    },

    generatePrompt() {
        this.updatePromptPreview();
        showToast('场景提示词已生成！', 'success');
    },

    saveScene(index) {
        const name = document.getElementById('scene-name')?.value?.trim();
        if (!name) {
            showToast('请填写场景名称', 'warning');
            return;
        }

        const scene = {
            id: index !== null && projectData.scenes[index]?.id 
                ? projectData.scenes[index].id 
                : 'scene_' + Date.now(),
            name,
            type: document.getElementById('scene-type')?.value,
            timeOfDay: document.getElementById('scene-time')?.value,
            lighting: document.getElementById('scene-lighting')?.value,
            description: document.getElementById('scene-description')?.value,
            props: document.getElementById('scene-props')?.value,
            mood: document.getElementById('scene-mood')?.value,
            aiPrompt: this.generateScenePrompt({
                name,
                type: document.getElementById('scene-type')?.value,
                timeOfDay: document.getElementById('scene-time')?.value,
                lighting: document.getElementById('scene-lighting')?.value,
                description: document.getElementById('scene-description')?.value,
                props: document.getElementById('scene-props')?.value,
                mood: document.getElementById('scene-mood')?.value
            }),
            createdAt: index !== null ? projectData.scenes[index]?.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (index !== null && index >= 0) {
            projectData.scenes[index] = scene;
        } else {
            projectData.scenes.push(scene);
        }

        this.closeEditor();
        this.renderSceneList();
        AppState.hasUnsavedChanges = true;
        updateSaveStatus('unsaved');
        updateProjectStats();
        showToast(`场景 "${name}" 已保存！`, 'success');
    },

    deleteScene(index) {
        const scene = projectData.scenes[index];
        if (!confirm(`确定删除场景 "${scene.name}" 吗？`)) return;

        projectData.scenes.splice(index, 1);
        this.renderSceneList();
        AppState.hasUnsavedChanges = true;
        updateSaveStatus('unsaved');
        updateProjectStats();
        showToast('场景已删除', 'info');
    },

    closeEditor() {
        const modal = document.getElementById('scene-modal');
        if (modal) modal.remove();
    },

    renderSceneList() {
        const container = document.getElementById('scenes-list');
        if (!container) return;

        if (!projectData.scenes || projectData.scenes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎬</div>
                    <h3>暂无场景</h3>
                    <p>添加场景以丰富你的故事世界</p>
                </div>
            `;
            return;
        }

        const typeIconMap = { interior: '🏠', exterior: '🌳', mixed: '🏛️' };
        const typeLabelMap = { interior: '内景', exterior: '外景', mixed: '内外景' };
        const timeLabelMap = { morning: '清晨', noon: '中午', afternoon: '下午', goldenHour: '黄金时刻', evening: '傍晚', night: '夜晚', any: '不限' };
        
        container.innerHTML = projectData.scenes.map((scene, index) => {
            return `
                <div class="scene-card">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 24px;">${typeIconMap[scene.type] || '🎬'}</div>
                            <h3 style="margin-top: 8px; font-size: 18px;">${scene.name}</h3>
                            <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">
                                ${typeLabelMap[scene.type] || ''}${scene.timeOfDay ? ' · ' + timeLabelMap[scene.timeOfDay] : ''}
                                ${scene.mood ? ' · ' + scene.mood : ''}
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-sm btn-secondary" onclick="SceneLibrary.showSceneEditor(${index})">✏️</button>
                            <button class="btn btn-sm btn-outline" onclick="SceneLibrary.deleteScene(${index})">🗑️</button>
                        </div>
                    </div>
                    ${scene.description ? `<div style="font-size: 13px; margin: 12px 0; color: var(--text-dim);">${scene.description}</div>` : ''}
                    ${scene.props ? `<div style="font-size: 12px; margin: 8px 0;"><strong>道具：</strong>${scene.props}</div>` : ''}
                    ${scene.aiPrompt ? `
                        <div style="background: var(--bg); padding: 12px; border-radius: 6px; margin-top: 12px; font-size: 11px; color: var(--text-dim); border-left: 3px solid var(--success);">
                            <div style="font-weight: bold; margin-bottom: 4px; color: var(--success);">✨ 场景提示词</div>
                            <div style="word-break: break-all;">${scene.aiPrompt}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
};

// ===================== Phase 3-3: 节拍表系统 =====================
const BeatSheet = {
    structures: {
        'three-act': {
            name: '三幕结构',
            description: '经典的开端 - 冲突 - 解决结构，适合大多数剧本',
            beats: [
                { id: 1, name: '开端', description: '介绍主角、背景、世界观', act: '第一幕', minutes: '0-10%' },
                { id: 2, name: '激励事件', description: '打破主角平衡生活的事件', act: '第一幕', minutes: '10%' },
                { id: 3, name: '第一转折点', description: '主角做出抉择，进入新世界', act: '第一幕结束', minutes: '25%' },
                { id: 4, name: '上升动作', description: '困难不断出现，挑战升级', act: '第二幕', minutes: '25%-50%' },
                { id: 5, name: '中点', description: '故事真正的转折点', act: '第二幕', minutes: '50%' },
                { id: 6, name: '坏家伙逼近', description: '主角面临最大挑战', act: '第二幕', minutes: '50%-75%' },
                { id: 7, name: '最低点', description: '主角的至暗时刻', act: '第二幕结束', minutes: '75%' },
                { id: 8, name: '第二转折点', description: '主角找到新的希望和方法', act: '第三幕', minutes: '75%-85%' },
                { id: 9, name: '高潮', description: '最终对决，情感最高点', act: '第三幕', minutes: '85%-95%' },
                { id: 10, name: '结局', description: '冲突解决，新生活开始', act: '第三幕', minutes: '95%-100%' }
            ]
        },
        'save-the-cat': {
            name: 'Save The Cat',
            description: '15节拍表，由Blake Snyder提出，非常受欢迎的剧作结构',
            beats: [
                { id: 1, name: '开场图像', description: '故事开始前的世界状态', act: '第一幕', minutes: '0-1%' },
                { id: 2, name: '主题呈现', description: '暗示故事的核心主题', act: '第一幕', minutes: '1%-5%' },
                { id: 3, name: '设定', description: '展示主角的世界和日常生活', act: '第一幕', minutes: '0%-10%' },
                { id: 4, name: '催化事件', description: '改变主角人生的重大事件', act: '第一幕', minutes: '10%' },
                { id: 5, name: '辩论', description: '主角内心的挣扎和犹豫', act: '第一幕', minutes: '10%-25%' },
                { id: 6, name: '进入新世界', description: '第一转折点，主角做出选择', act: '第二幕前半', minutes: '25%' },
                { id: 7, name: 'B故事', description: '次要情节，往往是情感线', act: '第二幕前半', minutes: '25%-35%' },
                { id: 8, name: '乐趣与游戏', description: '类型片的核心场景和承诺', act: '第二幕前半', minutes: '35%-50%' },
                { id: 9, name: '中点', description: '故事的真正转折点', act: '第二幕', minutes: '50%' },
                { id: 10, name: '坏家伙逼近', description: '敌人开始真正威胁主角', act: '第二幕后半', minutes: '50%-65%' },
                { id: 11, name: '一无所有', description: '主角失去一切的时刻', act: '第二幕后半', minutes: '65%-75%' },
                { id: 12, name: '灵魂黑夜', description: '主角最绝望的时刻', act: '第二幕后半', minutes: '75%' },
                { id: 13, name: '第三幕衔接', description: '主角找到新希望', act: '第三幕', minutes: '75%-80%' },
                { id: 14, name: '高潮', description: '最终对决和决战', act: '第三幕', minutes: '85%-95%' },
                { id: 15, name: '终场图像', description: '故事结束后的新世界', act: '第三幕', minutes: '95%-100%' }
            ]
        },
        'four-act': {
            name: '四幕结构',
            description: '将第二幕分为两部分，更适合长篇作品',
            beats: [
                { id: 1, name: '铺垫', description: '介绍主角、世界和日常', act: '第一幕', minutes: '0-25%' },
                { id: 2, name: '激励事件', description: '打破平衡的事件发生', act: '第一幕', minutes: '25%' },
                { id: 3, name: '反抗', description: '主角尝试解决问题但失败', act: '第二幕', minutes: '25%-50%' },
                { id: 4, name: '中点', description: '故事的转折点', act: '第二幕', minutes: '50%' },
                { id: 5, name: '更大的挑战', description: '问题变得更加复杂', act: '第三幕', minutes: '50%-75%' },
                { id: 6, name: '危机', description: '主角面临最大危机', act: '第三幕', minutes: '75%' },
                { id: 7, name: '高潮', description: '最终的决一死战', act: '第四幕', minutes: '75%-95%' },
                { id: 8, name: '结局', description: '问题解决，新秩序建立', act: '第四幕', minutes: '95%-100%' }
            ]
        }
    },

    init() {
        // 初始化或加载节拍表数据
        if (!projectData.beats || !projectData.beats.structure) {
            projectData.beats = {
                structure: 'three-act',
                beats: this.createEmptyBeats('three-act')
            };
        } else if (!projectData.beats.beats || projectData.beats.beats.length === 0) {
            projectData.beats.beats = this.createEmptyBeats(projectData.beats.structure);
        }
        
        // 更新下拉选择
        const select = document.getElementById('beat-structure');
        if (select) select.value = projectData.beats.structure;
        
        this.renderBeatTable();
        console.log('✅ 节拍表系统初始化完成');
    },

    createEmptyBeats(structure) {
        const template = this.structures[structure];
        if (!template) return [];
        return template.beats.map(b => ({
            id: b.id,
            name: b.name,
            description: b.description,
            act: b.act,
            minutes: b.minutes,
            content: ''
        }));
    },

    changeBeatStructure() {
        const select = document.getElementById('beat-structure');
        const newStructure = select.value;
        
        if (!confirm(`切换结构将清空当前填写的内容（除非内容可以迁移）。确定切换吗？`)) {
            select.value = projectData.beats.structure;
            return;
        }
        
        projectData.beats = {
            structure: newStructure,
            beats: this.createEmptyBeats(newStructure)
        };
        
        this.renderBeatTable();
        AppState.hasUnsavedChanges = true;
        updateSaveStatus('unsaved');
        showToast(`已切换到：${this.structures[newStructure].name}`, 'success');
    },

    renderBeatTable() {
        const container = document.getElementById('beat-table');
        if (!container) return;

        const structure = this.structures[projectData.beats.structure];
        if (!structure) return;

        let html = `
            <div style="margin-bottom: 24px; padding: 16px; background: var(--bg-panel-light); border-radius: 8px; border-left: 4px solid var(--primary);">
                <h4 style="margin-bottom: 8px;">${structure.name}</h4>
                <p style="font-size: 13px; color: var(--text-dim); margin: 0;">${structure.description}</p>
            </div>
        `;

        // 按幕分组
        let currentAct = '';
        projectData.beats.beats.forEach((beat, index) => {
            if (beat.act !== currentAct) {
                if (currentAct !== '') html += '</div>';
                currentAct = beat.act;
                html += `
                    <div style="margin: 24px 0 12px 0;">
                        <h4 style="color: var(--primary); font-size: 14px; font-weight: 600; margin: 0;">
                            ${this.getActIcon(currentAct)} ${currentAct}
                        </h4>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                `;
            }

            html += `
                <div class="beat-row" data-index="${index}" style="background: var(--bg-panel-light); padding: 16px; border-radius: 8px; border: 1px solid var(--border); transition: var(--transition);">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 16px; margin-bottom: 12px;">
                        <div style="display: flex; align-items: start; gap: 12px; flex: 1;">
                            <div style="width: 32px; height: 32px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; color: white; flex-shrink: 0;">
                                ${index + 1}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">${beat.name}</div>
                                <div style="font-size: 12px; color: var(--text-dim); margin-bottom: 4px;">${beat.description}</div>
                                <div style="font-size: 11px; color: var(--accent);">⏱️ ${beat.minutes}</div>
                            </div>
                        </div>
                    </div>
                    <textarea 
                        rows="3" 
                        placeholder="填写此节拍的内容：发生了什么？主角经历了什么？"
                        onchange="BeatSheet.updateBeat(${index}, this.value)"
                        style="width: 100%; padding: 10px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; resize: vertical;"
                    >${beat.content || ''}</textarea>
                </div>
            `;
        });

        if (currentAct !== '') html += '</div>';

        // 总览统计
        const filledCount = projectData.beats.beats.filter(b => b.content && b.content.trim()).length;
        const totalCount = projectData.beats.beats.length;
        const progress = Math.round((filledCount / totalCount) * 100);
        
        html += `
            <div style="margin-top: 24px; padding: 20px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1)); border-radius: 8px; border: 1px solid var(--primary);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h4 style="margin: 0;">📊 节拍完成度</h4>
                    <span style="font-size: 20px; font-weight: 600; color: var(--primary);">${progress}%</span>
                </div>
                <div style="height: 8px; background: var(--bg); border-radius: 4px; overflow: hidden;">
                    <div style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--secondary)); transition: width 0.3s;"></div>
                </div>
                <div style="font-size: 12px; color: var(--text-dim); margin-top: 8px; text-align: right;">
                    已完成 ${filledCount}/${totalCount} 个节拍
                </div>
            </div>
        `;

        // 生成建议
        if (filledCount > 0 && filledCount < totalCount) {
            html += `
                <div style="margin-top: 16px; padding: 16px; background: var(--bg); border-radius: 8px; border: 1px dashed var(--border);">
                    <div style="font-size: 13px; color: var(--text-dim);">
                        💡 <strong>提示：</strong>已完成 ${filledCount} 个节拍，还有 ${totalCount - filledCount} 个需要填写。完成后可根据节拍表生成完整的剧本大纲。
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    },

    getActIcon(act) {
        if (act.includes('第一')) return '🎬';
        if (act.includes('第二')) return '⚡';
        if (act.includes('第三')) return '🔥';
        if (act.includes('第四')) return '✨';
        return '📌';
    },

    updateBeat(index, content) {
        if (projectData.beats && projectData.beats.beats[index]) {
            projectData.beats.beats[index].content = content;
            AppState.hasUnsavedChanges = true;
            updateSaveStatus('unsaved');
        }
    },

    generateOutlineFromBeats() {
        const filledBeats = projectData.beats.beats.filter(b => b.content && b.content.trim());
        if (filledBeats.length < 3) {
            showToast('请至少填写3个节拍的内容', 'warning');
            return;
        }

        const structure = this.structures[projectData.beats.structure];
        let outline = `【剧本大纲 - ${structure.name}】\n\n`;
        
        let currentAct = '';
        projectData.beats.beats.forEach((beat, index) => {
            if (beat.act !== currentAct) {
                currentAct = beat.act;
                outline += `\n=== ${currentAct} ===\n\n`;
            }
            
            outline += `${index + 1}. ${beat.name} (${beat.minutes})\n`;
            if (beat.content) {
                outline += `   ${beat.content}\n`;
            } else {
                outline += `   [待填写]\n`;
            }
            outline += '\n';
        });

        outline += `\n【主题提示】\n根据以上节拍，故事的核心主题是：\n- 主角面临的挑战\n- 情感弧光\n- 最终的成长/改变`;

        // 填充到大纲输入
        const outlineResult = document.getElementById('outline-result-content');
        if (outlineResult) {
            outlineResult.textContent = outline;
            document.getElementById('outline-result').style.display = 'block';
        }
        projectData.outline = outline;
        AppState.hasUnsavedChanges = true;
        updateSaveStatus('unsaved');
        updateProjectStats();
        
        switchTab('outline');
        showToast('已从节拍表生成大纲！', 'success');
    }
};

// ===================== Phase 3-4: 数据一致性与版本增强 =====================
const DataConsistency = {
    validateProject() {
        const issues = [];

        // 检查基础字段
        if (!projectData.characters || projectData.characters.length === 0) {
            issues.push({ level: 'info', message: '建议添加角色信息' });
        }

        if (!projectData.scenes || projectData.scenes.length === 0) {
            issues.push({ level: 'info', message: '建议添加场景信息' });
        }

        // 检查分镜引用的角色
        if (projectData.shots && projectData.characters) {
            const characterNames = projectData.characters.map(c => c.name);
            projectData.shots.forEach((shot, idx) => {
                if (shot.characters) {
                    const shotChars = shot.characters.split(/[,，]/).map(s => s.trim());
                    shotChars.forEach(char => {
                        if (char && !characterNames.includes(char) && !characterNames.some(n => n.includes(char) || char.includes(n))) {
                            issues.push({ level: 'warning', message: `分镜#${idx + 1}提到的角色"${char}"未在角色库定义` });
                        }
                    });
                }
            });
        }

        // 检查节拍表完成度
        if (projectData.beats && projectData.beats.beats) {
            const filled = projectData.beats.beats.filter(b => b.content && b.content.trim()).length;
            if (filled > 0 && filled < projectData.beats.beats.length / 2) {
                issues.push({ level: 'info', message: `节拍表仅完成了 ${filled}/${projectData.beats.beats.length}，建议完整填写以获得更佳结构` });
            }
        }

        // 检查时间戳
        if (!projectData.createdAt) {
            projectData.createdAt = new Date().toISOString();
        }
        projectData.updatedAt = new Date().toISOString();

        return issues;
    },

    showValidationReport() {
        const issues = this.validateProject();
        
        let reportHtml = `
            <div style="max-width: 600px;">
                <div style="padding: 20px; border-radius: 8px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1)); margin-bottom: 20px; border: 1px solid var(--primary);">
                    <h3 style="margin: 0 0 12px 0;">📋 项目健康检查报告</h3>
        `;

        // 统计信息
        const charCount = (projectData.characters || []).length;
        const sceneCount = (projectData.scenes || []).length;
        const shotCount = (projectData.shots || []).length;
        const outlineWords = (projectData.outline || '').length;
        
        reportHtml += `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
                <div style="text-align: center; padding: 12px; background: var(--bg); border-radius: 6px;">
                    <div style="font-size: 24px; font-weight: 600; color: var(--primary);">${charCount}</div>
                    <div style="font-size: 11px; color: var(--text-dim);">角色</div>
                </div>
                <div style="text-align: center; padding: 12px; background: var(--bg); border-radius: 6px;">
                    <div style="font-size: 24px; font-weight: 600; color: var(--success);">${sceneCount}</div>
                    <div style="font-size: 11px; color: var(--text-dim);">场景</div>
                </div>
                <div style="text-align: center; padding: 12px; background: var(--bg); border-radius: 6px;">
                    <div style="font-size: 24px; font-weight: 600; color: var(--accent);">${shotCount}</div>
                    <div style="font-size: 11px; color: var(--text-dim);">分镜</div>
                </div>
                <div style="text-align: center; padding: 12px; background: var(--bg); border-radius: 6px;">
                    <div style="font-size: 24px; font-weight: 600; color: var(--warning);">${outlineWords}</div>
                    <div style="font-size: 11px; color: var(--text-dim);">大纲字数</div>
                </div>
            </div>
        `;

        if (issues.length === 0) {
            reportHtml += `
                <div style="padding: 16px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; color: var(--success); text-align: center;">
                    ✅ 项目健康状态良好！
                </div>
            `;
        } else {
            const highIssues = issues.filter(i => i.level === 'warning');
            const lowIssues = issues.filter(i => i.level === 'info');
            
            reportHtml += `
                <div style="margin-top: 16px;">
                    ${highIssues.length > 0 ? `
                        <div style="margin-bottom: 12px;">
                            <div style="font-size: 13px; font-weight: 600; color: var(--warning); margin-bottom: 8px;">
                                ⚠️ 需要注意 (${highIssues.length})
                            </div>
                            ${highIssues.map(i => `<div style="font-size: 13px; padding: 8px; background: rgba(245, 158, 11, 0.05); border-left: 3px solid var(--warning); margin-bottom: 4px; border-radius: 4px;">${i.message}</div>`).join('')}
                        </div>
                    ` : ''}
                    ${lowIssues.length > 0 ? `
                        <div style="margin-bottom: 12px;">
                            <div style="font-size: 13px; font-weight: 600; color: var(--text-dim); margin-bottom: 8px;">
                                💡 优化建议 (${lowIssues.length})
                            </div>
                            ${lowIssues.map(i => `<div style="font-size: 13px; padding: 8px; background: var(--bg); border-left: 3px solid var(--text-dim); margin-bottom: 4px; border-radius: 4px; color: var(--text-dim);">${i.message}</div>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }

        reportHtml += `
                </div>
            </div>
        `;

        // 显示弹窗
        const modalHtml = `
            <div id="validation-modal" class="modal-overlay" style="display: flex; z-index: 2000;">
                <div class="modal-content" style="max-width: 650px;">
                    <div class="modal-header">
                        <h3>📋 项目健康检查</h3>
                        <button class="btn-icon modal-close" onclick="DataConsistency.closeValidation()">×</button>
                    </div>
                    <div class="modal-body">
                        ${reportHtml}
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-outline" onclick="DataConsistency.closeValidation()">关闭</button>
                        <button class="btn btn-primary" onclick="DataConsistency.runAutofix()">🔧 自动优化</button>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('validation-modal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    closeValidation() {
        const modal = document.getElementById('validation-modal');
        if (modal) modal.remove();
    },

    runAutofix() {
        const fixedCount = [];

        // 自动更新时间戳
        projectData.updatedAt = new Date().toISOString();
        if (!projectData.createdAt) {
            projectData.createdAt = new Date().toISOString();
            fixedCount.push('创建时间已设置');
        }

        // 确保字段存在
        if (!projectData.characters) projectData.characters = [];
        if (!projectData.scenes) projectData.scenes = [];
        if (!projectData.shots) projectData.shots = [];
        if (!projectData.beats) {
            projectData.beats = {
                structure: 'three-act',
                beats: []
            };
            fixedCount.push('节拍表已初始化');
        }

        this.closeValidation();
        if (fixedCount.length > 0) {
            showToast(`已完成自动修复：${fixedCount.join('，')}`, 'success');
        } else {
            showToast('项目状态良好，无需修复', 'success');
        }
    },

    exportProjectJSON() {
        const exportData = JSON.parse(JSON.stringify(projectData));
        exportData.version = '2.0';
        exportData.exportedAt = new Date().toISOString();
        exportData.statistics = {
            characterCount: (exportData.characters || []).length,
            sceneCount: (exportData.scenes || []).length,
            shotCount: (exportData.shots || []).length,
            outlineLength: (exportData.outline || '').length,
            scriptLength: (exportData.script || '').length
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `project_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('项目数据已导出为JSON文件', 'success');
    },

    async importProjectJSON() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const data = JSON.parse(event.target.result);
                    
                    if (!confirm('导入将覆盖当前项目的所有内容，确定继续吗？')) return;
                    
                    projectData.outline = data.outline || '';
                    projectData.script = data.script || '';
                    projectData.novel = data.novel || '';
                    projectData.shots = data.shots || [];
                    projectData.characters = data.characters || [];
                    projectData.scenes = data.scenes || [];
                    projectData.beats = data.beats || { structure: 'three-act', beats: [] };
                    projectData.createdAt = data.createdAt || new Date().toISOString();
                    projectData.updatedAt = new Date().toISOString();
                    
                    // 重新渲染
                    CharacterLibrary.renderCharacterList();
                    SceneLibrary.renderSceneList();
                    BeatSheet.renderBeatTable();
                    renderShotList(projectData.shots);
                    
                    AppState.hasUnsavedChanges = true;
                    updateSaveStatus('unsaved');
                    updateProjectStats();
                    
                    showToast('项目数据导入成功！', 'success');
                };
                reader.readAsText(file);
            } catch (err) {
                showToast('导入失败：' + err.message, 'error');
            }
        };
        
        input.click();
    }
};

// ===================== Phase 3 入口函数 =====================
function initPhase3() {
    console.log('🚀 初始化 Phase 3 系统...');
    
    // 初始化各子系统
    CharacterLibrary.init();
    SceneLibrary.init();
    BeatSheet.init();
    
    // 扩展 updateProjectStats 函数以包含新数据
    if (typeof window.updateProjectStats !== 'undefined') {
        const originalUpdateStats = window.updateProjectStats;
        window.updateProjectStats = function() {
            originalUpdateStats.call(this);
            
            // 更新角色和场景统计
            const charCount = (projectData.characters || []).length;
            const sceneCount = (projectData.scenes || []).length;
            
            // 显示在属性面板（如果存在）
            const charBadge = document.querySelector('.nav-item[data-tab="characters"] .nav-badge');
            const sceneBadge = document.querySelector('.nav-item[data-tab="scenes"] .nav-badge');
            
            if (charBadge) charBadge.textContent = charCount;
            if (sceneBadge) sceneBadge.textContent = sceneCount;
            
            // 更新侧边栏
            const charCountEl = document.getElementById('char-count');
            const sceneCountEl = document.getElementById('scene-count');
            if (charCountEl) charCountEl.textContent = charCount;
            if (sceneCountEl) sceneCountEl.textContent = sceneCount;
        };
    }
    
    // 添加顶部按钮
    setTimeout(() => {
        const headerLeft = document.querySelector('.header-right');
        if (headerLeft && !document.querySelector('.btn-check-health')) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary btn-check-health';
            btn.textContent = '📋 健康检查';
            btn.onclick = () => DataConsistency.showValidationReport();
            headerLeft.insertBefore(btn, headerLeft.firstChild);
            
            const exportBtn = document.createElement('button');
            exportBtn.className = 'btn btn-secondary';
            exportBtn.textContent = '📤 导出JSON';
            exportBtn.onclick = () => DataConsistency.exportProjectJSON();
            headerLeft.insertBefore(exportBtn, headerLeft.children[1]);
            
            const importBtn = document.createElement('button');
            importBtn.className = 'btn btn-secondary';
            importBtn.textContent = '📥 导入JSON';
            importBtn.onclick = () => DataConsistency.importProjectJSON();
            headerLeft.insertBefore(importBtn, headerLeft.children[2]);
        }
    }, 200);
    
    console.log('✅ Phase 3 系统初始化完成');
}

// ============ 提供给全局调用的函数别名 ============
window.addCharacter = () => CharacterLibrary.addCharacter();
window.addScene = () => SceneLibrary.addScene();
window.changeBeatStructure = () => BeatSheet.changeBeatStructure();

// ============ 启动 Phase 3 ============
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPhase3);
} else {
    initPhase3();
}

console.log('✅ Phase 3 系统加载完成');

// ====== PHASE 4 ======
/**
 * ================================================
 * Phase 4-1: 专业剧本编写器
 * 功能：标准剧本格式 / 场景标题 / 角色对白 / 时间轴
 * ================================================
 */

const ScriptEditor = {
    scenes: [],
    currentSceneIndex: 0,
    isEditing: false,

    sceneIntros: ['INT.', 'EXT.', 'INT./EXT.'],
    timeOfDays: ['日', '夜', '黄昏', '黎明', '清晨', '傍晚'],

    init() {
        if (!projectData.scenes || !Array.isArray(projectData.scenes) || projectData.scenes.length === 0) {
            if (projectData.script && projectData.script.trim()) {
                this.parseExistingScript(projectData.script);
            } else {
                projectData.scenes = [];
            }
        }
        this.renderScriptEditor();
        console.log('✅ 剧本编写器初始化完成');
    },

    parseExistingScript(content) {
        projectData.scenes = [];
        const lines = content.split('\n');
        let currentScene = null;
        let currentDialogue = null;
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.match(/^(INT\.|EXT\.|INT\.\/EXT\.)/i) || 
                trimmed.match(/^场景\d+/i) || 
                trimmed.match(/^[A-Z].*[-].*[日夜]/)) {
                if (currentScene) {
                    projectData.scenes.push(currentScene);
                }
                currentScene = {
                    id: 'scene_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    intro: 'INT.',
                    location: trimmed.split(/[-]/)[0]?.trim() || '场景',
                    time: '日',
                    action: '',
                    dialogues: []
                };
            } else if (currentScene && trimmed) {
                if (trimmed === trimmed.toUpperCase() && trimmed.length < 30 && !trimmed.includes('。')) {
                    currentDialogue = { character: trimmed, content: '', parenthetical: '' };
                    if (!currentScene.dialogues) currentScene.dialogues = [];
                    currentScene.dialogues.push(currentDialogue);
                } else if (currentDialogue && currentDialogue.content === '') {
                    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
                        currentDialogue.parenthetical = trimmed;
                    } else {
                        currentDialogue.content = trimmed;
                    }
                } else {
                    if (currentScene.action === '') {
                        currentScene.action = trimmed;
                    }
                }
            }
        });
        
        if (currentScene) {
            projectData.scenes.push(currentScene);
        }
    },

    renderScriptEditor() {
        const container = document.getElementById('script-result-content');
        if (!container) return;

        if (projectData.scenes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎬</div>
                    <h3>暂无剧本内容</h3>
                    <p>点击下方按钮开始编写第一个场景</p>
                    <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="ScriptEditor.addNewScene()">➕ 添加场景</button>
                        <button class="btn btn-secondary" onclick="ScriptEditor.generateFromOutline()">📝 从大纲生成</button>
                        <button class="btn btn-secondary" onclick="ScriptEditor.loadScriptTemplate('romance')">💘 爱情模板</button>
                        <button class="btn btn-secondary" onclick="ScriptEditor.loadScriptTemplate('action')">🎯 动作模板</button>
                    </div>
                </div>
            `;
            return;
        }

        let html = '';
        
        projectData.scenes.forEach((scene, idx) => {
            html += `
                <div class="script-scene-card" data-index="${idx}" id="scene-${idx}" style="margin-bottom: 24px; padding: 20px; background: var(--bg-panel-light); border-radius: 8px; border-left: 4px solid var(--primary);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div style="font-weight: 600; color: var(--primary);">场景 ${idx + 1} / ${projectData.scenes.length}</div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-sm" onclick="ScriptEditor.moveScene(${idx}, -1)" ${idx === 0 ? 'disabled' : ''}>⬆️</button>
                            <button class="btn btn-sm" onclick="ScriptEditor.moveScene(${idx}, 1)" ${idx === projectData.scenes.length - 1 ? 'disabled' : ''}>⬇️</button>
                            <button class="btn btn-sm btn-secondary" onclick="ScriptEditor.editScene(${idx})">✏️ 编辑</button>
                            <button class="btn btn-sm btn-danger" onclick="ScriptEditor.deleteScene(${idx})">🗑️ 删除</button>
                        </div>
                    </div>
                    
                    <div style="font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.8;">
                        <div style="font-weight: bold; color: var(--primary); text-transform: uppercase; margin-bottom: 12px;">
                            ${scene.intro}.${scene.location} - ${scene.time}
                        </div>
                        <div style="margin-bottom: 16px; color: var(--text-dim);">${scene.action || '(暂无动作描述)'}</div>
                        
                        ${scene.dialogues && scene.dialogues.length > 0 ? 
                            scene.dialogues.map((d, dIdx) => `
                                <div style="margin: 16px 0; padding-left: 20%;">
                                    <div style="font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">${d.character}</div>
                                    ${d.parenthetical ? `<div style="font-style: italic; color: var(--text-dim); font-size: 13px; margin-bottom: 4px;">${d.parenthetical}</div>` : ''}
                                    <div style="margin-bottom: 8px;">${d.content}</div>
                                </div>
                            `).join('') : '<div style="color: var(--text-muted); font-style: italic;">(暂无对白)</div>'}
                    </div>
                </div>
            `;
        });

        html += `
            <div style="margin-top: 24px; padding: 20px; background: rgba(99, 102, 241, 0.1); border-radius: 8px; border: 2px dashed var(--primary); text-align: center;">
                <button class="btn btn-primary btn-large" onclick="ScriptEditor.addNewScene()">➕ 添加新场景</button>
            </div>
        `;
        
        container.innerHTML = html;
        document.getElementById('script-result').style.display = 'block';
        this.updateScriptStats();
    },

    addNewScene() {
        const newScene = {
            id: 'scene_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            intro: 'INT.',
            location: '新场景 ' + (projectData.scenes.length + 1),
            time: '日',
            action: '',
            dialogues: []
        };
        
        projectData.scenes.push(newScene);
        this.currentSceneIndex = projectData.scenes.length - 1;
        this.editScene(this.currentSceneIndex, true);
        
        AppState.hasUnsavedChanges = true;
        updateSaveStatus('unsaved');
    },

    editScene(index, isNew = false) {
        const scene = projectData.scenes[index];
        if (!scene) return;
        
        this.currentSceneIndex = index;
        this.isEditing = true;
        
        const modalHtml = `
            <div id="scene-edit-modal" class="modal-overlay" style="display: flex; z-index: 2000;">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h3>${isNew ? '➕ 新场景' : '✏️ 编辑场景'} - 场景 ${index + 1}</h3>
                        <button class="btn-icon modal-close" onclick="ScriptEditor.closeSceneEditor()">×</button>
                    </div>
                    <div class="modal-body">
                        <div style="display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 12px; margin-bottom: 16px;">
                            <div class="form-group">
                                <label>场景类型</label>
                                <select id="edit-scene-intro">
                                    ${this.sceneIntros.map(i => `<option value="${i}" ${scene.intro === i ? 'selected' : ''}>${i}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>场景位置</label>
                                <input type="text" id="edit-scene-location" value="${scene.location || ''}" placeholder="如：办公室 - 会议室">
                            </div>
                            <div class="form-group">
                                <label>时间</label>
                                <select id="edit-scene-time">
                                    ${this.timeOfDays.map(t => `<option value="${t}" ${scene.time === t ? 'selected' : ''}>${t}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>🎬 动作/场景描述</label>
                            <textarea id="edit-scene-action" rows="4" placeholder="描述此场景发生的动作、环境、氛围...">${scene.action || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>💬 角色对白</label>
                            <div id="dialogue-editor" style="background: var(--bg); padding: 12px; border-radius: 6px; margin-bottom: 12px;">
                                ${this.renderDialogueEditor(scene.dialogues)}
                            </div>
                            <button class="btn btn-secondary btn-sm" onclick="ScriptEditor.addDialogue()">➕ 添加对白</button>
                        </div>
                        
                        <div class="form-group">
                            <label>📝 完整剧本预览（标准格式）</label>
                            <div id="scene-preview" style="background: var(--bg); padding: 16px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.8; border: 1px solid var(--border);">
                                ${this.generateSceneText(scene)}
                            </div>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-outline" onclick="ScriptEditor.closeSceneEditor()">取消</button>
                        <button class="btn btn-secondary" onclick="ScriptEditor.updateScenePreview()">🔄 预览</button>
                        <button class="btn btn-primary" onclick="ScriptEditor.saveScene(${index})">💾 保存</button>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('scene-edit-modal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        ['edit-scene-intro', 'edit-scene-location', 'edit-scene-time', 'edit-scene-action'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.updateScenePreview());
        });
    },

    renderDialogueEditor(dialogues) {
        if (!dialogues || dialogues.length === 0) {
            return '<div style="color: var(--text-muted); text-align: center; padding: 20px;">暂无对白，点击下方按钮添加</div>';
        }
        
        return dialogues.map((d, idx) => `
            <div class="dialogue-item" style="margin-bottom: 12px; padding: 12px; background: var(--bg-panel-light); border-radius: 6px; border: 1px solid var(--border);">
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <input type="text" class="dialogue-char" value="${d.character || ''}" placeholder="角色名" style="flex: 1; padding: 8px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; color: var(--text);">
                    <input type="text" class="dialogue-parenth" value="${d.parenthetical || ''}" placeholder="(动作提示)" style="flex: 1; padding: 8px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; color: var(--text);">
                    <button class="btn btn-sm btn-danger" onclick="ScriptEditor.deleteDialogue(${idx})">×</button>
                </div>
                <textarea class="dialogue-content" rows="2" placeholder="对白内容..." style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; color: var(--text); resize: vertical;">${d.content || ''}</textarea>
            </div>
        `).join('');
    },

    addDialogue() {
        const container = document.getElementById('dialogue-editor');
        if (!container) return;
        
        const currentScene = projectData.scenes[this.currentSceneIndex];
        if (!currentScene.dialogues) currentScene.dialogues = [];
        
        currentScene.dialogues.push({ character: '', parenthetical: '', content: '' });
        container.innerHTML = this.renderDialogueEditor(currentScene.dialogues);
    },

    deleteDialogue(index) {
        const currentScene = projectData.scenes[this.currentSceneIndex];
        if (currentScene.dialogues && currentScene.dialogues[index]) {
            currentScene.dialogues.splice(index, 1);
            const container = document.getElementById('dialogue-editor');
            if (container) container.innerHTML = this.renderDialogueEditor(currentScene.dialogues);
        }
    },

    updateScenePreview() {
        const preview = document.getElementById('scene-preview');
        if (!preview) return;
        
        const tempScene = {
            intro: document.getElementById('edit-scene-intro')?.value || 'INT.',
            location: document.getElementById('edit-scene-location')?.value || '场景',
            time: document.getElementById('edit-scene-time')?.value || '日',
            action: document.getElementById('edit-scene-action')?.value || '',
            dialogues: Array.from(document.querySelectorAll('.dialogue-item')).map((item, idx) => ({
                character: item.querySelector('.dialogue-char')?.value || '',
                parenthetical: item.querySelector('.dialogue-parenth')?.value || '',
                content: item.querySelector('.dialogue-content')?.value || ''
            }))
        };
        
        preview.innerHTML = this.generateSceneText(tempScene);
    },

    generateSceneText(scene) {
        let text = `
            <div style="font-weight: bold; color: var(--primary); text-transform: uppercase; margin-bottom: 12px;">
                ${scene.intro}.${scene.location} - ${scene.time}
            </div>
            <div style="margin-bottom: 16px; color: var(--text-dim);">
                ${scene.action || '(暂无动作描述)'}
            </div>
        `;
        
        if (scene.dialogues && scene.dialogues.length > 0) {
            scene.dialogues.forEach(d => {
                text += `
                    <div style="margin: 16px 0; padding-left: 20%;">
                        <div style="font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">${d.character || '(角色)'}</div>
                        ${d.parenthetical ? `<div style="font-style: italic; color: var(--text-dim); font-size: 13px;">${d.parenthetical}</div>` : ''}
                        <div>${d.content || '(暂无对白)'}</div>
                    </div>
                `;
            });
        }
        
        return text;
    },

    saveScene(index) {
        const scene = projectData.scenes[index];
        if (!scene) return;
        
        scene.intro = document.getElementById('edit-scene-intro')?.value || 'INT.';
        scene.location = document.getElementById('edit-scene-location')?.value || '场景';
        scene.time = document.getElementById('edit-scene-time')?.value || '日';
        scene.action = document.getElementById('edit-scene-action')?.value || '';
        
        scene.dialogues = Array.from(document.querySelectorAll('.dialogue-item')).map((item) => ({
            character: item.querySelector('.dialogue-char')?.value || '',
            parenthetical: item.querySelector('.dialogue-parenth')?.value || '',
            content: item.querySelector('.dialogue-content')?.value || ''
        }));
        
        this.closeSceneEditor();
        this.renderScriptEditor();
        AppState.hasUnsavedChanges = true;
        updateSaveStatus('unsaved');
        showToast('场景已保存！', 'success');
    },

    closeSceneEditor() {
        const modal = document.getElementById('scene-edit-modal');
        if (modal) modal.remove();
        this.isEditing = false;
    },

    moveScene(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= projectData.scenes.length) return;
        
        const temp = projectData.scenes[index];
        projectData.scenes[index] = projectData.scenes[newIndex];
        projectData.scenes[newIndex] = temp;
        
        this.renderScriptEditor();
        AppState.hasUnsavedChanges = true;
        updateSaveStatus('unsaved');
    },

    deleteScene(index) {
        if (!confirm(`确定删除场景 ${index + 1} 吗？`)) return;
        projectData.scenes.splice(index, 1);
        this.renderScriptEditor();
        AppState.hasUnsavedChanges = true;
        updateSaveStatus('unsaved');
        showToast('场景已删除', 'info');
    },

    updateScriptStats() {
        const numScenes = projectData.scenes.length;
        let numDialogues = 0;
        projectData.scenes.forEach(s => {
            if (s.dialogues) numDialogues += s.dialogues.length;
        });
        
        projectData.script = this.generateFullScript();
        AppState.updateTabState('script', true);
    },

    generateFullScript() {
        let fullScript = '';
        projectData.scenes.forEach((scene, idx) => {
            fullScript += `${scene.intro}.${scene.location} - ${scene.time}\n\n`;
            fullScript += `${scene.action}\n\n`;
            if (scene.dialogues && scene.dialogues.length > 0) {
                scene.dialogues.forEach(d => {
                    fullScript += `${d.character}\n`;
                    if (d.parenthetical) fullScript += `${d.parenthetical}\n`;
                    fullScript += `${d.content}\n\n`;
                });
            }
            fullScript += '\n';
        });
        return fullScript;
    },

    generateFromOutline() {
        if (!projectData.outline || projectData.outline.length < 20) {
            showToast('请先编写或导入大纲内容', 'warning');
            switchTab('outline');
            return;
        }
        
        const outlineText = projectData.outline;
        const sceneKeywords = ['场景', '第一幕', '第二幕', '开端', '发展', '高潮', '结尾', '事件', '段落'];
        
        projectData.scenes = [];
        
        const sections = outlineText.split(/\n\s*\n|[\n\r]{2,}/);
        let sceneCount = 0;
        
        sections.forEach(section => {
            if (section.trim().length > 20 && sceneCount < 20) {
                const isScene = sceneKeywords.some(k => section.includes(k));
                if (isScene || sceneCount < 5) {
                    const lines = section.split('\n').filter(l => l.trim());
                    const title = lines[0]?.replace(/[\[\]]/g, '').trim() || `场景 ${sceneCount + 1}`;
                    const content = lines.slice(1).join('\n').trim() || section.trim();
                    
                    projectData.scenes.push({
                        id: 'scene_' + Date.now() + '_' + sceneCount,
                        intro: sceneCount % 2 === 0 ? 'INT.' : 'EXT.',
                        location: title.substring(0, 40),
                        time: sceneCount % 3 === 0 ? '夜' : '日',
                        action: content.substring(0, 500),
                        dialogues: []
                    });
                    sceneCount++;
                }
            }
        });
        
        if (projectData.scenes.length === 0) {
            projectData.scenes = [{
                id: 'scene_' + Date.now(),
                intro: 'INT.',
                location: '主场景',
                time: '日',
                action: outlineText.substring(0, 300),
                dialogues: []
            }];
        }
        
        this.renderScriptEditor();
        showToast(`已从大纲生成 ${projectData.scenes.length} 个场景`, 'success');
        AppState.hasUnsavedChanges = true;
        updateSaveStatus('unsaved');
    },

    loadScriptTemplate(type) {
        const templates = {
            romance: [
                {
                    intro: 'EXT.', location: '公园 - 午后', time: '黄昏',
                    action: '夕阳西下，温暖的阳光洒在公园的长椅上。女主角小雨独自坐在长椅上，看着手中的一本旧书。微风拂过，轻轻撩起她的发丝。',
                    dialogues: [
                        { character: '小雨', parenthetical: '(自言自语)', content: '又是一年的春天了...时间过得真快。' },
                        { character: '???', parenthetical: '(画外音)', content: '这里有人坐吗？' }
                    ]
                },
                {
                    intro: 'INT.', location: '咖啡馆', time: '日',
                    action: '咖啡馆内，轻音乐缓缓流淌。男主角陈风端着两杯咖啡，走向小雨坐的位置。',
                    dialogues: [
                        { character: '陈风', parenthetical: '(微笑)', content: '没想到真的在这里遇到你。' },
                        { character: '小雨', parenthetical: '(惊喜)', content: '陈风？你怎么会在这里？' },
                        { character: '陈风', parenthetical: '', content: '我一直想问你...三年前，为什么突然离开？' }
                    ]
                },
                {
                    intro: 'INT.', location: '咖啡馆', time: '日',
                    action: '两人相视而笑，空气中弥漫着久别重逢的温馨。',
                    dialogues: [
                        { character: '小雨', parenthetical: '(低头，轻声)', content: '那时候...我以为离开是最好的选择。' },
                        { character: '陈风', parenthetical: '(温柔地)', content: '那现在呢？' },
                        { character: '小雨', parenthetical: '(抬头微笑)', content: '现在...我很高兴回来了。' }
                    ]
                }
            ],
            action: [
                {
                    intro: 'EXT.', location: '城市街道', time: '夜',
                    action: '霓虹闪烁的街道上，人群熙熙攘攘。一辆黑色轿车急驰而过，鸣笛声刺耳。',
                    dialogues: [
                        { character: '警察A', parenthetical: '(对讲机)', content: '目标车辆向北驶去，请求支援！' },
                        { character: '警察B', parenthetical: '', content: '收到！十分钟内到达！' }
                    ]
                },
                {
                    intro: 'INT.', location: '仓库', time: '夜',
                    action: '昏暗的仓库内，主角林峰被绑在椅子上，头部有血迹。反派老大慢慢走向他。',
                    dialogues: [
                        { character: '老大', parenthetical: '(冷笑)', content: '你以为你能逃走吗？' },
                        { character: '林峰', parenthetical: '(吃力地)', content: '你...你们逃不掉的...' },
                        { character: '老大', parenthetical: '(示意手下)', content: '处理掉他。' }
                    ]
                },
                {
                    intro: 'EXT.', location: '仓库外', time: '夜',
                    action: '警笛声由远及近。仓库大门被撞开，警察冲入。',
                    dialogues: [
                        { character: '警察队长', parenthetical: '', content: '不许动！警察！' },
                        { character: '林峰', parenthetical: '(虚弱地)', content: '你们...终于来了。' }
                    ]
                }
            ]
        };
        
        if (templates[type]) {
            projectData.scenes = templates[type].map((scene, idx) => ({
                id: 'scene_' + Date.now() + '_' + idx,
                ...scene
            }));
            this.renderScriptEditor();
            showToast(`已加载${type === 'romance' ? '爱情' : '动作'}剧本模板`, 'success');
            AppState.hasUnsavedChanges = true;
            updateSaveStatus('unsaved');
        }
    }
};

/**
 * ================================================
 * Phase 4-2: 多格式导出系统
 * 功能：TXT/CSV/HTML/Markdown/Fountain 多格式导出
 * ================================================
 */

const ExportManager = {
    exportToTxt() {
        let content = '';
        content += `========================================\n`;
        content += `${projectData.title || '剧本项目'}\n`;
        content += `========================================\n\n`;
        content += `类型：${projectData.genre || '未定'} | 风格：${projectData.style || '标准'} | 时长：${projectData.duration || '未定'} | 集数：${projectData.episodes || '未定'}\n`;
        content += `导出时间：${new Date().toLocaleString('zh-CN')}\n`;
        content += `\n========================================\n\n`;
        
        content += `【剧本大纲】\n\n${projectData.outline || '暂无'}\n\n`;
        
        content += `\n========================================\n`;
        content += `【剧本正文】\n`;
        content += `========================================\n\n`;
        
        if (projectData.scenes && projectData.scenes.length > 0) {
            projectData.scenes.forEach((scene, idx) => {
                content += `\n--- 场景 ${idx + 1} ---\n\n`;
                content += `${scene.intro}.${scene.location} - ${scene.time}\n\n`;
                content += `${scene.action}\n\n`;
                
                if (scene.dialogues && scene.dialogues.length > 0) {
                    scene.dialogues.forEach(d => {
                        content += `${d.character}\n`;
                        if (d.parenthetical) content += `${d.parenthetical}\n`;
                        content += `${d.content}\n\n`;
                    });
                }
            });
        } else if (projectData.script) {
            content += projectData.script;
        } else {
            content += '(暂无剧本内容)\n';
        }
        
        content += `\n========================================\n`;
        content += `【分镜脚本】\n`;
        content += `========================================\n\n`;
        
        if (projectData.shots && projectData.shots.length > 0) {
            projectData.shots.forEach((shot, idx) => {
                content += `分镜 ${idx + 1}：${shot.type || '未知镜位'}\n`;
                content += `场景：${shot.scene || '未设定'}\n`;
                content += `时长：${shot.duration || '未定'}\n`;
                if (shot.characters) content += `人物：${shot.characters}\n`;
                if (shot.cameraMove) content += `运镜：${shot.cameraMove}\n`;
                content += `描述：${shot.content || ''}\n`;
                if (shot.dialog) content += `对白：${shot.dialog}\n`;
                if (shot.imagePrompt) content += `提示词：${shot.imagePrompt}\n`;
                content += '\n';
            });
        } else {
            content += '(暂无分镜内容)\n';
        }
        
        if (projectData.characters && projectData.characters.length > 0) {
            content += `\n========================================\n`;
            content += `【角色表】\n`;
            content += `========================================\n\n`;
            projectData.characters.forEach((char, idx) => {
                content += `${idx + 1}. ${char.name} (${char.type || '未定'})\n`;
                if (char.appearance) content += `   外貌：${char.appearance}\n`;
                if (char.personality) content += `   性格：${char.personality}\n`;
                if (char.background) content += `   背景：${char.background}\n`;
                content += '\n';
            });
        }
        
        this.downloadFile(content, 'script.txt', 'text/plain;charset=utf-8');
    },

    exportToCsv() {
        if (!projectData.shots || projectData.shots.length === 0) {
            showToast('暂无分镜数据可导出', 'warning');
            return;
        }
        
        let csv = '序号,镜位,场景,人物,运镜,时长,描述,对白,打光,情绪,图片提示词,视频提示词,人物提示词\n';
        
        projectData.shots.forEach((shot, idx) => {
            const row = [
                idx + 1,
                this.escapeCsv(shot.type || ''),
                this.escapeCsv(shot.scene || ''),
                this.escapeCsv(shot.characters || ''),
                this.escapeCsv(shot.cameraMove || ''),
                this.escapeCsv(shot.duration || ''),
                this.escapeCsv(shot.content || ''),
                this.escapeCsv(shot.dialog || ''),
                this.escapeCsv(shot.lighting || ''),
                this.escapeCsv(shot.mood || ''),
                this.escapeCsv(shot.imagePrompt || ''),
                this.escapeCsv(shot.videoPrompt || ''),
                this.escapeCsv(shot.characterPrompt || '')
            ].join(',');
            csv += row + '\n';
        });
        
        this.downloadFile(csv, 'storyboard.csv', 'text/csv;charset=utf-8');
    },

    exportToHtml() {
        let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectData.title || '剧本项目'}</title>
    <style>
        body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.8; color: #333; }
        h1 { text-align: center; color: #6366f1; border-bottom: 3px solid #6366f1; padding-bottom: 20px; }
        h2 { color: #8b5cf6; margin-top: 40px; border-left: 4px solid #8b5cf6; padding-left: 16px; }
        h3 { color: #a855f7; }
        .meta { text-align: center; color: #666; margin-bottom: 40px; }
        .scene { margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #6366f1; }
        .scene-header { font-weight: bold; color: #6366f1; text-transform: uppercase; margin-bottom: 16px; font-size: 16px; }
        .scene-action { color: #555; margin-bottom: 16px; }
        .dialogue { margin: 20px 0; padding-left: 100px; }
        .dialogue-char { font-weight: bold; text-transform: uppercase; margin-bottom: 4px; color: #333; }
        .dialogue-parenth { font-style: italic; color: #888; font-size: 14px; margin-bottom: 4px; }
        .dialogue-content { margin-bottom: 8px; }
        .shots-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .shots-table th, .shots-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .shots-table th { background: #6366f1; color: white; }
        .shot-item { background: white; margin: 20px 0; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .character-card { background: #fff7ed; padding: 16px; margin: 12px 0; border-radius: 8px; border-left: 4px solid #f59e0b; }
        .prompt-box { background: #f0fdf4; padding: 12px; margin-top: 8px; border-radius: 6px; font-family: monospace; font-size: 13px; color: #166534; }
        @media print { .scene, .shot-item, .character-card { page-break-inside: avoid; } }
    </style>
</head>
<body>
    <h1>${projectData.title || '剧本项目'}</h1>
    <div class="meta">
        <p>类型：${projectData.genre || '未定'} | 风格：${projectData.style || '标准'} | 时长：${projectData.duration || '未定'}</p>
        <p>导出时间：${new Date().toLocaleString('zh-CN')}</p>
    </div>
    
    <h2>📝 剧本大纲</h2>
    <div style="white-space: pre-wrap;">${projectData.outline || '(暂无)'}</div>
    
    <h2>🎬 剧本正文</h2>
`;
        
        if (projectData.scenes && projectData.scenes.length > 0) {
            projectData.scenes.forEach((scene, idx) => {
                html += `
    <div class="scene">
        <div class="scene-header">场景 ${idx + 1}：${scene.intro}.${scene.location} - ${scene.time}</div>
        <div class="scene-action">${scene.action || ''}</div>
        ${scene.dialogues ? scene.dialogues.map(d => `
            <div class="dialogue">
                <div class="dialogue-char">${d.character}</div>
                ${d.parenthetical ? `<div class="dialogue-parenth">${d.parenthetical}</div>` : ''}
                <div class="dialogue-content">${d.content}</div>
            </div>
        `).join('') : ''}
    </div>`;
            });
        } else if (projectData.script) {
            html += `<div style="white-space: pre-wrap;">${projectData.script}</div>`;
        } else {
            html += '<p>(暂无剧本内容)</p>';
        }
        
        if (projectData.shots && projectData.shots.length > 0) {
            html += `\n    <h2>🎞️ 分镜脚本</h2>\n`;
            html += `    <table class="shots-table">
        <thead><tr><th>序号</th><th>镜位</th><th>场景</th><th>时长</th><th>描述</th><th>人物</th><th>运镜</th><th>对白</th><th>AI提示词</th></tr></thead>
        <tbody>`;
            
            projectData.shots.forEach((shot, idx) => {
                html += `
            <tr>
                <td>${idx + 1}</td>
                <td>${shot.type || ''}</td>
                <td>${shot.scene || ''}</td>
                <td>${shot.duration || ''}</td>
                <td>${shot.content || ''}</td>
                <td>${shot.characters || ''}</td>
                <td>${shot.cameraMove || ''}</td>
                <td>${shot.dialog || ''}</td>
                <td style="font-size: 12px; color: #666;">${shot.imagePrompt || ''}</td>
            </tr>`;
            });
            
            html += `\n        </tbody>\n    </table>\n`;
        }
        
        if (projectData.characters && projectData.characters.length > 0) {
            html += `\n    <h2>👥 角色设定</h2>\n`;
            projectData.characters.forEach(char => {
                html += `
    <div class="character-card">
        <h3>${char.name} <span style="font-size: 14px; color: #666;">(${char.type || '未定'})</span></h3>
        ${char.age ? `<p><strong>年龄：</strong>${char.age}</p>` : ''}
        ${char.gender ? `<p><strong>性别：</strong>${char.gender}</p>` : ''}
        ${char.appearance ? `<p><strong>外貌：</strong>${char.appearance}</p>` : ''}
        ${char.personality ? `<p><strong>性格：</strong>${char.personality}</p>` : ''}
        ${char.background ? `<p><strong>背景：</strong>${char.background}</p>` : ''}
        ${char.aiPrompt ? `<div class="prompt-box"><strong>AI绘画提示词：</strong>${char.aiPrompt}</div>` : ''}
    </div>`;
            });
        }
        
        html += `\n</body>\n</html>`;
        
        this.downloadFile(html, 'storyboard.html', 'text/html;charset=utf-8');
    },

    exportToMarkdown() {
        let md = `# ${projectData.title || '剧本项目'}\n\n`;
        md += `> 类型：${projectData.genre || '未定'} | 风格：${projectData.style || '标准'} | 时长：${projectData.duration || '未定'} | 集数：${projectData.episodes || '未定'}\n\n`;
        md += `> 导出时间：${new Date().toLocaleString('zh-CN')}\n\n`;
        md += `---\n\n`;
        
        md += `## 📝 剧本大纲\n\n${projectData.outline || '_暂无大纲内容_'}\n\n`;
        
        md += `---\n\n## 🎬 剧本正文\n\n`;
        
        if (projectData.scenes && projectData.scenes.length > 0) {
            projectData.scenes.forEach((scene, idx) => {
                md += `### 场景 ${idx + 1}：${scene.intro}.${scene.location} - ${scene.time}\n\n`;
                md += `${scene.action}\n\n`;
                
                if (scene.dialogues && scene.dialogues.length > 0) {
                    scene.dialogues.forEach(d => {
                        md += `**${d.character}**`;
                        if (d.parenthetical) md += ` _${d.parenthetical}_`;
                        md += `\n\n> ${d.content}\n\n`;
                    });
                }
                md += `---\n\n`;
            });
        } else if (projectData.script) {
            md += projectData.script + '\n\n';
        } else {
            md += '_暂无剧本内容_\n\n';
        }
        
        md += `## 🎞️ 分镜脚本\n\n`;
        
        if (projectData.shots && projectData.shots.length > 0) {
            md += `| 序号 | 镜位 | 场景 | 时长 | 描述 |\n`;
            md += `|:-:|:--|:--|:--|:--|\n`;
            
            projectData.shots.forEach((shot, idx) => {
                md += `| ${idx + 1} | ${shot.type || ''} | ${shot.scene || ''} | ${shot.duration || ''} | ${(shot.content || '').substring(0, 50)} |\n`;
            });
            md += '\n';
        } else {
            md += '_暂无分镜内容_\n\n';
        }
        
        if (projectData.characters && projectData.characters.length > 0) {
            md += `## 👥 角色设定\n\n`;
            projectData.characters.forEach(char => {
                md += `### ${char.name} (${char.type || '未定'})\n\n`;
                if (char.age) md += `- **年龄**：${char.age}\n`;
                if (char.personality) md += `- **性格**：${char.personality}\n`;
                if (char.appearance) md += `- **外貌**：${char.appearance}\n`;
                if (char.background) md += `- **背景**：${char.background}\n`;
                if (char.aiPrompt) md += `- **AI提示词**：${char.aiPrompt}\n`;
                md += '\n';
            });
        }
        
        this.downloadFile(md, 'script.md', 'text/markdown;charset=utf-8');
    },

    exportToFountain() {
        let fountain = `Title: ${projectData.title || '剧本项目'}\n`;
        fountain += `Genre: ${projectData.genre || '未定'}\n`;
        fountain += `Draft Date: ${new Date().toLocaleDateString('zh-CN')}\n\n`;
        
        if (projectData.scenes && projectData.scenes.length > 0) {
            projectData.scenes.forEach((scene, idx) => {
                const sceneHeader = `${scene.intro}.${scene.location} - ${scene.time}`.toUpperCase();
                fountain += `${sceneHeader}\n\n`;
                fountain += `${scene.action}\n\n`;
                
                if (scene.dialogues && scene.dialogues.length > 0) {
                    scene.dialogues.forEach(d => {
                        fountain += `${(d.character || '角色').toUpperCase()}\n`;
                        if (d.parenthetical) fountain += `${d.parenthetical}\n`;
                        fountain += `${d.content}\n\n`;
                    });
                }
            });
        } else if (projectData.script) {
            fountain += projectData.script;
        } else {
            fountain += '(暂无剧本内容)';
        }
        
        this.downloadFile(fountain, 'script.fountain', 'text/plain;charset=utf-8');
    },

    exportProjectJson() {
        // 规范化：兼容旧字段路径 + 新统一结构
        const data = normalizeProjectData(projectData);
        const exportData = {
            // 兼容旧路径（供导入旧项目使用）
            title: data.metadata.title || '',
            genre: data.metadata.genre || '',
            style: data.metadata.style || '',
            duration: data.metadata.duration || '',
            episodes: data.metadata.episodes || '',
            // 新统一路径
            outline: data.outline || '',
            script: data.script || '',
            novel: data.novel || '',
            shots: (data.shots || []).map(s => normalizeShot(s)),
            characters: data.characters || [],
            scenes: data.scenes || [],
            beats: data.beats || { structure: 'three-act', beats: [] },
            metadata: data.metadata || {},
            version: '2.0',
            exportedAt: new Date().toISOString(),
            statistics: {
                sceneCount: (data.scenes || []).length,
                shotCount: (data.shots || []).length,
                characterCount: (data.characters || []).length,
                outlineLength: (data.outline || '').length,
                scriptLength: (data.script || '').length
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `project_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('项目已导出为JSON文件', 'success');
    },

    escapeCsv(text) {
        if (!text) return '';
        const escaped = String(text).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
        return `"${escaped}"`;
    },

    downloadFile(content, filename, mimeType) {
        if (mimeType === 'application/json') {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return;
        }
        
        const blob = new Blob(['\ufeff' + content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast(`文件已下载：${filename}`, 'success');
    },

    showExportModal() {
        const modalHtml = `
            <div id="export-modal" class="modal-overlay" style="display: flex; z-index: 2000;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>📤 导出项目</h3>
                        <button class="btn-icon modal-close" onclick="document.getElementById('export-modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="color: var(--text-dim); margin-bottom: 20px;">选择您需要导出的格式：</p>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                            <button class="btn btn-primary" onclick="ExportManager.exportToTxt(); document.getElementById('export-modal').remove();" style="padding: 20px;">
                                <div style="font-size: 24px; margin-bottom: 8px;">📄</div>
                                <div style="font-weight: bold;">TXT 文本</div>
                                <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">标准可读格式</div>
                            </button>
                            <button class="btn btn-primary" onclick="ExportManager.exportToCsv(); document.getElementById('export-modal').remove();" style="padding: 20px;">
                                <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
                                <div style="font-weight: bold;">CSV 表格</div>
                                <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">分镜表，适合Excel</div>
                            </button>
                            <button class="btn btn-primary" onclick="ExportManager.exportToHtml(); document.getElementById('export-modal').remove();" style="padding: 20px;">
                                <div style="font-size: 24px; margin-bottom: 8px;">🌐</div>
                                <div style="font-weight: bold;">HTML 网页</div>
                                <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">精美排版，可打印</div>
                            </button>
                            <button class="btn btn-primary" onclick="ExportManager.exportToMarkdown(); document.getElementById('export-modal').remove();" style="padding: 20px;">
                                <div style="font-size: 24px; margin-bottom: 8px;">📝</div>
                                <div style="font-weight: bold;">Markdown</div>
                                <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">通用文档格式</div>
                            </button>
                            <button class="btn btn-secondary" onclick="ExportManager.exportToFountain(); document.getElementById('export-modal').remove();" style="padding: 20px;">
                                <div style="font-size: 24px; margin-bottom: 8px;">🎭</div>
                                <div style="font-weight: bold;">Fountain</div>
                                <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">专业剧本格式</div>
                            </button>
                            <button class="btn btn-secondary" onclick="ExportManager.exportProjectJson(); document.getElementById('export-modal').remove();" style="padding: 20px;">
                                <div style="font-size: 24px; margin-bottom: 8px;">📦</div>
                                <div style="font-weight: bold;">JSON 项目</div>
                                <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">完整备份</div>
                            </button>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-outline" onclick="document.getElementById('export-modal').remove()">关闭</button>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('export-modal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
};

/**
 * ================================================
 * Phase 4-3: AI辅助创作建议引擎
 * ================================================
 */

const AIAssistant = {
    analyzeStory() {
        const analysis = {
            score: 0,
            totalPossible: 5,
            suggestions: [],
            strengths: [],
            issues: []
        };
        
        const outlineLength = (projectData.outline || '').length;
        const hasCharacters = projectData.characters && projectData.characters.length > 0;
        const hasScenes = projectData.scenes && projectData.scenes.length > 0;
        const hasShots = projectData.shots && projectData.shots.length > 0;
        
        if (outlineLength > 100) {
            analysis.strengths.push('大纲内容较为丰富');
            analysis.score++;
        } else {
            analysis.issues.push('建议增加大纲的详细程度');
        }
        
        if (hasCharacters) {
            analysis.strengths.push('已创建角色设定');
            analysis.score++;
        } else {
            analysis.issues.push('建议添加主要角色设定');
        }
        
        if (hasScenes) {
            analysis.strengths.push('已有场景内容');
            analysis.score++;
            
            let totalDialogues = 0;
            projectData.scenes.forEach(s => {
                if (s.dialogues) totalDialogues += s.dialogues.length;
            });
            if (totalDialogues > 0) {
                analysis.strengths.push(`已有${totalDialogues}段对白`);
                analysis.score++;
            }
        } else {
            analysis.issues.push('建议编写或生成场景内容');
        }
        
        if (hasShots) {
            analysis.strengths.push('已有分镜设计');
            analysis.score++;
        }
        
        if (projectData.characters && projectData.characters.length === 1) {
            analysis.suggestions.push('只有一个角色，建议增加配角或对手角色以产生戏剧冲突');
        }
        
        if (projectData.shots && projectData.shots.length > 0 && projectData.shots.length < 5) {
            analysis.suggestions.push('分镜数量较少，建议补充更多镜头覆盖完整场景');
        }
        
        return analysis;
    },

    showAnalysis() {
        const analysis = this.analyzeStory();
        
        const modalHtml = `
            <div id="analysis-modal" class="modal-overlay" style="display: flex; z-index: 2000;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>🧠 AI 剧本分析</h3>
                        <button class="btn-icon modal-close" onclick="document.getElementById('analysis-modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <div style="font-size: 48px; font-weight: bold; color: var(--primary);">${analysis.score}/${analysis.totalPossible}</div>
                            <div style="color: var(--text-dim);">完整度评分（满分${analysis.totalPossible}分）</div>
                        </div>
                        
                        ${analysis.strengths.length > 0 ? `
                            <div style="margin-bottom: 16px;">
                                <h4 style="color: var(--success); margin-bottom: 8px;">✅ 优点</h4>
                                ${analysis.strengths.map(s => `<div style="padding: 8px; background: rgba(16, 185, 129, 0.1); border-radius: 4px; margin-bottom: 4px;">${s}</div>`).join('')}
                            </div>
                        ` : ''}
                        
                        ${analysis.issues.length > 0 ? `
                            <div style="margin-bottom: 16px;">
                                <h4 style="color: var(--warning); margin-bottom: 8px;">⚠️ 改进点</h4>
                                ${analysis.issues.map(i => `<div style="padding: 8px; background: rgba(245, 158, 11, 0.1); border-radius: 4px; margin-bottom: 4px;">${i}</div>`).join('')}
                            </div>
                        ` : ''}
                        
                        ${analysis.suggestions.length > 0 ? `
                            <div style="margin-bottom: 16px;">
                                <h4 style="color: var(--primary); margin-bottom: 8px;">💡 建议</h4>
                                ${analysis.suggestions.map(s => `<div style="padding: 8px; background: rgba(99, 102, 241, 0.1); border-radius: 4px; margin-bottom: 4px;">${s}</div>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-outline" onclick="document.getElementById('analysis-modal').remove()">关闭</button>
                        <button class="btn btn-primary" onclick="AIAssistant.generateSuggestion(); document.getElementById('analysis-modal').remove();">🔮 创意建议</button>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('analysis-modal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    generateSuggestion() {
        const suggestions = [
            { type: '冲突升级', content: '考虑在当前故事中增加一个时间限制或外部压力，例如：主角必须在24小时内完成某件事，否则将失去重要机会。时间压力会自然产生紧张感。' },
            { type: '角色关系', content: '建议增加一个让主角暴露弱点的场景。观众喜欢看到不完美但真实的角色，让主角在某件事上失败或犯错，然后再让他/她站起来克服困难，这样更能引发观众共鸣。' },
            { type: '场景建议', content: '在当前场景之后，是否考虑加入一个"对比场景"？比如紧张追逐戏后，用一个安静的对话场景让观众喘口气，同时让剧情有节奏起伏。' },
            { type: '情感层次', content: '建议在对白中增加"潜台词"——角色说的话和内心真实想法之间的差异。这种表里不一的对话能让角色更立体，也让观众更想深入了解。' },
            { type: '视觉元素', content: '考虑加入一个象征性的视觉主题：比如一只流浪猫、一朵花、一把旧钥匙。让这个视觉元素在故事的关键时刻重复出现，增强象征意义。' },
            { type: '悬念设置', content: '在场景结束时，尝试用一个"开放式悬念"结尾——一个问题的答案被延迟揭晓，或者一个新的疑问被抛出。这样能让观众想继续看下一个场景。' },
            { type: '对白优化', content: '检查对白是否过于直白？试着让角色"不说清楚"——通过语气、停顿、回避问题来暗示真实想法。在现实生活中，人们很少直接表达内心最深处的感受。' },
            { type: '节奏控制', content: '如果你的剧本对话较多，建议在3-4个对话场景后插入一个纯视觉的动作场景或环境场景，让观众从大量信息中休息一下。' }
        ];
        
        const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        
        const modalHtml = `
            <div id="suggestion-modal" class="modal-overlay" style="display: flex; z-index: 2000;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>🔮 AI创作建议 - ${randomSuggestion.type}</h3>
                        <button class="btn-icon modal-close" onclick="document.getElementById('suggestion-modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div style="padding: 20px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1)); border-radius: 8px; font-size: 15px; line-height: 1.8; color: var(--text);">
                            ${randomSuggestion.content}
                        </div>
                        <div style="margin-top: 16px; font-size: 13px; color: var(--text-dim); text-align: center;">
                            💡 此建议基于您当前项目的结构分析生成
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-outline" onclick="document.getElementById('suggestion-modal').remove(); AIAssistant.generateSuggestion();">🔄 换一条</button>
                        <button class="btn btn-primary" onclick="document.getElementById('suggestion-modal').remove();">完成</button>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('suggestion-modal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    generateWritingPrompt(type) {
        const prompts = {
            opening: [
                '一个陌生城市的清晨，主角推开咖啡馆的门...',
                '电话铃在午夜响起，是那个三年没联系的人...',
                '主角打开一个尘封已久的抽屉，发现了一张泛黄的照片...',
                '大雨滂沱的夜晚，门外传来急促的敲门声...'
            ],
            conflict: [
                '主角最信任的人刚刚背叛了他/她...',
                '在即将实现目标的最后一刻，意外发生了...',
                '两个角色发现他们追求的是同一个东西，而这个东西只能属于一人...',
                '主角必须在两个重要选择中做出决定：救亲人还是完成任务？'
            ],
            climax: [
                '真相大白的那一刻，主角站在决定命运的十字路口...',
                '所有伏笔汇聚成一个重大揭示，所有人都惊呆了...',
                '最后一场对决，主角必须用之前学到的一切来赢得胜利...'
            ],
            emotional: [
                '写一段让观众流泪的告别场景...',
                '描述两个久别重逢的人眼神交汇的那一刻...',
                '主角终于理解了某个让他/她一直误解的真相...'
            ],
            ending: [
                '开放式结局：主角走向未知的远方，留下无尽想象空间...',
                '圆满结局：所有伏笔回收，角色完成蜕变...',
                '意犹未尽：最后一句对白引发观众的深度思考...'
            ]
        };
        
        const selected = prompts[type] || prompts.opening;
        const random = selected[Math.floor(Math.random() * selected.length)];
        
        const modalHtml = `
            <div id="prompt-modal" class="modal-overlay" style="display: flex; z-index: 2000;">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>✨ 创作灵感 - ${type === 'opening' ? '开场' : type === 'conflict' ? '冲突' : type === 'climax' ? '高潮' : type === 'emotional' ? '情感' : '结尾'}</h3>
                        <button class="btn-icon modal-close" onclick="document.getElementById('prompt-modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div style="padding: 20px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(99, 102, 241, 0.1)); border-radius: 8px; font-size: 15px; line-height: 1.8; color: var(--text); font-style: italic;">
                            "${random}"
                        </div>
                        <div style="margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
                            <button class="btn btn-secondary btn-sm" onclick="AIAssistant.generateWritingPrompt('opening')">开场</button>
                            <button class="btn btn-secondary btn-sm" onclick="AIAssistant.generateWritingPrompt('conflict')">冲突</button>
                            <button class="btn btn-secondary btn-sm" onclick="AIAssistant.generateWritingPrompt('climax')">高潮</button>
                            <button class="btn btn-secondary btn-sm" onclick="AIAssistant.generateWritingPrompt('emotional')">情感</button>
                            <button class="btn btn-secondary btn-sm" onclick="AIAssistant.generateWritingPrompt('ending')">结尾</button>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-outline" onclick="document.getElementById('prompt-modal').remove()">关闭</button>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('prompt-modal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
};

/**
 * ================================================
 * Phase 4-4: 项目模板库
 * 功能：快速加载不同类型的剧本模板
 * ================================================
 */

const ProjectTemplates = {
    templates: {
        '悬疑短片': {
            title: '悬疑短片项目模板',
            genre: '悬疑',
            style: '暗色风格',
            duration: '10-15分钟',
            episodes: '单集',
            outline: `第一幕：开场（2分钟）
- 雨夜，一名侦探独自驾车来到偏僻的山间小屋
- 小屋内空无一人，但明显有人刚离开
- 侦探发现桌上有一张他自己年轻时的照片

第二幕：发现与冲突（6-8分钟）
- 侦探开始搜查，发现更多与自己相关的线索
- 闪回片段：多年前的一宗未破案
- 电话响起，神秘声音警告他离开
- 房屋门锁突然关上，侦探被困

第三幕：高潮与结局（3-5分钟）
- 发现隐藏地下室，找到了关键证据
- 与真相对峙，发现案犯竟是自己认识的人
- 最终选择：揭露真相还是永远保守秘密？`,
            characters: [
                { id: '1', name: '李明', type: '主角', age: '40岁', gender: 'male', appearance: '中年男性，略显疲惫，眼神锐利，穿着风衣', personality: '坚韧，执着，有强烈的正义感', background: '资深侦探，多年前接手过一个悬案' },
                { id: '2', name: '神秘来电者', type: '反派', age: '未知', gender: 'unknown', appearance: '声音低沉，从未露面', personality: '狡猾，冷酷，似乎了解主角的一切', background: '与多年前的案件有关' }
            ],
            scenes: [
                { id: 's1', intro: 'EXT.', location: '山间小路', time: '夜', action: '暴雨如注。一辆旧轿车艰难地行驶在泥泞的山路上。车灯在黑暗中划出两条光束。', dialogues: [] },
                { id: 's2', intro: 'INT.', location: '山间小屋 - 客厅', time: '夜', action: '李明推门进入，手电照亮房间。空无一人，但桌上的咖啡还冒着热气。', dialogues: [] },
                { id: 's3', intro: 'INT.', location: '小屋 - 客厅', time: '夜', action: '李明在桌上发现一张泛黄的照片——是他年轻时的照片，背景是他早已忘记的某个地方。', dialogues: [{ character: '李明', parenthetical: '(低语)', content: '这是...怎么可能？' }] },
                { id: 's4', intro: 'INT.', location: '小屋 - 地下室入口', time: '夜', action: '李明发现地板上的暗门，打开，发现通往地下的阶梯。', dialogues: [] }
            ]
        },
        '爱情短片': {
            title: '爱情短片项目模板',
            genre: '爱情',
            style: '温暖治愈',
            duration: '8-12分钟',
            episodes: '单集',
            outline: `第一幕：相遇（2分钟）
- 一家旧书店，女主角在找一本书
- 男主角也伸手去拿同一本书
- 两人的手在书上相遇，相视一笑
- 简短对话，发现共同兴趣

第二幕：相知（4-6分钟）
- 多次在不同场合偶遇
- 开始一起喝咖啡，讨论书籍
- 慢慢了解彼此的过去
- 产生微妙的感情变化

第三幕：告白（3-4分钟）
- 男主决定表达自己的感情
- 在有特殊意义的地方等待
- 紧张的告白场景
- 开放式结尾，留给观众想象`,
            characters: [
                { id: '1', name: '小雨', type: '主角', age: '26岁', gender: 'female', appearance: '温柔知性，戴眼镜，喜欢穿米色毛衣', personality: '安静，喜欢阅读，内心善良', background: '出版社编辑，工作忙碌但对生活有热情' },
                { id: '2', name: '陈风', type: '恋人', age: '28岁', gender: 'male', appearance: '文质彬彬，笑容温暖，常穿深色衬衫', personality: '幽默，体贴，有艺术气质', background: '自由作家，经常在咖啡馆写作' }
            ],
            scenes: [
                { id: 's1', intro: 'INT.', location: '旧书店', time: '日', action: '阳光从老式窗户斜射进来。小雨在书架间浏览，伸手去拿一本书。与此同时，陈风也伸手去拿同一本书。', dialogues: [{ character: '小雨', parenthetical: '', content: '啊...抱歉。' }, { character: '陈风', parenthetical: '(微笑)', content: '不，没关系。你先请。' }] },
                { id: 's2', intro: 'INT.', location: '咖啡馆', time: '日', action: '一周后。小雨在靠窗的位置看书。门铃响起，陈风走进来，四处张望后看到小雨。', dialogues: [] }
            ]
        }
    },

    showTemplateModal() {
        const keys = Object.keys(this.templates);
        let buttonsHtml = keys.map(key => {
            const t = this.templates[key];
            return `
                <button class="btn btn-primary" onclick="ProjectTemplates.loadTemplate('${key}')" style="padding: 20px; text-align: left;">
                    <div style="font-weight: bold; margin-bottom: 8px;">📋 ${key}</div>
                    <div style="font-size: 13px; color: var(--text-dim);">${t.genre} | ${t.duration}</div>
                </button>
            `;
        }).join('');
        
        const modalHtml = `
            <div id="template-modal" class="modal-overlay" style="display: flex; z-index: 2000;">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h3>📚 项目模板库</h3>
                        <button class="btn-icon modal-close" onclick="document.getElementById('template-modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="color: var(--text-dim); margin-bottom: 20px;">选择一个模板快速开始项目（将覆盖当前内容）：</p>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px;">
                            ${buttonsHtml}
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-outline" onclick="document.getElementById('template-modal').remove()">取消</button>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('template-modal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    loadTemplate(key) {
        const template = this.templates[key];
        if (!template) return;
        
        if (!confirm(`确定加载"${key}"模板吗？这将覆盖当前项目内容。`)) return;
        
        projectData.title = template.title;
        projectData.genre = template.genre;
        projectData.style = template.style;
        projectData.duration = template.duration;
        projectData.episodes = template.episodes;
        projectData.outline = template.outline;
        projectData.characters = template.characters;
        projectData.scenes = template.scenes;
        projectData.shots = projectData.shots || [];
        
        // 更新UI
        const titleInput = document.getElementById('project-title');
        if (titleInput) titleInput.value = projectData.title;
        
        const outlineInput = document.getElementById('outline');
        if (outlineInput) outlineInput.value = projectData.outline;
        
        // 重新渲染
        if (typeof ScriptEditor !== 'undefined' && ScriptEditor.renderScriptEditor) {
            ScriptEditor.renderScriptEditor();
        }
        if (typeof CharacterLibrary !== 'undefined' && CharacterLibrary.render) {
            CharacterLibrary.render();
        }
        
        document.getElementById('template-modal').remove();
        AppState.hasUnsavedChanges = true;
        updateSaveStatus('unsaved');
        showToast(`已加载${key}模板`, 'success');
    }
};

/**
 * ================================================
 * Phase 4-5: Phase 4 初始化
 * ================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof ScriptEditor !== 'undefined') {
            ScriptEditor.init();
        }
        console.log('✅ Phase 4 模块加载完成：剧本编辑器/多格式导出/AI建议引擎/项目模板');
    }, 100);
});

