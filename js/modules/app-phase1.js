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
