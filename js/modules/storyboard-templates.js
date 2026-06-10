/**
 * ================================================
 * 故事板模板系统 - 专业分镜脚本生成引擎
 * ================================================
 * 支持：虞姬舞剑、办公室调度、职场相遇、竹林对决
 * 功能：模板化生成、可视化展示、专业导出
 * ================================================
 */

// ========== 专业分镜脚本模板配置 ==========
const STORYBOARD_TEMPLATES = {

    // 虞姬舞剑 - 古装戏曲风格
    'yuji_sword_dance': {
        id: 'yuji_sword_dance',
        name: '虞姬舞剑·手绘分镜',
        category: '古装戏曲',
        layout: '4x3',
        totalShots: 12,
        style: 'ink_wash', // 水墨手绘风格
        theme: '虞姬在舞台上表演舞剑的完整动作序列',

        // 五色标注配置
        annotationColors: {
            camera: '#e74c3c',      // 红色 - 机位运动
            trajectory: '#3498db',   // 蓝色 - 角色轨迹
            interaction: '#27ae60',  // 绿色 - 互动关系
            effects: '#e67e22',      // 橙色 - 效果/冲击力
            sound: '#9b59b6'         // 紫色 - 音效/标注
        },

        // 镜头序列配置
        shots: [
            { id: 1, type: '全景', scene: '深夜戏曲舞台', duration: '0.8s', mood: '凝重', camera: '推镜', angle: '俯视' },
            { id: 2, type: '中近景', scene: '舞台中央', duration: '0.8s', mood: '紧张', camera: '固定', angle: '侧面' },
            { id: 3, type: '特写', scene: '拔剑瞬间', duration: '0.8s', mood: '爆发', camera: '推镜+跟镜', angle: '侧面' },
            { id: 4, type: '中景', scene: '舞台', duration: '0.8s', mood: '决绝', camera: '横摇移镜', angle: '环绕' },
            { id: 5, type: '近景', scene: '舞台', duration: '1.6s', mood: '专注', camera: '固定', angle: '正面' },
            { id: 6, type: '中近景', scene: '舞台', duration: '0.8s', mood: '激烈', camera: '跟镜', angle: '侧面' },
            { id: 7, type: '特写', scene: '剑穗', duration: '0.8s', mood: '飘逸', camera: '推镜', angle: '特写' },
            { id: 8, type: '中景', scene: '舞台', duration: '0.8s', mood: '旋转', camera: '环绕', angle: '俯拍' },
            { id: 9, type: '远景', scene: '舞台全景', duration: '0.8s', mood: '悲壮', camera: '拉镜', angle: '全景' },
            { id: 10, type: '中景', scene: '舞台', duration: '0.8s', mood: '高潮', camera: '固定', angle: '仰视' },
            { id: 11, type: '特写', scene: '虞姬面部', duration: '0.8s', mood: '决绝', camera: '推镜', angle: '正面' },
            { id: 12, type: '大特写', scene: '虞姬面部', duration: '1.2s', mood: '悲怆', camera: '固定', angle: '特写' }
        ]
    },

    // 办公室日常 - 调度分镜风格
    'office_daily': {
        id: 'office_daily',
        name: '办公室日常·调度分镜',
        category: '职场日常',
        layout: '3x2',
        totalShots: 6,
        style: 'stick_figure', // 火柴人草图风格
        theme: '职员从工位起身去茶水间接咖啡再返回工位的完整动作序列',

        annotationColors: {
            camera: '#e74c3c',
            trajectory: '#3498db',
            interaction: '#27ae60',
            effects: '#e67e22',
            sound: '#9b59b6'
        },

        shots: [
            { id: 1, type: '中近景', scene: '工位', duration: '2s', mood: '平静', camera: '固定', angle: '正面' },
            { id: 2, type: '中景', scene: '工位通道', duration: '3s', mood: '自然', camera: '跟拍', angle: '侧面' },
            { id: 3, type: '中景', scene: '走廊转角', duration: '2.5s', mood: '自然', camera: '摇镜', angle: '侧面' },
            { id: 4, type: '近景', scene: '茶水间', duration: '4s', mood: '平静', camera: '固定', angle: '正面' },
            { id: 5, type: '中景', scene: '走廊', duration: '3s', mood: '自然', camera: '跟拍', angle: '背面' },
            { id: 6, type: '中近景', scene: '工位', duration: '2.5s', mood: '平静', camera: '固定', angle: '正面' }
        ]
    },

    // 职场相遇 - 爱情分镜风格
    'office_romance': {
        id: 'office_romance',
        name: '职场相遇·爱情分镜',
        category: '都市情感',
        layout: '3x2',
        totalShots: 6,
        style: 'pencil_sketch', // 铅笔手绘风格
        theme: '苏晚清与顾霆琛在公司走廊意外相撞的浪漫相遇桥段',

        annotationColors: {
            camera: '#e74c3c',
            trajectory: '#3498db',
            interaction: '#27ae60',
            effects: '#e67e22',
            sound: '#9b59b6'
        },

        shots: [
            { id: 1, type: '全景', scene: '公司走廊', duration: '1.5s', mood: '紧张', camera: '跟镜', angle: '侧面' },
            { id: 2, type: '中景', scene: '走廊转角', duration: '1s', mood: '冲击', camera: '推镜', angle: '正面' },
            { id: 3, type: '近景', scene: '走廊', duration: '1.5s', mood: '慌乱', camera: '推镜', angle: '正面' },
            { id: 4, type: '特写', scene: '手部特写', duration: '1.5s', mood: '暧昧', camera: '固定', angle: '俯视' },
            { id: 5, type: '中景', scene: '走廊', duration: '1.5s', mood: '微妙', camera: '固定', angle: '侧面' },
            { id: 6, type: '特写', scene: '面部特写', duration: '1s', mood: '心动', camera: '固定', angle: '正面' }
        ]
    },

    // 竹林对决 - 动作分镜风格
    'bamboo_duel': {
        id: 'bamboo_duel',
        name: '竹林对决·动作分镜',
        category: '武侠动作',
        layout: '4x3',
        totalShots: 12,
        style: 'action_sketch', // 动作草图风格
        theme: '竹林中两位剑客从对峙到胜负分晓的完整战斗序列',

        annotationColors: {
            camera: '#e74c3c',
            trajectory: '#3498db',
            interaction: '#27ae60',
            effects: '#e67e22',
            sound: '#9b59b6'
        },

        shots: [
            { id: 1, type: '极超广角', scene: '青竹林', duration: '3s', mood: '肃杀', camera: '固定', angle: '俯视' },
            { id: 2, type: '低角度', scene: '竹林', duration: '2s', mood: '蓄势', camera: '推镜', angle: '低角度' },
            { id: 3, type: '仰角', scene: '竹林', duration: '2s', mood: '爆发', camera: '手持跟拍', angle: '仰视' },
            { id: 4, type: '近景', scene: '竹林', duration: '1.5s', mood: '激烈', camera: '手持跟拍', angle: '侧面' },
            { id: 5, type: '中景', scene: '竹林', duration: '2s', mood: '灵动', camera: '侧移跟拍', angle: '侧面' },
            { id: 6, type: '低角度', scene: '竹林', duration: '2s', mood: '反击', camera: '移镜', angle: '低角度' },
            { id: 7, type: '中近景', scene: '竹林', duration: '1.5s', mood: '惊险', camera: '快推', angle: '正面' },
            { id: 8, type: '广角', scene: '竹林', duration: '2s', mood: '震撼', camera: '快摇', angle: '全景' },
            { id: 9, type: '近景', scene: '竹林', duration: '3s', mood: '密集', camera: '环绕', angle: '侧面' },
            { id: 10, type: '仰角', scene: '竹林', duration: '2.5s', mood: '高潮', camera: '慢速推镜', angle: '仰视' },
            { id: 11, type: '中景', scene: '竹林', duration: '1.5s', mood: '终结', camera: '快推', angle: '侧面' },
            { id: 12, type: '极超广角', scene: '竹林', duration: '3s', mood: '落幕', camera: '拉远', angle: '全景' }
        ]
    }
};


