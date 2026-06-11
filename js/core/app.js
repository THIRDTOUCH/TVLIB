// ================== AI短剧文本制作工作流大师 - 核心逻辑 ==================

// ========== 全局数据存储（统一数据结构）==========
let projectData = {
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
    metadata: {
        title: '',
        genre: '',
        style: '',
        duration: '',
        episodes: '',
        createdAt: null,
        updatedAt: null,
        version: '2.0'
    }
};

// ========== 项目数据规范化：确保所有字段存在 ==========
function normalizeProjectData(data) {
    if (!data) data = {};
    const base = {
        outline: '',
        script: '',
        novel: '',
        shots: [],
        characters: [],
        scenes: [],
        beats: { structure: 'three-act', beats: [] },
        metadata: { title: '', genre: '', style: '', duration: '', episodes: '', createdAt: null, updatedAt: null, version: '2.0' }
    };
    // 合并，确保所有字段存在
    data.outline = data.outline || base.outline;
    data.script = data.script || base.script;
    data.novel = data.novel || base.novel;
    data.shots = Array.isArray(data.shots) ? data.shots : [];
    data.characters = Array.isArray(data.characters) ? data.characters : [];
    data.scenes = Array.isArray(data.scenes) ? data.scenes : [];
    data.beats = data.beats && data.beats.beats ? data.beats : { structure: 'three-act', beats: [] };
    data.metadata = Object.assign({}, base.metadata, data.metadata || {});
    return data;
}

// ========== 分镜数据规范化：统一字段结构 ==========
function normalizeShot(shot, index) {
    if (!shot) shot = {};
    return {
        id: shot.id || (index !== undefined ? index + 1 : Date.now()),
        type: shot.type || shot.shotType || '中景',
        scene: shot.scene || '未命名场景',
        characters: shot.characters || '',
        cameraMove: shot.cameraMove || shot.camera || '固定',
        duration: shot.duration || '5秒',
        content: shot.content || shot.description || '',
        dialog: shot.dialog || shot.dialogue || '',
        imagePrompt: shot.imagePrompt || shot.image_prompt || '',
        videoPrompt: shot.videoPrompt || shot.video_prompt || '',
        characterPrompt: shot.characterPrompt || '',
        lighting: shot.lighting || '自然光',
        mood: shot.mood || '平静',
        aspectRatio: shot.aspectRatio || '16:9',
        createdAt: shot.createdAt || new Date().toISOString(),
        updatedAt: shot.updatedAt || new Date().toISOString()
    };
}

let currentProject = null; // 当前打开的项目

// ========== 镜别选项库 ==========
const SHOT_TYPES = [
    '远景', '全景', '中景', '中近景', '近景', '特写', '大特写',
    '主观镜头', '客观镜头', '反应镜头', '过肩镜头', '双人镜头',
    '三人镜头', '群像镜头', '空镜头', '插入镜头', '俯拍', '仰拍',
    '平拍', '顶拍', '反打', '正反打'
];

// ========== 运镜选项库 ==========
const CAMERA_MOVES = [
    '固定', '推镜', '拉镜', '摇镜（左/右）', '移镜', '升降镜',
    '跟拍', '环绕', '手持抖动', '稳定器平滑', '无人机航拍', '变焦',
    '快速变焦', '慢动作', '延时摄影', '升格', '降格', '旋转',
    '甩镜', '滑动'
];

// ========== 场景类型库 ==========
const SCENE_TYPES = [
    '室内-客厅', '室内-卧室', '室内-厨房', '室内-办公室', '室内-会议室',
    '室内-餐厅', '室内-酒吧', '室内-医院', '室内-学校', '室内-商场',
    '室外-街道', '室外-公园', '室外-广场', '室外-海边', '室外-山区',
    '室外-田野', '室外-城市夜景', '室外-雨天', '室外-雪景', '室外-黄昏',
    '梦境/幻想', '回忆场景', '闪回', '抽象/超现实'
];

// ========== 画面风格描述词库 ==========
const VISUAL_STYLES = {
    cinematic: ['电影质感', '浅景深', '高对比度', '暖色调', '柔和光线', '胶片感'],
    anime: ['二次元画风', '鲜艳色彩', '手绘感', '精致线条', '梦幻光效'],
    realistic: ['写实风格', '真实光影', '纪录片质感', '自然光', '细腻纹理'],
    dark: ['暗黑系', '低饱和', '阴沉氛围', '阴影主导', '神秘光效'],
    warm: ['暖色调', '金色光线', '温馨氛围', '柔和光晕', '怀旧质感'],
    cold: ['冷色调', '蓝色滤镜', '冷峻氛围', '金属质感', '清冷光线'],
    vintage: ['复古怀旧', '老电影质感', '棕褐色调', '颗粒感', '褪色效果'],
    cyberpunk: ['赛博朋克', '霓虹灯光', '蓝紫对比', '未来感', '高饱和科技感']
};

// ========== 情绪词库 ==========
const MOOD_WORDS = [
    '紧张', '悬疑', '温馨', '浪漫', '悲伤', '愤怒', '恐惧', '喜悦',
    '平静', '孤独', '希望', '绝望', '兴奋', '压抑', '温暖', '冰冷',
    '怀旧', '梦幻', '诡异', '热血'
];

// ========== 人物描述词库 ==========
const CHARACTER_DESCRIPTORS = {
    female: [
        { age: '20-25岁', look: '清纯甜美', outfit: '白色连衣裙', hair: '长直发乌黑' },
        { age: '28-32岁', look: '优雅知性', outfit: '职业套装', hair: '中长发波浪' },
        { age: '18-22岁', look: '活泼可爱', outfit: '休闲卫衣牛仔', hair: '双马尾棕色' },
        { age: '35-40岁', look: '冷艳高贵', outfit: '深色晚礼服', hair: '低盘发黑色' },
        { age: '25-30岁', look: '文艺气质', outfit: '米色针织衫', hair: '微卷棕色' }
    ],
    male: [
        { age: '25-30岁', look: '阳光帅气', outfit: '白衬衫牛仔裤', hair: '短发黑色' },
        { age: '35-40岁', look: '成熟稳重', outfit: '深色西装', hair: '整齐背头' },
        { age: '18-22岁', look: '叛逆少年', outfit: '黑色夹克', hair: '凌乱中发' },
        { age: '28-35岁', look: '斯文儒雅', outfit: '浅灰毛衣', hair: '中分微卷' },
        { age: '30-40岁', look: '硬朗阳刚', outfit: '军绿色外套', hair: '板寸' }
    ]
};

