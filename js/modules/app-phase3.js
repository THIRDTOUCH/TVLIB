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