// ========== 专业提示词模板库 ==========
const PROMPT_TEMPLATES = {

    // 镜头类型提示词
    shotTypes: {
        '远景': 'wide establishing shot, epic scale, environmental context',
        '全景': 'full shot, complete figure, establishing scene',
        '中景': 'medium shot, waist up, natural framing',
        '中近景': 'medium close up, chest up, balanced composition',
        '近景': 'close up framing, detailed view, shallow depth',
        '特写': 'extreme close up, intimate detail, dramatic focus',
        '大特写': 'macro close up, hyper detailed, immersive',
        '极超广角': 'extreme wide shot, sweeping vista, epic composition'
    },

    // 运镜方式提示词
    cameraMoves: {
        '固定': 'static composition, stable framing, cinematic stillness',
        '推镜': 'slow push in, approaching subject, tension building',
        '拉镜': 'slow pull back, revealing scene, expanding view',
        '摇镜': 'smooth pan, horizontal sweep, revealing',
        '移镜': 'tracking shot, following movement, dynamic',
        '跟镜': 'follow shot, accompanying subject, immersive',
        '环绕': 'orbit shot, circling subject, 360 perspective',
        '手持跟拍': 'handheld tracking, organic feel, documentary style',
        '快推': 'quick push in, rapid approach, urgency',
        '慢速推镜': 'slow deliberate push, building tension',
        '快摇': 'quick pan, sudden reveal, shock effect',
        '侧移跟拍': 'lateral tracking, parallel movement',
        '低角度移镜': 'low angle tracking, power perspective'
    },

    // 情绪氛围提示词
    moods: {
        '凝重': 'somber atmosphere, dramatic tension, low key lighting',
        '紧张': 'tense mood, high stakes, suspenseful',
        '爆发': 'explosive energy, dynamic action, high intensity',
        '决绝': 'determined expression, resolute gaze, powerful',
        '专注': 'intense focus, concentration, sharp details',
        '激烈': 'fierce combat, rapid movement, chaos',
        '飘逸': 'ethereal quality, graceful motion, flowing',
        '旋转': 'spinning motion, centripetal force, dynamic',
        '悲壮': 'melancholic heroism, tragic grandeur',
        '高潮': 'climactic moment, peak intensity, dramatic',
        '悲怆': 'deep sorrow, tearful emotion, heartbreak',
        '心动': 'romantic tension, heartbeat moment, chemistry',
        '慌乱': 'flustered panic, nervous energy, chaos',
        '冲击': 'impact moment, collision, shock',
        '暧昧': 'romantic ambiguity, tension, longing',
        '微妙': 'subtle shift, delicate moment, nuance',
        '肃杀': 'menacing atmosphere, deathly silence',
        '蓄势': 'building tension, coiled spring, anticipation',
        '灵动': 'nimble movement, agile grace, quick',
        '惊险': 'danger close, near miss, heart pounding',
        '震撼': 'jaw dropping, awe inspiring, massive impact',
        '密集': 'rapid fire, dense action, overwhelming',
        '落幕': 'finale, conclusion, serene aftermath'
    },

    // 场景提示词
    scenes: {
        '深夜戏曲舞台': 'ancient chinese opera stage, dramatic spotlight, traditional setting, theatrical atmosphere',
        '青竹林': 'bamboo forest, misty morning, ethereal, traditional chinese landscape',
        '公司走廊': 'modern office corridor, glass walls, corporate environment, professional',
        '茶水间': 'office kitchenette, coffee machine, break room, casual',
        '工位': 'office cubicle, computer desk, workspace, modern office'
    },

    // 风格提示词
    styles: {
        'ink_wash': 'chinese ink wash painting style, brush strokes, traditional aesthetics, minimalist',
        'stick_figure': 'simple stick figure sketch, quick thumbnail, rough draft',
        'pencil_sketch': 'pencil sketch style, graphite shading, clean lines, professional',
        'action_sketch': 'dynamic action sketch, motion lines, energy, comic book style'
    },

    // 打光提示词
    lighting: {
        '顶光': 'top lighting, overhead illumination, studio quality',
        '侧光': 'side lighting, dramatic shadows, chiaroscuro',
        '逆光': 'backlighting, silhouette, rim light',
        '自然光': 'natural daylight, soft shadows, realistic',
        '聚光灯': 'spotlight effect, dramatic focus, theatrical',
        '暖色调': 'warm color temperature, golden hour, cozy',
        '冷色调': 'cool color temperature, blue tones, clinical'
    }
};