// ========== 模板库（大数据查询用） ==========
const TEMPLATES = [
    {
        id: 't0-3',
        type: 'storyboard',
        title: '竹林对决·动作分镜',
        desc: '12镜头动作分镜图，展示竹林中两位剑客从对峙到胜负分晓的完整战斗序列，含机位运动和音效标注。',
        tags: ['武侠', '动作', '竹林', '对决', '4x3布局'],
        content: {
            shotCount: 12,
            visualStyle: 'cinematic',
            aspectRatio: '16:9',
            theme: '竹林剑客对决',
            layout: '4x3',
            shots: [
                { id: 1, type: '极超广角', scene: '青竹林', characters: '白衣剑客、蓝衣剑客', cameraMove: '固定', duration: '3s', mood: '肃杀', content: '两人对峙，剑指对方，晨雾弥漫', dialog: '[风声，竹叶沙沙]', imagePrompt: 'bamboo forest duel scene, two swordsmen facing each other, misty morning, cinematic wide shot, sketch style', videoPrompt: 'static extreme wide shot, establishing shot', characterPrompt: '白衣剑客：戴斗笠，白衣飘飘；蓝衣剑客：劲装，英姿飒爽', lighting: '自然光穿透竹林' },
                { id: 2, type: '低角度', scene: '竹林', characters: '白衣剑客', cameraMove: '推镜', duration: '2s', mood: '蓄势', content: '白衣剑客压低身形，快速起步', dialog: '[脚步声，竹叶沙沙]', imagePrompt: 'low angle shot swordsman charging, dynamic pose, pencil sketch', videoPrompt: 'low angle push in, charging motion', characterPrompt: '', lighting: '侧逆光' },
                { id: 3, type: '仰角', scene: '竹林', characters: '白衣剑客、蓝衣剑客', cameraMove: '手持跟拍', duration: '2s', mood: '爆发', content: '白衣剑客高跃劈下，蓝衣剑客抬剑格挡', dialog: '[剑鸣！]', imagePrompt: 'action shot mid-air strike, sword clash, dramatic angle, sketch style', videoPrompt: 'handheld follow, jumping attack', characterPrompt: '', lighting: '低角度逆光' },
                { id: 4, type: '近景', scene: '竹林', characters: '白衣剑客、蓝衣剑客', cameraMove: '手持跟拍', duration: '1.5s', mood: '激烈', content: '兵刃相撞，火花四溅', dialog: '[铿！金属撞击声]', imagePrompt: 'close up sword clash, sparks flying, intense combat, pencil sketch', videoPrompt: 'handheld close up, impact moment', characterPrompt: '', lighting: '正面强光' },
                { id: 5, type: '中景', scene: '竹林', characters: '蓝衣剑客', cameraMove: '侧移跟拍', duration: '2s', mood: '灵动', content: '蓝衣剑客侧身翻滚闪避，拉开距离', dialog: '[呼！]', imagePrompt: 'medium shot evasive roll, motion lines, bamboo forest background', videoPrompt: 'side tracking shot, evasion', characterPrompt: '', lighting: '环境光' },
                { id: 6, type: '低角度', scene: '竹林', characters: '蓝衣剑客', cameraMove: '移镜', duration: '2s', mood: '反击', content: '蓝衣剑客低身疾滑，绕至白衣剑客侧后', dialog: '[刷！破空声]', imagePrompt: 'low angle sliding movement, circling opponent, dynamic action', videoPrompt: 'low tracking shot, circling', characterPrompt: '', lighting: '低角度光' },
                { id: 7, type: '中近景', scene: '竹林', characters: '白衣剑客、蓝衣剑客', cameraMove: '快推', duration: '1.5s', mood: '惊险', content: '蓝衣剑客突刺，白衣剑客后仰闪身', dialog: '[噗！破空声]', imagePrompt: 'medium close up quick thrust, dodging backwards, intense moment', videoPrompt: 'quick push in, near miss', characterPrompt: '', lighting: '侧光' },
                { id: 8, type: '广角', scene: '竹林', characters: '白衣剑客、蓝衣剑客', cameraMove: '快摇', duration: '2s', mood: '震撼', content: '白衣剑客反身斩竹，竹断飞溅逼退蓝衣剑客', dialog: '[哗啦！竹子断裂声]', imagePrompt: 'wide shot bamboo breaking, debris flying, combat destruction', videoPrompt: 'quick pan, environmental destruction', characterPrompt: '', lighting: '全景光' },
                { id: 9, type: '近景', scene: '竹林', characters: '白衣剑客、蓝衣剑客', cameraMove: '环绕', duration: '3s', mood: '密集', content: '双方连斩数合，剑招密集', dialog: '[当当当！连续撞击声]', imagePrompt: 'close up rapid sword exchanges, multiple strikes, motion blur', videoPrompt: 'orbit shot, continuous combat', characterPrompt: '', lighting: '动感光' },
                { id: 10, type: '仰角', scene: '竹林', characters: '白衣剑客、蓝衣剑客', cameraMove: '慢速推镜', duration: '2.5s', mood: '高潮', content: '白衣剑客腾跃，蓝衣剑客斩向其落点', dialog: '[嘿！]', imagePrompt: 'low angle jump attack, counter strike, dramatic composition', videoPrompt: 'slow push in, climax moment', characterPrompt: '', lighting: '仰角逆光' },
                { id: 11, type: '中景', scene: '竹林', characters: '白衣剑客、蓝衣剑客', cameraMove: '快推', duration: '1.5s', mood: '终结', content: '蓝衣剑客上挑斩中，白衣剑客被击飞', dialog: '[砰！沉重撞击声]', imagePrompt: 'medium shot finishing blow, character flying back, impact effect', videoPrompt: 'quick push in, finishing move', characterPrompt: '', lighting: '动态光' },
                { id: 12, type: '极超广角', scene: '竹林', characters: '蓝衣剑客', cameraMove: '拉远', duration: '3s', mood: '落幕', content: '蓝衣剑客收剑，胜负已分，风声渐弱', dialog: '[风声渐弱，竹叶落地]', imagePrompt: 'extreme wide shot victor standing, defeated opponent on ground, serene bamboo forest', videoPrompt: 'slow pull back, conclusion', characterPrompt: '', lighting: '整体氛围光' }
            ]
        }
    },
    {
        id: 't0-2',
        type: 'storyboard',
        title: '职场相遇·爱情分镜',
        desc: '6镜头故事分镜图，展示苏晚清与顾霆琛在公司走廊意外相撞的浪漫相遇桥段，含详细时间轴和音效标注。',
        tags: ['职场', '爱情', '相遇', '都市情感', '3x2布局'],
        content: {
            shotCount: 6,
            visualStyle: 'cinematic',
            aspectRatio: '16:9',
            theme: '职场浪漫相遇',
            layout: '3x2',
            shots: [
                { id: 1, type: '全景', scene: '公司走廊', characters: '苏晚清', cameraMove: '跟镜', duration: '1.5s', mood: '紧张', content: '苏晚清怀抱文件夹快步小跑，神情焦急，高跟鞋急促敲击地面', dialog: '[急促的脚步声，纸张摩擦声]', imagePrompt: 'modern office corridor, woman running with files, anxious expression, pencil sketch style, cinematic composition', videoPrompt: 'tracking shot following running subject, fast pace', characterPrompt: '苏晚清：25岁职场女性，职业套装，高跟鞋，长发', lighting: '白天自然光 · 落地窗阳光' },
                { id: 2, type: '中景', scene: '走廊转角', characters: '苏晚清、顾霆琛', cameraMove: '推镜', duration: '1s', mood: '冲击', content: '顾霆琛从转角走出，苏晚清撞入他怀中，文件脱手飞散空中', dialog: '[碰撞闷响，纸张哗啦散落]', imagePrompt: 'collision moment in hallway, papers flying everywhere, dramatic composition, pencil sketch', videoPrompt: 'push in on collision, motion blur effect', characterPrompt: '顾霆琛：28岁总裁，西装革履，英俊挺拔', lighting: '走廊灯光 · 动态' },
                { id: 3, type: '近景', scene: '走廊', characters: '苏晚清', cameraMove: '推镜', duration: '1.5s', mood: '慌乱', content: '苏晚清面向镜头后退半步，看着满地文件，发丝垂落脸颊，眼神慌张', dialog: '[略显急促的呼吸声] 苏晚清：对不起，顾总！', imagePrompt: 'close up shocked woman, scattered papers on floor, anxious expression, sketch style', videoPrompt: 'slow push in on face, emotional expression', characterPrompt: '', lighting: '正面光 · 眼神光' },
                { id: 4, type: '特写', scene: '手部特写', characters: '苏晚清、顾霆琛', cameraMove: '固定', duration: '1.5s', mood: '暧昧', content: '两只手同时伸向掉落的文件，手指即将触碰', dialog: '[衣物摩擦声，轻微的吸气声]', imagePrompt: 'extreme close up two hands almost touching, romantic tension, pencil sketch, dramatic lighting', videoPrompt: 'static close up, tension building', characterPrompt: '', lighting: '柔和侧光 · 暧昧氛围' },
                { id: 5, type: '中景', scene: '走廊', characters: '苏晚清、顾霆琛', cameraMove: '固定', duration: '1.5s', mood: '微妙', content: '顾霆琛伸手搀扶苏晚清，两人近距离对视，距离逐渐拉近', dialog: '[心跳声渐强，背景音乐起]', imagePrompt: 'two people standing close, man helping woman up, romantic moment, pencil sketch, warm lighting', videoPrompt: 'static medium shot, emotional climax', characterPrompt: '', lighting: '暖色调灯光 · 浪漫氛围' },
                { id: 6, type: '特写', scene: '面部特写', characters: '苏晚清、顾霆琛', cameraMove: '固定', duration: '1s', mood: '心动', content: '两人鼻尖相触，眼神交织，呼吸可闻', dialog: '[呼吸声，钟表滴答声]', imagePrompt: 'extreme close up faces almost touching, intense eye contact, romantic atmosphere, pencil sketch', videoPrompt: 'static extreme close up, emotional conclusion', characterPrompt: '', lighting: '柔光 · 眼神特写' }
            ]
        }
    },
    {
        id: 't0-1',
        type: 'storyboard',
        title: '办公室日常·调度分镜',
        desc: '6镜头调度分镜图，展示职员从工位起身去茶水间接咖啡再返回的完整动作序列，含机位运动和角色轨迹标注。',
        tags: ['职场', '日常', '调度', '办公场景', '3x2布局'],
        content: {
            shotCount: 6,
            visualStyle: 'cinematic',
            aspectRatio: '16:9',
            theme: '办公室日常动作调度',
            layout: '3x2',
            shots: [
                { id: 1, type: '中近景', scene: '工位', characters: '职员', cameraMove: '固定', duration: '2s', mood: '平静', content: '职员坐在工位前，面对电脑，身体微微前倾准备起身', dialog: '[键盘敲击声渐停]', imagePrompt: 'office cubicle, person sitting at desk, ready to stand up, pencil sketch style, simple line drawing, minimal shading', videoPrompt: 'static medium close up, office environment, natural lighting', characterPrompt: '办公室职员，穿着休闲商务装', lighting: '办公室荧光灯光' },
                { id: 2, type: '中景', scene: '工位通道', characters: '职员', cameraMove: '跟拍', duration: '3s', mood: '自然', content: '职员起身，绕过椅子，向走廊方向走去', dialog: '[椅子挪动声]', imagePrompt: 'walking through office corridor, tracking shot perspective, pencil sketch, motion lines', videoPrompt: 'tracking shot following subject, smooth camera movement', characterPrompt: '', lighting: '走廊灯光' },
                { id: 3, type: '中景', scene: '走廊转角', characters: '职员', cameraMove: '摇镜', duration: '2.5s', mood: '自然', content: '职员转过走廊拐角，茶水间入口出现在前方', dialog: '[脚步声]', imagePrompt: 'office hallway corner, perspective drawing, vanishing point, sketch style', videoPrompt: 'pan around corner, revealing new space', characterPrompt: '', lighting: '走廊灯光' },
                { id: 4, type: '近景', scene: '茶水间', characters: '职员', cameraMove: '固定', duration: '4s', mood: '平静', content: '职员走到咖啡机前，接咖啡，蒸汽上升', dialog: '[咖啡机运作声，杯子放置声]', imagePrompt: 'coffee machine close up, steam rising, office kitchen, pencil sketch, warm lighting', videoPrompt: 'static close up, action focus', characterPrompt: '', lighting: '暖色调灯光' },
                { id: 5, type: '中景', scene: '走廊', characters: '职员', cameraMove: '跟拍', duration: '3s', mood: '自然', content: '职员手持咖啡杯，沿走廊返回工位方向', dialog: '[脚步声，杯子碰撞声]', imagePrompt: 'walking back through hallway, holding coffee cup, motion lines, sketch style', videoPrompt: 'tracking shot from behind, returning journey', characterPrompt: '', lighting: '走廊灯光' },
                { id: 6, type: '中近景', scene: '工位', characters: '职员', cameraMove: '固定', duration: '2.5s', mood: '平静', content: '职员回到工位，放下咖啡杯，坐下，继续工作', dialog: '[椅子挪动声，键盘敲击声恢复]', imagePrompt: 'sitting back at desk, coffee cup on table, resume work, pencil sketch, office environment', videoPrompt: 'static medium shot, completing the cycle', characterPrompt: '', lighting: '办公室灯光' }
            ]
        }
    },
    {
        id: 't0',
        type: 'storyboard',
        title: '虞姬舞剑·手绘分镜',
        desc: '12镜头完整桥段，展示虞姬在舞台上表演舞剑的完整动作序列，含详细时间轴和镜头标注。',
        tags: ['古装', '武侠', '舞剑', '手绘风格', '动作戏'],
        content: {
            shotCount: 12,
            visualStyle: 'cinematic',
            aspectRatio: '16:9',
            theme: '虞姬舞剑 - 完整动作桥段',
            layout: '4x3',
            shots: [
                { id: 1, type: '全景', scene: '深夜戏曲舞台', characters: '虞姬', cameraMove: '推镜', duration: '0.8s', mood: '凝重', content: '虞姬背对镜头立于舞台中央，聚光灯焦点如孤岛，红毯金帷，光影凝重', dialog: '[寂静中一声板鼓轻敲]', imagePrompt: 'ink wash sketch style, full shot of ancient chinese stage, spotlight, warrior princess standing alone, dramatic lighting, minimalist pencil drawing', videoPrompt: 'slow push in, dramatic spotlight effect, cinematic black and white', characterPrompt: '虞姬：古装女子，鱼鳞甲，如意冠，英姿飒爽', lighting: '顶光 · 聚光灯效果' },
                { id: 2, type: '中近景', scene: '舞台中央', characters: '虞姬', cameraMove: '固定', duration: '0.8s', mood: '紧张', content: '虞姬背对镜头，右手缓缓探向腰间剑柄，指尖触柄一瞬微停', dialog: '[剑鞘轻响，金属与皮革摩擦声]', imagePrompt: 'ink wash sketch, medium close up back view, hand reaching for sword hilt, dramatic shadows, chinese opera style', videoPrompt: 'static shot, slow hand movement, tension building', characterPrompt: '', lighting: '侧光 · 背部轮廓光' },
                { id: 3, type: '特写', scene: '拔剑瞬间', characters: '虞姬', cameraMove: '推镜+跟镜', duration: '0.8s', mood: '爆发', content: '剑刃猛然出鞘，金属寒光在聚光灯下划出冷冽圆弧，剑锋掠过镜头前', dialog: '[急促的剑刃出鞘金属摩擦声]', imagePrompt: 'extreme close up sword blade, cold metal glint, dramatic lighting, sketch style', videoPrompt: 'fast push in, motion blur effect, metallic sound effect', characterPrompt: '', lighting: '强逆光 · 金属反光' },
                { id: 4, type: '中景', scene: '舞台', characters: '虞姬', cameraMove: '横摇移镜', duration: '0.8s', mood: '决绝', content: '虞姬猛然转身，鱼鳞甲裙摆随动作旋开，剑锋在空中划出半圆轨迹', dialog: '[急促的剑穗飞旋声]', imagePrompt: 'ink wash sketch, medium shot spinning warrior, flowing robes, dynamic motion lines', videoPrompt: 'pan follow, spinning motion, flowing fabric', characterPrompt: '', lighting: '多角度光源 · 动感照明' },
                { id: 5, type: '近景', scene: '舞台', characters: '虞姬', cameraMove: '固定', duration: '1.6s', mood: '专注', content: '虞姬持剑于胸前，目光凝聚，旋转的剑刃划出严酷弧线', dialog: '[剑穗呼啸，剑风破风声]', imagePrompt: 'close up determined face, sword at chest level, intense gaze, sketch art style', videoPrompt: 'static close up, facial expression focus', characterPrompt: '', lighting: '正面主光 · 眼神光' },
                { id: 6, type: '中近景', scene: '舞台', characters: '虞姬', cameraMove: '跟镜', duration: '0.8s', mood: '激烈', content: '虞姬纵身跃起，剑势旋斩，剑尖擦地火花四溅', dialog: '[踏足作响，剑与地面摩擦声]', imagePrompt: 'dynamic action sketch, leaping warrior, sword slash, motion blur lines', videoPrompt: 'tracking shot, jump sequence, sparks effect', characterPrompt: '', lighting: '底光+主光 · 动感' },
                { id: 7, type: '特写', scene: '剑穗', characters: '虞姬', cameraMove: '推镜', duration: '0.8s', mood: '飘逸', content: '剑穗凌空摇曳，流苏飞荡，残影如弧', dialog: '[剑穗飘动声]', imagePrompt: 'close up tassel flowing in wind, dynamic motion, sketch style', videoPrompt: 'slow push in, flowing fabric motion', characterPrompt: '', lighting: '侧逆光 · 轮廓光' },
                { id: 8, type: '中景', scene: '舞台', characters: '虞姬', cameraMove: '环绕', duration: '0.8s', mood: '旋转', content: '虞姬以剑尖为轴，剑穗随身飞旋，衣袂如绽放的墨莲', dialog: '[衣袂猎猎作响]', imagePrompt: 'ink wash sketch, spinning figure, flowing robes like flower bloom, dynamic composition', videoPrompt: 'orbit shot, 360 degree spin, graceful motion', characterPrompt: '', lighting: '全方位光源 · 舞台效果' },
                { id: 9, type: '远景', scene: '舞台全景', characters: '虞姬', cameraMove: '拉镜', duration: '0.8s', mood: '悲壮', content: '舞台中剑光如银蛇狂舞，虞姬的身影在光晕中忽隐忽现', dialog: '[剑啸声渐强]', imagePrompt: 'wide shot stage, swirling sword light trails, lone figure in spotlight, dramatic atmosphere', videoPrompt: 'slow pull back, revealing full stage, light trails effect', characterPrompt: '', lighting: '舞台顶光 · 整体照明' },
                { id: 10, type: '中景', scene: '舞台', characters: '虞姬', cameraMove: '固定', duration: '0.8s', mood: '高潮', content: '虞姬纵身跃起，剑势如长虹贯日，剑气纵横', dialog: '[一声长啸]', imagePrompt: 'dynamic action sketch, jumping high, sword raised, powerful pose, motion lines', videoPrompt: 'static shot, jump freeze frame, dramatic peak', characterPrompt: '', lighting: '逆光+底光 · 剪影效果' },
                { id: 11, type: '特写', scene: '虞姬面部', characters: '虞姬', cameraMove: '推镜', duration: '0.8s', mood: '决绝', content: '虞姬立定，剑尖斜指，猛将向右前方望去', dialog: '[一切声音渐寂]', imagePrompt: 'extreme close up face, determined expression, sweat on brow, sketch style', videoPrompt: 'slow push in on face, emotional climax', characterPrompt: '', lighting: '正面柔光 · 眼神特写' },
                { id: 12, type: '大特写', scene: '虞姬面部', characters: '虞姬', cameraMove: '固定', duration: '1.2s', mood: '悲怆', content: '虞姬手持剑穗，愁眉不展，一声呼唤将未出，眼眶已噙泪', dialog: '[霸王！！！声音凄绝颤抖]', imagePrompt: 'extreme close up eyes filled with tears, sorrowful expression, ink wash sketch', videoPrompt: 'static extreme close up, tear drop, emotional conclusion', characterPrompt: '', lighting: '柔和顶光 · 泪光效果' }
            ]
        }
    },
    {
        id: 't1',
        type: 'outline',
        title: '都市情感·邂逅重逢',
        desc: '男女主角因误会分手，多年后在城市偶遇，重新审视彼此感情的经典故事线。',
        tags: ['都市', '情感', '重逢', '治愈'],
        content: {
            genre: '都市情感',
            style: '温暖治愈',
            theme: '在繁华都市中，两颗曾经受伤的心因一次偶然的重逢而重新靠近。',
            characters: [
                { name: '林悦', role: '28岁，建筑设计师', desc: '外表坚强独立，内心细腻敏感，对感情谨慎' },
                { name: '陈昊', role: '30岁，互联网公司创始人', desc: '外冷内热，理性思维，对林悦一直怀有愧疚' }
            ],
            plot: '开端：林悦在一个雨天参加建筑展，意外遇到多年未见的陈昊。\n发展：陈昊试图弥补过去的错误，林悦在抗拒与动摇之间徘徊。\n高潮：一次意外事件让两人重新认识到彼此的重要性。\n结局：在当初分手的地点，两人决定给彼此一个重新开始的机会。'
        }
    },
    {
        id: 't2',
        type: 'outline',
        title: '悬疑推理·午夜真相',
        desc: '一桩看似普通的失踪案，背后隐藏着惊人的秘密。',
        tags: ['悬疑', '推理', '反转', '紧张'],
        content: {
            genre: '悬疑推理',
            style: '紧张刺激',
            theme: '当真相被刻意隐藏时，执着的追寻者将揭开一层层令人震惊的面纱。',
            characters: [
                { name: '苏晴', role: '32岁，资深刑警', desc: '冷静果断，观察力敏锐，因妹妹的失踪而对本案格外执着' },
                { name: '顾言', role: '35岁，神秘记者', desc: '掌握着不为人知的信息，身份复杂，与案件有着千丝万缕的联系' }
            ],
            plot: '开端：一名普通白领深夜离奇失踪，现场没有任何线索。\n发展：苏晴在调查中发现受害者背后隐藏的多重身份，顾言提供关键信息。\n高潮：真相与苏晴妹妹多年前的失踪案惊人地联系在一起。\n结局：在一场生死对峙中，真相终于水落石出，但代价沉重。'
        }
    },
    {
        id: 't3',
        type: 'outline',
        title: '青春校园·梦想启航',
        desc: '关于青春、友情与梦想的成长故事。',
        tags: ['青春', '校园', '励志', '成长'],
        content: {
            genre: '励志成长',
            style: '温暖治愈',
            theme: '青春路上的迷茫与坚持，友情与梦想交织的美好时光。',
            characters: [
                { name: '陈小夏', role: '18岁，高三学生', desc: '性格开朗，热爱音乐，却在升学与梦想间挣扎' },
                { name: '林沐阳', role: '18岁，学霸班长', desc: '表面理性，内心也有着不为人知的压力与渴望' }
            ],
            plot: '开端：高考在即，陈小夏坚持音乐梦想，与保守的母亲产生冲突。\n发展：小夏和沐阳一起组建乐队，在排练和演出中收获成长。\n高潮：音乐节演出与重要模拟考同日，小夏必须做出选择。\n结局：乐队演出获得认可，小夏也找到了平衡学业与梦想的方式。'
        }
    },
    {
        id: 't4',
        type: 'script',
        title: '标准对白剧本模板',
        desc: '包含场景说明、动作描写、对话的完整剧本格式。',
        tags: ['剧本', '格式', '标准'],
        content: {
            format: 'standard',
            language: 'modern',
            scenes: '场景1：某咖啡馆 · 白天\n\n【场景描述】\n阳光透过落地玻璃窗洒进温馨的咖啡馆，轻柔的背景音乐流淌。顾客们三三两两地坐在桌前，或看书或聊天。\n\n【人物动作】\n林悦（28岁，知性优雅）坐在靠窗的位置，面前放着一杯已经凉了的拿铁。她看着窗外，眼神有些恍惚。\n\n【对白】\n    林悦（自言自语）\n又是下雨天...\n\n    服务员（走上前）\n您好，请问需要续杯吗？\n\n    林悦（回过神来）\n哦...好的，谢谢。\n\n（陈昊推门而入，风铃轻响。他环顾四周，目光停留在林悦身上。）\n\n    陈昊（轻声）\n林悦...真的是你。\n\n    林悦（抬头，愣住）\n陈昊？\n\n【场景渐暗】\n\n---\n\n场景2：同前 · 片刻后\n\n【对白】\n    陈昊（坐下，声音略带紧张）\n好久不见...你还好吗？\n\n    林悦（恢复平静）\n挺好的。你呢？\n\n    陈昊\n我...一直想找机会跟你道歉。\n\n    林悦（打断）\n不用了，都是过去的事了。\n\n（林悦拿起包准备离开，陈昊伸手想留住她，却又缩了回去。）\n\n    陈昊\n至少...让我送你回家？\n\n    林悦（犹豫片刻）\n...不用了，谢谢。\n\n（林悦转身离去，陈昊看着她的背影，眼中满是复杂的情绪。）'
        }
    },
    {
        id: 't5',
        type: 'storyboard',
        title: '对话场景分镜模板',
        desc: '标准两人对话场景的6个基础分镜设计。',
        tags: ['分镜', '对话', '入门'],
        content: {
            shotCount: 6,
            visualStyle: 'cinematic',
            shots: [
                { type: '远景', scene: '咖啡馆外景', characters: '路人', cameraMove: '固定', duration: '3秒', content: '建立场景', imagePrompt: 'cafe exterior street view rain cinematic warm lighting', videoPrompt: 'gentle rain falling, soft camera movement', characterPrompt: '', dialog: '' },
                { type: '中景', scene: '咖啡馆内', characters: '林悦一人', cameraMove: '固定', duration: '4秒', content: '林悦独自坐在桌前，神情恍惚', imagePrompt: 'young woman sitting alone in cafe window looking thoughtful cinematic lighting', videoPrompt: 'slow pan to reveal character', characterPrompt: '林悦：28岁女性，知性优雅，长发', dialog: '林悦（内心独白）：又是下雨天...' },
                { type: '近景', scene: '咖啡馆内', characters: '林悦', cameraMove: '固定', duration: '3秒', content: '林悦抬头，惊讶地看向前方', imagePrompt: 'close up woman face surprised expression cinematic warm light', videoPrompt: 'static shot reaction', characterPrompt: '', dialog: '林悦：陈昊？' },
                { type: '过肩镜头', scene: '咖啡馆内', characters: '陈昊、林悦', cameraMove: '固定', duration: '5秒', content: '陈昊站在林悦对面，神情复杂', imagePrompt: 'over the shoulder shot man standing looking nervous cinematic interior', videoPrompt: 'static two shot', characterPrompt: '陈昊：30岁男性，挺拔英俊', dialog: '陈昊：林悦...真的是你。' },
                { type: '双人镜头', scene: '咖啡馆内', characters: '陈昊、林悦', cameraMove: '固定', duration: '8秒', content: '两人对话，气氛尴尬', imagePrompt: 'two people talking in cafe awkward atmosphere warm lighting', videoPrompt: 'static medium two shot', characterPrompt: '', dialog: '陈昊：好久不见...\n林悦：挺好的。你呢？' },
                { type: '特写', scene: '咖啡馆内', characters: '陈昊', cameraMove: '固定', duration: '3秒', content: '陈昊看着林悦离去的背影，眼中复杂', imagePrompt: 'close up man eye looking sad with tear cinematic depth of field', videoPrompt: 'slow close up reaction', characterPrompt: '', dialog: '' }
            ]
        }
    },
    {
        id: 't6',
        type: 'novel',
        title: '第一人称小说模板',
        desc: '以第一人称视角展开的小说化剧本。',
        tags: ['小说', '第一人称', '情感'],
        content: {
            pov: 'first',
            style: 'literary',
            chapters: '不分章节'
        }
    },
    {
        id: 't7',
        type: 'outline',
        title: '豪门恩怨·继承人之争',
        desc: '财富、权力与家族秘密交织的豪门故事。',
        tags: ['豪门', '恩怨', '商战', '反转'],
        content: {
            genre: '豪门恩怨',
            style: '暗黑深沉',
            theme: '在金钱与权力的游戏中，人性的光明与黑暗将接受最残酷的考验。',
            characters: [
                { name: '苏梦瑶', role: '26岁，苏氏集团千金', desc: '表面柔弱，内心坚韧，隐藏着惊人的商业天赋' },
                { name: '顾景琛', role: '32岁，顾氏集团总裁', desc: '冷酷果决，与苏家有着复杂的恩怨纠葛' }
            ],
            plot: '开端：苏氏集团突然陷入危机，苏梦瑶被迫从海外归来主持大局。\n发展：顾景琛在关键时刻出现，是敌是友难以分辨，旧怨与新仇交织。\n高潮：一份隐藏多年的遗嘱浮出水面，彻底颠覆了所有人的认知。\n结局：苏梦瑶在顾景琛的帮助下守住家业，但两人的关系早已超出商业。'
        }
    },
    {
        id: 't8',
        type: 'outline',
        title: '穿越重生·逆袭人生',
        desc: '回到过去，改写命运的爽感故事。',
        tags: ['穿越', '重生', '逆袭', '爽感'],
        content: {
            genre: '穿越重生',
            style: '热血沸腾',
            theme: '当人生可以重来一次，那些错过的机会、遗憾的人、未竟的梦想，是否都能重新拥有？',
            characters: [
                { name: '云舒', role: '重生回到22岁', desc: '前世是失败的打工人，重生后拥有未来记忆，决心改写命运' },
                { name: '陆时衍', role: '25岁，神秘投资人', desc: '前世是云舒遥不可及的存在，今生却意外地对她产生兴趣' }
            ],
            plot: '开端：云舒在一次意外后醒来，发现自己回到了22岁，正是一切错误开始之前。\n发展：利用未来记忆，云舒在事业上步步为营，同时小心避开前世的悲剧。\n高潮：陆时衍的出现打破了她的计划，两人之间的关系变得扑朔迷离。\n结局：云舒不仅收获了事业上的成功，更重要的是找到了真正值得珍惜的人。'
        }
    }
];

