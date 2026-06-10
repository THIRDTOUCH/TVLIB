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