// ========== 分镜脚本生成器类 ==========
class StoryboardGenerator {

    constructor(templateId) {
        this.template = STORYBOARD_TEMPLATES[templateId];
        if (!this.template) {
            throw new Error(`模板 ${templateId} 不存在`);
        }
        this.shots = [];
        this.metadata = {
            title: '',
            author: '',
            date: new Date().toISOString().slice(0, 10),
            version: '1.0'
        };
    }

    /**
     * 设置项目元数据
     */
    setMetadata(title, author = '') {
        this.metadata.title = title || this.template.name;
        this.metadata.author = author;
        return this;
    }

    /**
     * 生成完整分镜脚本
     */
    generate(characterData = {}, sceneData = {}) {
        this.shots = [];

        this.template.shots.forEach((shotConfig, index) => {
            const shot = {
                // 基本信息
                id: shotConfig.id,
                type: shotConfig.type,
                scene: sceneData.scene || shotConfig.scene,
                characters: characterData.characters || [],
                duration: shotConfig.duration,
                mood: shotConfig.mood,
                cameraMove: shotConfig.camera,
                angle: shotConfig.angle,

                // 画面描述
                content: this.generateContent(shotConfig, characterData, sceneData),

                // 对白/音效
                dialog: this.generateDialog(shotConfig, characterData),

                // 提示词
                imagePrompt: this.generateImagePrompt(shotConfig, characterData, sceneData),
                videoPrompt: this.generateVideoPrompt(shotConfig),
                characterPrompt: this.generateCharacterPrompt(characterData),

                // 打光
                lighting: this.generateLighting(shotConfig),

                // 标注数据
                annotations: this.generateAnnotations(shotConfig)
            };

            this.shots.push(shot);
        });

        return this.shots;
    }

