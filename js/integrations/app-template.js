class TemplateLibrary {
  constructor() {
    this.templates = new Map();
    this.categories = new Map();
    this.tags = new Set();
    this._init();
  }

  _init() {
    this._loadBuiltInTemplates();
    this._loadUserTemplates();
  }

  _loadBuiltInTemplates() {
    const builtIn = [
      {
        id: 'tpl_romance_001',
        name: '青春校园爱情',
        category: 'romance',
        description: '适合校园题材的短剧，包含初恋、误会、和解等经典桥段',
        tags: ['校园', '爱情', '青春', '初恋'],
        difficulty: 'easy',
        duration: 5,
        scenes: 4,
        builtIn: true,
        rating: 4.8,
        usage: 1523,
        data: {
          outline: '第一章：偶遇\n第二章：心动\n第三章：误会\n第四章：告白',
          characters: ['女主（害羞内向）', '男主（阳光开朗）', '闺蜜（助攻）'],
          beats: ['开场：校园日常', '激发事件：男主意外帮助女主', '发展：多次互动产生好感', '转折：误会产生', '高潮：雨中告白', '结局：确认关系']
        }
      },
      {
        id: 'tpl_action_001',
        name: '都市悬疑反转',
        category: 'action',
        description: '适合都市悬疑题材，包含多重反转的紧凑剧情',
        tags: ['悬疑', '反转', '都市', '推理'],
        difficulty: 'medium',
        duration: 8,
        scenes: 6,
        builtIn: true,
        rating: 4.6,
        usage: 1089,
        data: {
          outline: '第一幕：案件发生\n第二幕：线索追踪\n第三幕：关键发现\n第四幕：真相揭露\n第五幕：意外反转',
          characters: ['主角（侦探）', '神秘人', '警察', '证人'],
          beats: ['开场：平静的生活', '激发事件：意外发现', '发展：线索拼凑', '转折：假线索误导', '高潮：真相对决', '反转：幕后黑手是亲近之人', '结局：正义伸张']
        }
      },
      {
        id: 'tpl_family_001',
        name: '家庭温情喜剧',
        category: 'family',
        description: '适合家庭题材，温馨幽默，适合短视频平台',
        tags: ['家庭', '喜剧', '温情', '日常'],
        difficulty: 'easy',
        duration: 3,
        scenes: 3,
        builtIn: true,
        rating: 4.9,
        usage: 2876,
        data: {
          outline: '场景一：普通家庭\n场景二：搞笑事件\n场景三：温情结尾',
          characters: ['爸爸（搞笑担当）', '妈妈（智慧担当）', '孩子（意外担当）'],
          beats: ['开场：家庭日常', '激发事件：突发状况', '发展：各种乌龙', '高潮：一家人面对困难', '结局：温馨和解']
        }
      },
      {
        id: 'tpl_fantasy_001',
        name: '奇幻穿越成长',
        category: 'fantasy',
        description: '奇幻题材，包含穿越、成长、冒险元素',
        tags: ['奇幻', '穿越', '成长', '冒险'],
        difficulty: 'hard',
        duration: 10,
        scenes: 8,
        builtIn: true,
        rating: 4.7,
        usage: 1654,
        data: {
          outline: '序章：现代生活\n第一章：意外穿越\n第二章：新世界探索\n第三章：获得能力\n第四章：遭遇挑战\n第五章：最终对决\n第六章：回归或留下',
          characters: ['主角（现代人）', '导师（智者）', '对手（反派）', '伙伴'],
          beats: ['开场：现代困境', '激发事件：意外穿越', '发展：适应新世界', '发现：获得特殊能力', '挑战：遭遇强敌', '成长：克服内心恐惧', '高潮：最终对决', '结局：选择归属']
        }
      },
      {
        id: 'tpl_office_001',
        name: '职场励志逆袭',
        category: 'office',
        description: '职场题材，新人成长，励志向上',
        tags: ['职场', '励志', '逆袭', '成长'],
        difficulty: 'medium',
        duration: 6,
        scenes: 5,
        builtIn: true,
        rating: 4.5,
        usage: 1987,
        data: {
          outline: '第一幕：新人入职\n第二幕：遭遇挫折\n第三幕：贵人相助\n第四幕：能力展现\n第五幕：事业成功',
          characters: ['主角（职场新人）', '导师（前辈）', '对手（同事）', '老板'],
          beats: ['开场：信心满满入职', '激发事件：初次失败', '发展：自我怀疑', '转折：遇到贵人', '发现：自身潜力', '高潮：关键项目成功', '结局：事业爱情双丰收']
        }
      }
    ];

    builtIn.forEach(tpl => {
      this.templates.set(tpl.id, tpl);
      tpl.tags.forEach(tag => this.tags.add(tag));
      
      if (!this.categories.has(tpl.category)) {
        this.categories.set(tpl.category, []);
      }
      this.categories.get(tpl.category).push(tpl.id);
    });
  }

  _loadUserTemplates() {
    try {
      const saved = localStorage.getItem('user_templates');
      if (saved) {
        const userTemplates = JSON.parse(saved);
        userTemplates.forEach(tpl => {
          this.templates.set(tpl.id, tpl);
          tpl.tags.forEach(tag => this.tags.add(tag));
          
          if (!this.categories.has(tpl.category)) {
            this.categories.set(tpl.category, []);
          }
          this.categories.get(tpl.category).push(tpl.id);
        });
      }
    } catch (e) {
      console.error('加载用户模板失败:', e);
    }
  }

  _saveUserTemplates() {
    const userTemplates = [...this.templates.values()].filter(tpl => !tpl.builtIn);
    localStorage.setItem('user_templates', JSON.stringify(userTemplates));
  }

  getAllTemplates() {
    return [...this.templates.values()];
  }

  getTemplate(id) {
    return this.templates.get(id);
  }

  searchTemplates(query = '', category = '', tags = [], sortBy = 'rating', limit = 20) {
    let results = [...this.templates.values()];
    
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(tpl => 
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (category) {
      results = results.filter(tpl => tpl.category === category);
    }

    if (tags && tags.length > 0) {
      results = results.filter(tpl => tags.some(tag => tpl.tags.includes(tag)));
    }

    results.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'usage':
          return b.usage - a.usage;
        case 'difficulty':
          const diffOrder = { easy: 1, medium: 2, hard: 3 };
          return diffOrder[a.difficulty] - diffOrder[b.difficulty];
        case 'duration':
          return a.duration - b.duration;
        default:
          return 0;
      }
    });

    return results.slice(0, limit);
  }

  getCategories() {
    return [...this.categories.keys()];
  }

  getTags() {
    return [...this.tags];
  }

  createTemplate(templateData) {
    const id = 'tpl_user_' + Date.now().toString(36);
    const template = {
      id,
      name: templateData.name || '未命名模板',
      category: templateData.category || 'custom',
      description: templateData.description || '',
      tags: templateData.tags || [],
      difficulty: templateData.difficulty || 'medium',
      duration: templateData.duration || 5,
      scenes: templateData.scenes || 4,
      builtIn: false,
      rating: 0,
      usage: 0,
      data: templateData.data || {},
      createdAt: Date.now(),
      author: templateData.author || '自定义'
    };

    this.templates.set(id, template);
    template.tags.forEach(tag => this.tags.add(tag));
    
    if (!this.categories.has(template.category)) {
      this.categories.set(template.category, []);
    }
    this.categories.get(template.category).push(id);
    
    this._saveUserTemplates();
    return id;
  }

  updateTemplate(id, updates) {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error('模板不存在');
    }
    if (template.builtIn) {
      throw new Error('不能修改内置模板');
    }
    
    Object.assign(template, updates);
    this._saveUserTemplates();
  }

  deleteTemplate(id) {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error('模板不存在');
    }
    if (template.builtIn) {
      throw new Error('不能删除内置模板');
    }
    
    const categoryTemplates = this.categories.get(template.category);
    if (categoryTemplates) {
      const idx = categoryTemplates.indexOf(id);
      if (idx !== -1) {
        categoryTemplates.splice(idx, 1);
      }
    }
    
    this.templates.delete(id);
    this._saveUserTemplates();
  }

  useTemplate(id) {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error('模板不存在');
    }
    
    template.usage = (template.usage || 0) + 1;
    if (!template.builtIn) {
      this._saveUserTemplates();
    }
    
    return JSON.parse(JSON.stringify(template.data));
  }

  rateTemplate(id, rating) {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error('模板不存在');
    }
    
    if (!template.ratings) {
      template.ratings = [];
    }
    template.ratings.push({ rating, timestamp: Date.now() });
    
    const total = template.ratings.reduce((sum, r) => sum + r.rating, 0);
    template.rating = Math.round((total / template.ratings.length) * 10) / 10;
    
    if (!template.builtIn) {
      this._saveUserTemplates();
    }
  }

  exportTemplate(id) {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error('模板不存在');
    }
    
    const exportData = JSON.stringify(template, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  importTemplate(jsonData) {
    try {
      const template = JSON.parse(jsonData);
      
      if (!template.name || !template.data) {
        throw new Error('模板数据不完整');
      }
      
      template.id = 'tpl_import_' + Date.now().toString(36);
      template.builtIn = false;
      template.usage = 0;
      template.importedAt = Date.now();
      
      this.templates.set(template.id, template);
      template.tags.forEach(tag => this.tags.add(tag));
      
      if (!this.categories.has(template.category)) {
        this.categories.set(template.category, []);
      }
      this.categories.get(template.category).push(template.id);
      
      this._saveUserTemplates();
      return template.id;
    } catch (e) {
      throw new Error('模板导入失败: ' + e.message);
    }
  }

  getStats() {
    const builtIn = [...this.templates.values()].filter(tpl => tpl.builtIn).length;
    const user = [...this.templates.values()].filter(tpl => !tpl.builtIn).length;
    const totalUsage = [...this.templates.values()].reduce((sum, tpl) => sum + (tpl.usage || 0), 0);
    
    return {
      total: this.templates.size,
      builtIn,
      user,
      categories: this.categories.size,
      tags: this.tags.size,
      totalUsage
    };
  }
}