// ========== 辅助函数库 ==========
function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function showToast(message, type = 'info') {
    if (!message) return;
    try {
        const container = document.getElementById('toast-container');
        if (!container) {
            // fallback: 创建容器
            const fallback = document.createElement('div');
            fallback.id = 'toast-container';
            fallback.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10001; display: flex; flex-direction: column; gap: 8px; pointer-events: none;';
            document.body.appendChild(fallback);
        }
        const target = document.getElementById('toast-container');
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#6366f1';
        toast.style.cssText = `
            position: relative; padding: 12px 20px;
            background: ${bgColor}; color: white; border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.25);
            font-size: 13px; max-width: 360px; font-weight: 500;
            pointer-events: auto; animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        target.appendChild(toast);
        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s, transform 0.3s';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
        }, 3200);
    } catch (e) {
        // 最底层降级
        try { console.log('[Toast]', type, message); } catch (_) {}
    }
}

function showLoading(text = 'AI正在创作中...') {
    const overlay = document.getElementById('loading-overlay');
    const textEl = document.getElementById('loading-text');
    if (overlay) {
        if (textEl) textEl.textContent = text;
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

function setStatus(text) {
    try {
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.textContent = text || '';
            return;
        }
        const statusBar = document.getElementById('project-status-bar');
        if (statusBar) {
            statusBar.textContent = text || '';
            return;
        }
        // fallback: 不做任何事
    } catch (e) {
        // 静默
    }
}

// ========== 新手引导 Onboarding ==========
let currentOnboardingStep = 1;

function showOnboarding() {
    const modal = document.getElementById('onboarding-modal');
    if (!modal) { showToast('初始化中，请稍候...', 'info'); return; }
    currentOnboardingStep = 1;
    updateOnboardingUI();
    modal.style.display = 'flex';
}

function updateOnboardingUI() {
    const steps = document.querySelectorAll('.onboarding-step');
    steps.forEach((step, idx) => {
        const stepNum = idx + 1;
        step.classList.toggle('active', stepNum === currentOnboardingStep);
        step.classList.toggle('completed', stepNum < currentOnboardingStep);
    });
    const btn = document.getElementById('onboarding-next');
    if (btn) {
        if (currentOnboardingStep >= 4) {
            btn.textContent = '✨ 开始创建项目 →';
        } else {
            btn.textContent = '下一步 →';
        }
    }
}

function nextOnboardingStep() {
    if (currentOnboardingStep >= 4) {
        closeOnboarding();
        createNewProject();
    } else {
        currentOnboardingStep++;
        updateOnboardingUI();
    }
}

function closeOnboarding() {
    const modal = document.getElementById('onboarding-modal');
    if (modal) modal.style.display = 'none';
}

// ========== 标签页切换 ==========
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    const tabEl = document.getElementById('tab-' + tabName);
    if (tabEl) tabEl.classList.add('active');

    const tabMap = { outline: 0, script: 1, novel: 2, storyboard: 3, board: 4, export: 5 };
    const index = tabMap[tabName];
    if (index !== undefined) {
        const tabBtns = document.querySelectorAll('.tab-btn');
        if (tabBtns[index]) tabBtns[index].classList.add('active');
    }

    // 切换到故事板时重新渲染
    if (tabName === 'board') {
        try { renderStoryboard(); } catch (e) { console.warn('renderStoryboard failed:', e); }
    }
    // 切换到分镜时渲染分镜列表
    if (tabName === 'storyboard') {
        try { if (typeof renderShotList === 'function' && projectData.shots.length > 0) renderShotList(projectData.shots); } catch (e) {}
    }
    // 切换到导出页面时更新统计
    if (tabName === 'export') {
        try { updateProjectSummary(); } catch (e) {}
    }
    // 更新全局状态
    try { if (typeof AppState !== 'undefined' && AppState.updateTabState) AppState.updateTabState(tabName, true); } catch (e) {}
}

function getTabLabel(name) {
    const map = { outline: '剧本大纲', script: '剧本生成', novel: '小说生成', storyboard: '分镜脚本', board: '故事板', export: '导出下载' };
    return map[name];
}

// ========== 角色管理 ==========
function addCharacter(name = '', role = '', desc = '') {
    const container = document.getElementById('characters-container');
    const div = document.createElement('div');
    div.className = 'character-item';
    div.innerHTML = `
        <input type="text" class="char-name" placeholder="角色姓名" value="${name}">
        <input type="text" class="char-role" placeholder="身份/年龄" value="${role}">
        <textarea class="char-desc" placeholder="性格外貌描述..." rows="2">${desc}</textarea>
        <button class="btn btn-sm btn-danger" onclick="removeCharacter(this)">✕</button>
    `;
    container.appendChild(div);
}

function removeCharacter(btn) {
    const items = document.querySelectorAll('.character-item');
    if (items.length <= 1) {
        showToast('至少保留一个角色', 'error');
        return;
    }
    btn.parentElement.remove();
}

function getCharacters() {
    const chars = [];
    document.querySelectorAll('.character-item').forEach(item => {
        const name = item.querySelector('.char-name').value.trim();
        const role = item.querySelector('.char-role').value.trim();
        const desc = item.querySelector('.char-desc').value.trim();
        if (name) chars.push({ name, role, desc });
    });
    return chars;
}

// ========== AI 生成辅助：统一 LLM 调用 + 本地模板降级 ==========
// 优先调用 LLM 生成，失败或未配置时降级到本地模板生成
async function callLLM(taskType, prompt, fallbackFn) {
    const hasLLM = typeof LLMManager !== 'undefined' && LLMManager.isConfigured && LLMManager.isConfigured();
    if (hasLLM) {
        try {
            const result = await LLMManager.sendMessage(prompt, { taskType });
            if (result && result.content && result.content.trim()) {
                return { content: result.content, source: 'llm' };
            }
        } catch (err) {
            console.warn('LLM 生成失败，降级到本地模板:', err.message || err);
        }
    }
    // 降级到本地模板
    return { content: fallbackFn(), source: 'local' };
}

// ========== 剧本大纲生成 ==========
function generateOutline() {
    const genre = document.getElementById('genre').value;
    const duration = document.getElementById('duration').value;
    const style = document.getElementById('style').value;
    const episodes = document.getElementById('episodes').value;
    const theme = document.getElementById('theme').value.trim();
    const plot = document.getElementById('plot').value.trim();
    const characters = getCharacters();

    if (!theme && characters.length === 0) {
        showToast('请至少填写主题或添加角色', 'error');
        return;
    }

    showLoading('AI正在构思故事大纲...');

    // 优先使用 LLM，否则用本地模板
    const brief = `请作为短剧编剧，创作一部${genre}类型${style}风格的剧本大纲，时长${duration}分钟${episodes ? '，' + episodes + '集' : ''}。主题：${theme || generateTheme(genre, style)}。情节概述：${plot || '(自动生成)'}`;

    callLLM('outline', brief, () => generateLocalOutline(genre, duration, style, episodes, theme, plot, characters)).then(({ content, source }) => {
        let outline = source === 'llm' ? content : content;

        // LLM 返回的是纯文本，本地模板也返回文本。统一格式
        document.getElementById('outline-result').style.display = 'block';
        document.getElementById('outline-result-content').textContent = outline;
        projectData.outline = outline;
        projectData.metadata = {
            ...projectData.metadata,
            genre, style, duration, episodes,
            updatedAt: new Date().toISOString()
        };

        // 保存角色数据到 projectData
        if (characters.length > 0) {
            projectData.characters = characters.map(c => ({
                id: Date.now() + Math.random(),
                name: c.name,
                role: c.role,
                description: c.desc,
                createdAt: new Date().toISOString()
            }));
        }

        hideLoading();
        const sourceLabel = source === 'llm' ? 'AI生成' : '本地模板';
        setStatus('大纲已生成（' + sourceLabel + '）· 共约 ' + outline.length + ' 字');
        showToast('大纲生成完成！可点击结果区域进行修改', 'success');
    });
}

// 本地模板生成（作为 LLM 不可用时的降级方案）
function generateLocalOutline(genre, duration, style, episodes, theme, plot, characters) {
    let outline = '';
    outline += `【剧名】${projectData.metadata.title || '未定名短剧'}\n`;
    outline += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    outline += `【基本信息】\n`;
    outline += `• 类型：${genre}\n`;
    outline += `• 风格：${style}\n`;
    outline += `• 时长：${duration}分钟${episodes > 1 ? ' × ' + episodes + '集' : ''}\n`;
    outline += `• 目标观众：18-45岁\n\n`;
    outline += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    outline += `【核心主题】\n${theme || generateTheme(genre, style)}\n\n`;
    outline += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    outline += `【主要人物】\n`;
    if (characters && characters.length > 0) {
        characters.forEach((c, i) => {
            outline += `${i + 1}. ${c.name}（${c.role}）\n`;
            outline += `   ${c.desc || generateCharDesc(genre)}\n\n`;
        });
    } else {
        const autoChars = generateAutoCharacters(genre, style);
        autoChars.forEach((c, i) => {
            outline += `${i + 1}. ${c.name}（${c.role}）\n`;
            outline += `   ${c.desc}\n\n`;
        });
    }
    outline += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    outline += `【情节结构】\n`;
    if (plot) {
        outline += plot + '\n\n';
    } else {
        outline += generatePlotStructure(genre, style);
    }
    outline += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    outline += `【核心冲突】\n${generateConflict(genre, style)}\n\n`;
    outline += `【情感主线】\n${generateEmotionalCore(genre, style)}\n\n`;
    outline += `【亮点设计】\n${generateHighlights(style)}\n\n`;
    outline += `【结尾风格】\n${generateEnding(style)}\n`;
    return outline;
}

function generateTheme(genre, style) {
    const themes = {
        '都市情感': '"在忙碌的都市生活中，寻找那份属于自己的温暖与归属。"',
        '古装仙侠': '"跨越时空与生死的羁绊，在宿命与选择之间，我们终将何去何从。"',
        '悬疑推理': '"当真相被层层迷雾掩盖，唯有执着的追寻者才能看见那最后一缕光。"',
        '喜剧搞笑': '"人生不如意事十之八九，可只要笑着面对，一切都会过去。"',
        '励志成长': '"每一个不曾放弃的今天，终将成就那个闪闪发光的明天。"',
        '科幻奇幻': '"当人类的边界被不断打破，我们对自己的认知是否也将重新定义？"',
        '豪门恩怨': '"在金钱与权力的舞台上，真情与算计的博弈永不停歇。"',
        '青春校园': '"那些关于成长、友情与梦想的日子，终将成为生命中最闪亮的回忆。"',
        '穿越重生': '"当命运的指针重新转动，这一次，我要活出真正的自己。"',
        '家庭伦理': '"家是最温暖的港湾，也是最深的羁绊。在爱与理解之间，我们慢慢长大。"'
    };
    return themes[genre] || themes['都市情感'];
}

function generateCharDesc(genre) {
    const descs = [
        '外表冷静内心炽热，有着不为人知的过去，在关键时刻总能展现惊人的力量。',
        '乐观开朗，像阳光一样温暖周围的人，但笑容背后也藏着属于自己的秘密。',
        '沉默寡言，观察力敏锐，总是以行动代替言语，用实力证明自己。',
        '聪明睿智，善于思考和分析，遇事冷静沉着，是团队中的智囊角色。'
    ];
    return randomFrom(descs);
}

function generateAutoCharacters(genre, style) {
    const surnames = ['林', '陈', '苏', '顾', '叶', '沈', '陆', '江', '韩', '白'];
    const femaleNames = ['悦', '梦瑶', '小夏', '晴', '舒', '晚', '若', '清', '月', '芷'];
    const maleNames = ['昊', '沐阳', '言', '景琛', '时衍', '深', '昀', '辰', '翊', '墨'];

    const isFemaleFirst = Math.random() > 0.5;
    const char1Name = (isFemaleFirst ? randomFrom(surnames) + randomFrom(femaleNames) : randomFrom(surnames) + randomFrom(maleNames));
    const char2Name = (!isFemaleFirst ? randomFrom(surnames) + randomFrom(femaleNames) : randomFrom(surnames) + randomFrom(maleNames));

    return [
        {
            name: char1Name,
            role: isFemaleFirst ? '28岁，建筑设计师' : '30岁，互联网公司创始人',
            desc: generateCharDesc(genre)
        },
        {
            name: char2Name,
            role: !isFemaleFirst ? '28岁，建筑设计师' : '30岁，互联网公司创始人',
            desc: generateCharDesc(genre)
        }
    ];
}

function generatePlotStructure(genre, style) {
    return `◆ 开端（约${Math.ceil(5/4)}分钟）
介绍主要角色和背景，建立人物关系，引出核心冲突的引子。

◆ 发展1（约${Math.ceil(5/4)}分钟）
冲突升级，事件逐步复杂化，人物面临第一个重大选择，展现角色性格与动机。

◆ 发展2（约${Math.ceil(5/4)}分钟）
达到故事中段，引入重要转折或新信息，让观众对后续发展产生强烈好奇。

◆ 高潮（约${Math.ceil(5/4)}分钟）
矛盾激化到顶点，人物面临最关键的抉择或挑战，情感和情节双重爆发。

◆ 结局（约1分钟）
问题解决或留下悬念，人物获得成长或启示，给观众留下深刻印象和回味空间。
`;
}

function generateConflict(genre, style) {
    const conflicts = [
        '过去的伤痛与当下的选择之间的矛盾，是主角必须面对的最大挑战。',
        '理想与现实的冲突，在追求梦想的道路上，主角需要做出一次次艰难的抉择。',
        '信任与背叛的博弈，谁是真心、谁是假意，将在关键时刻见分晓。',
        '个人情感与责任使命的冲突，在爱与大义之间，做出最痛苦的选择。',
        '自我怀疑与外部压力的双重夹击，主角必须在破碎中重建自我。'
    ];
    return randomFrom(conflicts);
}

function generateEmotionalCore(genre, style) {
    return '故事的情感核心围绕"成长与救赎"展开，每一个角色都在这段经历中获得属于自己的成长与感悟，让观众在情节推进中产生强烈的情感共鸣。';
}

function generateHighlights(style) {
    return `• 场景设计：通过光影变化营造视觉冲击力\n• 对话设计：简短有力的台词，每一句都承载情感信息\n• 节奏控制：张弛有度，在紧张与舒缓间找到完美平衡\n• 细节呈现：细微的表情与动作，传递人物内心的波澜\n• 音乐配合：恰到好处的BGM，放大情绪的感染力`;
}

function generateEnding(style) {
    const endings = {
        '温暖治愈': '开放式温馨结局，留给观众想象与回味的空间。',
        '紧张刺激': '在最后一刻的反转中落下帷幕，余韵悠长。',
        '幽默轻松': '皆大欢喜的圆满结局，让人嘴角上扬。',
        '感人肺腑': '泪点与温暖并存，在感动中收尾。',
        '暗黑深沉': '带有哲学意味的开放式结局，引发深思。',
        '热血沸腾': '在高潮的余韵中充满希望地结束。'
    };
    return endings[style] || endings['温暖治愈'];
}

function optimizeOutline() {
    showLoading('AI正在优化大纲结构...');
    setTimeout(() => {
        let content = document.getElementById('outline-result-content').textContent;
        if (!content) {
            showToast('请先生成大纲', 'error');
            hideLoading();
            return;
        }
        content = content.replace(/【核心主题】/, '【核心主题】\n※ 情感张力：增强人物情感的深度和真实性');
        content = content.replace(/【核心冲突】/, '【核心冲突】\n※ 冲突设计：增加多层次的内外冲突，让情节更有张力');
        document.getElementById('outline-result-content').textContent = content;
        projectData.outline = content;
        hideLoading();
        showToast('大纲优化建议已添加！可手动修改内容', 'success');
    }, 1000);
}

// ========== 剧本生成 ==========
function importOutline() {
    if (!projectData.outline) {
        showToast('请先生成大纲', 'error');
        return;
    }
    document.getElementById('script-input').value = projectData.outline;
    showToast('已导入大纲内容', 'success');
}

function generateScript() {
    const input = document.getElementById('script-input').value.trim();
    const format = document.getElementById('script-format').value;
    const language = document.getElementById('script-language').value;
    const sceneCount = parseInt(document.getElementById('scene-count').value) || 4;

    if (!input) {
        showToast('请输入大纲内容或点击"从大纲导入"', 'error');
        return;
    }

    showLoading('AI正在编写剧本...');

    const brief = `请作为专业编剧，根据以下剧本大纲创作${sceneCount}场短剧剧本。格式：${format}，语言风格：${language}。请按剧本写作规范输出：场景标题、角色名、对白、动作描述。大纲内容：\n${input}`;

    callLLM('script', brief, () => generateScriptContent(input, format, language, sceneCount)).then(({ content, source }) => {
        const script = content;
        document.getElementById('script-result').style.display = 'block';
        document.getElementById('script-result-content').textContent = script;
        projectData.script = script;
        hideLoading();
        const sourceLabel = source === 'llm' ? 'AI生成' : '本地模板';
        setStatus('剧本已生成（' + sourceLabel + '）· 共约 ' + script.length + ' 字');
        showToast('剧本生成完成！可点击结果区域修改', 'success');
    });
}

function generateScriptContent(outline, format, language, sceneCount) {
    let script = '';
    script += `《${projectData.metadata.title || '未定名短剧'}》\n`;
    script += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    script += `【剧本版本】${format.toUpperCase()} · ${language}风格\n`;
    script += `【场景数量】${sceneCount}场\n`;
    script += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 生成场景
    const scenes = generateScenes(sceneCount, outline);
    scenes.forEach((scene, i) => {
        script += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        script += `【场景 ${i + 1}】${scene.title}\n`;
        script += `【地点】${scene.location}\n`;
        script += `【时间】${scene.time}\n`;
        script += `【氛围】${scene.mood}\n`;
        script += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        script += `◆ 场景描述\n${scene.description}\n\n`;
        script += `◆ 人物动作\n${scene.actions}\n\n`;
        script += `◆ 对白\n${scene.dialogs}\n\n`;

        if (i < scenes.length - 1) {
            script += `【转场】${scene.transition}\n\n`;
        }
    });

    script += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    script += `【剧终】\n`;
    script += `── 本剧本由AI短剧文本制作工作流大师创作 ──\n`;

    return script;
}

function generateScenes(count, outline) {
    const locations = [
        { title: '咖啡馆的重逢', location: '某市中心 · 阳光咖啡馆', time: '下午 · 晴天', mood: '温馨略带紧张' },
        { title: '回忆的街角', location: '老街巷 · 人行道', time: '黄昏 · 夕阳', mood: '怀旧浪漫' },
        { title: '办公室的抉择', location: '现代写字楼 · 高层办公室', time: '傍晚', mood: '严肃紧张' },
        { title: '雨天的电话亭', location: '街边 · 电话亭', time: '夜晚 · 下雨', mood: '伤感温暖' },
        { title: '最后的公园', location: '城市公园 · 长椅', time: '清晨 · 薄雾', mood: '宁静释然' },
        { title: '热闹的餐厅', location: '老城区餐厅 · 包间', time: '晚上', mood: '温馨热闹' },
        { title: '星空下的告白', location: '天台', time: '深夜', mood: '浪漫深情' },
        { title: '机场的告别', location: '机场候机厅', time: '白天', mood: '复杂不舍' }
    ];

    const scenes = [];
    for (let i = 0; i < count; i++) {
        const template = locations[i % locations.length];
        const sceneProgress = (i + 1) / count;

        scenes.push({
            ...template,
            description: generateSceneDescription(template, sceneProgress),
            actions: generateSceneActions(sceneProgress),
            dialogs: generateSceneDialogs(sceneProgress),
            transition: sceneProgress < 1 ? randomFrom(['淡出淡入', '硬切', '黑场过渡', '匹配剪辑']) : ''
        });
    }

    return scenes;
}

function generateSceneDescription(template, progress) {
    const descriptions = [
        `柔和的光线透过窗户洒入${template.location.split('·')[1] || ''}，空气中弥漫着淡淡的咖啡香。几位客人悠闲地坐在各自的位置，或看书或低声交谈，一切都显得宁静而美好。`,
        `夕阳的余晖将整条街道染成金黄色，行人步履匆匆。微风吹过，带来夏日特有的温暖气息，以及一丝若有若无的花香。`,
        `落地窗外是繁华都市的天际线，灯光已经亮起。办公室里只开着一盏台灯，暖黄色的光线在现代感十足的空间里投下柔和的阴影。`,
        `雨点敲打着玻璃，街灯在雨幕中晕染出一片片暖黄色的光晕。城市的喧嚣被雨水隔绝，只有雨水滴落的声音在耳边回响。`,
        `晨雾还未完全散去，公园里透着清新的凉意。远处有晨练的身影，鸟鸣声清脆悦耳，一切都在昭示着新一天的开始。`
    ];

    let desc = descriptions[Math.floor(progress * descriptions.length)];
    if (!desc) desc = descriptions[0];
    return desc;
}

function generateSceneActions(progress) {
    if (progress < 0.3) {
        return '林悦端着咖啡走到窗边停下，目光落在窗外的街景上，久久没有移开。手指无意识地摩挲着杯壁，似乎在回忆什么。片刻后，她轻轻叹了口气，转身走向座位。';
    } else if (progress < 0.6) {
        return '陈昊推门而入，目光在室内快速扫过。当看到林悦时，他的脚步明显停顿了一下。犹豫片刻后，他整理了一下衣襟，深吸一口气，迈步向她走去。';
    } else if (progress < 0.9) {
        return '两人面对面坐着，气氛有些尴尬。林悦端起杯子喝了一口，视线飘向窗外。陈昊看着她，嘴唇动了动，似乎想说什么却又难以开口。最后，他从口袋里掏出一样东西，轻轻放在桌上。';
    } else {
        return '林悦站起身来，拿起包。陈昊也跟着站起来，两人对视片刻。林悦微微点头致意，转身离去。陈昊站在原地，看着她的背影消失在人群中，久久没有移动。';
    }
}

function generateSceneDialogs(progress) {
    if (progress < 0.3) {
        return `    林悦（自言自语）
又是这个季节...时间过得真快。

    服务员
您好，请问有什么可以帮您的吗？

    林悦
谢谢，不用了。（停顿片刻）对了...今天几号？

    服务员
X月X号，女士。

    林悦（轻声）
原来已经这么久了...`;
    } else if (progress < 0.6) {
        return `    陈昊
林悦...真的是你。

    林悦（转身，愣住）
陈昊？你怎么会在这里？

    陈昊（苦笑）
我也想问同样的问题。（指了指对面的位置）可以...坐吗？

    林悦（犹豫）
...请坐。

    陈昊（坐下后沉默片刻）
你...还好吗？

    林悦
挺好的。你呢？看起来变化很大。`;
    } else if (progress < 0.9) {
        return `    陈昊
这些年...我一直在想，如果当初我没有那么做，结果会不会不一样。

    林悦
没有如果了，陈昊。发生的事情已经发生。

    陈昊
我知道。可是我还是想说...对不起。（从口袋里掏出一样东西）这个，应该还给你。

    林悦（看到东西，愣住）
这是...

    陈昊
当年你落在我这里的。我一直想找机会还给你。

    林悦（声音有些颤抖）
谢谢你还留着它。`;
    } else {
        return `    林悦
时间不早了，我该走了。

    陈昊（急忙）
等等！林悦，我们...还能再见面吗？

    林悦（在门口停下脚步，没有回头）
...如果命运允许的话。

    陈昊（看着她离开，轻声）
我会等的。不管多久。

    独白（陈昊）
有些人，一旦错过，就是一生。但这一次，我不想再错过。`;
    }
}

function optimizeScript() {
    showLoading('AI正在润色剧本...');
    setTimeout(() => {
        let content = document.getElementById('script-result-content').textContent;
        if (!content) {
            showToast('请先生成剧本', 'error');
            hideLoading();
            return;
        }
        // 模拟优化 - 添加标注
        const notes = '\n\n【润色建议】\n1. 可以在关键对话处添加更细腻的表情描写\n2. 场景转换之间可以加入空镜过渡\n3. 对白可以进一步精简，提高节奏\n4. 可加入背景音乐提示增强氛围\n';
        document.getElementById('script-result-content').textContent = content + notes;
        projectData.script = content + notes;
        hideLoading();
        showToast('润色建议已添加', 'success');
    }, 1200);
}

// ========== 小说生成 ==========
function importScriptToNovel() {
    if (!projectData.script) {
        showToast('请先生成剧本', 'error');
        return;
    }
    document.getElementById('novel-input').value = projectData.script;
    showToast('已导入剧本内容', 'success');
}

function importOutlineToNovel() {
    if (!projectData.outline) {
        showToast('请先生成大纲', 'error');
        return;
    }
    document.getElementById('novel-input').value = projectData.outline;
    showToast('已导入大纲内容', 'success');
}

function generateNovel() {
    const input = document.getElementById('novel-input').value.trim();
    const pov = document.getElementById('novel-pov').value;
    const style = document.getElementById('novel-style').value;
    const chapters = document.getElementById('novel-chapters').value;
    const length = document.getElementById('novel-length').value;

    if (!input) {
        showToast('请输入剧本/大纲内容或点击导入', 'error');
        return;
    }

    showLoading('AI正在创作小说版...');

    setTimeout(() => {
        const novel = generateNovelContent(input, pov, style, chapters, length);
        document.getElementById('novel-result').style.display = 'block';
        document.getElementById('novel-result-content').textContent = novel;
        projectData.novel = novel;
        hideLoading();
        setStatus('小说已生成 · 共约 ' + novel.length + ' 字');
        showToast('小说生成完成！', 'success');
    }, 2500);
}

function generateNovelContent(input, pov, style, chapters, length) {
    let novel = '';
    novel += `《${projectData.metadata.title || '未定名短剧'}》小说版\n`;
    novel += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    novel += `【叙事方式】${getPOVName(pov)}\n`;
    novel += `【文风】${getStyleName(style)}\n`;
    novel += `【篇幅】${length}\n`;
    novel += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    novel += generateChapterContent(pov, style, 1);
    novel += `\n\n` + generateChapterContent(pov, style, 2);
    novel += `\n\n` + generateChapterContent(pov, style, 3);

    novel += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    novel += `【未完待续...】\n`;
    novel += `（注：您可以点击编辑区域继续创作后续章节）\n`;

    return novel;
}

function getPOVName(pov) {
    const map = {
        'first': '第一人称（我）',
        'third-limited': '第三人称限知',
        'third-omniscient': '第三人称全知',
        'alternating': '多视角交替'
    };
    return map[pov] || '第一人称';
}

function getStyleName(style) {
    const map = {
        'web-novel': '网络小说风',
        'literary': '文学风格',
        'minimalist': '极简主义',
        'descriptive': '细腻描写',
        'fast-paced': '快节奏'
    };
    return map[style] || '网络小说风';
}

function generateChapterContent(pov, style, chapterNum) {
    let content = '';
    content += `◆ 第${chapterNum}章 ` + ['重逢', '往事', '抉择'][chapterNum - 1] + '\n\n';

    if (pov === 'first') {
        content += generateFirstPerson(chapterNum, style);
    } else if (pov === 'third-limited') {
        content += generateThirdLimited(chapterNum, style);
    } else if (pov === 'third-omniscient') {
        content += generateThirdOmniscient(chapterNum, style);
    } else {
        content += generateAlternating(chapterNum, style);
    }

    return content;
}

function generateFirstPerson(chapter, style) {
    if (chapter === 1) {
        return `我推开咖啡馆那扇玻璃门的时候，午后的阳光正以一种慵懒的姿态洒落在街道上。\n\n风铃声清脆悦耳，像是某种信号，提醒着我这一天注定会有些不一样。\n\n我找了个靠窗的位置坐下，点了一杯拿铁。窗外的人来人往，每个人都在奔赴自己的目的地，而我却不知道自己要去往何方。\n\n咖啡端上来的时候，我下意识地看了一眼门口。就是这一眼，让我的整个世界都静止了。\n\n他站在那里，还是记忆中的样子，只是眉宇间多了几分成熟。他也看到了我。\n\n有那么一瞬间，我以为时间会倒流，回到那个我们还彼此相爱的时候。\n\n可现实是，我们之间隔着整整五年的光阴和一道无法跨越的鸿沟。\n\n"林悦。"他念出我的名字，声音沙哑得像是经过了漫长的岁月。\n\n我没有回答，只是看着他一步步向我走来。每一步都像是踩在我的心上，让我无法呼吸。\n\n五年前离开的人，怎么又回来了呢？`;
    } else if (chapter === 2) {
        return `陈昊在我对面坐下的时候，我几乎要以为自己还在梦里。\n\n"你怎么会在这里？"我的声音比我想象的要平静得多。\n\n他笑了，笑容里带着一丝苦涩："我也想问你同样的问题。这个城市这么大，我们却偏偏在同一个地方相遇。"\n\n我端起咖啡喝了一口，试图用这种方式掩饰内心的慌乱。咖啡已经凉了，苦涩的味道在舌尖蔓延开来。\n\n就像我们的过去。\n\n"你过得好吗？"他问。\n\n这个问题我被问过无数次，每一次我的答案都是"挺好的"。我自己都快要相信这个答案了。\n\n可是在陈昊面前，我第一次犹豫了。\n\n"挺好的。"我最终还是这么回答。然后反问："你呢？"\n\n"还不错。"他说，"事业算是有了点起色。只是..."\n\n他没有说完，但我知道他想说什么。\n\n只是，心里有个空缺，怎么也填不满。\n\n我们相对无言，窗外的天色渐渐暗了下来。`;
    } else {
        return `我站起身来的时候，感觉整个身体都在颤抖。\n\n"我该走了。"我说，声音轻得像是叹息。\n\n陈昊也跟着站起来，他的嘴唇动了动，似乎想说什么。最后他只是从口袋里掏出一样东西，放在桌上。\n\n"这个，应该还给你。"\n\n我看着那枚小小的银色项链，眼眶瞬间就热了。\n\n那是五年前我生日那天，他送给我的礼物。也是那天晚上，我们吵了最后一架，然后我转身离开，再也没有回头。\n\n"你...一直留着它？"我的声音哽咽。\n\n"嗯。"陈昊点头，"我一直在等一个机会，把它还给你。"\n\n我拿起项链，冰凉的金属触感让我清醒了一些。\n\n"谢谢你。"我说。\n\n然后，我没有再看他，转身离开了咖啡馆。\n\n走出门的时候，我听到身后传来他的声音："林悦，我们还能再见面吗？"\n\n我没有回头。\n\n风吹过我的脸颊，带走了眼眶里的温热。我知道，这一次，我不能再回头了。\n\n只是...\n\n我或许，也并不想走得那么干脆。`;
    }
}

function generateThirdLimited(chapter, style) {
    if (chapter === 1) {
        return `林悦推开那扇沉重的玻璃门时，风铃清脆的响声在午后的咖啡馆里回荡。\n\n她选了靠窗的位置，这里的光线最好，也最适合发呆。\n\n服务员把一杯拿铁放在她面前的时候，她道了声谢，目光却一直停留在窗外。\n\n人来人往，车水马龙，这座城市永远不会因为某个人的心事而停下脚步。\n\n林悦端起咖啡喝了一口，眉头微蹙。太苦了。\n\n她放下杯子，就在这时，门口的风铃声再次响起。\n\n一个熟悉的身影走了进来。\n\n林悦的手指猛地收紧，指甲几乎要嵌入掌心。\n\n是他。\n\n陈昊。\n\n这个名字在她的心里沉寂了五年，她以为自己早就已经忘记了。可是仅仅是看到他的背影，那些被她刻意尘封的记忆就如潮水般涌来，几乎要将她淹没。\n\n陈昊在门口站定，目光在咖啡馆里扫视一圈，然后，定格在她的身上。\n\n他显然也愣住了。`;
    } else if (chapter === 2) {
        return `陈昊向林悦的方向走来，每一步都像是踩在棉花上，让他有些不真实感。\n\n五年了。\n\n他无数次想象过与她重逢的场景，可是没有一次是这样的——在一家普通的咖啡馆，在一个普通的午后，以这样猝不及防的方式。\n\n"可以坐吗？"他问，声音比他想象的要沙哑。\n\n林悦看了他很久，才轻轻点了点头。\n\n陈昊在她对面坐下，一时间不知道该说什么。该说什么呢？"好久不见"太轻，"我想你"太重，"对不起"太无力。\n\n最后他只能说："你...还好吗？"\n\n林悦端起咖啡，借着这个动作掩饰自己的情绪："挺好的。"\n\n这个答案陈昊并不意外。他太了解她了，林悦永远都是这样，把脆弱藏得很好，给所有人看的都是那张"我很好"的面孔。\n\n只有在他面前，她偶尔才会卸下防备。\n\n可是现在，在他面前的这个林悦，比任何时候都要防备。\n\n陈昊的心里一阵抽痛。\n\n是他亲手把她推开的。`;
    } else {
        return `天色暗下来的时候，林悦终于站起身。\n\n"我该走了。"她说。\n\n陈昊也跟着站起来，他想说"让我送你"，可是话到嘴边，却变成了从口袋里掏出那枚项链。\n\n银色的链子在台灯下泛着柔和的光。\n\n"这是你的。"陈昊说，"我一直...保管到现在。"\n\n林悦的目光落在项链上，身体明显颤抖了一下。\n\n"你一直留着它。"不是问句。\n\n陈昊点头："我一直想把它还给你。"\n\n林悦没有说话，只是伸手拿起那枚项链。她的指尖在微微颤抖。\n\n"谢谢你。"她说。\n\n然后，她转身离开。\n\n陈昊看着她的背影消失在门口，没有追上去。\n\n他知道，现在还不是时候。\n\n有些东西，失去只需要一瞬间，可要拿回来，却需要一辈子的时间。\n\n他等得起。\n\n窗外的天色完全黑了，街道上的灯光一盏盏亮起来。\n\n陈昊在座位上坐了很久很久。\n\n咖啡凉透了。\n\n可是他的心，却在这一刻，重新变得温热起来。`;
    }
}

function generateThirdOmniscient(chapter, style) {
    if (chapter === 1) {
        return `午后的阳光正好。\n\n林悦走进那家咖啡馆的时候，并不知道命运在这一刻为她安排了什么。她只是想找一个安静的地方，度过这难得的悠闲时光。\n\n陈昊推开那扇玻璃门的时候，也没有想到，他寻找了五年的人，就坐在窗边。\n\n这是一座拥有千万人口的城市，两个人相遇的概率，不足百万分之一。\n\n可是他们相遇了。\n\n在这个普通得不能再普通的下午。\n\n林悦看到陈昊的那一刻，时间仿佛静止了。她的心跳漏了一拍，然后以一种快要跳出来的速度疯狂跳动着。\n\n怎么会是他？\n\n陈昊看到林悦的时候，也愣住了。有那么一瞬间，他以为自己又在做梦。这个场景，他在梦里经历过无数次。\n\n可是这一次，是真的。\n\n风铃声再次响起，将两个人从各自的思绪中拉回现实。\n\n陈昊深吸一口气，向她走去。\n\n林悦端起咖啡，试图用这个小动作掩饰内心的慌乱。\n\n命运的齿轮，在这一刻，重新开始转动。`;
    } else if (chapter === 2) {
        return `陈昊在林悦对面坐下，两人之间的距离不过一张桌子的宽度，却像是隔着一条无法跨越的银河。\n\n五年的时间，说长不长，说短不短。\n\n足以让一个人脱胎换骨，也足以让一段感情从刻骨铭心变为尘封的记忆。\n\n林悦以为自己早就忘记了陈昊。过去的五年里，她把所有的精力都投入到工作中，让自己没有时间去想过去的事情。\n\n她以为自己成功了。\n\n可是陈昊的出现，让她所有的努力都变成了徒劳。\n\n陈昊看着对面的林悦。她变了，比五年前更加成熟，更加从容。可那双眼睛，那双他曾经深爱过的眼睛，还是和记忆中的一模一样。\n\n他有千言万语想要说，可是话到嘴边，却只剩下一句：\n\n"你还好吗？"\n\n简单的四个字，却承载了五年的时光和思念。\n\n林悦的回答同样简短："挺好的。"\n\n咖啡馆里的背景音乐不知何时换了一首，柔和的旋律在空气中流淌。\n\n窗外的阳光渐渐西斜，在桌面上投下长长的影子。\n\n两个人就那样坐着，沉默着，像是在等待什么。\n\n又像是在害怕什么。`;
    } else {
        return `林悦站起身的时候，陈昊也跟着站了起来。\n\n他看到林悦的身体在微微颤抖，尽管她掩饰得很好。\n\n陈昊的心里涌起一阵冲动，想要冲上去抱住她，告诉她这五年来他有多么后悔，有多么想念她。\n\n可是他忍住了。\n\n他知道，现在还不是时候。\n\n有些事情，急不得。\n\n他只能从口袋里掏出那枚项链，放在桌上。\n\n银色的链子在灯光下泛着柔和的光泽，像是某种承诺，又像是某种遗憾。\n\n林悦拿起项链的时候，陈昊清楚地看到她的眼眶红了。\n\n"谢谢你。"她轻声说。\n\n然后，她转身离开。\n\n陈昊没有追上去。他只是站在原地，看着她的背影消失在门口。\n\n林悦走出咖啡馆的时候，晚风吹过，带着夏日特有的温热。\n\n她没有回头。\n\n只是在走出很远之后，才停下脚步，从口袋里掏出那枚项链，在路灯下仔细地看着。\n\n泪水终于滑落下来。\n\n同一时刻，咖啡馆里的陈昊也在看着窗外。\n\n他的嘴角却带着一丝微笑。\n\n不管怎样，他们终于又见面了。\n\n这就是最好的开始。\n\n街道上的霓虹灯一盏盏亮起来，映照着这座城市里，无数悲欢离合的故事。\n\n而他们的故事，或许，才刚刚开始。`;
    }
}

function generateAlternating(chapter, style) {
    return generateFirstPerson(chapter, style);
}

function optimizeNovel() {
    showLoading('AI正在润色小说...');
    setTimeout(() => {
        const content = document.getElementById('novel-result-content').textContent;
        if (!content) {
            showToast('请先生成小说', 'error');
            hideLoading();
            return;
        }
        const notes = '\n\n【润色建议】\n※ 可以进一步丰富环境描写，增加氛围感\n※ 人物心理活动可以更加细腻，让读者更有代入感\n※ 可加入一些伏笔和象征手法\n※ 对话可以更生活化，避免过度戏剧化\n';
        document.getElementById('novel-result-content').textContent = content + notes;
        projectData.novel = content + notes;
        hideLoading();
        showToast('润色建议已添加', 'success');
    }, 1200);
}

// ========== 分镜脚本生成 ==========
function importScriptToStoryboard() {
    if (!projectData.script) {
        showToast('请先生成剧本', 'error');
        return;
    }
    document.getElementById('storyboard-input').value = projectData.script;
    showToast('已导入剧本内容', 'success');
}

// LLM 返回的文本解析成分镜数组
function parseShotsFromLLM(text) {
    const shots = [];
    const lines = text.split('\n').filter(l => l.trim());
    let currentShot = null;
    let shotIndex = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // 检测分镜开头：数字编号或"镜头X"等关键词
        const match = line.match(/^(\d+)[\.\、\s\)\]]+(.+)/);
        if (match || line.includes('镜头') || line.startsWith('【') || /^镜/.test(line)) {
            if (currentShot) {
                shots.push(normalizeShot(currentShot, shotIndex++));
            }
            currentShot = {
                type: '中景',
                scene: '',
                characters: '',
                cameraMove: '固定',
                duration: '5s',
                content: line.replace(/^[\d\.\、\s\)\]\【\】]+/, ''),
                dialog: '',
                imagePrompt: '',
                videoPrompt: '',
                characterPrompt: '',
                lighting: '自然光',
                mood: '平静',
                aspectRatio: '16:9'
            };
        } else if (currentShot) {
            // 追加内容或解析字段
            if (line.startsWith('场景:') || line.startsWith('场景：')) {
                currentShot.scene = line.replace(/^场景[\s:：]/, '').trim();
            } else if (line.startsWith('人物:') || line.startsWith('人物：') || line.startsWith('角色:') || line.startsWith('角色：')) {
                currentShot.characters = line.replace(/^(人物|角色)[\s:：]/, '').trim();
            } else if (line.startsWith('运镜:') || line.startsWith('运镜：') || line.startsWith('镜头:') || line.startsWith('镜头：')) {
                currentShot.cameraMove = line.replace(/^(运镜|镜头)[\s:：]/, '').trim();
            } else if (line.startsWith('对白:') || line.startsWith('对白：') || line.startsWith('台词:') || line.startsWith('台词：')) {
                currentShot.dialog = line.replace(/^(对白|台词)[\s:：]/, '').trim();
            } else if (line.startsWith('提示词:') || line.startsWith('提示词：') || line.toLowerCase().includes('prompt')) {
                currentShot.imagePrompt = line.replace(/^[^:：]*[:：]/, '').trim();
            } else {
                currentShot.content = (currentShot.content + ' ' + line).trim();
            }
        }
    }
    if (currentShot) shots.push(normalizeShot(currentShot, shotIndex));

    // 如果解析不出分镜（LLM 返回非结构化文本），则退回本地模板
    if (shots.length === 0) {
        return null;
    }
    return shots;
}

function generateStoryboard() {
    const input = document.getElementById('storyboard-input').value.trim();
    const visualStyle = document.getElementById('visual-style').value;
    const shotCount = parseInt(document.getElementById('shot-count').value) || 8;
    const pace = document.getElementById('shot-pace').value;
    const aspectRatio = document.getElementById('aspect-ratio').value;

    if (!input) {
        showToast('请输入剧本内容或点击"从剧本导入"', 'error');
        return;
    }

    showLoading('AI正在设计分镜...');

    const brief = `作为分镜师，将以下剧本内容拆解为${shotCount}个分镜。视觉风格：${visualStyle}，节奏：${pace}，画面比例：${aspectRatio}。请为每个分镜包含以下字段：\n- 景别（远景/全景/中景/近景/特写等）\n- 场景描述\n- 人物\n- 运镜\n- 时长\n- 画面内容\n- 对白/音效\n- 画面情绪\n- AI图片提示词（英文）\n\n剧本内容：\n${input}`;

    callLLM('storyboard', brief, () => generateShots(input, visualStyle, shotCount, pace, aspectRatio)).then(({ content, source }) => {
        let shots;
        if (source === 'llm' && typeof content === 'string') {
            const parsed = parseShotsFromLLM(content);
            shots = parsed || generateShots(input, visualStyle, shotCount, pace, aspectRatio);
        } else if (Array.isArray(content)) {
            shots = content.map((s, i) => normalizeShot(s, i));
        } else {
            shots = generateShots(input, visualStyle, shotCount, pace, aspectRatio);
        }

        projectData.shots = shots;
        renderShots(shots);
        hideLoading();
        const sourceLabel = source === 'llm' ? 'AI生成' : '本地模板';
        setStatus('分镜已生成（' + sourceLabel + '）· 共 ' + shots.length + ' 个镜头');
        showToast('分镜脚本生成完成！可编辑每个分镜', 'success');
    });
}

function generateShots(script, visualStyle, count, pace, aspectRatio) {
    const shots = [];
    const styleKeywords = VISUAL_STYLES[visualStyle] || VISUAL_STYLES.cinematic;
    const mood = randomFrom(MOOD_WORDS);

    // 分镜结构：建立-引入-推进-高潮-收束
    const shotProgressions = [
        { typeRange: ['远景', '全景'], content: '建立场景，展示环境氛围', charCount: 0 },
        { typeRange: ['中景', '中近景'], content: '引入主要人物，展示人物状态', charCount: 1 },
        { typeRange: ['近景', '中近景'], content: '人物互动，事件开端', charCount: 2 },
        { typeRange: ['近景', '过肩镜头'], content: '对话进行，情感表露', charCount: 2 },
        { typeRange: ['特写', '近景'], content: '关键动作/表情，情节转折', charCount: 1 },
        { typeRange: ['双人镜头', '中景'], content: '人物关系变化，冲突升级', charCount: 2 },
        { typeRange: ['特写', '大特写'], content: '情绪高潮，情感爆发', charCount: 1 },
        { typeRange: ['全景', '远景'], content: '场景收束，余韵悠长', charCount: 1 },
        { typeRange: ['中景', '近景'], content: '后续发展或悬念设置', charCount: 2 },
        { typeRange: ['空镜头', '远景'], content: '留白与情绪收尾', charCount: 0 }
    ];

    for (let i = 0; i < count; i++) {
        const template = shotProgressions[i % shotProgressions.length];
        const progress = (i + 1) / count;

        const shot = {
            id: i + 1,
            type: randomFrom(template.typeRange),
            scene: generateSceneForShot(progress),
            characters: generateCharactersForShot(progress, template.charCount),
            cameraMove: generateCameraMove(progress, pace),
            duration: generateDuration(progress, pace),
            content: template.content,
            dialog: generateDialogForShot(progress),
            imagePrompt: generateImagePrompt(visualStyle, progress, template),
            videoPrompt: generateVideoPrompt(visualStyle, progress),
            characterPrompt: generateCharacterPrompt(progress, template.charCount),
            lighting: generateLighting(progress, mood),
            mood: mood,
            aspectRatio: aspectRatio
        };
        shots.push(shot);
    }

    return shots;
}

function generateSceneForShot(progress) {
    const scenes = [
        '咖啡馆外景', '咖啡馆内', '窗边位置', '街道转角', '咖啡馆门口',
        '咖啡馆内景', '两人桌前', '窗外街景', '主角特写场景', '室内氛围'
    ];
    return scenes[Math.floor(progress * scenes.length)] || scenes[0];
}

function generateCharactersForShot(progress, count) {
    if (count === 0) return '无/环境';
    if (count === 1) return randomFrom(['林悦', '陈昊']);
    return '林悦 + 陈昊';
}

function generateCameraMove(progress, pace) {
    if (pace === 'slow') {
        return randomFrom(['固定', '缓慢推镜', '缓慢拉镜', '轻微摇镜']);
    } else if (pace === 'fast') {
        return randomFrom(['快速推镜', '快速切换', '甩镜', '手持跟拍']);
    } else if (pace === 'dynamic') {
        if (progress < 0.5) return randomFrom(['固定', '稳定器']);
        return randomFrom(['推镜', '跟拍', '环绕']);
    }
    return randomFrom(['固定', '推镜', '拉镜', '摇镜', '跟拍', '稳定器']);
}

function generateDuration(progress, pace) {
    if (pace === 'slow') return randomFrom(['5秒', '6秒', '7秒', '8秒']);
    if (pace === 'fast') return randomFrom(['2秒', '3秒', '4秒']);
    if (pace === 'dynamic') {
        if (progress < 0.3) return '5秒';
        if (progress < 0.7) return '3秒';
        return '6秒';
    }
    return randomFrom(['3秒', '4秒', '5秒', '6秒']);
}

function generateDialogForShot(progress) {
    if (progress < 0.2) return '（环境音/无对白）';
    if (progress < 0.4) return '林悦：又是下雨天...';
    if (progress < 0.6) return '陈昊：林悦...真的是你。';
    if (progress < 0.8) return '陈昊：我一直想找机会...跟你道歉。';
    return '（沉默/只有动作）';
}

function generateImagePrompt(style, progress, template) {
    const styleKeywords = VISUAL_STYLES[style] || VISUAL_STYLES.cinematic;
    const keywords = [];
    keywords.push(randomFrom(styleKeywords));

    // 场景元素
    if (progress < 0.2) keywords.push('cafe exterior street view');
    else if (progress < 0.4) keywords.push('cafe interior warm lighting');
    else if (progress < 0.6) keywords.push('people talking emotional moment');
    else if (progress < 0.8) keywords.push('close up emotional expression');
    else keywords.push('cinematic wide shot atmosphere');

    // 人物元素
    if (template.charCount >= 1) {
        keywords.push('young asian ' + (template.charCount === 1 ? 'woman or man' : 'couple'));
    }

    // 情绪元素
    const moods = ['emotional', 'warm', 'melancholic', 'nostalgic', 'hopeful', 'tense'];
    keywords.push(randomFrom(moods));

    return keywords.join(', ') + ', detailed, 8k, masterpiece';
}

function generateVideoPrompt(style, progress) {
    const moves = [
        'slow cinematic pan', 'gentle tracking shot', 'static composition',
        'slow push in', 'soft camera movement', 'subtle handheld motion'
    ];
    const lighting = ['natural light', 'warm golden hour', 'soft indoor lighting', 'dramatic chiaroscuro'];
    return `${randomFrom(moves)}, ${randomFrom(lighting)}, shallow depth of field, cinematic`;
}

function generateCharacterPrompt(progress, charCount) {
    if (charCount === 0) return '';
    if (charCount === 1) {
        const isFemale = Math.random() > 0.5;
        return isFemale
            ? '林悦：25-28岁女性，长发，优雅知性，白色连衣裙或简约衬衫，神情略带伤感'
            : '陈昊：28-32岁男性，短发挺拔，商务休闲装，气质成熟内敛';
    }
    return '林悦（女性，长发优雅）和陈昊（男性，挺拔成熟），两人相对，气氛微妙';
}

function generateLighting(progress, mood) {
    const lightings = [
        '自然光 · 午后阳光',
        '暖色调 · 室内灯光',
        '侧光 · 戏剧感',
        '柔和逆光 · 剪影效果',
        '冷光 · 情绪压抑',
        '顶光 · 神圣感'
    ];
    return lightings[Math.floor(progress * lightings.length)] || lightings[0];
}

function renderShots(shots) {
    const container = document.getElementById('shots-container');
    const list = document.getElementById('shots-list');
    container.style.display = 'block';
    list.innerHTML = '';

    shots.forEach((shot, index) => {
        const card = document.createElement('div');
        card.className = 'shot-card';
        const typeOptions = SHOT_TYPES.map(t => `<option value="${t}" ${t === shot.type ? 'selected' : ''}>${t}</option>`).join('');
        const cameraOptions = CAMERA_MOVES.map(m => `<option value="${m}" ${m === shot.cameraMove ? 'selected' : ''}>${m}</option>`).join('');
        card.innerHTML = `
            <div class="shot-header">
                <span class="shot-number">◉ 分镜 ${shot.id} / ${shots.length}</span>
                <div class="shot-actions">
                    <button class="btn btn-sm" onclick="moveShot(${index}, -1)">↑</button>
                    <button class="btn btn-sm" onclick="moveShot(${index}, 1)">↓</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteShot(${index})">删除</button>
                </div>
            </div>
            <div class="shot-body">
                <div class="shot-info-grid">
                    <div class="shot-info-item">
                        <div class="shot-info-label">镜别</div>
                        <select class="shot-select" data-field="type">${typeOptions}</select>
                    </div>
                    <div class="shot-info-item">
                        <div class="shot-info-label">场景</div>
                        <input type="text" class="shot-input" data-field="scene" value="${shot.scene}">
                    </div>
                    <div class="shot-info-item">
                        <div class="shot-info-label">人物</div>
                        <input type="text" class="shot-input" data-field="characters" value="${shot.characters}">
                    </div>
                    <div class="shot-info-item">
                        <div class="shot-info-label">运镜</div>
                        <select class="shot-select" data-field="cameraMove">${cameraOptions}</select>
                    </div>
                    <div class="shot-info-item">
                        <div class="shot-info-label">时长</div>
                        <input type="text" class="shot-input" data-field="duration" value="${shot.duration}">
                    </div>
                    <div class="shot-info-item">
                        <div class="shot-info-label">情绪基调</div>
                        <input type="text" class="shot-input" data-field="mood" value="${shot.mood}">
                    </div>
                </div>
                <div class="shot-field">
                    <div class="shot-field-label">画面内容描述</div>
                    <textarea class="shot-content" data-field="content" rows="2">${shot.content}</textarea>
                </div>
                <div class="shot-field">
                    <div class="shot-field-label">对白 / 旁白 / 音效</div>
                    <textarea class="shot-content" data-field="dialog" rows="2">${shot.dialog}</textarea>
                </div>
                <div class="shot-field">
                    <div class="shot-field-label">打光 / 色调</div>
                    <textarea class="shot-content" data-field="lighting" rows="1">${shot.lighting}</textarea>
                </div>
                <div class="shot-field">
                    <div class="shot-field-label">静态图提示词 (Image Prompt)</div>
                    <textarea class="shot-content" data-field="imagePrompt" rows="2">${shot.imagePrompt}</textarea>
                </div>
                <div class="shot-field">
                    <div class="shot-field-label">视频动态提示词 (Video Prompt)</div>
                    <textarea class="shot-content" data-field="videoPrompt" rows="2">${shot.videoPrompt}</textarea>
                </div>
                <div class="shot-field">
                    <div class="shot-field-label">人物形象提示词</div>
                    <textarea class="shot-content" data-field="characterPrompt" rows="2">${shot.characterPrompt}</textarea>
                </div>
            </div>
        `;
        list.appendChild(card);
    });

    // 添加事件监听 - 自动保存编辑内容
    list.querySelectorAll('.shot-input, .shot-select, .shot-content').forEach(el => {
        el.addEventListener('change', (e) => {
            const card = e.target.closest('.shot-card');
            const idx = Array.from(list.children).indexOf(card);
            const field = e.target.dataset.field;
            projectData.shots[idx][field] = e.target.value;
        });
    });
}

function moveShot(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= projectData.shots.length) return;
    const temp = projectData.shots[index];
    projectData.shots[index] = projectData.shots[newIndex];
    projectData.shots[newIndex] = temp;
    // 重新编号
    projectData.shots.forEach((s, i) => s.id = i + 1);
    renderShots(projectData.shots);
    showToast('分镜顺序已调整', 'info');
}

function deleteShot(index) {
    if (projectData.shots.length <= 1) {
        showToast('至少保留一个分镜', 'error');
        return;
    }
    projectData.shots.splice(index, 1);
    projectData.shots.forEach((s, i) => s.id = i + 1);
    renderShots(projectData.shots);
    showToast('分镜已删除', 'info');
}

function addShotManually() {
    const newShot = {
        id: projectData.shots.length + 1,
        type: '中景',
        scene: '待填写',
        characters: '待填写',
        cameraMove: '固定',
        duration: '3秒',
        content: '请描述本镜头画面...',
        dialog: '（对白内容）',
        imagePrompt: 'cinematic, detailed, 8k, masterpiece',
        videoPrompt: 'static shot, natural lighting',
        characterPrompt: '',
        lighting: '自然光',
        mood: '平静',
        aspectRatio: '16:9'
    };
    projectData.shots.push(newShot);
    renderShots(projectData.shots);
    showToast('已添加新分镜，请编辑内容', 'success');
}

function regenerateStoryboard() {
    generateStoryboard();
}

// ========== 故事板可视化 ==========
function renderStoryboard() {
    const viewMode = document.getElementById('board-view-mode').value;
    const view = document.getElementById('board-view');

    if (!projectData.shots || projectData.shots.length === 0) {
        view.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎬</div>
                <h3>故事板预览区</h3>
                <p>请先生成分镜脚本，然后点击"从分镜脚本载入"查看故事板。</p>
            </div>
        `;
        return;
    }

    const shots = projectData.shots;

    if (viewMode === 'grid') {
        renderBoardGrid(view, shots);
    } else if (viewMode === 'timeline') {
        renderBoardTimeline(view, shots);
    } else if (viewMode === '4x3') {
        renderBoard4x3(view, shots);
    } else {
        renderBoardCarousel(view, shots);
    }
}

