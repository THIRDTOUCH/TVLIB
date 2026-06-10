/**
 * ================================================
 * AI短剧文本制作工作流 - 增强功能模块
 * 对标专业产品：Celtx, Final Draft, WriterDuet, Trelby
 * ================================================
 * 补充功能：
 * 1. 角色管理系统（Character Management）
 * 2. 场景库管理（Scene Library）
 * 3. 专业剧本格式生成
 * 4. 节拍表（Beat Sheet）
 * 5. 分镜脚本高级模板
 * 6. 多格式导出（PDF格式描述、Final Draft格式）
 * ================================================
 */

// ========== 1. 角色管理系统 ==========
const CharacterSystem = {
    /**
     * 创建角色
     */
    createCharacter(options = {}) {
        return {
            id: options.id || this.generateId(),
            name: options.name || '新角色',
            type: options.type || 'main', // main, supporting, minor, antagonist, love
            description: options.description || '',
            age: options.age || '',
            gender: options.gender || '',
            appearance: options.appearance || '',
            personality: options.personality || '',
            background: options.background || '',
            motivation: options.motivation || '',
            conflict: options.conflict || '',
            arc: options.arc || '', // 角色弧光
            traits: options.traits || [],
            dialogStyle: options.dialogStyle || '',
            relationships: options.relationships || [],
            color: options.color || this.getRandomColor(),
            avatar: options.avatar || '',
            customFields: options.customFields || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    },

    /**
     * 角色类型模板
     */
    characterTypes: {
        main: { label: '主角', description: '故事核心人物，经历主要变化' },
        protagonist: { label: '主人公', description: '推动情节发展的核心角色' },
        antagonist: { label: '反派/对手', description: '与主角对立的角色' },
        love: { label: '恋人', description: '情感关系对象' },
        mentor: { label: '导师', description: '给予指导和建议' },
        ally: { label: '盟友', description: '帮助主角的角色' },
        supporting: { label: '配角', description: '次要角色，辅助主线' },
        minor: { label: '小角色', description: '客串或功能性角色' },
        villain: { label: '反派', description: '邪恶角色，反派主角' }
    },

    /**
     * 获取随机颜色
     */
    getRandomColor() {
        const colors = [
            '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
            '#1abc9c', '#e67e22', '#34495e', '#f1c40f', '#d35400'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    /**
     * 生成角色提示词（用于AI绘画）
     */
    generateCharacterPrompt(character) {
        const parts = [];

        if (character.age) parts.push(`${character.age}岁`);
        if (character.gender) {
            const genderMap = { '男': 'young man', '女': 'young woman', '男性': 'man', '女性': 'woman' };
            parts.push(genderMap[character.gender] || character.gender);
        }
        if (character.appearance) parts.push(character.appearance);
        if (character.personality) parts.push(`(${character.personality})`);

        return parts.join(', ');
    },

    generateId() {
        return `char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
};

// ========== 2. 场景库管理 ==========
const _SceneLibrary = {
    /**
     * 标准场景分类（专业软件标准）
     */
    sceneTypes: {
        interior: '内景',
        exterior: '外景',
        both: '内/外景'
    },

    /**
     * 时间分类
     */
    timeOfDay: {
        day: '日',
        night: '夜',
        morning: '晨',
        evening: '昏',
        dawn: '黎明',
        dusk: '黄昏',
        midnight: '深夜',
        continuous: '连续'
    },

    /**
     * 常用场景库
     */
    commonScenes: [
        // 都市情感剧常用场景
        { type: 'interior', name: '办公室', time: 'day', mood: '专业/紧张', commonIn: '职场剧' },
        { type: 'interior', name: '会议室', time: 'day', mood: '紧张/正式', commonIn: '职场剧' },
        { type: 'interior', name: '公寓客厅', time: 'night', mood: '温馨/孤独', commonIn: '都市剧' },
        { type: 'interior', name: '卧室', time: 'night', mood: '私密/疲惫', commonIn: '都市剧' },
        { type: 'interior', name: '咖啡店', time: 'day', mood: '悠闲/轻松', commonIn: '都市剧' },
        { type: 'interior', name: '餐厅', time: 'evening', mood: '浪漫/正式', commonIn: '情感剧' },
        { type: 'exterior', name: '街道', time: 'day', mood: '繁华/忙碌', commonIn: '都市剧' },
        { type: 'exterior', name: '公园', time: 'day', mood: '放松/自然', commonIn: '情感剧' },
        { type: 'exterior', name: '公司大厅', time: 'day', mood: '专业/忙碌', commonIn: '职场剧' },
        { type: 'exterior', name: '地铁站', time: 'day', mood: '拥挤/匆忙', commonIn: '都市剧' },
        { type: 'exterior', name: '医院走廊', time: 'day', mood: '紧张/严肃', commonIn: '职场剧' },
        { type: 'exterior', name: '咖啡馆外', time: 'day', mood: '悠闲/社交', commonIn: '都市剧' },

        // 古装剧常用场景
        { type: 'interior', name: '皇宫大殿', time: 'day', mood: '庄严/宏伟', commonIn: '古装剧' },
        { type: 'interior', name: '书房', time: 'day', mood: '安静/学术', commonIn: '古装剧' },
        { type: 'interior', name: '闺房', time: 'night', mood: '私密/浪漫', commonIn: '古装剧' },
        { type: 'exterior', name: '庭院', time: 'day', mood: '宁静/优美', commonIn: '古装剧' },
        { type: 'exterior', name: '竹林', time: 'day', mood: '幽静/神秘', commonIn: '武侠剧' },
        { type: 'exterior', name: '山林', time: 'day', mood: '自然/冒险', commonIn: '武侠剧' },
        { type: 'exterior', name: '城门口', time: 'day', mood: '繁忙/市井', commonIn: '古装剧' },

        // 悬疑剧常用场景
        { type: 'interior', name: '审讯室', time: 'day', mood: '紧张/压抑', commonIn: '悬疑剧' },
        { type: 'interior', name: '实验室', time: 'day', mood: '科技/神秘', commonIn: '科幻剧' },
        { type: 'interior', name: '地下室', time: 'night', mood: '黑暗/惊悚', commonIn: '悬疑剧' },
        { type: 'exterior', name: '废弃工厂', time: 'night', mood: '荒凉/危险', commonIn: '悬疑剧' },
        { type: 'exterior', name: '雨夜街道', time: 'night', mood: '阴暗/紧张', commonIn: '悬疑剧' }
    ],

    /**
     * 搜索场景
     */
    searchScenes(keyword, category) {
        return this.commonScenes.filter(scene => {
            const matchKeyword = !keyword ||
                scene.name.includes(keyword) ||
                scene.mood.includes(keyword);
            const matchCategory = !category || scene.commonIn.includes(category);
            return matchKeyword && matchCategory;
        });
    },

    /**
     * 创建场景条目
     */
    createScene(options = {}) {
        return {
            id: `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: options.type || 'interior',
            name: options.name || '新场景',
            location: options.location || '',
            time: options.time || 'day',
            mood: options.mood || '',
            lighting: options.lighting || '',
            description: options.description || '',
            commonIn: options.commonIn || '通用',
            imagePrompt: options.imagePrompt || '',
            tags: options.tags || [],
            props: options.props || [],
            characters: options.characters || [],
            customFields: options.customFields || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
};

// ========== 3. 专业剧本格式系统 ==========
const ScriptFormatter = {
    /**
     * 标准剧本格式 (Standard Script Format)
     * 参考：Final Draft, Celtx 行业标准
     */
    formats: {
        standard: {
            name: '标准格式',
            description: '好莱坞/中国行业标准格式',
            fontSize: 12,
            lineSpacing: 1.5,
            margins: { top: 1, bottom: 1, left: 1.5, right: 1 },
            elements: ['scene_heading', 'action', 'character', 'dialog', 'parenthetical', 'transition']
        },
        tvFormat: {
            name: '电视剧格式',
            description: '中国电视剧常用格式',
            fontSize: 12,
            lineSpacing: 1.5,
            margins: { top: 1, bottom: 1, left: 1.5, right: 1 },
            elements: ['scene_heading', 'action', 'character', 'dialog', 'parenthetical']
        },
        manuscript: {
            name: '文学剧本',
            description: '文学性强的剧本格式',
            fontSize: 12,
            lineSpacing: 2,
            margins: { top: 2, bottom: 2, left: 1, right: 1 },
            elements: ['scene_heading', 'action', 'character', 'dialog']
        },
        minimal: {
            name: '精简格式',
            description: '快速拍摄用的精简格式',
            fontSize: 11,
            lineSpacing: 1,
            margins: { top: 1, bottom: 1, left: 1, right: 1 },
            elements: ['scene_heading', 'character', 'dialog']
        }
    },

    /**
     * 剧本元素类型
     */
    elements: {
        scene_heading: {
            label: '场景标题',
            prefix: '',
            uppercase: true,
            align: 'left',
            indent: 0,
            bold: true
        },
        action: {
            label: '动作描述',
            prefix: '',
            uppercase: false,
            align: 'left',
            indent: 0,
            bold: false
        },
        character: {
            label: '角色名',
            prefix: '',
            uppercase: true,
            align: 'center',
            indent: 20,
            bold: true
        },
        dialog: {
            label: '对白',
            prefix: '',
            uppercase: false,
            align: 'left',
            indent: 10,
            bold: false
        },
        parenthetical: {
            label: '括号提示',
            prefix: '(',
            suffix: ')',
            uppercase: false,
            align: 'center',
            indent: 15,
            italic: true
        },
        transition: {
            label: '转场',
            prefix: '',
            uppercase: true,
            align: 'right',
            indent: 0,
            bold: true
        }
    },

    /**
     * 格式化剧本内容
     */
    formatScript(scriptData, format = 'standard') {
        const config = this.formats[format] || this.formats.standard;
        let output = '';

        scriptData.forEach(block => {
            const element = this.elements[block.type];
            if (!element) return;

            let text = block.text || block.content || '';
            if (element.uppercase) text = text.toUpperCase();
            if (element.prefix) text = element.prefix + text;
            if (element.suffix) text = text + element.suffix;

            output += text + '\n';
        });

        return output;
    },

    /**
     * 生成标准场景标题
     */
    generateSceneHeading(type, location, time) {
        const typeMap = { interior: '内', exterior: '外', both: '内/外' };
        return `${typeMap[type] || '内'} ${location} - ${time}`;
    }
};

// ========== 4. 节拍表系统（Beat Sheet）==========
const BeatSheetSystem = {
    /**
     * 经典三幕结构（Three-Act Structure）
     */
    threeActStructure: {
        name: '三幕结构',
        description: '经典的三幕剧本结构',
        acts: [
            {
                name: '第一幕：开端',
                duration: '25%',
                beats: [
                    { key: 'opening_image', name: '开场画面', description: '建立故事基调与视觉风格' },
                    { key: 'theme_stated', name: '主题呈现', description: '暗示故事核心主题' },
                    { key: 'setup', name: '建置', description: '介绍主角、世界、现状' },
                    { key: 'catalyst', name: '催化剂/激励事件', description: '打破主角生活平衡的事件' },
                    { key: 'debate', name: '争论/犹豫', description: '主角面临选择的挣扎' }
                ]
            },
            {
                name: '第二幕：对抗',
                duration: '50%',
                beats: [
                    { key: 'break_into_two', name: '进入第二幕', description: '主角做出选择，进入新世界' },
                    { key: 'b_story', name: 'B故事线', description: '次要情节，常是情感线' },
                    { key: 'fun_and_games', name: '乐趣与游戏', description: '故事的精彩冒险部分' },
                    { key: 'midpoint', name: '中点', description: '故事性质发生变化的关键点' },
                    { key: 'bad_guys_close_in', name: '坏蛋逼近', description: '压力逐渐增大' },
                    { key: 'all_is_lost', name: '一无所有', description: '表面看起来失败' },
                    { key: 'dark_night_of_soul', name: '灵魂黑夜', description: '主角的最低谷' }
                ]
            },
            {
                name: '第三幕：结局',
                duration: '25%',
                beats: [
                    { key: 'break_into_three', name: '进入第三幕', description: '找到新的解决方案' },
                    { key: 'finale', name: '高潮', description: '最终对决或解决' },
                    { key: 'final_image', name: '终场画面', description: '与开场画面形成对比' }
                ]
            }
        ]
    },

    /**
     * Save The Cat 节拍表（布莱克·斯奈德）
     */
    saveTheCatStructure: {
        name: 'Save the Cat',
        description: '布莱克·斯奈德的15节拍结构',
        duration: '110页/分钟',
        beats: [
            { key: 'opening_image', name: '开场画面', page: 1, percent: 1 },
            { key: 'theme_stated', name: '主题呈现', page: 5, percent: 5 },
            { key: 'setup', name: '建置', page: 10, percent: 10 },
            { key: 'catalyst', name: '催化剂', page: 12, percent: 12 },
            { key: 'debate', name: '争论', page: 20, percent: 20 },
            { key: 'break_into_two', name: '进入第二幕', page: 25, percent: 25 },
            { key: 'b_story', name: 'B故事', page: 30, percent: 30 },
            { key: 'fun_and_games', name: '乐趣与游戏', page: 37, percent: 37 },
            { key: 'midpoint', name: '中点', page: 55, percent: 50 },
            { key: 'bad_guys_close_in', name: '坏蛋逼近', page: 65, percent: 65 },
            { key: 'all_is_lost', name: '一无所有', page: 75, percent: 75 },
            { key: 'dark_night_of_soul', name: '灵魂黑夜', page: 80, percent: 80 },
            { key: 'break_into_three', name: '进入第三幕', page: 85, percent: 85 },
            { key: 'finale', name: '高潮', page: 100, percent: 90 },
            { key: 'final_image', name: '终场画面', page: 110, percent: 100 }
        ]
    },

    /**
     * 四幕结构（用于电视剧）
     */
    fourActStructure: {
        name: '四幕结构',
        description: '电视剧/长篇故事常用',
        acts: [
            { name: '第一幕', duration: '20%', description: '悬念设置/人物介绍' },
            { name: '第二幕', duration: '30%', description: '冲突升级/复杂情节' },
            { name: '第三幕', duration: '30%', description: '关键转折/高潮' },
            { name: '第四幕', duration: '20%', description: '解决/结局' }
        ]
    },

    /**
     * 生成结构大纲
     */
    generateStructureOutline(storyType = 'drama') {
        const structure = this.threeActStructure;
        return {
            type: structure.name,
            description: structure.description,
            acts: structure.acts.map((act, index) => ({
                ...act,
                scenes: [],
                notes: ''
            })),
            totalEstimatedPages: 0,
            createdFor: storyType,
            createdAt: new Date().toISOString()
        };
    }
};

// ========== 5. 分镜脚本高级模板系统 ==========
const AdvancedShotTemplates = {
    /**
     * 镜头类型库（按专业术语）
     */
    shotTypes: {
        // 按镜头远近分类
        extreme_long: { name: '远景', label: 'ELS', chinese: '大远景' },
        long: { name: '全景', label: 'LS', chinese: '全景' },
        medium_long: { name: '中远景', label: 'MLS', chinese: '中远景' },
        medium: { name: '中景', label: 'MS', chinese: '中景' },
        medium_close: { name: '中近景', label: 'MCS', chinese: '中近景' },
        close_up: { name: '近景', label: 'CU', chinese: '近景' },
        extreme_close: { name: '特写', label: 'ECU', chinese: '大特写' },
        // 按镜头角度分类
        eye_level: { name: '平视', label: 'EYE', chinese: '平视' },
        low_angle: { name: '低角度', label: 'LOW', chinese: '仰视' },
        high_angle: { name: '高角度', label: 'HIGH', chinese: '俯视' },
        birds_eye: { name: '鸟瞰', label: 'BE', chinese: '鸟瞰' },
        worms_eye: { name: '虫视', label: 'WE', chinese: '虫视' },
        dutch: { name: '斜角', label: 'DUTCH', chinese: '斜角' },
        over_shoulder: { name: '过肩', label: 'OTS', chinese: '过肩镜头' },
        pov: { name: '主观镜头', label: 'POV', chinese: '主观视角' },
        two_shot: { name: '双人镜头', label: '2S', chinese: '双人镜头' },
        group: { name: '群像', label: 'GRP', chinese: '群像镜头' },
        insert: { name: '插入镜头', label: 'INS', chinese: '插入镜头' },
        reaction: { name: '反应镜头', label: 'RXN', chinese: '反应镜头' }
    },

    /**
     * 运镜方式库
     */
    cameraMoves: {
        static: { name: '固定', label: 'S', description: '静止不动的镜头' },
        pan_left: { name: '向左摇', label: 'PL', description: '镜头向左水平摇动' },
        pan_right: { name: '向右摇', label: 'PR', description: '镜头向右水平摇动' },
        tilt_up: { name: '向上摇', label: 'TU', description: '镜头向上垂直摇动' },
        tilt_down: { name: '向下摇', label: 'TD', description: '镜头向下垂直摇动' },
        dolly_in: { name: '推进', label: 'DI', description: '摄像机向被摄体移动' },
        dolly_out: { name: '拉出', label: 'DO', description: '摄像机远离被摄体' },
        zoom_in: { name: '推焦', label: 'ZI', description: '镜头焦距变短，画面变大' },
        zoom_out: { name: '拉焦', label: 'ZO', description: '镜头焦距变长，画面变小' },
        follow: { name: '跟拍', label: 'F', description: '跟随移动的被摄体' },
        tracking: { name: '轨道', label: 'T', description: '沿轨道水平移动' },
        crane_up: { name: '升降上升', label: 'CU', description: '摄像机上升' },
        crane_down: { name: '升降下降', label: 'CD', description: '摄像机下降' },
        handheld: { name: '手持', label: 'HH', description: '手持拍摄，有轻微抖动' },
        steadicam: { name: '稳定器', label: 'ST', description: '使用稳定器的流畅移动' },
        drone: { name: '无人机', label: 'DRN', description: '无人机航拍' },
        arc: { name: '环形', label: 'ARC', description: '围绕主体做弧形运动' },
        whip_pan: { name: '急摇', label: 'WP', description: '快速摇动产生动态模糊' },
        rack_focus: { name: '焦点转换', label: 'RF', description: '改变焦点从前景到背景' }
    },

    /**
     * 打光方式库
     */
    lightingStyles: {
        natural: { name: '自然光', description: '利用自然光源，真实感强' },
        three_point: { name: '三点打光', description: '标准电影打光：主光、辅光、轮廓光' },
        high_key: { name: '高调光', description: '明亮均匀，低反差，常用于喜剧/浪漫' },
        low_key: { name: '低调光', description: '暗调高反差，常用于悬疑/恐怖' },
        chiaroscuro: { name: '明暗对比', description: '强烈的明暗对比，戏剧感强' },
        backlight: { name: '逆光', description: '从背后打光，产生轮廓光' },
        rim_light: { name: '轮廓光', description: '突出主体轮廓的光' },
        practical: { name: '道具光', description: '利用场景中的实际光源（灯、窗等）' },
        candle: { name: '烛光', description: '温暖柔和的烛光效果' },
        neon: { name: '霓虹', description: '都市夜景的霓虹灯光' },
        moonlight: { name: '月光', description: '清冷的月光效果' },
        sunset: { name: '日落', description: '金色黄昏光效' },
        silhouette: { name: '剪影', description: '主体呈剪影状态' },
        diffused: { name: '柔光', description: '柔和散射的光线' },
        harsh: { name: '硬光', description: '强烈直射的光线' }
    },

    /**
     * 音效库分类
     */
    soundEffects: {
        ambient: ['雨声', '风声', '交通噪音', '人群嘈杂声', '鸟鸣', '海浪声'],
        action: ['脚步声', '敲门声', '电话铃声', '门铃声', '掌声', '欢呼声'],
        emotional: ['心跳声', '呼吸声', '哭泣声', '叹息声'],
        tension: ['紧张的音乐', '玻璃破碎声', '尖叫声', '雷声'],
        environmental: ['开门声', '汽车引擎声', '打字声', '写字声', '翻页声']
    },

    /**
     * 生成提示词（专业级）
     */
    generatePrompt(shot, characterName = '') {
        const parts = [];

        // 场景类型
        const typeStyle = {
            extreme_long: 'wide shot, panoramic view',
            long: 'full shot, wide angle',
            medium_long: 'medium wide shot',
            medium: 'medium shot',
            medium_close: 'medium close-up',
            close_up: 'close-up shot',
            extreme_close: 'extreme close-up, detailed'
        };

        if (typeStyle[shot.cameraType]) {
            parts.push(typeStyle[shot.cameraType]);
        }

        // 角度
        const angleStyle = {
            low_angle: 'low angle shot',
            high_angle: 'high angle shot',
            birds_eye: 'bird\'s eye view',
            dutch: 'dutch angle, tilted composition',
            over_shoulder: 'over the shoulder shot',
            pov: 'POV shot, first person view',
            two_shot: 'two shot, two characters',
            reaction: 'reaction shot, close-up on face'
        };

        if (angleStyle[shot.angle]) {
            parts.push(angleStyle[shot.angle]);
        }

        // 运镜
        const moveStyle = {
            dolly_in: 'dolly in movement',
            dolly_out: 'dolly out movement',
            zoom_in: 'zoom in, cinematic zoom',
            zoom_out: 'zoom out, revealing scene',
            handheld: 'handheld camera, slight shake',
            tracking: 'tracking shot, smooth movement',
            steadicam: 'steadicam shot, smooth and fluid',
            drone: 'aerial drone shot',
            follow: 'following shot',
            arc: 'circular arc movement',
            whip_pan: 'whip pan, motion blur'
        };

        if (moveStyle[shot.cameraMove]) {
            parts.push(moveStyle[shot.cameraMove]);
        }

        // 打光
        const lightingStyle = {
            natural: 'natural lighting, realistic',
            three_point: 'three-point lighting setup',
            high_key: 'high-key lighting, bright and even',
            low_key: 'low-key lighting, moody and dramatic',
            chiaroscuro: 'chiaroscuro lighting, strong contrasts',
            backlight: 'backlit, rim light effect',
            candle: 'candlelight, warm and intimate',
            neon: 'neon lighting, vibrant and colorful',
            moonlight: 'moonlight, cool and blue',
            sunset: 'golden hour, warm sunset lighting',
            silhouette: 'silhouette, dramatic shadows',
            diffused: 'soft diffused light',
            harsh: 'harsh direct light'
        };

        if (lightingStyle[shot.lighting]) {
            parts.push(lightingStyle[shot.lighting]);
        }

        // 情绪
        const moodStyle = {
            happy: 'warm and cheerful atmosphere',
            sad: 'somber and melancholic mood',
            tense: 'tension-filled, suspenseful',
            romantic: 'romantic and intimate',
            mysterious: 'mysterious and atmospheric',
            dramatic: 'dramatic and powerful',
            peaceful: 'peaceful and serene',
            energetic: 'energetic and dynamic'
        };

        if (moodStyle[shot.mood]) {
            parts.push(moodStyle[shot.mood]);
        }

        // 添加场景描述
        if (shot.scene) parts.push(shot.scene);
        if (shot.content) parts.push(shot.content);
        if (characterName) parts.push(`${characterName} in the scene`);

        // 画面质量提示词
        parts.push('cinematic, professional film still, high quality, sharp focus, detailed');

        // 风格
        if (shot.visualStyle) {
            const styleMap = {
                realistic: 'photorealistic, hyperrealistic',
                cinematic: 'cinematic style, film grain, 35mm',
                anime: 'anime style, illustration',
                cartoon: 'cartoon style',
                artistic: 'artistic, painterly style',
                noir: 'film noir style, black and white',
                documentary: 'documentary style, candid',
                fantasy: 'fantasy style, magical elements',
                gritty: 'gritty, raw, documentary feel'
            };
            if (styleMap[shot.visualStyle]) parts.push(styleMap[shot.visualStyle]);
        }

        return parts.join(', ');
    },

    /**
     * 生成视频提示词（用于视频模型）
     */
    generateVideoPrompt(shot, characterName = '') {
        const basePrompt = this.generatePrompt(shot, characterName);
        const videoParts = [];

        // 动态描述
        const movementDesc = {
            dolly_in: 'camera slowly dollying in, revealing subject',
            dolly_out: 'camera dollying out, revealing the wider scene',
            zoom_in: 'slow cinematic zoom in',
            zoom_out: 'smooth zoom out',
            handheld: 'handheld camera, organic movement',
            tracking: 'smooth tracking shot following the action',
            steadicam: 'smooth steadicam movement',
            drone: 'aerial drone movement, cinematic',
            follow: 'camera follows the subject',
            whip_pan: 'fast whip pan, motion blur effect',
            static: 'static locked-off shot'
        };

        if (movementDesc[shot.cameraMove]) {
            videoParts.push(movementDesc[shot.cameraMove]);
        }

        // 时长提示
        if (shot.duration) {
            videoParts.push(`${shot.duration} duration`);
        }

        // 视频质量提示词
        videoParts.push('high quality video, 4K, 60fps, cinematic motion, professional film');

        return basePrompt + ', ' + videoParts.join(', ');
    },

    /**
     * 高级分镜模板（基于行业标准）
     */
    advancedTemplates: {
        emotional_conversation: {
            name: '情感对话',
            description: '两人对话的标准镜头语言',
            shots: [
                { cameraType: 'medium', angle: 'eye_level', move: 'static', characters: 2, duration: 8 },
                { cameraType: 'over_shoulder', angle: 'eye_level', move: 'static', characters: 1, duration: 5 },
                { cameraType: 'close_up', angle: 'eye_level', move: 'static', characters: 1, duration: 4 },
                { cameraType: 'medium', angle: 'eye_level', move: 'static', characters: 2, duration: 6 }
            ]
        },
        dramatic_reveal: {
            name: '戏剧性揭示',
            description: '从隐藏到揭示的镜头序列',
            shots: [
                { cameraType: 'medium_close', angle: 'eye_level', move: 'static', characters: 1, duration: 5 },
                { cameraType: 'reaction', angle: 'eye_level', move: 'static', characters: 1, duration: 3 },
                { cameraType: 'extreme_close', angle: 'eye_level', move: 'zoom_in', characters: 1, duration: 4 },
                { cameraType: 'medium', angle: 'eye_level', move: 'static', characters: 2, duration: 8 }
            ]
        },
        action_sequence: {
            name: '动作序列',
            description: '快速动作场景的标准镜头语言',
            shots: [
                { cameraType: 'medium', angle: 'eye_level', move: 'handheld', characters: 2, duration: 6 },
                { cameraType: 'close_up', angle: 'low_angle', move: 'static', characters: 1, duration: 3 },
                { cameraType: 'extreme_close', angle: 'eye_level', move: 'static', characters: 1, duration: 2 },
                { cameraType: 'medium_long', angle: 'eye_level', move: 'follow', characters: 2, duration: 8 }
            ]
        },
        romantic_moment: {
            name: '浪漫时刻',
            description: '亲密场景的镜头语言',
            shots: [
                { cameraType: 'medium', angle: 'eye_level', move: 'dolly_in', characters: 2, duration: 6 },
                { cameraType: 'close_up', angle: 'eye_level', move: 'static', characters: 1, duration: 4 },
                { cameraType: 'extreme_close', angle: 'eye_level', move: 'static', characters: 1, duration: 3 },
                { cameraType: 'two_shot', angle: 'eye_level', move: 'static', characters: 2, duration: 8 }
            ]
        }
    }
};

// ========== 6. 导出系统增强 ==========
const ExportSystem = {
    /**
     * 导出为标准剧本格式（TXT）
     */
    exportAsStandardScript(project, shots, characters) {
        const lines = [];

        // 标题页
        lines.push('=' .repeat(60));
        lines.push(project.title || '未命名项目');
        lines.push('=' .repeat(60));
        lines.push('');

        if (project.description) {
            lines.push(project.description);
            lines.push('');
        }
        lines.push(`类型: ${project.genre || '未分类'}`);
        lines.push(`风格: ${project.style || '未设定'}`);
        lines.push(`时长: ${project.duration || '未设定'}`);
        lines.push(`集数: ${project.episodes || '未设定'}`);
        lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
        lines.push('');
        lines.push('=' .repeat(60));
        lines.push('');
        lines.push('【剧本内容】');
        lines.push('=' .repeat(60));
        lines.push('');

        // 添加剧本主体
        if (project.script) {
            lines.push(project.script);
        }

        // 分镜脚本
        if (shots && shots.length > 0) {
            lines.push('');
            lines.push('=' .repeat(60));
            lines.push('【分镜脚本】');
            lines.push('=' .repeat(60));
            lines.push('');

            shots.forEach((shot, index) => {
                lines.push(`镜头 ${index + 1}: ${shot.scene || '未命名场景'}`);
                lines.push(`镜别: ${shot.type || '未设定'}`);
                lines.push(`人物: ${shot.characters || '未设定'}`);
                lines.push(`运镜: ${shot.camera || shot.cameraMove || '固定'}`);
                lines.push(`时长: ${shot.duration || '未设定'}`);
                lines.push(`画面: ${shot.content || ''}`);
                lines.push(`对白/音效: ${shot.dialog || ''}`);
                lines.push(`打光: ${shot.lighting || '未设定'}`);
                if (shot.imagePrompt) {
                    lines.push(`提示词: ${shot.imagePrompt}`);
                }
                lines.push('');
            });
        }

        // 角色信息
        if (characters && characters.length > 0) {
            lines.push('');
            lines.push('=' .repeat(60));
            lines.push('【角色介绍】');
            lines.push('=' .repeat(60));
            lines.push('');

            characters.forEach(char => {
                lines.push(`● ${char.name || '未命名角色'}`);
                if (char.type) lines.push(`  类型: ${CharacterSystem.characterTypes[char.type]?.label || char.type}`);
                if (char.description) lines.push(`  描述: ${char.description}`);
                if (char.appearance) lines.push(`  外形: ${char.appearance}`);
                if (char.personality) lines.push(`  性格: ${char.personality}`);
                if (char.background) lines.push(`  背景: ${char.background}`);
                lines.push('');
            });
        }

        return lines.join('\n');
    },

    /**
     * 导出为 CSV（分镜表）
     */
    exportAsCSV(shots, includePrompts = true) {
        const headers = [
            '编号', '镜别', '场景', '人物', '运镜', '时长',
            '画面内容', '对白/音效', '打光', '情绪基调'
        ];

        if (includePrompts) {
            headers.push('图片提示词', '视频提示词');
        }

        const rows = [headers.join(',')];

        shots.forEach((shot, index) => {
            const row = [
                index + 1,
                this.escapeCSV(shot.type || ''),
                this.escapeCSV(shot.scene || ''),
                this.escapeCSV(shot.characters || ''),
                this.escapeCSV(shot.camera || shot.cameraMove || ''),
                this.escapeCSV(shot.duration || ''),
                this.escapeCSV(shot.content || ''),
                this.escapeCSV(shot.dialog || ''),
                this.escapeCSV(shot.lighting || ''),
                this.escapeCSV(shot.mood || '')
            ];

            if (includePrompts) {
                row.push(this.escapeCSV(shot.imagePrompt || ''));
                row.push(this.escapeCSV(shot.videoPrompt || ''));
            }

            rows.push(row.join(','));
        });

        return rows.join('\n');
    },

    escapeCSV(text) {
        if (!text) return '';
        const escaped = String(text).replace(/"/g, '""');
        if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
            return `"${escaped}"`;
        }
        return escaped;
    },

    /**
     * 导出为 HTML 故事板
     */
    exportAsStoryboardHTML(project, shots, characters) {
        const shotsHTML = shots.map((shot, index) => `
    <div class="shot-card">
      <div class="shot-header">
        <h3>镜头 ${index + 1}: ${shot.scene || '未命名场景'}</h3>
        <span class="shot-duration">${shot.duration || '--'}</span>
      </div>
      <div class="shot-info">
        <div class="shot-field"><span>镜别:</span> ${shot.type || '--'}</div>
        <div class="shot-field"><span>运镜:</span> ${shot.camera || shot.cameraMove || '--'}</div>
        <div class="shot-field"><span>人物:</span> ${shot.characters || '--'}</div>
        <div class="shot-field"><span>打光:</span> ${shot.lighting || '--'}</div>
      </div>
      <div class="shot-content">
        <p><strong>画面:</strong> ${shot.content || '无描述'}</p>
        <p><strong>对白/音效:</strong> ${shot.dialog || '无'}</p>
      </div>
      ${shot.imagePrompt ? `
      <div class="shot-prompt">
        <strong>AI 绘图提示词:</strong>
        <p style="background: #f5f5f5; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px;">
          ${shot.imagePrompt}
        </p>
      </div>` : ''}
    </div>
  `).join('');

        const charactersHTML = characters && characters.length > 0 ? `
    <section class="characters-section">
      <h2>角色介绍</h2>
      <div class="characters-grid">
        ${characters.map(char => `
        <div class="character-card">
          <h3>${char.name || '未命名角色'}</h3>
          <p><strong>类型:</strong> ${CharacterSystem.characterTypes[char.type]?.label || char.type || '--'}</p>
          <p><strong>描述:</strong> ${char.description || '--'}</p>
          ${char.appearance ? `<p><strong>外形:</strong> ${char.appearance}</p>` : ''}
          ${char.personality ? `<p><strong>性格:</strong> ${char.personality}</p>` : ''}
        </div>
      `).join('')}
      </div>
    </section>
  ` : '';

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${project.title || '未命名项目'}</title>
  <style>
    body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #fafafa; color: #333; }
    h1 { text-align: center; color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 20px; }
    h2 { color: #3498db; margin-top: 40px; border-left: 4px solid #3498db; padding-left: 12px; }
    .project-info { background: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .storyboard-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; margin-top: 20px; }
    .shot-card { background: white; border-radius: 8px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 1px solid #ddd; }
    .shot-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 8px; margin-bottom: 12px; }
    .shot-header h3 { margin: 0; color: #2c3e50; font-size: 16px; }
    .shot-duration { color: #7f8c8d; font-weight: bold; background: #ecf0f1; padding: 4px 12px; border-radius: 4px; font-size: 12px; }
    .shot-info { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px; font-size: 13px; color: #666; }
    .shot-field span { color: #3498db; font-weight: bold; }
    .shot-content p { margin: 8px 0; line-height: 1.6; font-size: 14px; }
    .shot-prompt { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #ccc; font-size: 12px; color: #7f8c8d; }
    .characters-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .character-card { background: white; padding: 16px; border-radius: 8px; border: 1px solid #ddd; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .character-card h3 { color: #e74c3c; margin-bottom: 12px; }
    .character-card p { margin: 6px 0; font-size: 14px; line-height: 1.5; }
    .outline-section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .script-section { background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); font-family: 'Courier New', monospace; line-height: 1.8; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>📖 ${project.title || '未命名项目'}</h1>

  <div class="project-info">
    <p><strong>类型:</strong> ${project.genre || '未分类'} &nbsp;|&nbsp;
    <strong>风格:</strong> ${project.style || '未设定'} &nbsp;|&nbsp;
    <strong>时长:</strong> ${project.duration || '未设定'} &nbsp;|&nbsp;
    <strong>集数:</strong> ${project.episodes || '未设定'}</p>
    ${project.description ? `<p><strong>描述:</strong> ${project.description}</p>` : ''}
    <p style="color: #7f8c8d; font-size: 12px;">生成时间: ${new Date().toLocaleString('zh-CN')}</p>
  </div>

  ${project.outline ? `
  <section class="outline-section">
    <h2>剧本大纲</h2>
    <div>${project.outline.replace(/\n/g, '<br>')}</div>
  </section>
  ` : ''}

  ${project.script ? `
  <section class="script-section">
    <h2>剧本正文</h2>
    <div>${project.script}</div>
  </section>
  ` : ''}

  ${shotsHTML ? `
  <section class="storyboard-section">
    <h2>分镜脚本</h2>
    <div class="storyboard-grid">
      ${shotsHTML}
    </div>
  </section>
  ` : ''}

  ${charactersHTML}

  <footer style="margin-top: 50px; padding: 20px; text-align: center; color: #7f8c8d; border-top: 1px solid #ddd; font-size: 12px;">
    由 AI短剧文本制作工作流 生成 | 生成时间: ${new Date().toLocaleString('zh-CN')}
  </footer>
</body>
</html>`;
    },

    /**
     * 导出为 Markdown（适合团队协作）
     */
    exportAsMarkdown(project, shots, characters, outline) {
        const sections = [];

        // 标题
        sections.push(`# ${project.title || '未命名项目'}`);
        sections.push('');
        sections.push(`> **类型**: ${project.genre || '未分类'} &nbsp;|&nbsp; **风格**: ${project.style || '未设定'} &nbsp;|&nbsp; **时长**: ${project.duration || '未设定'}`);
        sections.push(`> **生成时间**: ${new Date().toLocaleString('zh-CN')}`);
        if (project.description) {
            sections.push('');
            sections.push(`> ${project.description}`);
        }
        sections.push('');

        // 大纲
        if (outline) {
            sections.push('## 📋 剧本大纲');
            sections.push('');
            sections.push(outline);
            sections.push('');
        }

        // 剧本
        if (project.script) {
            sections.push('## 🎭 剧本正文');
            sections.push('');
            sections.push('```');
            sections.push(project.script);
            sections.push('```');
            sections.push('');
        }

        // 分镜表
        if (shots && shots.length > 0) {
            sections.push('## 🎬 分镜脚本');
            sections.push('');
            sections.push('| 编号 | 镜别 | 场景 | 人物 | 运镜 | 时长 | 画面 | 对白/音效 |');
            sections.push('|------|------|------|------|------|------|------|----------|');

            shots.forEach((shot, index) => {
                const row = [
                    index + 1,
                    shot.type || '-',
                    shot.scene || '-',
                    shot.characters || '-',
                    shot.camera || shot.cameraMove || '-',
                    shot.duration || '-',
                    (shot.content || '').replace(/\|/g, '\\|'),
                    (shot.dialog || '').replace(/\|/g, '\\|')
                ].map(cell => String(cell)).join(' | ');
                sections.push(`| ${row} |`);
            });

            sections.push('');

            // 详细分镜
            sections.push('### 详细分镜说明');
            sections.push('');
            shots.forEach((shot, index) => {
                sections.push(`#### 镜头 ${index + 1}: ${shot.scene || '未命名'}`);
                sections.push('');
                sections.push(`- **镜别**: ${shot.type || '-'}`);
                sections.push(`- **运镜**: ${shot.camera || shot.cameraMove || '-'}`);
                sections.push(`- **人物**: ${shot.characters || '-'}`);
                sections.push(`- **时长**: ${shot.duration || '-'}`);
                sections.push(`- **打光**: ${shot.lighting || '-'}`);
                sections.push(`- **情绪**: ${shot.mood || '-'}`);
                sections.push('');
                if (shot.content) {
                    sections.push(`**画面**: ${shot.content}`);
                    sections.push('');
                }
                if (shot.dialog) {
                    sections.push(`**对白/音效**: ${shot.dialog}`);
                    sections.push('');
                }
                if (shot.imagePrompt) {
                    sections.push(`**AI 绘图提示词**: \`${shot.imagePrompt}\``);
                    sections.push('');
                }
                if (shot.videoPrompt) {
                    sections.push(`**视频提示词**: \`${shot.videoPrompt}\``);
                    sections.push('');
                }
                sections.push('---');
                sections.push('');
            });
        }

        // 角色
        if (characters && characters.length > 0) {
            sections.push('## 👥 角色介绍');
            sections.push('');
            characters.forEach(char => {
                sections.push(`### ${char.name || '未命名角色'}`);
                sections.push('');
                sections.push(`- **类型**: ${CharacterSystem.characterTypes[char.type]?.label || char.type || '-'}`);
                if (char.description) sections.push(`- **描述**: ${char.description}`);
                if (char.appearance) sections.push(`- **外形**: ${char.appearance}`);
                if (char.personality) sections.push(`- **性格**: ${char.personality}`);
                if (char.background) sections.push(`- **背景**: ${char.background}`);
                if (char.motivation) sections.push(`- **动机**: ${char.motivation}`);
                sections.push('');
            });
        }

        return sections.join('\n');
    },

    /**
     * 导出项目数据（JSON格式）
     */
    exportAsJSON(project, shots, characters, outline, script) {
        const data = {
            exportInfo: {
                version: 2,
                exportTime: new Date().toISOString(),
                generatedBy: 'AI短剧文本制作工作流'
            },
            project: {
                id: project.id,
                title: project.title,
                description: project.description,
                genre: project.genre,
                style: project.style,
                duration: project.duration,
                episodes: project.episodes,
                status: project.status,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt
            },
            outline,
            script,
            shots,
            characters,
            statistics: {
                shotCount: shots.length,
                characterCount: characters.length,
                estimatedDuration: this.calculateDuration(shots)
            }
        };

        return JSON.stringify(data, null, 2);
    },

    /**
     * 计算总时长
     */
    calculateDuration(shots) {
        if (!shots || !Array.isArray(shots)) return '0秒';
        let total = 0;
        shots.forEach(shot => {
            const match = String(shot.duration || '').match(/(\d+(?:\.\d+)?)/);
            if (match) total += parseFloat(match[1]);
        });
        if (total >= 60) return `${(total / 60).toFixed(1)}分钟`;
        return `${total.toFixed(1)}秒`;
    }
};

// ========== 7. 智能内容增强 ==========
const ContentEnhancer = {
    /**
     * 场景结构建议（基于专业剧本结构）
     */
    suggestSceneStructure(storyType) {
        const templates = {
            drama: [
                { name: '开场', duration: '10%', purpose: '建立世界和主角' },
                { name: '激励事件', duration: '10%', purpose: '打破平衡的事件' },
                { name: '第一幕结尾', duration: '15%', purpose: '不可逆转的选择' },
                { name: '上升动作', duration: '30%', purpose: '冲突逐渐升级' },
                { name: '中点', duration: '10%', purpose: '故事性质改变' },
                { name: '下降动作', duration: '15%', purpose: '代价和冲突加剧' },
                { name: '高潮', duration: '8%', purpose: '最终对决' },
                { name: '结局', duration: '2%', purpose: '新的平衡状态' }
            ],
            romance: [
                { name: '相遇', duration: '15%', purpose: '两人第一次相遇' },
                { name: '吸引', duration: '20%', purpose: '互相产生好感' },
                { name: '障碍', duration: '25%', purpose: '关系面临挑战' },
                { name: '冲突', duration: '20%', purpose: '关系破裂或危机' },
                { name: '转折', duration: '10%', purpose: '态度的重大变化' },
                { name: '和解', duration: '10%', purpose: '最终走到一起' }
            ],
            action: [
                { name: '序幕', duration: '10%', purpose: '展示主角能力和世界' },
                { name: '危机出现', duration: '15%', purpose: '反派或威胁出现' },
                { name: '训练/准备', duration: '20%', purpose: '主角成长和准备' },
                { name: '第一次对决', duration: '15%', purpose: '初步对抗' },
                { name: '挫折', duration: '15%', purpose: '重大失败' },
                { name: '最终准备', duration: '10%', purpose: '集结力量' },
                { name: '决战', duration: '15%', purpose: '最终对决' }
            ],
            mystery: [
                { name: '案件发生', duration: '15%', purpose: '神秘事件出现' },
                { name: '调查开始', duration: '20%', purpose: '发现线索' },
                { name: '误导线索', duration: '25%', purpose: '出现假线索' },
                { name: '关键发现', duration: '15%', purpose: '找到关键线索' },
                { name: '真相揭示', duration: '15%', purpose: '揭示真相' },
                { name: '对决/解决', duration: '10%', purpose: '解决事件' }
            ]
        };

        return templates[storyType] || templates.drama;
    },

    /**
     * 对话风格建议
     */
    suggestDialogStyles(genre) {
        const styles = {
            romance: [
                '含蓄委婉，言外之意',
                '直接坦率，情感炽热',
                '温柔体贴，关怀备至',
                '幽默轻松，增进气氛',
                '试探性，留有余地'
            ],
            drama: [
                '简洁有力，信息密集',
                '情感内敛，含蓄表达',
                '逻辑清晰，层次分明',
                '个性化语言，符合角色',
                '潜台词丰富，意味深长'
            ],
            action: [
                '简短有力，节奏感强',
                '命令式语言，直接高效',
                '紧张对话，悬念迭起',
                '简短对白，动作优先',
                '冷言冷语，展现个性'
            ],
            comedy: [
                '夸张表达，幽默有趣',
                '双关语，机智问答',
                '夸张反应，喜剧效果',
                '幽默吐槽，轻松氛围',
                '误会和巧合'
            ]
        };

        return styles[genre] || styles.drama;
    },

    /**
     * 情绪变化曲线建议
     */
    suggestEmotionArc(storyType) {
        const arcs = {
            drama: ['平静', '好奇', '希望', '期待', '喜悦', '困惑', '失望', '挣扎', '愤怒', '悲伤', '接受', '成长'],
            romance: ['陌生', '好奇', '吸引', '心动', '甜蜜', '犹豫', '误会', '失落', '坦诚', '感动', '幸福'],
            mystery: ['平静', '疑惑', '紧张', '好奇', '发现', '困惑', '恍然大悟', '恐惧', '震惊', '解决'],
            action: ['平常', '警觉', '紧张', '挑战', '失败', '挣扎', '决心', '准备', '对抗', '胜利']
        };

        return arcs[storyType] || arcs.drama;
    },

    /**
     * 镜头节奏建议（基于内容类型）
     */
    suggestShotRhythm(sectionType) {
        const rhythms = {
            action: { shotDuration: '2-3秒', cuts: '快速剪切', movement: '手持/快推' },
            emotional: { shotDuration: '8-12秒', cuts: '缓慢剪切', movement: '缓慢移动/固定' },
            dialogue: { shotDuration: '5-8秒', cuts: '标准节奏', movement: '固定/过肩' },
            mystery: { shotDuration: '4-6秒', cuts: '节奏变化', movement: '缓慢推进' },
            comedy: { shotDuration: '4-7秒', cuts: '轻快节奏', movement: '灵活多样' }
        };

        return rhythms[sectionType] || rhythms.dialogue;
    },

    /**
     * 场景情绪调色板建议
     */
    suggestColorPalette(mood) {
        const palettes = {
            romantic: {
                primary: '#e91e63',
                secondary: '#f8bbd9',
                accent: '#f48fb1',
                description: '粉红色调，温暖柔和'
            },
            dramatic: {
                primary: '#1a237e',
                secondary: '#3949ab',
                accent: '#5c6bc0',
                description: '深蓝色调，严肃深沉'
            },
            mystery: {
                primary: '#212121',
                secondary: '#424242',
                accent: '#616161',
                description: '暗灰色调，神秘压抑'
            },
            cheerful: {
                primary: '#ff9800',
                secondary: '#ffb74d',
                accent: '#ffcc80',
                description: '橙黄色调，活力阳光'
            },
            peaceful: {
                primary: '#4caf50',
                secondary: '#81c784',
                accent: '#a5d6a7',
                description: '绿色调，自然平静'
            },
            tense: {
                primary: '#b71c1c',
                secondary: '#e53935',
                accent: '#ef5350',
                description: '红色调，紧张刺激'
            }
        };

        return palettes[mood] || palettes.dramatic;
    }
};

// ========== 8. AI 提示词库 ==========
const PromptLibrary = {
    /**
     * 场景提示词模板
     */
    scenePrompts: {
        office_day: 'modern office interior, bright daylight through large windows, professional atmosphere, minimalist design, sleek furniture, computer monitors, cinematic lighting, photorealistic, 8K',
        cafe_day: 'cozy coffee shop interior, warm afternoon light, wooden tables, steam rising from coffee cups, soft bokeh, warm color palette, photorealistic, cinematic',
        street_night: 'modern city street at night, neon lights reflecting on wet pavement, rain falling, moody atmosphere, cinematic lighting, urban setting, dramatic shadows',
        park_day: 'city park in daytime, green trees, walking paths, sunlight filtering through leaves, peaceful atmosphere, natural lighting, photorealistic',
        bedroom_night: 'modern bedroom at night, soft warm lighting from bedside lamp, cozy atmosphere, comfortable bed, personal items scattered, warm color temperature',
        meeting_room: 'corporate meeting room, conference table, office chairs, presentation screen, professional lighting, business environment, clean and organized',
        restaurant_evening: 'elegant restaurant interior, warm ambient lighting, soft music implied, fine dining setup, romantic atmosphere, warm colors',
        hospital_corridor: 'hospital corridor, bright fluorescent lighting, white walls, medical equipment, sterile environment, clinical atmosphere',
        subway_station: 'busy subway station, people rushing, fluorescent lighting, tiled walls, underground atmosphere, motion blur on moving elements',
        apartment_living: 'modern apartment living room, large windows, comfortable sofa, contemporary design, soft natural lighting, homey atmosphere',

        // 古装场景
        palace_hall: 'ancient Chinese palace hall, grand architecture, red pillars, golden decorations, traditional Chinese design, majestic atmosphere, historical setting',
        ancient_study: 'traditional Chinese study room, wooden furniture, calligraphy supplies, scroll paintings, ink stones, warm soft lighting, scholarly atmosphere',
        ancient_bedroom: 'ancient Chinese bedroom, silk curtains, traditional canopy bed, red lanterns, ornate decorations, warm candlelight, historical period setting',
        traditional_garden: 'classical Chinese garden, stone paths, decorative plants, traditional architecture, peaceful pond, natural landscaping, cultural atmosphere',
        bamboo_forest: 'dense bamboo forest, tall green bamboo stalks, sunlight filtering through leaves, misty atmosphere, serene natural environment, wuxia setting',
        mountain_landscape: 'majestic mountain landscape, rugged peaks, mist and clouds, traditional Chinese scenery, dramatic atmosphere, vast natural setting',

        // 悬疑场景
        dark_alley: 'dark urban alleyway, dim lighting, mysterious shadows, wet pavement reflecting light, suspenseful atmosphere, noir style, dramatic shadows',
        abandoned_building: 'abandoned building interior, decaying walls, broken windows, dust and debris, eerie atmosphere, forgotten places, dramatic lighting',
        interrogation_room: 'interrogation room, bare concrete walls, single overhead light, one table and two chairs, tense atmosphere, stark lighting, shadows',
        basement: 'dark basement, concrete walls, minimal lighting, mysterious objects, eerie shadows, suspenseful atmosphere, low light'
    },

    /**
     * 情绪提示词
     */
    moodPrompts: {
        romantic: 'romantic atmosphere, warm lighting, intimate setting, soft focus, emotional moment, gentle mood',
        tense: 'tense atmosphere, dramatic shadows, high contrast lighting, suspenseful mood, cinematic tension',
        sad: 'somber mood, cool color palette, soft diffused light, melancholic atmosphere, emotional weight',
        happy: 'bright cheerful lighting, warm colors, happy atmosphere, vibrant mood, positive energy',
        mysterious: 'mysterious atmosphere, dramatic shadows, moody lighting, enigmatic setting, dark color palette',
        peaceful: 'peaceful serene setting, soft natural light, calm atmosphere, tranquil mood, gentle colors',
        dramatic: 'dramatic cinematic lighting, high contrast, powerful atmosphere, emotional intensity, strong shadows',
        energetic: 'dynamic energetic scene, vibrant colors, dynamic composition, lively atmosphere, motion implied',
        nostalgic: 'warm nostalgic lighting, soft golden tones, vintage atmosphere, sentimental mood, gentle blur'
    },

    /**
     * 角色提示词模板
     */
    characterPrompts: {
        young_woman: 'young woman in her 20s, beautiful face, expressive eyes, elegant features, soft skin, professional portrait lighting',
        young_man: 'young man in his 20s, handsome face, strong jawline, confident expression, professional lighting, masculine features',
        business_woman: 'professional businesswoman in her 30s, elegant attire, confident expression, intelligent eyes, corporate setting',
        mysterious_stranger: 'mysterious stranger, dark clothing, hood or hat, hidden face, dramatic lighting, enigmatic presence',
        elderly_person: 'elderly person in their 60s-70s, wise expression, gentle eyes, experienced face, warm compassionate look',
        villain: 'villain character, menacing expression, dark attire, sharp features, dramatic lighting, intimidating presence',
        hero: 'heroic character, strong determined expression, noble features, heroic pose, inspiring presence, heroic lighting'
    },

    /**
     * 动作场景提示词
     */
    actionPrompts: {
        running: 'dynamic running pose, motion blur on limbs, dynamic composition, energetic movement, action moment captured',
        fight_scene: 'martial arts fight scene, dynamic action pose, motion blur, cinematic action shot, dramatic combat moment',
        chase_scene: 'chase scene, high speed movement, dynamic camera angle, motion blur, intense action, cinematic chase shot',
        dramatic_reveal: 'dramatic reveal moment, slow motion effect, focus pull, cinematic reveal, dramatic timing',
        tense_standoff: 'tense standoff scene, two characters facing off, dramatic silence implied, high tension, cinematic composition'
    },

    /**
     * 组合提示词生成器
     */
    generateCombinedPrompt(sceneKey, moodKey, characterKey = '', customDetails = '') {
        const parts = [];

        if (this.scenePrompts[sceneKey]) parts.push(this.scenePrompts[sceneKey]);
        if (this.moodPrompts[moodKey]) parts.push(this.moodPrompts[moodKey]);
        if (this.characterPrompts[characterKey]) parts.push(this.characterPrompts[characterKey]);
        if (customDetails) parts.push(customDetails);

        parts.push('cinematic, professional film still, high quality, sharp focus, detailed, 8K, professional composition');

        return parts.join(', ');
    }
};

// 导出到全局
window.CharacterSystem = CharacterSystem;
window.SceneLibrary = _SceneLibrary;
window.ScriptFormatter = ScriptFormatter;
window.BeatSheetSystem = BeatSheetSystem;
window.AdvancedShotTemplates = AdvancedShotTemplates;
window.ExportSystem = ExportSystem;
window.ContentEnhancer = ContentEnhancer;
window.PromptLibrary = PromptLibrary;

console.log('✅ 增强功能模块加载完成');