class MaterialLibrary {
  constructor() {
    this.materials = new Map();
    this._init();
  }

  _init() {
    this._loadBuiltInMaterials();
    this._loadUserMaterials();
  }

  _loadBuiltInMaterials() {
    const builtIn = [
      {
        id: 'mat_001',
        name: '校园场景 - 阳光课堂',
        type: 'scene',
        description: '明亮的教室，阳光透过窗户洒入，充满青春气息',
        tags: ['校园', '教室', '阳光', '白天'],
        builtIn: true,
        url: null,
        prompt: 'bright classroom, sunlight streaming through windows, school desks, blackboard, school atmosphere, cinematic lighting'
      },
      {
        id: 'mat_002',
        name: '都市夜景 - 霓虹街道',
        type: 'scene',
        description: '繁华都市夜晚，霓虹灯闪烁，人流如织',
        tags: ['都市', '夜景', '霓虹', '街道'],
        builtIn: true,
        url: null,
        prompt: 'city night street, neon lights, bustling crowd, rain wet pavement, cyberpunk vibes, cinematic'
      },
      {
        id: 'mat_003',
        name: '自然风景 - 山川河流',
        type: 'scene',
        description: '壮丽山川，河流蜿蜒，大自然风光',
        tags: ['自然', '山川', '河流', '风景'],
        builtIn: true,
        url: null,
        prompt: 'majestic mountain landscape, winding river, dramatic clouds, epic scenery, wide angle shot'
      },
      {
        id: 'mat_004',
        name: '室内场景 - 温馨卧室',
        type: 'scene',
        description: '温馨舒适的卧室，暖色调装饰',
        tags: ['室内', '卧室', '温馨', '家居'],
        builtIn: true,
        url: null,
        prompt: 'cozy bedroom interior, warm lighting, wooden furniture, soft blankets, peaceful atmosphere'
      },
      {
        id: 'mat_005',
        name: '角色造型 - 学生少女',
        type: 'character',
        description: '穿着校服的高中女生，清纯可爱',
        tags: ['角色', '学生', '少女', '校服'],
        builtIn: true,
        url: null,
        prompt: 'high school girl in school uniform, cute expression, soft lighting, detailed face, anime style'
      },
      {
        id: 'mat_006',
        name: '角色造型 - 职业男性',
        type: 'character',
        description: '西装革履的职业男性，成熟稳重',
        tags: ['角色', '职业', '男性', '西装'],
        builtIn: true,
        url: null,
        prompt: 'businessman in suit, professional appearance, confident expression, office background, realistic'
      },
      {
        id: 'mat_007',
        name: '道具 - 智能手机',
        type: 'prop',
        description: '现代智能手机，用于各种场景',
        tags: ['道具', '手机', '现代', '科技'],
        builtIn: true,
        url: null,
        prompt: 'smartphone in hand, close up shot, screen glow, detailed texture, modern technology'
      },
      {
        id: 'mat_008',
        name: '氛围 - 雨天街道',
        type: 'atmosphere',
        description: '潮湿的街道，雨滴落下，忧郁氛围',
        tags: ['氛围', '雨天', '街道', '忧郁'],
        builtIn: true,
        url: null,
        prompt: 'rainy street scene, raindrops falling, wet pavement reflecting lights, moody atmosphere, dark tones'
      }
    ];

    builtIn.forEach(mat => {
      this.materials.set(mat.id, mat);
    });
  }