function renderBoard4x3(container, shots) {
    container.innerHTML = '';
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(4, 1fr)';
    container.style.gap = '12px';

    // 确保正好12个镜头（4×3布局）
    const displayShots = [...shots];
    while (displayShots.length < 12) {
        displayShots.push({
            id: displayShots.length + 1,
            type: '空镜头',
            scene: '待填充',
            characters: '-',
            cameraMove: '固定',
            duration: '1s',
            mood: '中性',
            content: '点击分镜脚本添加内容',
            dialog: '-',
            imagePrompt: '',
            videoPrompt: '',
            characterPrompt: '',
            lighting: '标准'
        });
    }

    displayShots.slice(0, 12).forEach(shot => {
        container.appendChild(createBoardCard(shot));
    });
}

function renderBoardGrid(container, shots) {
    container.innerHTML = '';
    const columns = parseInt(document.getElementById('board-columns').value) || 3;
    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    container.style.gap = '16px';

    shots.forEach(shot => {
        container.appendChild(createBoardCard(shot));
    });
}

function renderBoardTimeline(container, shots) {
    container.innerHTML = '';
    container.style.display = 'block';
    const timeline = document.createElement('div');
    timeline.className = 'board-timeline';
    timeline.style.position = 'relative';
    timeline.style.paddingLeft = '40px';

    shots.forEach((shot, idx) => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.style.marginBottom = '24px';
        item.style.position = 'relative';
        item.innerHTML = `
            <div style="position: absolute; left: -34px; top: 20px; width: 16px; height: 16px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 50%; border: 3px solid #1e293b; box-shadow: 0 0 0 2px #6366f1;"></div>
        `;
        item.appendChild(createBoardCard(shot));
        timeline.appendChild(item);
    });

    container.appendChild(timeline);
}