    /**
     * 生成画面内容描述
     */
    generateContent(shotConfig, characters, sceneData) {
        const templates = {
            1: `${characters.protagonist || '角色'}背对镜头立于${shotConfig.scene}，聚光灯焦点如孤岛`,
            2: `${characters.protagonist || '角色'}背对镜头，右手缓缓探向腰间，动作微停`,
            3: '剑刃猛然出鞘，金属寒光在聚光灯下划出冷冽圆弧',
            4: `${characters.protagonist || '角色'}猛然转身，裙摆随动作旋开，剑锋在空中划出半圆轨迹`,
            5: `${characters.protagonist || '角色'}持剑于胸前，目光凝聚，剑刃划出严酷弧线`,
            6: `${characters.protagonist || '角色'}纵身跃起，剑势旋斩，剑尖擦地`,
            7: '剑穗凌空摇曳，流苏飞荡，残影如弧',
            8: `${characters.protagonist || '角色'}以剑尖为轴，剑穗随身飞旋，衣袂如绽放的花朵`,
            9: `${shotConfig.scene}中剑光如银蛇狂舞，${characters.protagonist || '角色'}的身影在光晕中忽隐忽现`,
            10: `${characters.protagonist || '角色'}纵身跃起，剑势如长虹贯日，剑气纵横`,
            11: `${characters.protagonist || '角色'}立定，剑尖斜指，目光向右前方望去`,
            12: `${characters.protagonist || '角色'}手持剑穗，愁眉不展，眼眶已噙泪`
        };

        return templates[shotConfig.id] || `${shotConfig.scene} - ${shotConfig.mood}氛围`;
    }

    /**
     * 生成对白/音效
     */
    generateDialog(shotConfig, characters) {
        const templates = {
            1: '[寂静中一声板鼓轻敲]',
            2: '[剑鞘轻响，金属与皮革摩擦声]',
            3: '[急促的剑刃出鞘金属摩擦声]',
            4: '[急促的剑穗飞旋声]',
            5: '[剑穗呼啸，剑风破风声]',
            6: '[踏足作响，剑与地面摩擦声]',
            7: '[剑穗飘动声]',
            8: '[衣袂猎猎作响]',
            9: '[剑啸声渐强]',
            10: '[一声长啸]',
            11: '[一切声音渐寂]',
            12: '[霸王！！！声音凄绝颤抖]'
        };

        return templates[shotConfig.id] || '[音效]';
    }

    /**
     * 生成图像提示词
     */
    generateImagePrompt(shotConfig, characters, sceneData) {
        const stylePrompt = PROMPT_TEMPLATES.styles[this.template.style] || '';
        const typePrompt = PROMPT_TEMPLATES.shotTypes[shotConfig.type] || '';
        const moodPrompt = PROMPT_TEMPLATES.moods[shotConfig.mood] || '';
        const scenePrompt = PROMPT_TEMPLATES.scenes[shotConfig.scene] || shotConfig.scene;

        const parts = [
            stylePrompt,
            typePrompt,
            moodPrompt,
            scenePrompt,
            'professional storyboard, detailed illustration, cinematic composition'
        ].filter(p => p).join(', ');

        return parts + ', 8k, masterpiece, high quality';
    }