  _loadUserMaterials() {
    try {
      const saved = localStorage.getItem('user_materials');
      if (saved) {
        const userMaterials = JSON.parse(saved);
        userMaterials.forEach(mat => {
          this.materials.set(mat.id, mat);
        });
      }
    } catch (e) {
      console.error('加载用户素材失败:', e);
    }
  }

  _saveUserMaterials() {
    const userMaterials = [...this.materials.values()].filter(mat => !mat.builtIn);
    localStorage.setItem('user_materials', JSON.stringify(userMaterials));
  }

  getAllMaterials() {
    return [...this.materials.values()];
  }

  getMaterial(id) {
    return this.materials.get(id);
  }

  searchMaterials(query = '', type = '', tags = [], limit = 30) {
    let results = [...this.materials.values()];
    
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(mat => 
        mat.name.toLowerCase().includes(q) ||
        mat.description.toLowerCase().includes(q) ||
        mat.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (type) {
      results = results.filter(mat => mat.type === type);
    }

    if (tags && tags.length > 0) {
      results = results.filter(mat => tags.some(tag => mat.tags.includes(tag)));
    }

    return results.slice(0, limit);
  }

  getTypes() {
    return [...new Set([...this.materials.values()].map(mat => mat.type))];
  }

  addMaterial(materialData) {
    const id = 'mat_' + Date.now().toString(36);
    const material = {
      id,
      name: materialData.name || '未命名素材',
      type: materialData.type || 'scene',
      description: materialData.description || '',
      tags: materialData.tags || [],
      builtIn: false,
      url: materialData.url || null,
      prompt: materialData.prompt || '',
      createdAt: Date.now()
    };

    this.materials.set(id, material);
    this._saveUserMaterials();
    return id;
  }

  deleteMaterial(id) {
    const material = this.materials.get(id);
    if (!material) {
      throw new Error('素材不存在');
    }
    if (material.builtIn) {
      throw new Error('不能删除内置素材');
    }
    
    this.materials.delete(id);
    this._saveUserMaterials();
  }

  useMaterial(id) {
    const material = this.materials.get(id);
    if (!material) {
      throw new Error('素材不存在');
    }
    return material;
  }

  getStats() {
    const builtIn = [...this.materials.values()].filter(mat => mat.builtIn).length;
    const user = [...this.materials.values()].filter(mat => !mat.builtIn).length;
    const types = this.getTypes();
    
    return {
      total: this.materials.size,
      builtIn,
      user,
      types: types.length,
      typeCount: types.reduce((acc, type) => {
        acc[type] = [...this.materials.values()].filter(mat => mat.type === type).length;
        return acc;
      }, {})
    };
  }
}

const TemplateManager = new TemplateLibrary();
const MaterialManager = new MaterialLibrary();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TemplateLibrary, MaterialLibrary, TemplateManager, MaterialManager };
}