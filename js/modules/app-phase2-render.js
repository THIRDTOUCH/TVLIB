/**
 * ================================================
 * Phase 2 补充：基础分镜渲染函数
 * 提供分镜列表渲染、加载状态集成
 * ================================================
 */

// 确保全局 projectData 存在
if (typeof window.projectData === 'undefined') {
    window.projectData = {
        outline: '',
        script: '',
        novel: '',
        shots: []
    };
}

// ===================== 分镜列表渲染 =====================
function renderShotList(shots) {
    const container = document.getElementById('shots-list');
    if (!container) return;

    if (!shots || shots.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎬</div>
                <h3>暂无分镜</h3>
                <p>点击上方按钮生成分镜脚本</p>
            </div>
        `;
        return;
    }

    container.innerHTML = shots.map((shot, index) => {
        const shotNumber = index + 1;
        const type = shot.type || shot.shot_type || '未知';
        const scene = shot.scene || '未设置';
        const duration = shot.duration || '';
        const content = shot.content || shot.description || '';
        const dialog = shot.dialog || '';
        const lighting = shot.lighting || '';
        const mood = shot.mood || '';
        const characterPrompt = shot.characterPrompt || '';
        const imagePrompt = shot.imagePrompt || '';
        const videoPrompt = shot.videoPrompt || '';
        const characters = shot.characters || '';
        const cameraMove = shot.cameraMove || shot.camera_movement || '';

        return `
            <div class="shot-card" data-index="${index}" draggable="true">
                <div class="shot-header">
                    <span class="shot-number">#${shotNumber}</span>
                    <span class="shot-duration">${duration}</span>
                </div>
                <div class="shot-info">
                    <div><strong>镜别：</strong>${type}</div>
                    <div><strong>场景：</strong>${scene}</div>
                    ${characters ? `<div><strong>人物：</strong>${characters}</div>` : ''}
                    ${cameraMove ? `<div><strong>运镜：</strong>${cameraMove}</div>` : ''}
                    ${lighting ? `<div><strong>打光：</strong>${lighting}</div>` : ''}
                    ${mood ? `<div><strong>情绪：</strong>${mood}</div>` : ''}
                </div>
                ${content ? `<div class="shot-content"><strong>画面描述：</strong><br>${content}</div>` : ''}
                ${dialog ? `<div class="shot-content"><strong>对白/音效：</strong><br>${dialog}</div>` : ''}
                ${imagePrompt ? `<div class="shot-prompts"><strong>🎨 Image Prompt：</strong><br><code>${imagePrompt}</code></div>` : ''}
                ${videoPrompt ? `<div class="shot-prompts"><strong>🎬 Video Prompt：</strong><br><code>${videoPrompt}</code></div>` : ''}
                ${characterPrompt ? `<div class="shot-prompts"><strong>👤 Character Prompt：</strong><br><code>${characterPrompt}</code></div>` : ''}
                <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <button class="btn btn-sm btn-secondary" onclick="deleteShot(${index})">🗑️ 删除</button>
                    <button class="btn btn-sm btn-secondary" onclick="moveShotUp(${index})" ${index === 0 ? 'disabled' : ''}>⬆️ 上移</button>
                    <button class="btn btn-sm btn-secondary" onclick="moveShotDown(${index})" ${index === shots.length - 1 ? 'disabled' : ''}>⬇️ 下移</button>
                </div>
            </div>
        `;
    }).join('');

    // 启用拖拽
    if (typeof DragSortManager !== 'undefined') {
        DragSortManager.enableDragSort();
    }
}

// ===================== 分镜操作函数 =====================
function deleteShot(index) {
    if (!confirm(`确定删除分镜 #${index + 1}？`)) return;
    
    const oldShots = JSON.parse(JSON.stringify(projectData.shots));
    projectData.shots.splice(index, 1);
    
    // 记录到历史
    if (typeof UndoRedoManager !== 'undefined') {
        UndoRedoManager.record('删除分镜', 'shots', oldShots, JSON.parse(JSON.stringify(projectData.shots)));
    }
    
    renderShotList(projectData.shots);
    AppState.hasUnsavedChanges = true;
    updateSaveStatus('unsaved');
    showToast('分镜已删除', 'success');
}

function moveShotUp(index) {
    if (index <= 0) return;
    
    const oldShots = JSON.parse(JSON.stringify(projectData.shots));
    const temp = projectData.shots[index];
    projectData.shots[index] = projectData.shots[index - 1];
    projectData.shots[index - 1] = temp;
    
    if (typeof UndoRedoManager !== 'undefined') {
        UndoRedoManager.record('移动分镜', 'shots', oldShots, JSON.parse(JSON.stringify(projectData.shots)));
    }
    
    renderShotList(projectData.shots);
    AppState.hasUnsavedChanges = true;
    updateSaveStatus('unsaved');
}

function moveShotDown(index) {
    if (index >= projectData.shots.length - 1) return;
    
    const oldShots = JSON.parse(JSON.stringify(projectData.shots));
    const temp = projectData.shots[index];
    projectData.shots[index] = projectData.shots[index + 1];
    projectData.shots[index + 1] = temp;
    
    if (typeof UndoRedoManager !== 'undefined') {
        UndoRedoManager.record('移动分镜', 'shots', oldShots, JSON.parse(JSON.stringify(projectData.shots)));
    }
    
    renderShotList(projectData.shots);
    AppState.hasUnsavedChanges = true;
    updateSaveStatus('unsaved');
}

// ===================== AI生成按钮封装 =====================
async function generateWithLoading(elementId, generatorFn, message) {
    try {
        // 显示加载状态
        const btn = document.getElementById(elementId);
        const originalText = btn?.textContent;
        
        if (btn) {
            btn.disabled = true;
            btn.textContent = '🤖 ' + message + '...';
        }
        
        // 显示加载骨架屏
        if (typeof LoadingManager !== 'undefined') {
            const resultArea = document.getElementById('shots-container') || 
                              document.getElementById(elementId.replace('btn-', '') + '-result');
            if (resultArea) {
                const resultContent = resultArea.querySelector('.result-content') || resultArea;
                if (resultContent) {
                    LoadingManager.showLoading(resultContent.id, {
                        type: 'skeleton',
                        lines: 8
                    });
                }
            }
        }
        
        // 执行生成函数
        await generatorFn();
        
        // 恢复按钮
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
        
        showToast('生成完成！', 'success');
        
    } catch (error) {
        console.error('生成失败:', error);
        showToast('生成失败: ' + error.message, 'error');
        
        const btn = document.getElementById(elementId);
        if (btn) {
            btn.disabled = false;
        }
    }
}

// ===================== 生成示例分镜（供测试）=====================
function generateSampleShots() {
    const sampleShots = [
        {
            type: '全景',
            scene: '公司走廊',
            characters: '主角',
            cameraMove: '推进',
            duration: '5s',
            content: '主角在空荡的走廊里快步走着，表情焦虑。',
            dialog: '脚步声渐强',
            lighting: '自然光',
            mood: '紧张',
            imagePrompt: 'empty office corridor, man walking hurriedly, tense mood, cinematic lighting',
            videoPrompt: 'slow push-in shot, tense atmosphere, natural light from windows'
        },
        {
            type: '中景',
            scene: '会议室门口',
            characters: '主角',
            cameraMove: '固定',
            duration: '3s',
            content: '主角停在会议室门口，深吸一口气准备推门进去。',
            dialog: '深呼吸声',
            lighting: '室内光',
            mood: '紧张',
            imagePrompt: 'man standing outside conference room, hand on door handle, taking deep breath',
            videoPrompt: 'medium shot, static camera, character preparing to enter room'
        },
        {
            type: '特写',
            scene: '会议室',
            characters: '主角、老板',
            cameraMove: '推近',
            duration: '4s',
            content: '老板从文件中抬起头，眼神犀利地看着主角。',
            dialog: '老板：你知道现在是什么情况吧？',
            lighting: '顶灯',
            mood: '压抑',
            imagePrompt: 'close-up of boss looking up from papers with intense gaze, dramatic lighting',
            videoPrompt: 'close-up push-in shot, dramatic lighting, tense atmosphere'
        },
        {
            type: '近景',
            scene: '会议室',
            characters: '主角',
            cameraMove: '轻微抖动',
            duration: '3s',
            content: '主角咬紧牙关，额头冒汗，双手微微颤抖。',
            dialog: '主角：我...我知道',
            lighting: '侧光',
            mood: '焦虑',
            imagePrompt: 'close-up of nervous man sweating, biting lip, hands slightly shaking',
            videoPrompt: 'slightly shaky handheld shot, close-up on face, sweat visible'
        },
        {
            type: '中景',
            scene: '会议室',
            characters: '老板、主角',
            cameraMove: '平移',
            duration: '5s',
            content: '老板站起来将文件夹甩在桌上，文件散落一地。',
            dialog: '文件散落声、老板重重的一拍',
            lighting: '顶光+侧光',
            mood: '愤怒',
            imagePrompt: 'boss slamming folder on desk, papers flying in air, dramatic shadow',
            videoPrompt: 'medium shot, pan movement, papers flying in slow motion'
        },
        {
            type: '近景',
            scene: '会议室',
            characters: '主角',
            cameraMove: '俯视',
            duration: '3s',
            content: '主角低头看着满地的文件，眼神空洞。',
            dialog: '寂静无声',
            lighting: '上方冷光',
            mood: '绝望',
            imagePrompt: 'overhead shot of man looking at scattered papers on floor, cold lighting',
            videoPrompt: 'high-angle shot looking down, cold blue lighting, slow movement'
        }
    ];

    // 将示例分镜添加到项目中
    const oldShots = JSON.parse(JSON.stringify(projectData.shots));
    projectData.shots = sampleShots;

    // 记录历史
    if (typeof UndoRedoManager !== 'undefined') {
        UndoRedoManager.record('生成示例分镜', 'shots', oldShots, JSON.parse(JSON.stringify(projectData.shots)));
    }

    // 显示容器并渲染
    const container = document.getElementById('shots-container');
    if (container) {
        container.style.display = 'block';
    }

    renderShotList(projectData.shots);
    AppState.updateTabState('storyboard', true);
    AppState.hasUnsavedChanges = true;
    updateSaveStatus('unsaved');
    updateProjectStats();
    
    showToast('已生成 ' + sampleShots.length + ' 个分镜', 'success');
}

// ===================== 生成大纲示例（供测试）=====================
function generateSampleOutline() {
    const outline = `【第一幕】设定与冲突引入
时间：现代都市，白天
地点：大型科技公司，高层办公室
人物：主角（张一鸣，28岁，项目经理）；老板（李总，45岁，公司合伙人）
事件：主角面临重大项目危机，被老板严厉训斥。

【第二幕】问题激化
冲突：主角发现项目数据有严重问题，而这些问题与他之前提出的担忧被忽视直接相关。他需要在有限时间内找出解决方案。
情绪变化：焦虑 → 自责 → 决心。

【第三幕】高潮与结局
发现：主角在看似无解的情况下，从一个被忽视的旧文件中发现了关键线索。
反转：他决定用这个线索冒险一搏。
结局：项目得以挽救，主角获得成长与认可。

【主题思想】
- 坚持原则的重要性
- 困境中的成长机会
- 信任与沟通的价值

【关键场景】
1. 会议室内的训斥
2. 深夜独自加班寻找方案
3. 关键时刻的决断
4. 成功挽回项目`;

    const oldValue = projectData.outline;
    projectData.outline = outline;

    if (typeof UndoRedoManager !== 'undefined') {
        UndoRedoManager.record('生成大纲', 'outline', oldValue, outline);
    }

    // 显示结果
    const resultEl = document.getElementById('outline-result-content');
    const resultArea = document.getElementById('outline-result');
    if (resultEl) resultEl.textContent = outline;
    if (resultArea) resultArea.style.display = 'block';

    AppState.updateTabState('outline', true);
    AppState.hasUnsavedChanges = true;
    updateSaveStatus('unsaved');
    updateProjectStats();
    showToast('大纲生成完成', 'success');
}

// ===================== 故事板渲染简化版 =====================
function renderStoryboard() {
    const viewMode = document.getElementById('board-view-mode')?.value || 'grid';
    const columns = document.getElementById('board-columns')?.value || '3';
    const boardView = document.getElementById('board-view');
    
    if (!boardView) return;

    if (!projectData.shots || projectData.shots.length === 0) {
        boardView.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎬</div>
                <h3>暂无分镜数据</h3>
                <p>请先生成分镜脚本或加载模板</p>
                <button class="btn btn-primary" onclick="switchTab('storyboard')" style="margin-top: 20px;">
                    去生成分镜
                </button>
            </div>
        `;
        return;
    }

    let html = '';
    const shots = projectData.shots;

    if (viewMode === 'grid') {
        // 网格视图
        html = `<div style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 16px;">`;
        shots.forEach((shot, index) => {
            html += generateStoryboardCard(shot, index + 1);
        });
        html += `</div>`;
    } else if (viewMode === 'timeline') {
        // 时间线视图
        html = `<div style="display: flex; flex-direction: column; gap: 16px;">`;
        shots.forEach((shot, index) => {
            html += `
                <div style="display: flex; gap: 16px; align-items: stretch;">
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div style="width: 40px; height: 40px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                            ${index + 1}
                        </div>
                        ${index < shots.length - 1 ? '<div style="width: 2px; flex: 1; background: var(--border); margin: 8px 0;"></div>' : ''}
                    </div>
                    ${generateStoryboardCard(shot, index + 1)}
                </div>
            `;
        });
        html += `</div>`;
    } else if (viewMode === 'carousel') {
        // 轮播视图
        html = `
            <div style="overflow-x: auto; padding-bottom: 16px;">
                <div style="display: flex; gap: 16px; scroll-snap-type: x mandatory;">
                    ${shots.map((shot, index) => `
                        <div style="flex: 0 0 300px; scroll-snap-align: start;">
                            ${generateStoryboardCard(shot, index + 1)}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (viewMode === '4x3') {
        // 4x3 布局
        html = `<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">`;
        shots.forEach((shot, index) => {
            html += generateStoryboardCard(shot, index + 1);
        });
        html += `</div>`;
    }

    boardView.innerHTML = html;
}

function generateStoryboardCard(shot, number) {
    const type = shot.type || shot.shot_type || '未知';
    const scene = shot.scene || '';
    const content = shot.content || shot.description || '';
    const duration = shot.duration || '';
    const mood = shot.mood || '';
    const cameraMove = shot.cameraMove || shot.camera_movement || '';

    return `
        <div style="background: var(--bg-panel-light); border: 1px solid var(--border); border-radius: 8px; padding: 16px; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <strong style="color: var(--primary);">镜头 #${number}</strong>
                <span style="font-size: 12px; color: var(--text-muted);">${duration}</span>
            </div>
            <div style="background: var(--bg); padding: 12px; border-radius: 4px; margin-bottom: 12px; min-height: 60px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 32px; color: var(--text-muted);">
                🎬
            </div>
            <div style="font-size: 13px; line-height: 1.6; color: var(--text);">
                <div style="margin-bottom: 4px;"><strong>${type}</strong> · ${scene}</div>
                ${cameraMove ? `<div style="color: var(--text-dim); font-size: 11px;">运镜: ${cameraMove}</div>` : ''}
                ${mood ? `<div style="color: var(--accent); font-size: 11px; margin-top: 4px;">情绪: ${mood}</div>` : ''}
                ${content ? `<p style="margin-top: 8px; color: var(--text-dim); font-size: 12px;">${content.substring(0, 80)}${content.length > 80 ? '...' : ''}</p>` : ''}
            </div>
        </div>
    `;
}

// ===================== 加载模板到故事板 =====================
function loadTemplateToBoard(templateName) {
    showToast(`加载模板: ${templateName}...`, 'info');
    
    // 模拟加载模板
    setTimeout(() => {
        if (templateName === 'yuji_sword_dance') {
            projectData.shots = [
                { type: '全景', scene: '古代戏台', characters: '虞姬', cameraMove: '推进', duration: '8s', content: '虞姬背对镜头立于舞台中央，身着鱼鳞甲头戴如意冠。', lighting: '舞台聚光灯', mood: '凝重', imagePrompt: 'ancient Chinese opera stage, woman in traditional armor, back view, dramatic spotlight' },
                { type: '中景', scene: '古代戏台', characters: '虞姬', cameraMove: '固定', duration: '6s', content: '右手缓缓探向腰间剑柄，指尖触柄一瞬微停。', lighting: '侧光', mood: '紧张', imagePrompt: 'woman reaching for sword hilt, hand trembling slightly, dramatic side lighting' },
                { type: '特写', scene: '古代戏台', characters: '虞姬', cameraMove: '推镜+跟镜', duration: '8s', content: '剑刃猛然出鞘，金属寒光在聚光灯下划出冷冽圆弧。', lighting: '聚光反射', mood: '紧张', imagePrompt: 'sword being drawn from scabbard, metal glinting in spotlight, close-up motion blur' },
                { type: '中景', scene: '古代戏台', characters: '虞姬', cameraMove: '横摇移镜', duration: '10s', content: '虞姬猛然转身，鱼鳞甲裙摆随动作旋开，正面亮相。', lighting: '顶光', mood: '决绝', imagePrompt: 'woman spinning with sword, armor flowing, determined expression, overhead stage lighting' },
                { type: '近景', scene: '古代戏台', characters: '虞姬', cameraMove: '推镜', duration: '8s', content: '剑尖直指前方，神色决绝，目光如炬直射镜。', lighting: '侧逆光', mood: '悲壮', imagePrompt: 'close-up sword tip pointing at camera, fierce eyes, backlighting creating rim light' },
                { type: '中景', scene: '古代戏台', characters: '虞姬', cameraMove: '环绕', duration: '10s', content: '虞姬挥舞长剑，剑光闪烁，整个身体随剑起舞。', lighting: '多方向光', mood: '激烈', imagePrompt: 'woman performing sword dance, multiple sword reflections, circular camera movement' },
                { type: '近景', scene: '古代戏台', characters: '虞姬', cameraMove: '跟镜', duration: '8s', content: '剑法如行云流水，每一剑都带有深深的情感寄托。', lighting: '动态追光', mood: '悲情', imagePrompt: 'graceful sword movements, emotional expression, dynamic stage lighting' },
                { type: '特写', scene: '古代戏台', characters: '虞姬', cameraMove: '静止', duration: '12s', content: '表情复杂，既有悲壮又有对项羽的深情，眼神含泪。', lighting: '柔和面部光', mood: '悲伤', imagePrompt: 'close-up of face with tears, emotional expression, soft facial lighting' },
                { type: '中景', scene: '古代戏台', characters: '虞姬', cameraMove: '后退', duration: '8s', content: '剑势渐缓，虞姬后退一步，动作慢慢定格。', lighting: '渐暗', mood: '结尾', imagePrompt: 'woman stepping back, movements slowing down, stage lighting dimming' },
                { type: '全景', scene: '古代戏台', characters: '虞姬', cameraMove: '拉镜', duration: '10s', content: '虞姬独自立于舞台中央，剑光垂下，身影孤寂。', lighting: '聚光收窄', mood: '孤寂', imagePrompt: 'wide shot of lone woman on stage with sword, spotlight narrowing, empty theatre' },
                { type: '近景', scene: '古代戏台', characters: '虞姬', cameraMove: '静止', duration: '8s', content: '眼神渐渐放空，仿佛在回想与项羽的点点滴滴。', lighting: '回忆光效', mood: '回忆', imagePrompt: 'close-up of eyes looking into distance, nostalgic expression, soft dream-like lighting' },
                { type: '特写', scene: '古代戏台', characters: '虞姬', cameraMove: '微动', duration: '10s', content: '一滴泪水从眼角滑落，划过脸颊，滴在剑刃上。', lighting: '聚焦面部', mood: '悲伤', imagePrompt: 'teardrop rolling down cheek, close-up on face, dramatic lighting on tear' }
            ];
        } else if (templateName === 'office_daily') {
            projectData.shots = [
                { type: '工位近景', scene: '现代办公室', characters: '员工', cameraMove: '固定', duration: '5s', content: '职员坐在办公桌前，专注地敲打着键盘。', lighting: '室内灯光', mood: '专注', imagePrompt: 'modern office cubicle, person sitting at desk typing on keyboard' },
                { type: '中景', scene: '办公室走廊', characters: '员工', cameraMove: '跟拍', duration: '5s', content: '职员从工位起身，拿起水杯朝茶水间走去。', lighting: '日光灯', mood: '日常', imagePrompt: 'person walking down office corridor with water cup' },
                { type: '近景', scene: '茶水间', characters: '员工', cameraMove: '固定', duration: '5s', content: '职员在茶水间接水，看着窗外放空片刻。', lighting: '自然光+室内灯', mood: '放松', imagePrompt: 'office pantry, person filling water cup, looking out window' },
                { type: '近景', scene: '办公室', characters: '员工', cameraMove: '固定', duration: '6s', content: '职员回到座位，坐下后喝了口水，继续工作。', lighting: '室内灯光', mood: '工作', imagePrompt: 'person sitting down at desk, taking sip of water, resuming work' },
                { type: '中景', scene: '会议室', characters: '多人', cameraMove: '固定', duration: '8s', content: '会议室里几人正在讨论，白板上写着项目计划。', lighting: '室内灯光', mood: '讨论', imagePrompt: 'meeting room discussion, people around table, whiteboard with project plan' },
                { type: '近景', scene: '办公室', characters: '员工', cameraMove: '固定', duration: '4s', content: '职员看着电脑屏幕，露出满意的笑容。', lighting: '屏幕光', mood: '满意', imagePrompt: 'close-up of person smiling at computer screen, satisfied expression' }
            ];
        } else if (templateName === 'office_romance') {
            projectData.shots = [
                { type: '全景跟镜', scene: '公司走廊', characters: '苏晚清', cameraMove: '跟拍', duration: '3s', content: '苏晚清怀抱文件夹快步小跑，神色慌张。', lighting: '自然光', mood: '紧张', imagePrompt: 'woman running in office corridor, holding files, anxious expression' },
                { type: '中景', scene: '走廊转角', characters: '苏晚清、顾霆琛', cameraMove: '固定', duration: '3s', content: '两人相撞，文件脱手飞散空中，两人错愕。', lighting: '混合光', mood: '意外', imagePrompt: 'two people bumping into each other, papers flying in air, surprised looks' },
                { type: '近景推镜', scene: '公司走廊', characters: '苏晚清', cameraMove: '推镜', duration: '3s', content: '苏晚清看着满地文件，慌乱开口道歉。', lighting: '自然光', mood: '尴尬', imagePrompt: 'close-up of woman looking at scattered papers, about to apologize' },
                { type: '特写', scene: '走廊', characters: '两人', cameraMove: '低角度', duration: '3s', content: '双手即将触碰的瞬间，气氛变得暧昧。', lighting: '柔和光', mood: '暧昧', imagePrompt: 'close-up of two hands about to touch, romantic tension' },
                { type: '中景', scene: '走廊', characters: '两人', cameraMove: '固定', duration: '3s', content: '顾霆琛扶住苏晚清，两人近距离对视。', lighting: '柔光', mood: '心动', imagePrompt: 'man holding woman arm, close eye contact, romantic atmosphere' },
                { type: '特写', scene: '走廊', characters: '苏晚清、顾霆琛', cameraMove: '固定', duration: '3s', content: '鼻尖相触，呼吸急促，感情急剧升温。', lighting: '柔和逆光', mood: '浪漫', imagePrompt: 'extreme close-up of faces almost touching, breathing heavy' }
            ];
        } else if (templateName === 'bamboo_duel') {
            projectData.shots = [
                { type: '全景极广角', scene: '竹林', characters: '两位剑客', cameraMove: '固定', duration: '5s', content: '两人对峙，剑指对方，竹叶沙沙作响。', lighting: '晨光', mood: '紧张', imagePrompt: 'two swordsmen facing off in bamboo forest, wide angle shot, morning mist' },
                { type: '中景', scene: '竹林', characters: '白衣剑客', cameraMove: '推进', duration: '3s', content: '白衣剑客压低身形，快速起步冲刺。', lighting: '林间光影', mood: '果断', imagePrompt: 'swordsman in white crouching, starting to charge forward, bamboo forest' },
                { type: '中景仰角', scene: '竹林', characters: '两位剑客', cameraMove: '手持跟拍', duration: '3s', content: '白衣剑客高高跃起，举剑下劈。', lighting: '透过竹叶的光柱', mood: '凌厉', imagePrompt: 'low angle shot of swordsman jumping in air, sword raised' },
                { type: '近景', scene: '竹林', characters: '两位剑客', cameraMove: '手持', duration: '2s', content: '兵刃相撞，火花四溅。', lighting: '动态光影', mood: '激烈', imagePrompt: 'swords clashing, sparks flying, intense close-up action' },
                { type: '中景', scene: '竹林', characters: '白衣剑客', cameraMove: '侧移跟拍', duration: '3s', content: '白衣剑客翻滚闪避，拉开距离。', lighting: '林间移动光', mood: '灵巧', imagePrompt: 'swordsman rolling on ground to dodge, bamboo leaves flying' },
                { type: '低角度', scene: '竹林', characters: '灰衣剑客', cameraMove: '移镜', duration: '3s', content: '灰衣剑客低身疾滑，绕至侧后。', lighting: '阴影', mood: '诡谲', imagePrompt: 'low angle shot of swordsman sliding low to ground around opponent' },
                { type: '中近景', scene: '竹林', characters: '两位剑客', cameraMove: '快推', duration: '3s', content: '灰衣剑客突刺，白衣后仰闪身。', lighting: '快速移动光', mood: '危险', imagePrompt: 'medium shot sword thrust forward, opponent leaning back to dodge' },
                { type: '近景广角', scene: '竹林', characters: '白衣剑客', cameraMove: '快摇', duration: '2s', content: '白衣反身斩竹，竹断飞溅，气势逼人。', lighting: '强光穿透', mood: '凌厉', imagePrompt: 'wide angle shot, sword cutting bamboo, pieces flying outward' },
                { type: '近景手持环绕', scene: '竹林', characters: '两位剑客', cameraMove: '环绕', duration: '5s', content: '双方连斩数合，招式密集，剑影交错。', lighting: '动态环绕光', mood: '激战', imagePrompt: 'rapid sword exchange, circular camera movement, bamboo forest battle' },
                { type: '仰角慢速推镜', scene: '竹林', characters: '两位剑客', cameraMove: '慢速推进', duration: '3s', content: '白衣腾跃，斩向落点。', lighting: '透过竹叶光', mood: '高潮', imagePrompt: 'low angle slow push-in, swordsman leaping high above opponent' },
                { type: '中景快推', scene: '竹林', characters: '两位剑客', cameraMove: '快推', duration: '3s', content: '灰衣上方挑斩，击中白衣左臂。', lighting: '重点照明', mood: '转折', imagePrompt: 'medium shot sword hitting opponent arm, slight blood spray' },
                { type: '全景极广角', scene: '竹林', characters: '灰衣剑客', cameraMove: '拉远', duration: '5s', content: '灰衣收剑站定，胜负已分，风声渐弱。', lighting: '渐亮晨光', mood: '结束', imagePrompt: 'extreme wide shot, lone victorious swordsman standing, morning light through bamboo' }
            ];
        } else {
            showToast('模板不存在', 'warning');
            return;
        }

        // 显示分镜列表
        const container = document.getElementById('shots-container');
        if (container) {
            container.style.display = 'block';
        }

        renderShotList(projectData.shots);
        AppState.updateTabState('storyboard', true);
        AppState.hasUnsavedChanges = true;
        updateSaveStatus('unsaved');
        updateProjectStats();
        
        showToast(`已加载 ${projectData.shots.length} 个分镜`, 'success');
        
        // 如果在故事板页面，也更新故事板
        if (document.getElementById('tab-board').classList.contains('active')) {
            renderStoryboard();
        }
    }, 500);
}

// ===================== 补充：显示模板选择 =====================
function showTemplates() {
    showToast('请在故事板页面选择模板，或使用左侧导航切换', 'info');
}

// ===================== 显示快捷键帮助弹窗 =====================
function showKeyboardShortcuts() {
    ModalSystem.open('shortcuts-modal');
}

// ===================== 项目统计更新（如果之前没有）=====================
if (typeof window.updateProjectStats !== 'function') {
    window.updateProjectStats = function() {
        const outline = (projectData.outline || '').length;
        const script = (projectData.script || '').length;
        const shots = (projectData.shots || []).length;
        
        // 更新底部状态栏
        const wordCountEl = document.getElementById('word-count');
        const shotCountEl = document.getElementById('shot-count-stat');
        if (wordCountEl) wordCountEl.textContent = `字数: ${outline + script}`;
        if (shotCountEl) shotCountEl.textContent = `分镜: ${shots}`;
        
        // 更新属性面板（如果存在）
        const statOutline = document.getElementById('stat-outline');
        const statScript = document.getElementById('stat-script');
        const statShots = document.getElementById('stat-shots');
        if (statOutline) statOutline.textContent = `${outline} 字`;
        if (statScript) statScript.textContent = `${script} 字`;
        if (statShots) statShots.textContent = `${shots} 个`;
    };
}

console.log('✅ Phase 2 补充渲染函数加载完成');