function renderBoardCarousel(container, shots) {
    container.innerHTML = '';
    const carousel = document.createElement('div');
    carousel.style.display = 'flex';
    carousel.style.gap = '16px';
    carousel.style.overflowX = 'auto';
    carousel.style.paddingBottom = '16px';
    carousel.style.scrollSnapType = 'x mandatory';

    shots.forEach(shot => {
        const card = createBoardCard(shot);
        card.style.minWidth = '320px';
        card.style.scrollSnapAlign = 'start';
        carousel.appendChild(card);
    });

    container.appendChild(carousel);
}

function createBoardCard(shot) {
    const card = document.createElement('div');
    card.className = 'board-card';
    card.style.background = '#1e293b';
    card.style.borderRadius = '12px';
    card.style.overflow = 'hidden';
    card.style.border = '1px solid #475569';
    card.style.transition = 'all 0.2s ease';

    // 视觉预览区（用渐变和图标模拟）
    const imageArea = document.createElement('div');
    imageArea.style.height = '160px';
    imageArea.style.background = `linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)`;
    imageArea.style.display = 'flex';
    imageArea.style.alignItems = 'center';
    imageArea.style.justifyContent = 'center';
    imageArea.style.position = 'relative';
    imageArea.innerHTML = `
        <div style="position: absolute; top: 10px; left: 10px; background: rgba(99, 102, 241, 0.9); color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">#${shot.id}</div>
        <div style="font-size: 40px; opacity: 0.7;">${getShotIcon(shot.type)}</div>
        <div style="position: absolute; bottom: 8px; right: 10px; font-size: 11px; color: #94a3b8;">${shot.type} · ${shot.duration}</div>
    `;

    // 内容区
    const contentArea = document.createElement('div');
    contentArea.style.padding = '16px';

    const title = document.createElement('div');
    title.style.fontSize = '13px';
    title.style.fontWeight = '600';
    title.style.color = '#818cf8';
    title.style.marginBottom = '8px';
    title.textContent = `${shot.scene}`;

    const desc = document.createElement('div');
    desc.style.fontSize = '12px';
    desc.style.color = '#94a3b8';
    desc.style.lineHeight = '1.5';
    desc.textContent = shot.content.substring(0, 60) + (shot.content.length > 60 ? '...' : '');

    const meta = document.createElement('div');
    meta.style.display = 'flex';
    meta.style.gap = '6px';
    meta.style.flexWrap = 'wrap';
    meta.style.marginTop = '12px';
    meta.style.fontSize = '10px';

    const tags = [shot.type, shot.cameraMove, shot.mood, shot.lighting.split(' ')[0]];
    tags.forEach(tag => {
        const span = document.createElement('span');
        span.style.padding = '3px 8px';
        span.style.background = '#334155';
        span.style.borderRadius = '10px';
        span.style.color = '#94a3b8';
        span.textContent = tag;
        meta.appendChild(span);
    });

    contentArea.appendChild(title);
    contentArea.appendChild(desc);
    contentArea.appendChild(meta);

    card.appendChild(imageArea);
    card.appendChild(contentArea);

    // 添加鼠标悬停效果
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-4px)';
        card.style.boxShadow = '0 10px 40px rgba(99, 102, 241, 0.2)';
        card.style.borderColor = '#6366f1';
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
        card.style.borderColor = '#475569';
    });

    return card;
}

function getShotIcon(type) {
    const icons = {
        '远景': '🏙️', '全景': '🌄', '中景': '👥', '中近景': '👤',
        '近景': '😊', '特写': '👁️', '大特写': '✨', '主观镜头': '👀',
        '客观镜头': '🎥', '反应镜头': '😮', '过肩镜头': '🎬', '双人镜头': '👫',
        '三人镜头': '👪', '群像镜头': '👥', '空镜头': '🌅', '插入镜头': '🔍',
        '俯拍': '⬇️', '仰拍': '⬆️', '平拍': '➡️', '顶拍': '⭕', '反打': '↩️', '正反打': '🔄'
    };
    return icons[type] || '🎞️';
}

function refreshStoryboard() {
    renderStoryboard();
    // 切换到故事板标签页
    document.querySelectorAll('.tab-btn')[4].classList.add('active');
    showToast('故事板已刷新', 'success');
}

// ========== 内容编辑功能 ==========
function editContent(elementId) {
    const el = document.getElementById(elementId);
    if (el.isContentEditable && el.getAttribute('contenteditable') === 'true') {
        el.setAttribute('contenteditable', 'false');
        el.style.background = '';
        el.style.border = '';
        showToast('编辑已保存', 'success');
    } else {
        el.setAttribute('contenteditable', 'true');
        el.style.background = '#1e293b';
        el.style.border = '2px dashed #6366f1';
        el.style.borderRadius = '8px';
        el.style.padding = '16px';
        el.focus();
        showToast('正在编辑中，再次点击按钮保存', 'info');
    }
}

function copyContent(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(() => {
        showToast('内容已复制到剪贴板', 'success');
    }).catch(() => {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('内容已复制到剪贴板', 'success');
    });
}

