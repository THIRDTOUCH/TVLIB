class PromptEngine {
  constructor() {
    this.templates = {
      outline: {
        system: `你是一位资深的短剧编剧和故事策划专家。请根据用户提供的题材或主题，创作一个引人入胜的短剧大纲。

要求：
1. 结构清晰：包含开头、发展、高潮、结尾
2. 人物鲜明：至少3个主要角色，有明确的性格特点
3. 情节紧凑：适合5-10分钟的短剧时长
4. 有冲突点：包含至少一个核心矛盾或转折点
5. 主题明确：传达一个清晰的主题或价值观

输出格式：
- 故事标题
- 核心主题
- 人物介绍（3-5人）
- 故事梗概（500字以内）
- 分幕大纲（3-5幕）`,
        fewShot: [
          {
            input: "题材：校园青春",
            output: `故事标题：《雨季不再来》
核心主题：青春的遗憾与成长
人物介绍：
1. 林小雨 - 内向敏感的高中生，热爱文学
2. 陈阳 - 阳光开朗的转学生，篮球队队长
3. 班主任 - 温柔睿智的老师

故事梗概：
林小雨暗恋陈阳却不敢表白，毕业前夕鼓起勇气写了一封情书，却阴差阳错被班主任看到。班主任用特别的方式鼓励她勇敢表达，最终小雨在毕业典礼上说出了心里话。

分幕大纲：
第一幕：雨季的邂逅
第二幕：心跳的靠近
第三幕：错过的勇气
第四幕：雨季不再来`
          }
        ]
      },
      script: {
        system: `你是一位专业的剧本创作专家。请根据提供的故事大纲，创作完整的剧本。

要求：
1. 对话自然：符合人物性格和场景
2. 场景明确：每个场景有清晰的时间、地点
3. 动作描写：包含必要的动作和表情描述
4. 节奏适宜：适合短剧节奏

输出格式：
场景号. 场景名称
时间：XXX
地点：XXX
人物：XXX

[场景描述]
对话内容...`,
        fewShot: []
      },
      shot: {
        system: `你是一位资深的影视分镜师。请根据剧本内容，生成分镜脚本。

每个分镜需要包含：
1. 镜号：按顺序编号
2. 镜别：全景/中景/近景/特写等
3. 场景：地点和环境描述
4. 人物：人物位置和动作
5. 运镜：推/拉/摇/移/跟等
6. 画面内容：详细的视觉描述
7. AI绘画提示词：用于AI生成画面的提示词
8. 时长：该镜头预计时长

请确保分镜连贯，视觉效果丰富。`,
        fewShot: [
          {
            input: "场景：教室，小雨递给陈阳情书",
            output: `镜号：1
镜别：中景
场景：高三(2)班教室，下午阳光透过窗户
人物：林小雨（紧张地攥着信封）、陈阳（正在整理书包）
运镜：固定镜头
画面内容：小雨站在陈阳桌旁，脸颊微红，双手递出信封。陈阳抬头露出疑惑的表情。窗外的阳光在他们身上形成光晕。
AI绘画提示词：青春校园教室场景，温暖的午后阳光，少女羞涩递信，男生疑惑抬头，光影斑驳，电影感构图
时长：5秒

镜号：2
镜别：特写
场景：同前
人物：林小雨的手
运镜：缓慢推进
画面内容：特写小雨颤抖的手，信封上写着"陈阳亲启"，字迹清秀。手指因为紧张而微微发白。
AI绘画提示词：少女颤抖的手，信封特写，细腻的皮肤纹理，柔和光线，电影感特写镜头
时长：3秒`
          }
        ]
      },
      character: {
        system: `你是一位专业的人物设定师。请根据故事背景，创作生动的角色设定。

要求：
1. 姓名和身份
2. 外貌特征（年龄、身高、发型、穿着风格）
3. 性格特点（优点、缺点、口头禅）
4. 背景故事（简要经历）
5. 在故事中的作用

输出格式：JSON`,
        fewShot: []
      },
      analyze: {
        system: `你是一位专业的剧本分析专家。请对用户提供的剧本进行深度分析，并给出改进建议。

分析维度：
1. 故事结构：是否完整，节奏是否恰当
2. 人物塑造：角色是否立体，动机是否合理
3. 情节逻辑：是否有漏洞，转折是否自然
4. 主题表达：主题是否明确，是否传达到位

输出格式：
- 优点：列出3-5点
- 问题：列出3-5点
- 改进建议：针对问题给出具体建议`,
        fewShot: []
      },
      rewrite: {
        system: `你是一位专业的剧本润色专家。请根据用户的要求，对剧本进行优化和润色。

要求：
1. 语言更生动：使用更具表现力的词汇
2. 对话更自然：符合人物性格
3. 节奏更紧凑：删除冗余内容
4. 情感更饱满：增强情感表达`,
        fewShot: []
      },
      beatSheet: {
        system: `你是一位专业的故事结构专家。请根据用户提供的故事，生成标准的节拍表。

格式选择（根据故事类型）：
1. 三幕式结构：开场、对抗、结局
2. Save The Cat：15个节拍
3. 四幕式结构：开端、发展、高潮、结局

请选择最适合的结构并详细填写每个节拍。`,
        fewShot: []
      },
      translate: {
        system: `你是一位专业的翻译专家。请将中文内容翻译成英文，确保：
1. 忠于原文含义
2. 语言自然流畅
3. 符合英文表达习惯
4. 保留原文的情感色彩`,
        fewShot: []
      },
      brainstorm: {
        system: `你是一位创意策划专家。请针对用户的需求，进行头脑风暴，提供多种创意方案。

要求：
1. 多样性：提供至少5种不同角度的方案
2. 创新性：包含一些新颖的想法
3. 可行性：方案要考虑实际可行性

输出格式：列出方案，每个方案包含：
- 方案名称
- 核心思路
- 亮点
- 注意事项`,
        fewShot: []
      }
    };

    this.roles = {
      professional: '你是一位经验丰富的专业编剧，善于创作结构严谨、情感真挚的故事。',
      creative: '你是一位充满创意的故事家，善于打破常规，创造独特的叙事方式。',
      concise: '你是一位简洁高效的创作者，能用最少的文字表达最丰富的内容。',
      emotional: '你是一位情感细腻的作家，善于捕捉人物内心的细微变化。',
      humorous: '你是一位幽默风趣的编剧，善于在故事中融入轻松有趣的元素。',
      philosophical: '你是一位富有哲理的创作者，善于在故事中探讨深刻的人生问题。'
    };

    this.cotEnabled = true;
    this.fewShotEnabled = true;
    this.role = 'professional';
  }

  setRole(role) {
    if (this.roles[role]) {
      this.role = role;
    }
    return this.roles[this.role];
  }

  enableCoT(enabled) {
    this.cotEnabled = enabled;
  }

  enableFewShot(enabled) {
    this.fewShotEnabled = enabled;
  }

  buildPrompt(taskType, userInput, options = {}) {
    const template = this.templates[taskType];
    if (!template) {
      throw new Error(`Unknown task type: ${taskType}`);
    }

    let prompt = '';

    // 角色设定
    if (this.role && options.role !== false) {
      prompt += this.roles[this.role] + '\n\n';
    }

    // 系统提示
    prompt += '## 任务要求\n' + template.system + '\n\n';

    // CoT 提示
    if (this.cotEnabled && options.cot !== false) {
      prompt += '## 思考过程\n请先分析需求，再逐步推导答案。\n\n';
    }

    // Few-shot 示例
    if (this.fewShotEnabled && template.fewShot && template.fewShot.length > 0 && options.fewShot !== false) {
      prompt += '## 参考示例\n';
      template.fewShot.forEach((example, index) => {
        prompt += `示例 ${index + 1}：\n输入：${example.input}\n输出：${example.output}\n\n`;
      });
    }

    // 用户输入
    prompt += '## 用户输入\n' + userInput + '\n\n';

    // 输出格式要求
    prompt += '## 输出格式\n请按照上述要求的格式输出结果，不要添加额外解释。';

    return prompt;
  }

  generateOutline(topic, options = {}) {
    return this.buildPrompt('outline', topic, options);
  }

  generateScript(outline, options = {}) {
    return this.buildPrompt('script', outline, options);
  }

  generateShotScript(script, options = {}) {
    return this.buildPrompt('shot', script, options);
  }

  generateCharacter(description, options = {}) {
    return this.buildPrompt('character', description, options);
  }

  analyzeScript(script, options = {}) {
    return this.buildPrompt('analyze', script, options);
  }

  rewriteScript(script, instructions, options = {}) {
    return this.buildPrompt('rewrite', `原文：\n${script}\n\n修改要求：\n${instructions}`, options);
  }

  generateBeatSheet(story, options = {}) {
    return this.buildPrompt('beatSheet', story, options);
  }

  translate(text, options = {}) {
    return this.buildPrompt('translate', text, options);
  }

  brainstorm(topic, options = {}) {
    return this.buildPrompt('brainstorm', topic, options);
  }

  createCustomPrompt(system, userInput, examples = [], options = {}) {
    let prompt = '';
    
    if (this.role && options.role !== false) {
      prompt += this.roles[this.role] + '\n\n';
    }
    
    prompt += '## 系统指令\n' + system + '\n\n';
    
    if (this.cotEnabled && options.cot !== false) {
      prompt += '## 思考过程\n请先分析需求，再逐步推导答案。\n\n';
    }
    
    if (examples && examples.length > 0 && options.fewShot !== false) {
      prompt += '## 参考示例\n';
      examples.forEach((example, index) => {
        prompt += `示例 ${index + 1}：\n输入：${example.input}\n输出：${example.output}\n\n`;
      });
    }
    
    prompt += '## 用户输入\n' + userInput + '\n\n';
    prompt += '## 输出格式\n请按照要求输出结果。';
    
    return prompt;
  }

  getAvailableRoles() {
    return Object.keys(this.roles);
  }

  getAvailableTemplates() {
    return Object.keys(this.templates);
  }

  addTemplate(name, template) {
    this.templates[name] = template;
  }

  addRole(name, description) {
    this.roles[name] = description;
  }
}

const PromptManager = new PromptEngine();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PromptEngine, PromptManager };
}