    /**
     * 生成视频提示词
     */
    generateVideoPrompt(shotConfig) {
        const cameraPrompt = PROMPT_TEMPLATES.cameraMoves[shotConfig.cameraMove] || '';
        const moodPrompt = PROMPT_TEMPLATES.moods[shotConfig.mood] || '';

        return [
            cameraPrompt,
            moodPrompt,
            'cinematic video, smooth motion, professional cinematography, film grain'
        ].filter(p => p).join(', ');
    }

    /**
     * 生成人物提示词
     */
    generateCharacterPrompt(characters) {
        if (!characters.protagonist || !characters.protagonistDesc) {
            return '';
        }

        return `${characters.protagonist}：${characters.protagonistDesc}`;
    }

    /**
     * 生成打光描述
     */
    generateLighting(shotConfig) {
        const mood = shotConfig.mood;
        const lightingMap = {
            '凝重': '顶光 · 聚光灯效果',
            '紧张': '侧光 · 轮廓分明',
            '爆发': '强逆光 · 金属反光',
            '决绝': '正面主光 · 眼神光',
            '专注': '正面柔光 · 清晰',
            '激烈': '底光+主光 · 动感',
            '飘逸': '侧逆光 · 轮廓光',
            '旋转': '全方位光源 · 舞台效果',
            '悲壮': '舞台顶光 · 整体照明',
            '高潮': '逆光+底光 · 剪影效果',
            '悲怆': '柔和顶光 · 泪光效果',
            '平静': '自然光 · 柔和',
            '自然': '环境光 · 真实'
        };

        return lightingMap[mood] || '标准打光';
    }

    /**
     * 生成标注数据
     */
    generateAnnotations(shotConfig) {
        const colors = this.template.annotationColors;

        return {
            camera: {
                label: '机位',
                value: shotConfig.camera,
                color: colors.camera
            },
            trajectory: {
                label: '轨迹',
                value: shotConfig.angle,
                color: colors.trajectory
            },
            interaction: {
                label: '互动',
                value: shotConfig.mood,
                color: colors.interaction
            },
            effects: {
                label: '效果',
                value: shotConfig.duration,
                color: colors.effects
            },
            sound: {
                label: '音效',
                value: shotConfig.id <= 4 ? '动作音效' : shotConfig.id <= 8 ? '环境音' : '高潮音效',
                color: colors.sound
            }
        };
    }

    /**
     * 获取生成的数据
     */
    getData() {
        return {
            template: this.template,
            metadata: this.metadata,
            shots: this.shots,
            totalDuration: this.calculateTotalDuration()
        };
    }

    /**
     * 计算总时长
     */
    calculateTotalDuration() {
        return this.shots.reduce((sum, shot) => {
            const duration = parseFloat(shot.duration);
            return sum + (isNaN(duration) ? 0 : duration);
        }, 0);
    }
}