// ========== 模板库功能 ==========
function showTemplates() {
    const modal = document.getElementById('template-modal');
    modal.style.display = 'flex';
    filterTemplates();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function filterTemplates() {
    const keyword = document.getElementById('template-search').value.toLowerCase();
    const type = document.getElementById('template-type').value;
    const list = document.getElementById('template-list');

    const filtered = TEMPLATES.filter(t => {
        const typeMatch = type === 'all' || t.type === type;
        const keywordMatch = !keyword
            || t.title.toLowerCase().includes(keyword)
            || t.desc.toLowerCase().includes(keyword)
            || (t.tags && t.tags.some(tag => tag.toLowerCase().includes(keyword)));
        return typeMatch && keywordMatch;
    });

    if (filtered.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">没有找到匹配的模板</div>';
        return;
    }

    list.innerHTML = filtered.map(t => `
        <div class="template-item" onclick="applyTemplate('${t.id}')">
            <div class="template-header">
                <div class="template-title">${t.title}</div>
                <div class="template-type">${getTemplateTypeName(t.type)}</div>
            </div>
            <div class="template-desc">${t.desc}</div>
            <div class="template-tags">
                ${(t.tags || []).map(tag => `<span class="template-tag">${tag}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

function getTemplateTypeName(type) {
    const map = { outline: '大纲模板', script: '剧本模板', novel: '小说模板', storyboard: '分镜模板' };
    return map[type] || type;
}

function applyTemplate(templateId) {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    closeModal('template-modal');

    if (template.type === 'outline') {
        applyOutlineTemplate(template);
        switchTab('outline');
    } else if (template.type === 'script') {
        applyScriptTemplate(template);
        switchTab('script');
    } else if (template.type === 'storyboard') {
        applyStoryboardTemplate(template);
        switchTab('storyboard');
    } else if (template.type === 'novel') {
        switchTab('novel');
        showToast('模板已加载，可直接点击生成', 'success');
    }
}

function applyOutlineTemplate(template) {
    const content = template.content;
    document.getElementById('genre').value = '都市情感';
    document.getElementById('theme').value = content.theme || '';
    // 清空现有角色
    const container = document.getElementById('characters-container');
    container.innerHTML = '';
    addCharacter('林悦', '28岁，建筑设计师', '外表坚强独立，内心细腻敏感');
    addCharacter('陈昊', '30岁，互联网公司创始人', '外冷内热，理性思维');
    document.getElementById('plot').value = content.plot || '';
    showToast(`已应用模板：${template.title}`, 'success');
}

function applyScriptTemplate(template) {
    document.getElementById('script-input').value = template.content.scenes || '';
    document.getElementById('script-format').value = template.content.format || 'standard';
    showToast(`已应用剧本模板：${template.title}`, 'success');
}

function applyStoryboardTemplate(template) {
    projectData.shots = template.content.shots.map((s, i) => ({ ...s, id: i + 1 }));
    document.getElementById('visual-style').value = template.content.visualStyle || 'cinematic';
    document.getElementById('shot-count').value = template.content.shotCount || 6;
    renderShots(projectData.shots);
    showToast(`已应用分镜模板：${template.title}`, 'success');
    // 自动检测重复并提示优化建议
    detectDuplicateShots();
}

// ========== 图片重复检测与优化 ==========
function detectDuplicateShots() {
    if (!projectData.shots || projectData.shots.length < 2) return;

    const duplicates = [];
    const seen = {};

    projectData.shots.forEach((shot, index) => {
        const key = `${shot.type}-${shot.scene}-${shot.cameraMove}`;
        if (seen[key]) {
            duplicates.push({ first: seen[key], second: index, reason: key });
        }
        seen[key] = index;
    });

    if (duplicates.length > 0) {
        let message = `检测到 ${duplicates.length} 个潜在重复镜头：\n`;
        duplicates.forEach(d => {
            message += `• 分镜 ${d.first + 1} 与 ${d.second + 1} 可能重复\n`;
        });
        message += '\n建议：点击分镜卡片调整镜别、运镜或场景描述';
        showToast(message, 'info');
    } else {
        showToast('✓ 未检测到重复镜头，分镜多样性良好！', 'success');
    }
}

// ========== AI 绘画提示词优化 ==========
function optimizeAllPrompts() {
    showLoading('AI正在优化绘画提示词...');
    setTimeout(() => {
        projectData.shots.forEach((shot, index) => {
            // 优化 Image Prompt
            shot.imagePrompt = enhancePrompt(shot.imagePrompt, shot.type, shot.scene, shot.mood);
            // 优化 Video Prompt
            shot.videoPrompt = enhanceVideoPrompt(shot.videoPrompt, shot.cameraMove, shot.duration);
            // 优化 Character Prompt
            if (shot.characterPrompt) {
                shot.characterPrompt = enhanceCharacterPrompt(shot.characterPrompt);
            }
        });
        renderShots(projectData.shots);
        hideLoading();
        showToast('所有提示词已优化！适合 AI 绘画工具使用', 'success');
    }, 1500);
}

function enhancePrompt(basePrompt, shotType, scene, mood) {
    const typeEnhancements = {
        '全景': 'wide shot composition, establishing shot, cinematic wide angle',
        '中景': 'medium shot framing, balanced composition, natural proportions',
        '近景': 'close up framing, detailed facial expressions, shallow depth of field',
        '特写': 'extreme close up, dramatic framing, hyper detailed',
        '大特写': 'macro close up, ultra detailed textures, intimate perspective',
        '远景': 'extreme wide shot, epic scale, environmental context',
        '过肩镜头': 'over the shoulder shot, conversation perspective',
        '双人镜头': 'two person composition, relationship focus',
        '空镜头': 'establishing shot, atmosphere focus, no characters'
    };

    const moodEnhancements = {
        '凝重': 'dramatic lighting, somber mood, low key',
        '紧张': 'tense atmosphere, high contrast, dramatic shadows',
        '爆发': 'dynamic action, motion blur, high energy',
        '决绝': 'determined expression, strong composition, powerful framing',
        '专注': 'intense focus, sharp details, shallow depth of field',
        '激烈': 'high action, dynamic motion, dramatic angles',
        '飘逸': 'flowing motion, ethereal quality, soft lighting',
        '旋转': 'spinning motion, circular composition, centripetal force',
        '悲壮': 'melancholic mood, heroic lighting, emotional depth',
        '高潮': 'peak action, dramatic climax, cinematic lighting',
        '悲怆': 'emotional intensity, tearful expression, soft lighting'
    };

    const sceneKeywords = {
        '深夜戏曲舞台': 'chinese opera stage, dramatic spotlight, traditional setting',
        '舞台中央': 'stage center, spotlight focus, performance area',
        '拔剑瞬间': 'action moment, sword drawing, dramatic timing',
        '舞台全景': 'full stage view, theatrical setting, audience perspective',
        '虞姬面部': 'close up portrait, emotional expression, character focus'
    };

    let enhanced = basePrompt || '';
    enhanced += (enhanced ? ', ' : '') + (typeEnhancements[shotType] || '');
    enhanced += (enhanced ? ', ' : '') + (moodEnhancements[mood] || '');
    enhanced += (enhanced ? ', ' : '') + (sceneKeywords[scene] || '');
    enhanced += (enhanced ? ', ' : '') + 'professional concept art, cinematic quality, high detail, 8k resolution, masterpiece';

    return enhanced.trim();
}

function enhanceVideoPrompt(basePrompt, cameraMove, duration) {
    const moveEnhancements = {
        '推镜': 'slow push in, smooth camera movement, gradual zoom',
        '拉镜': 'slow pull back, revealing scene, expanding view',
        '摇镜': 'smooth pan, horizontal movement, revealing composition',
        '跟镜': 'tracking shot, following subject, dynamic movement',
        '环绕': 'orbit shot, 360 degree view, immersive experience',
        '固定': 'static composition, stable framing, cinematic stillness',
        '推镜+跟镜': 'combined push and track, dynamic approach',
        '横摇移镜': 'horizontal pan with movement, fluid transition',
        '拉镜+环绕': 'pull back with orbit, expanding perspective'
    };

    const durationEnhancements = {
        '0.8s': 'quick cut, fast pace, snappy timing',
        '1.2s': 'medium duration, balanced timing',
        '1.6s': 'extended moment, lingering shot, emotional beat',
        '2.4s': 'slow moment, contemplative timing, dramatic pause'
    };

    let enhanced = basePrompt || '';
    enhanced += (enhanced ? ', ' : '') + (moveEnhancements[cameraMove] || '');
    enhanced += (enhanced ? ', ' : '') + (durationEnhancements[duration] || '');
    enhanced += (enhanced ? ', ' : '') + 'cinematic video, smooth motion, professional cinematography, film grain';

    return enhanced.trim();
}

function enhanceCharacterPrompt(basePrompt) {
    const enhancements = [
        'detailed costume design',
        'expressive facial features',
        'dynamic pose',
        'professional character design',
        'cinematic lighting on face',
        'emotional expression'
    ];

    let enhanced = basePrompt || '';
    enhancements.forEach(e => {
        if (!enhanced.toLowerCase().includes(e.toLowerCase())) {
            enhanced += (enhanced ? ', ' : '') + e;
        }
    });

    return enhanced.trim();
}

// ========== 大数据查询优化故事板 ==========
function optimizeStoryboardWithBigData() {
    showLoading('正在通过大数据优化故事板...');

    setTimeout(() => {
        // 模拟大数据查询优化建议
        const suggestions = [];

        // 检查镜别多样性
        const shotTypes = projectData.shots.map(s => s.type);
        const uniqueTypes = [...new Set(shotTypes)];
        if (uniqueTypes.length < 5) {
            suggestions.push(`镜别多样性不足（当前使用 ${uniqueTypes.length} 种），建议增加：${getRecommendedShotTypes(shotTypes).join('、')}`);
        }

        // 检查运镜多样性
        const moves = projectData.shots.map(s => s.cameraMove);
        const uniqueMoves = [...new Set(moves)];
        if (uniqueMoves.length < 4) {
            suggestions.push(`运镜方式较单一（当前使用 ${uniqueMoves.length} 种），建议尝试：${getRecommendedMoves(moves).join('、')}`);
        }

        // 检查时长分布
        const avgDuration = projectData.shots.reduce((sum, s) => sum + parseFloat(s.duration), 0) / projectData.shots.length;
        if (avgDuration < 0.8 || avgDuration > 2) {
            suggestions.push(`平均镜头时长(${avgDuration.toFixed(2)}s)偏离标准范围(0.8-2s)，建议调整节奏`);
        }

        // 检查情绪变化
        const moods = [...new Set(projectData.shots.map(s => s.mood))];
        if (moods.length < 3) {
            suggestions.push(`情绪变化较少（当前 ${moods.length} 种），建议增加情绪层次：${getRecommendedMoods(moods).join('、')}`);
        }

        // 自动优化提示词
        optimizeAllPrompts();

        // 显示优化建议
        if (suggestions.length > 0) {
            let message = '大数据分析优化建议：\n';
            suggestions.forEach((s, i) => message += `${i + 1}. ${s}\n`);
            showToast(message, 'info');
        } else {
            showToast('🎉 故事板已达到优秀标准！大数据分析完成', 'success');
        }

        hideLoading();
    }, 2000);
}

function getRecommendedShotTypes(used) {
    const allTypes = ['全景', '中景', '近景', '特写', '大特写', '远景', '过肩镜头', '空镜头'];
    return allTypes.filter(t => !used.includes(t)).slice(0, 3);
}

function getRecommendedMoves(used) {
    const allMoves = ['推镜', '拉镜', '摇镜', '跟镜', '环绕', '固定', '甩镜', '移镜'];
    return allMoves.filter(m => !used.includes(m)).slice(0, 3);
}

function getRecommendedMoods(used) {
    const allMoods = ['紧张', '专注', '爆发', '决绝', '飘逸', '悲壮', '高潮', '悲怆', '平静', '希望'];
    return allMoods.filter(m => !used.includes(m)).slice(0, 3);
}

function loadTemplate(type) {
    showTemplates();
    document.getElementById('template-type').value = type;
    filterTemplates();
}

// ========== AI助手引导大纲设计 ==========
function startOutlineWithAI() {
    // 显示引导提示
    const guideBox = document.getElementById('outline-ai-guide');
    const stepText = document.getElementById('outline-ai-step');
    if (guideBox) {
        guideBox.style.display = 'block';
        if (stepText) stepText.textContent = '请告诉我您想创作什么样的故事，我来帮您填写大纲！';
    }
    
    // 打开智能助手
    if (window.AgentAssistant) {
        AgentAssistant.open();
        setTimeout(() => {
            AgentAssistant.handleInput('我想创作一个短剧故事，请帮我设计剧本大纲。我需要先告诉你什么信息？');
        }, 300);
    }
}

// 供AI助手回调填写的函数
function fillOutlineField(field, value) {
    const el = document.getElementById(field);
    if (el) {
        el.value = value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

// ========== 项目保存与加载 ==========
async function saveProject() {
    try {
        const titleEl = document.getElementById('project-name');
        projectData.metadata.title = titleEl ? (titleEl.value || '未定名项目') : '未定名项目';
        projectData.metadata.updatedAt = new Date().toISOString();

        // 收集大纲结果
        const outlineResult = document.getElementById('outline-result-content');
        if (outlineResult && outlineResult.textContent) {
            projectData.outline = outlineResult.textContent;
        }

        // 收集剧本结果
        const scriptResult = document.getElementById('script-result-content');
        if (scriptResult && scriptResult.textContent) {
            projectData.script = scriptResult.textContent;
        }

        // 收集小说结果
        const novelResult = document.getElementById('novel-result-content');
        if (novelResult && novelResult.textContent) {
            projectData.novel = novelResult.textContent;
        }

        // 保存到 localStorage
        localStorage.setItem('shortDramaProject', JSON.stringify(projectData));

        // 同时保存到 IndexedDB
        if (selectedProjectId && window.projectManager && window.projectManager.database) {
            try {
                const existing = await window.projectManager.database.getProject(selectedProjectId);
                if (existing) {
                    existing.title = projectData.metadata.title;
                    existing.description = existing.description || '';
                    existing.outline = projectData.outline || existing.outline || '';
                    existing.script = projectData.script || existing.script || '';
                    existing.novel = projectData.novel || existing.novel || '';
                    existing.updatedAt = new Date().toISOString();
                    await window.projectManager.database.updateProject(existing);
                }
            } catch (dbErr) { console.warn('同步到数据库失败:', dbErr); }
        }

        showToast('项目已保存！同时生成 JSON 备份文件', 'success');

        // 同时提供下载（可选，注释掉避免打扰）
        // downloadProjectAsJson();
    } catch (e) {
        console.error('保存失败:', e);
        showToast('保存失败: ' + (e.message || e), 'error');
    }
}

function downloadProjectAsJson() {
    try {
        const dataStr = JSON.stringify(projectData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${projectData.metadata.title || '短剧项目'}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            if (link.parentNode) document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    } catch (e) {
        console.error(e);
    }
}

function loadProject() {
    try {
        // 创建文件选择器
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const loaded = JSON.parse(ev.target.result);
                    if (loaded && typeof loaded === 'object') {
                        // 合并到 projectData
                        Object.assign(projectData, loaded);
                        const titleEl = document.getElementById('project-name');
                        if (titleEl) titleEl.value = projectData.metadata.title || '';
                        showToast('项目加载成功！', 'success');
                    } else {
                        showToast('文件格式不正确', 'error');
                    }
                } catch (err) {
                    showToast('文件解析失败', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    } catch (e) {
        showToast('加载失败: ' + (e.message || e), 'error');
    }
}

// ========== 导出功能 ==========
function exportFile(type, format) {
    if (type === 'all' && format === 'json') {
        downloadProjectAsJson();
        return;
    }
    if (type === 'all' && format === 'md') {
        exportFullMarkdown();
        return;
    }
    if (type === 'storyboard' && format === 'html') {
        exportStoryboardHTML();
        return;
    }

    let content = '';
    let filename = '';

    if (type === 'outline') {
        content = projectData.outline || document.getElementById('outline-result-content').textContent || '大纲内容为空';
        filename = '大纲.txt';
    } else if (type === 'script') {
        content = projectData.script || document.getElementById('script-result-content').textContent || '剧本内容为空';
        filename = '剧本.txt';
    } else if (type === 'novel') {
        content = projectData.novel || document.getElementById('novel-result-content').textContent || '小说内容为空';
        filename = '小说.txt';
    } else if (type === 'storyboard') {
        if (format === 'csv') {
            content = exportStoryboardCSV();
            filename = '分镜脚本.csv';
        } else {
            content = exportStoryboardText();
            filename = '分镜脚本.txt';
        }
    }

    downloadFile(content, filename, format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8');
    showToast(`已导出 ${filename}`, 'success');
}

function downloadFile(content, filename, mimeType) {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const projectName = document.getElementById('project-name').value || '短剧项目';
    link.download = `${projectName}_${filename}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    updateProjectSummary();
}

function exportStoryboardText() {
    if (!projectData.shots || projectData.shots.length === 0) {
        return '请先生成分镜脚本';
    }
    let text = '';
    text += `《${projectData.metadata.title || '未定名短剧'}》分镜脚本\n`;
    text += `生成时间：${new Date().toLocaleString()}\n`;
    text += `共 ${projectData.shots.length} 个分镜\n\n`;
    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    projectData.shots.forEach(shot => {
        text += `【分镜 ${shot.id}】\n`;
        text += `镜别：${shot.type}\n`;
        text += `场景：${shot.scene}\n`;
        text += `人物：${shot.characters}\n`;
        text += `运镜：${shot.cameraMove}\n`;
        text += `时长：${shot.duration}\n`;
        text += `情绪：${shot.mood}\n`;
        text += `画面：${shot.content}\n`;
        text += `对白：${shot.dialog}\n`;
        text += `打光：${shot.lighting}\n`;
        text += `画面比例：${shot.aspectRatio}\n`;
        text += `\n※ Image Prompt：${shot.imagePrompt}\n`;
        text += `※ Video Prompt：${shot.videoPrompt}\n`;
        if (shot.characterPrompt) text += `※ 人物提示词：${shot.characterPrompt}\n`;
        text += '\n';
    });

    return text;
}

function exportStoryboardCSV() {
    if (!projectData.shots || projectData.shots.length === 0) {
        return '分镜,镜别,场景,人物,运镜,时长,情绪,画面,对白,打光,画面比例,Image Prompt,Video Prompt,人物提示词';
    }
    let csv = '分镜编号,镜别,场景,人物,运镜,时长,情绪基调,画面内容,对白旁白,打光色调,画面比例,Image Prompt,Video Prompt,人物提示词\n';
    projectData.shots.forEach(shot => {
        const row = [
            shot.id, shot.type, shot.scene, shot.characters, shot.cameraMove,
            shot.duration, shot.mood,
            `"${(shot.content || '').replace(/"/g, '""')}"`,
            `"${(shot.dialog || '').replace(/"/g, '""')}"`,
            shot.lighting, shot.aspectRatio,
            `"${(shot.imagePrompt || '').replace(/"/g, '""')}"`,
            `"${(shot.videoPrompt || '').replace(/"/g, '""')}"`,
            `"${(shot.characterPrompt || '').replace(/"/g, '""')}"`
        ];
        csv += row.join(',') + '\n';
    });
    return csv;
}

function exportStoryboardHTML() {
    if (!projectData.shots || projectData.shots.length === 0) {
        showToast('请先生成分镜脚本', 'error');
        return;
    }

    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>${projectData.metadata.title || '短剧'} - 故事板</title>
    <style>
        body { font-family: -apple-system, 'PingFang SC', sans-serif; background: #0f172a; color: #f1f5f9; padding: 40px; }
        h1 { text-align: center; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .board-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 1400px; margin: 40px auto; }
        .shot-card { background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #475569; }
        .shot-image { height: 180px; background: linear-gradient(135deg, #1e293b, #334155); display: flex; align-items: center; justify-content: center; font-size: 48px; position: relative; }
        .shot-badge { position: absolute; top: 10px; left: 10px; background: rgba(99, 102, 241, 0.9); padding: 4px 10px; border-radius: 12px; font-size: 12px; }
        .shot-content { padding: 16px; }
        .shot-title { font-weight: 600; color: #818cf8; margin-bottom: 8px; }
        .shot-desc { font-size: 13px; color: #94a3b8; line-height: 1.6; }
        .meta-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
        .meta-tag { font-size: 11px; padding: 3px 8px; background: #334155; border-radius: 10px; color: #94a3b8; }
        .prompt-area { margin-top: 12px; padding: 12px; background: #0f172a; border-radius: 8px; font-size: 11px; color: #64748b; line-height: 1.6; }
    </style>
</head>
<body>
    <h1>🎬 ${projectData.metadata.title || '短剧'} · 故事板</h1>
    <div class="board-grid">
`;
    projectData.shots.forEach(shot => {
        html += `
        <div class="shot-card">
            <div class="shot-image">
                <span class="shot-badge">#${shot.id}</span>
                🎞️
            </div>
            <div class="shot-content">
                <div class="shot-title">${shot.scene}</div>
                <div class="shot-desc">${shot.content}</div>
                <div class="meta-row">
                    <span class="meta-tag">${shot.type}</span>
                    <span class="meta-tag">${shot.cameraMove}</span>
                    <span class="meta-tag">${shot.duration}</span>
                    <span class="meta-tag">${shot.mood}</span>
                </div>
                <div class="prompt-area">
                    <div><strong>对白：</strong>${shot.dialog}</div>
                    <div style="margin-top: 6px;"><strong>Image：</strong>${shot.imagePrompt}</div>
                    <div style="margin-top: 6px;"><strong>Video：</strong>${shot.videoPrompt}</div>
                </div>
            </div>
        </div>`;
    });
    html += `
    </div>
</body>
</html>`;

    downloadFile(html, '故事板.html', 'text/html;charset=utf-8');
}

function exportFullMarkdown() {
    let md = `# ${projectData.metadata.title || '未定名短剧'}\n\n`;
    md += `> 生成时间：${new Date().toLocaleString()}\n\n`;
    md += `---\n\n`;

    // 大纲
    if (projectData.outline || document.getElementById('outline-result-content').textContent) {
        md += `## 📋 剧本大纲\n\n`;
        md += (projectData.outline || document.getElementById('outline-result-content').textContent) + '\n\n';
        md += `---\n\n`;
    }

    // 剧本
    if (projectData.script || document.getElementById('script-result-content').textContent) {
        md += `## 🎭 完整剧本\n\n`;
        md += (projectData.script || document.getElementById('script-result-content').textContent) + '\n\n';
        md += `---\n\n`;
    }

    // 小说
    if (projectData.novel || document.getElementById('novel-result-content').textContent) {
        md += `## 📖 小说版本\n\n`;
        md += (projectData.novel || document.getElementById('novel-result-content').textContent) + '\n\n';
        md += `---\n\n`;
    }

    // 分镜表
    if (projectData.shots && projectData.shots.length > 0) {
        md += `## 🎞️ 分镜脚本\n\n`;
        md += `| 分镜 | 镜别 | 场景 | 人物 | 运镜 | 时长 | 情绪 | 画面内容 |\n`;
        md += `|------|------|------|------|------|------|------|----------|\n`;
        projectData.shots.forEach(shot => {
            md += `| ${shot.id} | ${shot.type} | ${shot.scene} | ${shot.characters} | ${shot.cameraMove} | ${shot.duration} | ${shot.mood} | ${shot.content} |\n`;
        });
        md += `\n### 📝 详细分镜表\n\n`;
        projectData.shots.forEach(shot => {
            md += `#### 🎬 分镜 ${shot.id}\n\n`;
            md += `- **镜别**：${shot.type}\n`;
            md += `- **场景**：${shot.scene}\n`;
            md += `- **人物**：${shot.characters}\n`;
            md += `- **运镜**：${shot.cameraMove}\n`;
            md += `- **时长**：${shot.duration}\n`;
            md += `- **画面**：${shot.content}\n`;
            md += `- **对白**：${shot.dialog}\n`;
            md += `- **打光**：${shot.lighting}\n`;
            md += `- **Image Prompt**：\`${shot.imagePrompt}\`\n`;
            md += `- **Video Prompt**：\`${shot.videoPrompt}\`\n`;
            if (shot.characterPrompt) md += `- **人物提示词**：\`${shot.characterPrompt}\`\n`;
            md += `\n`;
        });
    }

    downloadFile(md, '完整项目文档.md', 'text/markdown;charset=utf-8');
}

// ========== 问题分析 ==========
function analyzeIssues() {
    const modal = document.getElementById('analysis-modal');
    modal.style.display = 'flex';
    document.getElementById('analysis-content').innerHTML = '<div class="analysis-loading">AI正在分析项目内容...</div>';

    setTimeout(() => {
        const analysis = performAnalysis();
        renderAnalysisResult(analysis);
    }, 1500);
}

function performAnalysis() {
    const result = {
        score: { overall: 0, structure: 0, characters: 0, content: 0, visual: 0 },
        issues: [],
        suggestions: [],
        strengths: [],
        stats: {}
    };

    // 统计数据
    const outlineLen = (projectData.outline || document.getElementById('outline-result-content').textContent || '').length;
    const scriptLen = (projectData.script || document.getElementById('script-result-content').textContent || '').length;
    const novelLen = (projectData.novel || document.getElementById('novel-result-content').textContent || '').length;
    const shotCount = (projectData.shots || []).length;

    result.stats = {
        outlineWords: outlineLen,
        scriptWords: scriptLen,
        novelWords: novelLen,
        shotCount: shotCount,
        totalContent: outlineLen + scriptLen + novelLen
    };

    // 评分系统
    let score = 0;
    let structureScore = 50;
    let characterScore = 50;
    let contentScore = 50;
    let visualScore = 50;

    // 结构评分
    if (outlineLen > 500) { structureScore += 20; result.strengths.push('大纲内容充实，结构完整'); }
    else if (outlineLen > 0) { structureScore += 10; result.issues.push({ level: 'medium', title: '大纲可以更详细', desc: '当前大纲较为简略，建议补充更多情节节点和转折设计' }); }
    else { result.issues.push({ level: 'high', title: '缺少剧本大纲', desc: '建议先生成剧本大纲，这是整个创作的基础' }); }

    if (scriptLen > 1000) { structureScore += 20; result.strengths.push('剧本内容丰富'); }
    else if (scriptLen > 0) { structureScore += 10; }
    else { result.issues.push({ level: 'medium', title: '剧本尚未生成', desc: '建议基于大纲生成完整剧本' }); }

    // 人物评分
    if (outlineLen > 200) { characterScore += 25; result.strengths.push('人物设定有基础描述'); }
    else { result.issues.push({ level: 'low', title: '人物塑造可以加强', desc: '建议补充更多人物性格、背景和成长弧线的描述' }); }

    const names = ['林悦', '陈昊', '主角', '女主', '男主'];
    const hasCharacterNames = names.some(n => (projectData.outline || '').includes(n) || (projectData.script || '').includes(n));
    if (hasCharacterNames) {
        characterScore += 25;
        result.strengths.push('人物命名完整，便于读者建立印象');
    }

    // 内容评分
    if (scriptLen > 500) { contentScore += 25; result.strengths.push('剧本对白和场景有一定深度'); }
    if (novelLen > 1000) { contentScore += 25; result.strengths.push('小说版本文字丰富，阅读体验好'); }

    const hasConflict = (projectData.outline || '').includes('冲突') || (projectData.script || '').includes('冲突') || scriptLen > 500;
    if (!hasConflict && outlineLen > 0) {
        result.issues.push({ level: 'medium', title: '冲突表现较弱', desc: '故事中缺少明显的冲突设计，建议增加人物之间的矛盾或内心挣扎' });
    } else {
        contentScore += 10;
        result.strengths.push('故事有明显的冲突设计');
    }

    // 视觉评分
    if (shotCount >= 6) {
        visualScore += 30;
        result.strengths.push(`分镜数量充足（${shotCount}个），视觉节奏完整`);
    } else if (shotCount > 0) {
        visualScore += 15;
        result.issues.push({ level: 'low', title: '分镜数量偏少', desc: '建议增加到6-10个分镜，覆盖更多关键场景的镜头设计' });
    } else {
        result.issues.push({ level: 'high', title: '尚未生成分镜脚本', desc: '强烈建议基于剧本生成分镜，为拍摄/AI视频生成做准备' });
    }

    if (shotCount > 0) {
        const hasPrompts = projectData.shots.some(s => s.imagePrompt && s.imagePrompt.length > 10);
        if (hasPrompts) {
            visualScore += 20;
            result.strengths.push('已包含详细的图像/视频提示词，便于 AI 生成');
        } else {
            result.issues.push({ level: 'medium', title: '提示词不够详细', desc: '建议补充每个分镜的 Image Prompt 和 Video Prompt，便于后续使用 AI 视频生成工具' });
        }
    }

    // 建议
    if (!projectData.novel && !document.getElementById('novel-result-content').textContent) {
        result.suggestions.push('可以尝试将剧本转换为小说版本，丰富心理描写和环境氛围，有助于更完整地理解故事');
    }
    if (shotCount > 0 && shotCount < 8) {
        result.suggestions.push('可以在故事板模式下查看分镜预览，根据视觉效果调整每个镜头的时长和顺序');
    }
    if (projectData.metadata.title === '' || !document.getElementById('project-name').value) {
        result.suggestions.push('建议为项目起一个响亮的标题，并在导出页面保存完整内容');
    }
    result.suggestions.push('完成创作后，可使用导出功能生成 TXT/CSV/MD/HTML 等多种格式的文件，方便团队协作');
    result.suggestions.push('可以使用"分析问题"功能定期检查内容，根据建议优化剧本质量');

    // 总分
    result.score = {
        overall: Math.round((structureScore + characterScore + contentScore + visualScore) / 4),
        structure: structureScore,
        characters: characterScore,
        content: contentScore,
        visual: visualScore
    };

    return result;
}

function renderAnalysisResult(analysis) {
    const container = document.getElementById('analysis-content');

    let html = `
        <div class="analysis-score" style="display: flex; gap: 20px; margin-bottom: 24px; padding: 20px; background: #0f172a; border-radius: 12px;">
            <div style="flex: 1; text-align: center;">
                <div style="font-size: 36px; font-weight: 700; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${analysis.score.overall}</div>
                <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">综合评分</div>
            </div>
            <div style="flex: 1; text-align: center;">
                <div style="font-size: 24px; font-weight: 600; color: #818cf8;">${analysis.score.structure}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">结构</div>
            </div>
            <div style="flex: 1; text-align: center;">
                <div style="font-size: 24px; font-weight: 600; color: #818cf8;">${analysis.score.characters}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">人物</div>
            </div>
            <div style="flex: 1; text-align: center;">
                <div style="font-size: 24px; font-weight: 600; color: #818cf8;">${analysis.score.content}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">内容</div>
            </div>
            <div style="flex: 1; text-align: center;">
                <div style="font-size: 24px; font-weight: 600; color: #818cf8;">${analysis.score.visual}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">视觉化</div>
            </div>
        </div>

        <div style="margin-bottom: 24px; padding: 16px; background: #0f172a; border-radius: 8px;">
            <h3 style="font-size: 15px; margin-bottom: 12px; color: #818cf8;">📊 项目统计</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;">
                <div style="background: #1e293b; padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 20px; font-weight: 600; color: #818cf8;">${analysis.stats.outlineWords}</div>
                    <div style="font-size: 11px; color: #94a3b8;">大纲字符</div>
                </div>
                <div style="background: #1e293b; padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 20px; font-weight: 600; color: #818cf8;">${analysis.stats.scriptWords}</div>
                    <div style="font-size: 11px; color: #94a3b8;">剧本字符</div>
                </div>
                <div style="background: #1e293b; padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 20px; font-weight: 600; color: #818cf8;">${analysis.stats.novelWords}</div>
                    <div style="font-size: 11px; color: #94a3b8;">小说字符</div>
                </div>
                <div style="background: #1e293b; padding: 12px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 20px; font-weight: 600; color: #818cf8;">${analysis.stats.shotCount}</div>
                    <div style="font-size: 11px; color: #94a3b8;">分镜数量</div>
                </div>
            </div>
        </div>

        <div style="margin-bottom: 24px;">
            <h3 style="font-size: 15px; margin-bottom: 12px; color: #818cf8;">💡 问题与改进建议</h3>
    `;

    if (analysis.issues.length === 0) {
        html += `<div style="padding: 16px; background: #1e3a2e; border-left: 4px solid #22c55e; border-radius: 8px; color: #86efac;">🎉 项目内容完整，暂时没有发现重大问题！</div>`;
    } else {
        analysis.issues.forEach(issue => {
            const severityColors = { high: '#ef4444', medium: '#f59e0b', low: '#6366f1' };
            html += `
                <div style="padding: 14px 16px; background: #0f172a; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid ${severityColors[issue.level]};">
                    <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">${issue.title}</div>
                    <div style="font-size: 13px; color: #94a3b8; line-height: 1.6;">${issue.desc}</div>
                </div>
            `;
        });
    }

    html += `
        </div>
        <div style="margin-bottom: 24px;">
            <h3 style="font-size: 15px; margin-bottom: 12px; color: #818cf8;">✨ 亮点总结</h3>
    `;

    if (analysis.strengths.length === 0) {
        html += `<div style="padding: 12px; color: #94a3b8; font-size: 13px;">继续创作，您的亮点将会出现在这里！</div>`;
    } else {
        analysis.strengths.forEach(strength => {
            html += `<div style="padding: 10px 14px; background: #1e3a2e; border-left: 4px solid #22c55e; border-radius: 8px; margin-bottom: 8px; font-size: 13px;">✅ ${strength}</div>`;
        });
    }

    html += `
        </div>
        <div>
            <h3 style="font-size: 15px; margin-bottom: 12px; color: #818cf8;">🎯 下一步建议</h3>
    `;
    analysis.suggestions.forEach((suggestion, idx) => {
        html += `<div style="padding: 10px 14px; background: #0f172a; border-radius: 8px; margin-bottom: 8px; font-size: 13px; color: #94a3b8;"><strong style="color: #818cf8;">${idx + 1}.</strong> ${suggestion}</div>`;
    });

    html += '</div>';

    container.innerHTML = html;
}

// ========== 项目概况更新 ==========
function updateProjectSummary() {
    const summaryEl = document.getElementById('project-summary');
    if (!summaryEl) return;

    const outlineLen = (projectData.outline || document.getElementById('outline-result-content')?.textContent || '').length;
    const scriptLen = (projectData.script || document.getElementById('script-result-content')?.textContent || '').length;
    const novelLen = (projectData.novel || document.getElementById('novel-result-content')?.textContent || '').length;
    const shotCount = (projectData.shots || []).length;

    if (outlineLen === 0 && scriptLen === 0 && novelLen === 0 && shotCount === 0) {
        summaryEl.style.display = 'none';
        return;
    }

    summaryEl.style.display = 'block';
    document.getElementById('summary-content').innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 12px;">
            <div style="background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #475569;">
                <div style="font-size: 24px; font-weight: 700; color: #818cf8;">${outlineLen}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">大纲字符</div>
            </div>
            <div style="background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #475569;">
                <div style="font-size: 24px; font-weight: 700; color: #818cf8;">${scriptLen}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">剧本字符</div>
            </div>
            <div style="background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #475569;">
                <div style="font-size: 24px; font-weight: 700; color: #818cf8;">${novelLen}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">小说字符</div>
            </div>
            <div style="background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #475569;">
                <div style="font-size: 24px; font-weight: 700; color: #818cf8;">${shotCount}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">分镜数量</div>
            </div>
        </div>
    `;
}

// ========== 标签切换（已合并到上方，此处删除避免重复）========== 
// 注：switchTab 已在上方第 403 行统一定义，避免二次覆盖

// ========== 初始化 ==========
window.addEventListener('DOMContentLoaded', () => {
    // 检查本地存储是否有项目
    const saved = localStorage.getItem('shortDramaProject');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data && data.metadata && data.metadata.title) {
                const projectNameEl = document.getElementById('project-name');
                if (projectNameEl) projectNameEl.value = data.metadata.title;
            }
        } catch (e) {
            // 忽略解析错误
        }
    }

    setStatus('就绪 - 开始创作您的短剧吧！');

    // 点击弹窗外部区域关闭
    try {
        document.querySelectorAll('.modal-overlay, .modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    } catch (e) { /* 静默 */ }

    // 初始化 LLM 自动重连
    try { initLLMReconnect(); } catch (e) { console.warn('LLM 重连初始化失败:', e); }

    // 初次加载项目列表（带延迟确保 project-manager 先执行）
    setTimeout(() => {
        try { refreshProjectList(); } catch (e) { console.warn('项目列表刷新失败:', e); }
    }, 500);
});

// ============================================================
// LLM 自动重连与降级机制
// ============================================================
function initLLMReconnect() {
    if (typeof window._llmManager === 'undefined') {
        window._llmManager = {
            connected: false,
            retryCount: 0,
            maxRetries: 5,
            reconnectTimer: null,
            lastCheck: 0,
            providers: ['ollama', 'groq', 'openrouter', 'gemini'],
            currentProviderIndex: 0
        };
    }

    // 定期检查连接状态
    function checkConnection() {
        try {
            // 若已配置了 LLMManager，则尝试做一个健康检查
            if (typeof LLMManager !== 'undefined' && typeof LLMManager.isConfigured === 'function') {
                const configured = LLMManager.isConfigured();
                if (configured) {
                    window._llmManager.connected = true;
                    window._llmManager.retryCount = 0;
                } else {
                    // 未配置：尝试切换到下一个可用的 provider
                    window._llmManager.retryCount++;
                    if (window._llmManager.retryCount >= window._llmManager.maxRetries) {
                        // 达到最大重试次数，退化为本地模板
                        window._llmManager.connected = false;
                        if (window._llmManager.retryCount === window._llmManager.maxRetries) {
                            console.log('[LLM] 已达到最大重试次数，使用本地模板模式');
                        }
                    }
                }
            } else {
                // LLMManager 不可用，使用本地模板模式
                window._llmManager.connected = false;
            }
        } catch (e) {
            window._llmManager.retryCount++;
            console.warn('[LLM] 连接检查异常:', e.message);
        }
    }

    // 每 30 秒做一次健康检查
    if (!window._llmManager.reconnectTimer) {
        window._llmManager.reconnectTimer = setInterval(checkConnection, 30000);
    }

    // 立即做第一次检查
    setTimeout(checkConnection, 2000);

    console.log('[LLM] 自动重连与降级机制已启动');
}

// 智能调用 LLM（带自动降级与重试）
async function callLLMSmart(prompt, options) {
    const opts = options || {};
    const taskType = opts.taskType || 'general';
    const fallbackFn = opts.fallback || (() => '（本地模式：AI 服务暂不可用，请稍后重试）');
    const maxAttempts = opts.attempts || 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            if (typeof LLMManager !== 'undefined' && LLMManager.isConfigured && LLMManager.isConfigured()) {
                const result = await LLMManager.sendMessage(prompt, { taskType });
                if (result && result.content && result.content.trim()) {
                    return { content: result.content, source: 'llm' };
                }
            }
        } catch (err) {
            console.warn(`[LLM] 第 ${attempt} 次调用失败:`, err.message);
            if (attempt < maxAttempts) {
                // 指数退避
                await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
            }
        }
    }

    // 降级：使用本地模板
    return { content: fallbackFn(), source: 'local' };
}

// ========== 模板故事板加载 ==========
function loadTemplateToBoard(templateId) {
    try {
        // 检查模板系统是否已加载
        if (typeof STORYBOARD_TEMPLATES === 'undefined') {
            showToast('请刷新页面后重试，故事板模板系统正在加载...', 'error');
            return;
        }

        const template = STORYBOARD_TEMPLATES[templateId];
        if (!template) {
            showToast('模板不存在', 'error');
            return;
        }

        // 生成完整数据
        const data = generateFromTemplate(templateId, {
            protagonist: '角色',
            protagonistDesc: '根据剧情设定'
        }, {
            scene: template.theme
        });

        if (!data) {
            showToast('模板生成失败', 'error');
            return;
        }

        // 更新项目数据
        projectData.shots = data.shots.map((shot, idx) => ({
            id: idx + 1,
            type: shot.type,
            scene: shot.scene,
            characters: '待定',
            cameraMove: shot.cameraMove,
            duration: shot.duration,
            content: shot.content,
            dialog: shot.dialog,
            imagePrompt: shot.imagePrompt,
            videoPrompt: shot.videoPrompt,
            characterPrompt: shot.characterPrompt,
            lighting: shot.lighting,
            mood: shot.mood,
            aspectRatio: '16:9'
        }));

        // 高亮选中卡片
        document.querySelectorAll('.template-card').forEach(card => {
            card.style.borderColor = 'transparent';
        });
        event.currentTarget.style.borderColor = '#6366f1';

        // 使用新渲染器显示
        const view = document.getElementById('board-view');
        view.classList.remove('board-empty');
        renderStoryboardTo('board-view', data, {
            layout: template.layout,
            viewMode: document.getElementById('board-view-mode').value
        });

        showToast(`已加载模板：${template.name} (${template.totalShots}个镜头)`, 'success');
        setStatus(`模板已加载 · ${template.totalShots}个镜头 · 总时长 ${data.totalDuration.toFixed(1)}秒`);

    } catch (error) {
        console.error('加载模板失败:', error);
        showToast('加载模板失败，请重试', 'error');
    }
}

// ========== 故事板优化 ==========
function optimizeStoryboard() {
    if (!projectData.shots || projectData.shots.length === 0) {
        showToast('请先生成或加载分镜脚本', 'error');
        return;
    }

    showLoading('正在优化故事板...');

    setTimeout(() => {
        // 检测重复
        detectDuplicateShots();

        // 优化提示词
        optimizeAllPrompts();

        // 大数据优化
        optimizeStoryboardWithBigData();

        hideLoading();
    }, 1500);
}

// ========== 故事板导出增强 ==========
function exportBoardAsPDF() {
    if (!projectData.shots || projectData.shots.length === 0) {
        showToast('请先生成或加载分镜脚本', 'error');
        return;
    }

    // 使用HTML导出
    const template = STORYBOARD_TEMPLATES['yuji_sword_dance'] || {
        layout: '3x2',
        totalShots: projectData.shots.length,
        name: '故事板',
        category: '自定义'
    };

    const data = {
        metadata: {
            title: document.getElementById('project-name').value || '短剧故事板'
        },
        template: template,
        totalDuration: projectData.shots.reduce((sum, s) => sum + parseFloat(s.duration || 0), 0),
        shots: projectData.shots
    };

    exportStoryboard(data, 'html', '故事板');
    showToast('故事板已导出为HTML文件', 'success');
}

// ========== 故事板预览增强 ==========
function previewBoardInFullscreen() {
    if (!projectData.shots || projectData.shots.length === 0) {
        showToast('请先生成或加载分镜脚本', 'error');
        return;
    }

    // 创建全屏预览
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: #0f172a;
        z-index: 9999;
        padding: 40px;
        overflow: auto;
    `;

    overlay.innerHTML = `
        <div style="max-width: 1400px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                <h2 style="font-size: 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🎬 故事板全屏预览</h2>
                <button onclick="this.closest('div').parentElement.remove()" style="background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px;">关闭预览</button>
            </div>
            <div id="fullscreen-board" style="display: grid; grid-template-columns: repeat(${document.getElementById('board-columns').value || 3}, 1fr); gap: 20px;"></div>
        </div>
    `;

    document.body.appendChild(overlay);

    // 渲染到全屏容器
    const shots = projectData.shots;
    const container = overlay.querySelector('#fullscreen-board');

    shots.forEach(shot => {
        const card = document.createElement('div');
        card.style.cssText = 'background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #475569;';
        card.innerHTML = `
            <div style="background: linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3)); padding: 12px 16px; display: flex; justify-content: space-between; border-bottom: 1px solid #475569;">
                <span style="font-weight: 600; color: #818cf8;">镜头 ${shot.id}</span>
                <span style="font-size: 12px; color: #94a3b8;">${shot.duration}</span>
            </div>
            <div style="height: 100px; background: linear-gradient(135deg, #1e293b, #334155); display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 36px; opacity: 0.6;">🎬</span>
            </div>
            <div style="padding: 16px;">
                <div style="font-size: 14px; font-weight: 600; color: #e2e8f0; margin-bottom: 8px;">${shot.scene}</div>
                <div style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin-bottom: 12px;">${shot.content}</div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <span style="padding: 3px 8px; background: rgba(99,102,241,0.2); color: #818cf8; border-radius: 10px; font-size: 10px;">${shot.type}</span>
                    <span style="padding: 3px 8px; background: rgba(16,185,129,0.2); color: #10b981; border-radius: 10px; font-size: 10px;">${shot.cameraMove}</span>
                    <span style="padding: 3px 8px; background: rgba(245,158,11,0.2); color: #f59e0b; border-radius: 10px; font-size: 10px;">${shot.mood}</span>
                </div>
                <div style="margin-top: 12px; padding: 8px; background: #0f172a; border-radius: 6px; font-size: 11px; color: #9b59b6;">
                    <strong>音效：</strong>${shot.dialog}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ========== 项目管理功能 ==========
let selectedProjectId = null;

// 创建新项目
function createNewProject() {
    try {
        const modal = document.getElementById('create-project-modal');
        if (!modal) {
            showToast('初始化中，请稍后再试...', 'warning');
            return;
        }
        modal.style.display = 'flex';
        // 重置表单
        const form = document.getElementById('create-project-form');
        if (form) {
            const titleInput = document.getElementById('new-project-title');
            if (titleInput) {
                titleInput.value = '';
                setTimeout(() => titleInput.focus(), 100);
            }
        }
    } catch (e) {
        showToast('无法打开创建对话框: ' + (e.message || e), 'error');
    }
}

// 关闭创建弹窗
function closeCreateModal() {
    const modal = document.getElementById('create-project-modal');
    if (modal) modal.style.display = 'none';
}

// ============================================================
// 智能对话框/弹窗显示函数（完整的 null 检查）
// ============================================================

function showProjectSettings() {
    const modal = document.getElementById('settings-modal');
    if (!modal) {
        // 兼容模式：创建一个简单的设置弹窗
        showToast('💡 当前项目名称已在左侧显示，可直接编辑', 'info');
        return;
    }
    modal.style.display = 'flex';
}

function showVersionHistory() {
    if (!selectedProjectId) {
        showToast('请先在项目列表中选择一个项目', 'warning');
        const projectsTab = document.getElementById('tab-projects');
        if (projectsTab) { switchTab('projects'); refreshProjectList(); }
        return;
    }
    const modal = document.getElementById('history-modal');
    if (modal) {
        modal.style.display = 'flex';
        try { showProjectHistory(); } catch (e) { console.warn(e); }
    } else {
        showToast('版本历史功能暂不可用', 'warning');
    }
}

function showExportPanel() {
    switchTab('export');
}

function showKeyboardShortcuts() {
    const modal = document.getElementById('shortcuts-modal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        showToast('快捷键：Ctrl+S 保存 | Ctrl+N 新建', 'info');
    }
}

function closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (modal) modal.style.display = 'none';
}

function closeVersionModal() {
    const modal = document.getElementById('version-modal');
    if (modal) modal.style.display = 'none';
}

// 提交创建项目（在 DOM 就绪后才绑定，确保表单元素存在）
window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('create-project-form');
    if (!form) {
        console.warn('create-project-form 元素未找到');
        return;
    }
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const titleEl = document.getElementById('new-project-title');
            if (!titleEl || !titleEl.value.trim()) {
                showToast('请输入项目名称', 'error');
                return;
            }
            const projectData = {
                title: titleEl.value.trim(),
                description: (document.getElementById('new-project-desc') || {}).value || '',
                genre: (document.getElementById('new-project-genre') || {}).value || '都市情感',
                style: (document.getElementById('new-project-style') || {}).value || '写实',
                duration: (document.getElementById('new-project-duration') || {}).value || '',
                episodes: (document.getElementById('new-project-episodes') || {}).value || ''
            };

            const project = await projectManager.createProject(projectData);
            selectedProjectId = project.id;

            // 更新 UI
            const projTextEl = document.querySelector('#current-project-name .project-name-text');
            if (projTextEl) projTextEl.textContent = project.title;
            const projStatusEl = document.querySelector('#current-project-name .project-status');
            if (projStatusEl) projStatusEl.textContent = '进行中';

            const projectNameEl = document.getElementById('project-name');
            if (projectNameEl) projectNameEl.value = project.title;

            // 同步类型/风格/时长/集数到大纲面板
            const genreEl = document.getElementById('genre');
            if (genreEl) genreEl.value = project.genre;
            const styleEl = document.getElementById('style');
            if (styleEl) styleEl.value = project.style;
            const durationEl = document.getElementById('duration');
            if (durationEl) durationEl.value = project.duration || '';
            const episodesEl = document.getElementById('episodes');
            if (episodesEl) episodesEl.value = project.episodes || '';

            projectData.metadata = projectData.metadata || {};
            projectData.metadata.title = project.title;
            projectData.metadata.genre = project.genre;
            projectData.metadata.style = project.style;
            projectData.metadata.duration = project.duration;
            projectData.metadata.episodes = project.episodes;

            showToast(`项目 "${project.title}" 创建成功！`, 'success');
            closeCreateModal();
            refreshProjectList();
            switchTab('outline');

        } catch (error) {
            console.error('创建项目失败:', error);
            showToast('创建项目失败: ' + (error.message || error), 'error');
        }
    });
});

// 刷新项目列表
async function refreshProjectList() {
    try {
        // 先确保 projectManager 已初始化
        if (!window.projectManager || !window.projectManager.database || !window.projectManager.database.db) {
            // 尝试初始化
            if (window.projectManager && typeof window.projectManager.init === 'function') {
                try {
                    await window.projectManager.init();
                } catch (initErr) {
                    console.warn('项目管理器初始化失败:', initErr);
                    showToast('系统初始化中，请刷新页面重试', 'warning');
                    return;
                }
            } else {
                showToast('项目管理系统尚未就绪，请刷新页面', 'warning');
                return;
            }
        }

        const projects = await projectManager.getProjects();
        const list = document.getElementById('project-list');

        if (!list) {
            console.log('项目列表元素不存在，跳过刷新');
            return;
        }

        if (!projects || projects.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📁</div>
                    <h3>暂无项目</h3>
                    <p>点击"创建新项目"开始你的创作之旅</p>
                </div>
            `;
            const details = document.getElementById('project-details');
            if (details) details.style.display = 'none';
            setStatus('就绪 - 点击左侧「+」创建新项目');
            return;
        }

        list.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                ${projects.map(p => `
                    <div class="project-card" onclick="selectProject('${p.id}')"
                         style="background: ${p.id === selectedProjectId ? 'rgba(99, 102, 241, 0.15)' : '#1e293b'};
                                border: 2px solid ${p.id === selectedProjectId ? '#6366f1' : '#374151'};
                                padding: 20px; border-radius: 12px; cursor: pointer; transition: all 0.2s;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1; min-width: 0;">
                                <h4 style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(p.title || '未命名项目')}</h4>
                                <p style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">${escapeHtml(p.description || '暂无描述')}</p>
                            </div>
                            <span style="font-size: 10px; padding: 2px 8px; border-radius: 10px; white-space: nowrap;
                                        background: ${getStatusColor(p.status)}; color: white;">
                                ${getStatusText(p.status)}
                            </span>
                        </div>
                        <div style="margin-top: 12px; display: flex; gap: 12px; font-size: 11px; color: #64748b; flex-wrap: wrap;">
                            <span>${escapeHtml(p.genre || '未分类')}</span>
                            <span>•</span>
                            <span>${escapeHtml(p.duration || '时长待定')}</span>
                            <span>•</span>
                            <span>${escapeHtml(p.episodes || '集数待定')}</span>
                        </div>
                        <div style="margin-top: 12px; font-size: 10px; color: #4b5563;">
                            更新于 ${formatDate(p.updatedAt)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        setStatus(`已加载 ${projects.length} 个项目`);

    } catch (error) {
        console.error('加载项目列表失败:', error);
        const list = document.getElementById('project-list');
        if (list) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>加载失败</h3>
                    <p>${escapeHtml(error.message || '请刷新页面重试')}</p>
                </div>
            `;
        }
    }
}

// HTML 转义辅助函数
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const str = String(text);
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// 获取状态颜色
function getStatusColor(status) {
    const colors = {
        draft: '#f59e0b',
        active: '#10b981',
        completed: '#6366f1',
        archived: '#6b7280'
    };
    return colors[status] || '#6b7280';
}

// 获取状态文本
function getStatusText(status) {
    const texts = {
        draft: '草稿',
        active: '进行中',
        completed: '已完成',
        archived: '已归档'
    };
    return texts[status] || '未知';
}

// 格式化日期
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 选择项目
function selectProject(projectId) {
    selectedProjectId = projectId;
    refreshProjectList();
    loadProjectDetails(projectId);
    // 同步更新当前项目显示
    const nameEl = document.getElementById('current-project-name');
    if (nameEl) {
        const projText = nameEl.querySelector('.project-name-text');
        if (projText && projectManager && projectManager.database) {
            projectManager.database.getProject(projectId).then(p => {
                if (p) {
                    projText.textContent = p.title || '未命名项目';
                    const statusEl = nameEl.querySelector('.project-status');
                    if (statusEl) statusEl.textContent = getStatusText(p.status);
                }
            }).catch(() => {});
        }
    }
}

// 加载项目详情
async function loadProjectDetails(projectId) {
    try {
        const project = await projectManager.getProject(projectId);
        if (!project) return;

        const detailTitle = document.getElementById('detail-title');
        const detailGenre = document.getElementById('detail-genre');
        const detailStyle = document.getElementById('detail-style');
        const detailDuration = document.getElementById('detail-duration');
        const detailEpisodes = document.getElementById('detail-episodes');
        const detailStatus = document.getElementById('detail-status');
        const detailCreated = document.getElementById('detail-created');
        const detailUpdated = document.getElementById('detail-updated');
        const projectDetails = document.getElementById('project-details');
        
        if (!detailTitle || !projectDetails) {
            console.log('项目详情元素不存在，跳过加载');
            return;
        }

        detailTitle.textContent = project.title;
        if (detailGenre) detailGenre.textContent = project.genre;
        if (detailStyle) detailStyle.textContent = project.style;
        if (detailDuration) detailDuration.textContent = project.duration || '-';
        if (detailEpisodes) detailEpisodes.textContent = project.episodes || '-';
        if (detailStatus) detailStatus.textContent = getStatusText(project.status);
        if (detailCreated) detailCreated.textContent = new Date(project.createdAt).toLocaleString('zh-CN');
        if (detailUpdated) detailUpdated.textContent = new Date(project.updatedAt).toLocaleString('zh-CN');
        
        projectDetails.style.display = 'block';
        
    } catch (error) {
        showToast('加载项目详情失败: ' + error.message, 'error');
    }
}

// 打开项目
async function openSelectedProject() {
    if (!selectedProjectId) {
        showToast('请先选择一个项目', 'error');
        return;
    }

    try {
        const project = await projectManager.openProject(selectedProjectId);
        if (!project) {
            showToast('项目不存在', 'error');
            return;
        }

        // 加载项目数据到当前编辑状态
        currentProject = project;
        projectData.outline = project.outline || '';
        projectData.script = project.script || '';
        projectData.novel = project.novel || '';
        projectData.shots = project.shots || [];

        // 更新界面
        document.getElementById('project-name').value = project.title;
        
        if (project.outline) {
            document.getElementById('outline-result').value = project.outline;
        }
        if (project.script) {
            document.getElementById('script-result').value = project.script;
        }
        if (project.novel) {
            document.getElementById('novel-result').value = project.novel;
        }
        if (project.shots.length > 0) {
            renderShotList(project.shots);
        }

        showToast(`已打开项目: ${project.title}`, 'success');
        switchTab('outline');
        
    } catch (error) {
        showToast('打开项目失败: ' + error.message, 'error');
    }
}

// 创建版本
function createVersionForProject() {
    if (!selectedProjectId) {
        showToast('请先选择一个项目', 'error');
        return;
    }
    document.getElementById('version-name').value = '';
    document.getElementById('version-modal').style.display = 'flex';
    loadVersions();
}

// 关闭版本弹窗
function closeVersionModal() {
    document.getElementById('version-modal').style.display = 'none';
}

// 加载版本列表
async function loadVersions() {
    if (!selectedProjectId) return;
    
    try {
        const versions = await projectManager.database.getVersions(selectedProjectId);
        const list = document.getElementById('version-list');
        
        if (versions.length === 0) {
            list.innerHTML = '<p style="color: #64748b; padding: 20px; text-align: center;">暂无版本记录</p>';
            return;
        }

        list.innerHTML = `
            <div style="padding: 20px;">
                ${versions.map(v => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; 
                                background: #0f172a; border-radius: 8px; margin-bottom: 8px;">
                        <div>
                            <div style="font-weight: 600;">${v.versionName}</div>
                            <div style="font-size: 12px; color: #64748b;">${new Date(v.timestamp).toLocaleString('zh-CN')}</div>
                        </div>
                        <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;" 
                                onclick="restoreVersion('${v.id}')">恢复</button>
                    </div>
                `).join('')}
            </div>
        `;
        
    } catch (error) {
        console.error('加载版本失败:', error);
    }
}

// 保存版本
async function saveVersion() {
    if (!selectedProjectId) {
        showToast('请先选择一个项目', 'error');
        return;
    }

    const versionName = document.getElementById('version-name').value;
    
    try {
        await projectManager.createVersion(versionName);
        showToast('版本保存成功！', 'success');
        loadVersions();
        document.getElementById('version-name').value = '';
    } catch (error) {
        showToast('保存版本失败: ' + error.message, 'error');
    }
}

// 恢复版本
async function restoreVersion(versionId) {
    if (!confirm('确定要恢复到此版本吗？当前修改将丢失。')) {
        return;
    }

    try {
        await projectManager.database.restoreVersion(versionId);
        showToast('版本恢复成功！', 'success');
        closeVersionModal();
        refreshProjectList();
    } catch (error) {
        showToast('恢复版本失败: ' + error.message, 'error');
    }
}

// 显示历史记录
async function showProjectHistory() {
    if (!selectedProjectId) {
        showToast('请先选择一个项目', 'error');
        return;
    }

    try {
        const history = await projectManager.database.getHistory(selectedProjectId);
        const list = document.getElementById('history-list');

        if (history.length === 0) {
            list.innerHTML = `
                <div class="empty-state" style="padding: 40px;">
                    <div class="empty-icon">📋</div>
                    <p>暂无操作记录</p>
                </div>
            `;
        } else {
            list.innerHTML = `
                <div style="padding: 20px;">
                    ${history.map(h => `
                        <div style="display: flex; gap: 16px; padding: 12px; background: #0f172a; border-radius: 8px; margin-bottom: 8px;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; 
                                        background: ${getActionColor(h.actionType)}; 
                                        display: flex; align-items: center; justify-content: center;">
                                ${getActionIcon(h.actionType)}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: 600;">${h.actionDesc}</div>
                                <div style="font-size: 12px; color: #64748b;">${new Date(h.timestamp).toLocaleString('zh-CN')}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        document.getElementById('history-modal').style.display = 'flex';
        
    } catch (error) {
        showToast('加载历史记录失败: ' + error.message, 'error');
    }
}

// 获取操作图标
function getActionIcon(type) {
    const icons = {
        create: '➕',
        update: '✏️',
        version: '📌',
        restore: '🔄',
        delete: '🗑️'
    };
    return icons[type] || '📋';
}

// 获取操作颜色
function getActionColor(type) {
    const colors = {
        create: 'rgba(16, 185, 129, 0.3)',
        update: 'rgba(99, 102, 241, 0.3)',
        version: 'rgba(245, 158, 11, 0.3)',
        restore: 'rgba(59, 130, 246, 0.3)',
        delete: 'rgba(239, 68, 68, 0.3)'
    };
    return colors[type] || 'rgba(107, 114, 128, 0.3)';
}

// 关闭历史弹窗
function closeHistoryModal() {
    document.getElementById('history-modal').style.display = 'none';
}

// 导出项目
async function exportSelectedProject() {
    if (!selectedProjectId) {
        showToast('请先选择一个项目', 'error');
        return;
    }

    try {
        const data = await projectManager.database.exportProject(selectedProjectId);
        downloadFile(JSON.stringify(data, null, 2), `${data.project.title}.json`, 'application/json');
        showToast('项目导出成功！', 'success');
    } catch (error) {
        showToast('导出项目失败: ' + error.message, 'error');
    }
}

// 导出全部项目
async function exportAllProjects() {
    try {
        const data = await projectManager.exportAll();
        downloadFile(JSON.stringify(data, null, 2), `shortdrama-backup-${Date.now()}.json`, 'application/json');
        showToast(`已导出 ${data.projectCount} 个项目！`, 'success');
    } catch (error) {
        showToast('导出失败: ' + error.message, 'error');
    }
}

// 导入项目
function importProjectFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            await projectManager.importProject(data);
            showToast('项目导入成功！', 'success');
            refreshProjectList();
            
        } catch (error) {
            showToast('导入失败: ' + error.message, 'error');
        }
    };
    input.click();
}

// 删除项目
async function deleteSelectedProject() {
    if (!selectedProjectId) {
        showToast('请先选择一个项目', 'error');
        return;
    }

    if (!confirm('确定要删除此项目吗？此操作不可撤销！')) {
        return;
    }

    try {
        await projectManager.deleteProject(selectedProjectId);
        showToast('项目已删除', 'success');
        selectedProjectId = null;
        document.getElementById('project-details').style.display = 'none';
        refreshProjectList();
    } catch (error) {
        showToast('删除失败: ' + error.message, 'error');
    }
}

// 保存当前项目
async function saveCurrentProject() {
    if (!projectManager.currentProject) {
        showToast('请先打开或创建项目', 'error');
        return;
    }

    try {
        await projectManager.updateContent('outline', projectData.outline);
        await projectManager.updateContent('script', projectData.script);
        await projectManager.updateContent('novel', projectData.novel);
        await projectManager.updateContent('shots', projectData.shots);
        showToast('项目保存成功！', 'success');
    } catch (error) {
        showToast('保存失败: ' + error.message, 'error');
    }
}

// 自动保存
setInterval(() => {
    if (projectManager.currentProject && (projectData.outline || projectData.script || projectData.shots.length > 0)) {
        saveCurrentProject();
    }
}, 30000);

// 初始化项目列表
document.addEventListener('projectManagerReady', () => {
    refreshProjectList();
});

// =============================================================================
// PWA 渐进式 Web 应用 - Service Worker 注册
// 功能：支持离线使用 + 安装到桌面（Windows/Android）
// =============================================================================

(function initPWA() {
    'use strict';

    // 检查是否支持 Service Worker
    if (!('serviceWorker' in navigator)) {
        console.log('[PWA] 当前浏览器不支持 Service Worker，将以普通网页模式运行');
        return;
    }

    // 检查是否支持 PWA 安装
    let deferredInstallPrompt = null;

    // 注册 Service Worker（只在 HTTPS 或 localhost/127.0.0.1/file:// 下有效）
    window.addEventListener('load', () => {
        const swUrl = './service-worker.js';

        navigator.serviceWorker.register(swUrl, { scope: './' })
            .then((registration) => {
                console.log('[PWA] ✅ Service Worker 注册成功，作用域:', registration.scope);

                // 监听 Service Worker 更新
                if (registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('[PWA] 🔔 发现新版本，下次启动时自动更新');
                            if (typeof showToast === 'function') {
                                showToast('发现新版本，下次启动时自动更新', 'info', 4000);
                            }
                        }
                    });
                });
            })
            .catch((err) => {
                console.warn('[PWA] ⚠️ Service Worker 注册失败:', err);
                console.log('[PWA] 提示：如果您使用 file:// 协议打开，Service Worker 可能无法启用，请使用本地服务器（localhost）');
            });

        // 检测是否在 PWA 独立应用模式下运行
        if (window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: fullscreen)').matches ||
            window.matchMedia('(display-mode: minimal-ui)').matches ||
            document.referrer.includes('android-app://') ||
            navigator.standalone === true) {
            console.log('[PWA] 🚀 以独立应用模式运行（已安装）');
            setTimeout(() => {
                if (typeof showToast === 'function') {
                    showToast('欢迎使用 AI短剧创作工作台 应用版', 'success', 3000);
                }
            }, 1000);
        }
    });

    // 监听 PWA 安装提示事件（Chrome/Edge 桌面版 + Android Chrome）
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        console.log('[PWA] 📦 系统已准备好安装提示，可以安装到桌面');

        // 延迟显示安装提示，避免打扰用户首屏体验
        setTimeout(() => {
            showInstallBanner();
        }, 5000);
    });

    // 监听 PWA 安装完成事件
    window.addEventListener('appinstalled', (event) => {
        console.log('[PWA] ✅ 应用已成功安装');
        deferredInstallPrompt = null;
        if (typeof showToast === 'function') {
            showToast('🎉 应用已安装到桌面！您可以关闭此页，从桌面图标启动', 'success', 6000);
        }
        hideInstallBanner();
    });

    // 显示安装横幅
    function showInstallBanner() {
        if (!deferredInstallPrompt) return;
        if (document.getElementById('pwa-install-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
            color: white;
            padding: 14px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(124, 58, 237, 0.4);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 16px;
            max-width: 90%;
            width: 420px;
            animation: slideUp 0.4s ease-out;
            font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
        `;

        banner.innerHTML = `
            <div style="font-size: 28px;">🎬</div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 600; margin-bottom: 4px; font-size: 15px;">安装 AI短剧创作工作台</div>
                <div style="font-size: 13px; opacity: 0.9;">支持离线使用，桌面图标一键启动</div>
            </div>
            <button id="pwa-install-btn" style="background: white; color: #7c3aed; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; white-space: nowrap; font-size: 14px;">安装</button>
            <button id="pwa-install-close" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0 4px; opacity: 0.8;">×</button>
        `;

        document.body.appendChild(banner);

        banner.querySelector('#pwa-install-btn').addEventListener('click', () => {
            if (deferredInstallPrompt) {
                deferredInstallPrompt.prompt();
                deferredInstallPrompt.userChoice.then((choiceResult) => {
                    console.log('[PWA] 用户安装选择:', choiceResult.outcome);
                    hideInstallBanner();
                    deferredInstallPrompt = null;
                });
            }
        });

        banner.querySelector('#pwa-install-close').addEventListener('click', () => {
            hideInstallBanner();
            console.log('[PWA] 用户关闭安装提示');
        });

        // 7 秒后自动消失
        setTimeout(() => {
            hideInstallBanner();
        }, 7000);
    }

    function hideInstallBanner() {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) {
            banner.style.animation = 'slideDown 0.3s ease-in forwards';
            setTimeout(() => banner.remove(), 300);
        }
    }

    // 添加横幅动画样式
    if (!document.getElementById('pwa-animation-style')) {
        const style = document.createElement('style');
        style.id = 'pwa-animation-style';
        style.textContent = `
            @keyframes slideUp {
                from { opacity: 0; transform: translate(-50%, 30px); }
                to { opacity: 1; transform: translate(-50%, 0); }
            }
            @keyframes slideDown {
                from { opacity: 1; transform: translate(-50%, 0); }
                to { opacity: 0; transform: translate(-50%, 30px); }
            }
            @media (max-width: 600px) {
                #pwa-install-banner {
                    width: calc(100% - 40px) !important;
                    bottom: 16px;
                    padding: 12px 16px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 检测设备类型
    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isWindows = /Windows/i.test(ua);
    const isChrome = /Chrome\//i.test(ua) && !/Edg\//i.test(ua);
    const isEdge = /Edg\//i.test(ua);

    console.log(`[PWA] 检测到运行环境：${isMobile ? '📱 移动设备' : '💻 桌面设备'} (${isWindows ? 'Windows' : '其他系统'}) - ${isChrome ? 'Chrome' : isEdge ? 'Edge' : '其他浏览器'}`);

    // 暴露全局方法
    window.InstallPWA = {
        install: function () {
            if (deferredInstallPrompt) {
                deferredInstallPrompt.prompt();
            } else {
                if (typeof showToast === 'function') {
                    showToast('请通过浏览器菜单选择"安装应用"或"添加到主屏幕"', 'info', 5000);
                }
            }
        },
        checkUpdate: function () {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.getRegistration().then((reg) => {
                    if (reg) {
                        reg.update();
                        if (typeof showToast === 'function') {
                            showToast('正在检查更新...', 'info', 2000);
                        }
                    }
                });
            }
        },
        isInstalled: function () {
            return window.matchMedia('(display-mode: standalone)').matches ||
                   window.matchMedia('(display-mode: fullscreen)').matches ||
                   navigator.standalone === true;
        }
    };

    console.log('[PWA] ✅ PWA 初始化模块已加载');
})();

// =============================================================================
// 移动端优化适配
// =============================================================================

(function initMobileOptimizations() {
    'use strict';

    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isAndroid = /Android/i.test(ua);

    if (!isMobile) {
        console.log('[Mobile] 💻 检测到桌面环境，跳过移动端优化');
        return;
    }

    console.log('[Mobile] 📱 检测到移动设备（' + (isAndroid ? 'Android' : '其他') + '），启用移动端优化');

    // 1. 优化触摸事件，去除 300ms 延迟
    document.documentElement.style.touchAction = 'manipulation';

    // 2. 防止双击缩放导致的不良体验
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    // 3. 避免键盘弹出时影响布局
    if (isAndroid) {
        window.addEventListener('resize', () => {
            if (document.activeElement.tagName === 'INPUT' ||
                document.activeElement.tagName === 'TEXTAREA') {
                setTimeout(() => {
                    document.activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        });
    }

    // 4. 移动端状态栏安全区域（刘海屏/挖孔屏适配）
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
        metaViewport.setAttribute('content',
            'width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=5.0, user-scalable=yes'
        );
    }

    // 5. 添加移动端样式类
    document.body.classList.add('is-mobile');
    if (isAndroid) document.body.classList.add('is-android');

    // 6. 移动端友好的视口高度设置（解决安卓地址栏变化问题）
    function setMobileVH() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    setMobileVH();
    window.addEventListener('resize', setMobileVH);
    window.addEventListener('orientationchange', setMobileVH);

    // 7. 检测横屏模式并优化布局
    function checkOrientation() {
        const isLandscape = window.innerWidth > window.innerHeight;
        if (isLandscape) {
            document.body.classList.add('is-landscape');
            document.body.classList.remove('is-portrait');
        } else {
            document.body.classList.add('is-portrait');
            document.body.classList.remove('is-landscape');
        }
    }
    checkOrientation();
    window.addEventListener('orientationchange', checkOrientation);
    window.addEventListener('resize', checkOrientation);

    // 8. 添加移动端优化样式注入
    if (!document.getElementById('mobile-optimization-style')) {
        const mobileStyle = document.createElement('style');
        mobileStyle.id = 'mobile-optimization-style';
        mobileStyle.textContent = `
            /* 移动端优化：使用动态视口高度 */
            .is-mobile body, .is-mobile html {
                height: 100vh;
                height: calc(var(--vh, 1vh) * 100);
            }

            /* 触摸设备按钮优化 */
            .is-mobile button,
            .is-mobile .btn {
                min-height: 44px;
                min-width: 44px;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            }

            /* 移动端输入框优化 */
            .is-mobile input,
            .is-mobile textarea,
            .is-mobile select {
                font-size: 16px !important; /* 防止 iOS 聚焦时自动放大 */
                -webkit-appearance: none;
                appearance: none;
            }

            /* 移动端触摸反馈 */
            .is-mobile .btn:active {
                transform: scale(0.96);
                transition: transform 0.1s;
            }

            /* 移动端字号调整 */
            .is-mobile.is-portrait {
                font-size: 14px;
            }
            .is-mobile.is-landscape {
                font-size: 13px;
            }

            /* 隐藏移动端可能不需要的元素 */
            @media (max-width: 768px) {
                .hide-on-mobile { display: none !important; }
            }

            /* 防止用户选择文本（可选） */
            .no-select {
                -webkit-user-select: none;
                user-select: none;
                -webkit-touch-callout: none;
            }
        `;
        document.head.appendChild(mobileStyle);
    }

    console.log('[Mobile] ✅ 移动端优化已启用');
})();

// =============================================================================
// 快捷操作：暴露给控制台 / 快捷键调用的便捷方法
// =============================================================================

// 键盘快捷键：Ctrl/Cmd + Shift + I 打开安装提示（在桌面版 Chrome/Edge 上）
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        if (window.InstallPWA) {
            window.InstallPWA.install();
        }
    }
});

// 完成 PWA 模块
console.log('============================================================');
console.log('✅ AI短剧创作工作台 - PWA 模式就绪');
console.log('');
console.log('💡 Windows 电脑：使用 Chrome/Edge 打开，点击地址栏右侧 📦 图标安装');
console.log('💡 Android 手机：使用 Chrome 打开，菜单中选择"添加到主屏幕"');
console.log('💡 便捷命令：在控制台运行 InstallPWA.install()');
console.log('============================================================');