// ========== 故事板渲染器 ==========
class StoryboardRenderer {

    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`容器 ${containerId} 不存在`);
        }
    }

    /**
     * 渲染故事板
     */
    render(data, options = {}) {
        const {
            layout = data.template.layout, // '3x2', '4x3'
            viewMode = 'grid', // 'grid', 'timeline', 'carousel'
            showAnnotations = true,
            theme = 'dark' // 'dark', 'light'
        } = options;

        this.container.innerHTML = '';

        if (viewMode === 'grid') {
            this.renderGrid(data, layout);
        } else if (viewMode === 'timeline') {
            this.renderTimeline(data);
        } else if (viewMode === 'carousel') {
            this.renderCarousel(data);
        }

        return this;
    }

    /**
     * 渲染网格视图
     */
    renderGrid(data, layout) {
        const [cols, rows] = layout.split('x').map(Number);
        const grid = document.createElement('div');
        grid.className = 'storyboard-grid';
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${cols}, 1fr);
            gap: 16px;
            padding: 20px;
        `;

        data.shots.forEach(shot => {
            const card = this.createShotCard(shot, data.template);
            grid.appendChild(card);
        });

        this.container.appendChild(grid);
    }

    /**
     * 创建单个镜头卡片
     */
    createShotCard(shot, template) {
        const card = document.createElement('div');
        card.className = 'shot-card-storyboard';
        card.style.cssText = `
            background: #1e293b;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #475569;
            transition: all 0.2s ease;
        `;

        // 头部 - 镜头编号
        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3));
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #475569;
        `;
        header.innerHTML = `
            <span style="font-weight: 600; color: #818cf8;">镜头 ${shot.id}</span>
            <span style="font-size: 12px; color: #94a3b8;">${shot.duration}</span>
        `;

        // 预览区 - 模拟画面
        const preview = document.createElement('div');
        preview.style.cssText = `
            height: 120px;
            background: linear-gradient(135deg, #1e293b, #334155);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        `;
        preview.innerHTML = `
            <span style="font-size: 36px; opacity: 0.6;">${this.getShotIcon(shot.type)}</span>
            <div style="position: absolute; bottom: 8px; left: 12px;">
                <span style="background: rgba(99, 102, 241, 0.8); padding: 2px 8px; border-radius: 10px; font-size: 10px; color: white;">${shot.type}</span>
            </div>
            <div style="position: absolute; bottom: 8px; right: 12px;">
                <span style="background: rgba(0,0,0,0.6); padding: 2px 8px; border-radius: 10px; font-size: 10px; color: white;">${shot.cameraMove}</span>
            </div>
        `;

        // 内容区
        const content = document.createElement('div');
        content.style.cssText = 'padding: 16px;';

        // 场景标题
        const sceneTitle = document.createElement('div');
        sceneTitle.style.cssText = 'font-size: 14px; font-weight: 600; color: #e2e8f0; margin-bottom: 8px;';
        sceneTitle.textContent = shot.scene;

        // 画面描述
        const desc = document.createElement('div');
        desc.style.cssText = 'font-size: 12px; color: #94a3b8; line-height: 1.6; margin-bottom: 12px;';
        desc.textContent = shot.content;

        // 元数据标签
        const meta = document.createElement('div');
        meta.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap;';
        const tags = [
            { label: shot.mood, color: '#f59e0b' },
            { label: shot.angle, color: '#6366f1' },
            { label: shot.duration, color: '#10b981' }
        ];
        tags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.style.cssText = `padding: 3px 8px; background: ${tag.color}20; color: ${tag.color}; border-radius: 10px; font-size: 10px;`;
            tagEl.textContent = tag.label;
            meta.appendChild(tagEl);
        });

        // 音效标注
        const dialog = document.createElement('div');
        dialog.style.cssText = 'margin-top: 12px; padding: 8px; background: #0f172a; border-radius: 6px; font-size: 11px; color: #9b59b6;';
        dialog.innerHTML = `<strong>音效：</strong>${shot.dialog}`;

        content.appendChild(sceneTitle);
        content.appendChild(desc);
        content.appendChild(meta);
        content.appendChild(dialog);

        card.appendChild(header);
        card.appendChild(preview);
        card.appendChild(content);

        // 悬停效果
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px)';
            card.style.boxShadow = '0 10px 30px rgba(99, 102, 241, 0.3)';
            card.style.borderColor = '#6366f1';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = 'none';
            card.style.borderColor = '#475569';
        });

        return card;
    }

    /**
     * 获取镜头图标
     */
    getShotIcon(type) {
        const icons = {
            '远景': '🏔️', '全景': '🌄', '中景': '👥', '中近景': '👤',
            '近景': '😊', '特写': '👁️', '大特写': '✨', '极超广角': '🌌',
            '低角度': '⬆️', '仰角': '⬆️', '俯视': '⬇️'
        };
        return icons[type] || '🎬';
    }

    /**
     * 渲染时间线视图
     */
    renderTimeline(data) {
        const timeline = document.createElement('div');
        timeline.className = 'storyboard-timeline';
        timeline.style.cssText = 'position: relative; padding-left: 40px;';

        // 时间线中轴
        const axis = document.createElement('div');
        axis.style.cssText = `
            position: absolute;
            left: 12px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(to bottom, #6366f1, #8b5cf6, #d946ef);
        `;

        timeline.appendChild(axis);

        data.shots.forEach((shot, index) => {
            const item = document.createElement('div');
            item.style.cssText = 'position: relative; margin-bottom: 24px;';

            // 时间线节点
            const node = document.createElement('div');
            node.style.cssText = `
                position: absolute;
                left: -34px;
                top: 20px;
                width: 16px;
                height: 16px;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                border-radius: 50%;
                border: 3px solid #1e293b;
                box-shadow: 0 0 0 2px #6366f1;
            `;

            // 连接卡片
            const card = this.createShotCard(shot, data.template);

            item.appendChild(node);
            item.appendChild(card);
            timeline.appendChild(item);
        });

        this.container.appendChild(timeline);
    }

    /**
     * 渲染轮播视图
     */
    renderCarousel(data) {
        const carousel = document.createElement('div');
        carousel.style.cssText = `
            display: flex;
            gap: 16px;
            overflow-x: auto;
            padding: 20px;
            scroll-snap-type: x mandatory;
        `;

        data.shots.forEach(shot => {
            const card = this.createShotCard(shot, data.template);
            card.style.cssText += 'min-width: 300px; scroll-snap-align: start;';
            carousel.appendChild(card);
        });

        this.container.appendChild(carousel);
    }
}


// ========== 专业导出功能 ==========
const StoryboardExporter = {

    /**
     * 导出为HTML故事板
     */
    exportHTML(data, filename = 'storyboard.html') {
        const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.metadata.title || '故事板'} - 分镜脚本</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, "PingFang SC", sans-serif; background: #0f172a; color: #f1f5f9; padding: 40px; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { font-size: 28px; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .header .meta { color: #94a3b8; margin-top: 8px; font-size: 14px; }
        .grid { display: grid; grid-template-columns: repeat(${data.template.layout === '4x3' ? 4 : 3}, 1fr); gap: 20px; max-width: 1600px; margin: 0 auto; }
        .card { background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #475569; }
        .card-header { background: linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3)); padding: 12px 16px; display: flex; justify-content: space-between; border-bottom: 1px solid #475569; }
        .card-preview { height: 120px; background: linear-gradient(135deg, #1e293b, #334155); display: flex; align-items: center; justify-content: center; font-size: 36px; position: relative; }
        .card-body { padding: 16px; }
        .card-title { font-weight: 600; margin-bottom: 8px; }
        .card-desc { font-size: 12px; color: #94a3b8; line-height: 1.6; margin-bottom: 12px; }
        .tags { display: flex; gap: 6px; flex-wrap: wrap; }
        .tag { padding: 3px 8px; border-radius: 10px; font-size: 10px; }
        .tag-type { background: rgba(99,102,241,0.2); color: #818cf8; }
        .tag-camera { background: rgba(16,185,129,0.2); color: #10b981; }
        .tag-mood { background: rgba(245,158,11,0.2); color: #f59e0b; }
        .dialog { margin-top: 12px; padding: 8px; background: #0f172a; border-radius: 6px; font-size: 11px; color: #9b59b6; }
        .footer { text-align: center; margin-top: 40px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎬 ${data.metadata.title || data.template.name}</h1>
        <div class="meta">
            ${data.template.category} · ${data.template.totalShots}个镜头 · 总时长 ${data.totalDuration.toFixed(1)}秒
        </div>
    </div>
    <div class="grid">
        ${data.shots.map(shot => `
        <div class="card">
            <div class="card-header">
                <span>镜头 ${shot.id}</span>
                <span>${shot.duration}</span>
            </div>
            <div class="card-preview">
                <span>🎬</span>
                <div style="position: absolute; bottom: 8px; left: 12px;">
                    <span class="tag tag-type">${shot.type}</span>
                </div>
            </div>
            <div class="card-body">
                <div class="card-title">${shot.scene}</div>
                <div class="card-desc">${shot.content}</div>
                <div class="tags">
                    <span class="tag tag-camera">${shot.cameraMove}</span>
                    <span class="tag tag-mood">${shot.mood}</span>
                </div>
                <div class="dialog"><strong>音效：</strong>${shot.dialog}</div>
            </div>
        </div>
        `).join('')}
    </div>
    <div class="footer">
        <p>生成时间：${new Date().toLocaleString()}</p>
        <p>由 AI短剧文本制作工作流大师 生成</p>
    </div>
</body>
</html>
        `;

        this.downloadFile(html, filename, 'text/html');
    },

    /**
     * 导出为CSV
     */
    exportCSV(data, filename = 'storyboard.csv') {
        const headers = ['镜头编号', '镜别', '场景', '运镜', '角度', '时长', '情绪', '画面内容', '对白/音效', '打光', 'Image Prompt', 'Video Prompt'];
        const rows = data.shots.map(shot => [
            shot.id,
            shot.type,
            shot.scene,
            shot.cameraMove,
            shot.angle,
            shot.duration,
            shot.mood,
            `"${shot.content.replace(/"/g, '""')}"`,
            `"${shot.dialog.replace(/"/g, '""')}"`,
            shot.lighting,
            `"${shot.imagePrompt.replace(/"/g, '""')}"`,
            `"${shot.videoPrompt.replace(/"/g, '""')}"`
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        this.downloadFile('\uFEFF' + csv, filename, 'text/csv');
    },

    /**
     * 导出为Markdown
     */
    exportMarkdown(data, filename = 'storyboard.md') {
        let md = `# ${data.metadata.title || data.template.name}\n\n`;
        md += `> **模板：** ${data.template.name}\n`;
        md += `> **类型：** ${data.template.category}\n`;
        md += `> **镜头数：** ${data.template.totalShots}个\n`;
        md += `> **总时长：** ${data.totalDuration.toFixed(1)}秒\n`;
        md += `> **生成时间：** ${new Date().toLocaleString()}\n\n`;
        md += `---\n\n`;
        md += `## 分镜表\n\n`;
        md += `| # | 镜别 | 场景 | 运镜 | 时长 | 情绪 | 画面内容 |\n`;
        md += `|---|------|------|------|------|------|----------|\n`;

        data.shots.forEach(shot => {
            md += `| ${shot.id} | ${shot.type} | ${shot.scene} | ${shot.cameraMove} | ${shot.duration} | ${shot.mood} | ${shot.content.substring(0, 30)}... |\n`;
        });

        md += `\n## 详细分镜\n\n`;

        data.shots.forEach(shot => {
            md += `### 镜头 ${shot.id}：${shot.scene}\n\n`;
            md += `- **镜别：** ${shot.type}\n`;
            md += `- **运镜：** ${shot.cameraMove}\n`;
            md += `- **角度：** ${shot.angle}\n`;
            md += `- **时长：** ${shot.duration}\n`;
            md += `- **情绪：** ${shot.mood}\n`;
            md += `- **打光：** ${shot.lighting}\n`;
            md += `- **画面：** ${shot.content}\n`;
            md += `- **音效：** ${shot.dialog}\n`;
            md += `- **Image Prompt：** \`${shot.imagePrompt}\`\n`;
            md += `- **Video Prompt：** \`${shot.videoPrompt}\`\n\n`;
        });

        this.downloadFile(md, filename, 'text/markdown');
    },

    /**
     * 下载文件
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};


// ========== 全局函数 ==========

/**
 * 根据模板生成完整分镜
 */
function generateFromTemplate(templateId, characters = {}, sceneData = {}) {
    try {
        const generator = new StoryboardGenerator(templateId);
        generator.setMetadata(sceneData.title || '');
        const data = generator.generate(characters, sceneData);
        return data;
    } catch (error) {
        console.error('生成失败:', error);
        return null;
    }
}

/**
 * 渲染故事板到指定容器
 */
function renderStoryboardTo(containerId, data, options = {}) {
    try {
        const renderer = new StoryboardRenderer(containerId);
        renderer.render(data, options);
        return true;
    } catch (error) {
        console.error('渲染失败:', error);
        return false;
    }
}

/**
 * 导出故事板
 */
function exportStoryboard(data, format = 'html', filename = 'storyboard') {
    const extensions = { html: 'html', csv: 'csv', md: 'md' };
    const filenameWithExt = `${filename}.${extensions[format] || 'html'}`;

    switch (format) {
        case 'html':
            StoryboardExporter.exportHTML(data, filenameWithExt);
            break;
        case 'csv':
            StoryboardExporter.exportCSV(data, filenameWithExt);
            break;
        case 'md':
            StoryboardExporter.exportMarkdown(data, filenameWithExt);
            break;
        default:
            console.error('不支持的格式:', format);
    }
}

// 导出到全局
window.STORYBOARD_TEMPLATES = STORYBOARD_TEMPLATES;
window.PROMPT_TEMPLATES = PROMPT_TEMPLATES;
window.StoryboardGenerator = StoryboardGenerator;
window.StoryboardRenderer = StoryboardRenderer;
window.StoryboardExporter = StoryboardExporter;
window.generateFromTemplate = generateFromTemplate;
window.renderStoryboardTo = renderStoryboardTo;
window.exportStoryboard = exportStoryboard;

console.log('✅ 故事板模板系统加载完成');
console.log('可用模板:', Object.keys(STORYBOARD_TEMPLATES));
