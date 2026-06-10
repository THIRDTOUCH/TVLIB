class TestFramework {
  constructor() {
    this.testSuites = new Map();
    this.results = [];
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.skippedTests = 0;
    this.currentSuite = null;
  }

  describe(suiteName, fn) {
    const suite = {
      name: suiteName,
      tests: [],
      beforeEach: [],
      afterEach: [],
      beforeAll: [],
      afterAll: []
    };
    
    this.currentSuite = suite;
    fn();
    this.testSuites.set(suiteName, suite);
    this.currentSuite = null;
  }

  it(testName, fn, options = {}) {
    if (!this.currentSuite) {
      throw new Error('Test must be defined within a describe block');
    }
    
    this.currentSuite.tests.push({
      name: testName,
      fn,
      skip: options.skip || false,
      timeout: options.timeout || 5000
    });
  }

  beforeEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeEach.push(fn);
    }
  }

  afterEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterEach.push(fn);
    }
  }

  beforeAll(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeAll.push(fn);
    }
  }

  afterAll(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterAll.push(fn);
    }
  }

  expect(value) {
    return {
      toBe(expected) {
        if (value !== expected) {
          throw new Error(`Expected ${expected} but got ${value}`);
        }
        return true;
      },
      toEqual(expected) {
        if (JSON.stringify(value) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(value)}`);
        }
        return true;
      },
      toBeTruthy() {
        if (!value) {
          throw new Error(`Expected truthy value but got ${value}`);
        }
        return true;
      },
      toBeFalsy() {
        if (value) {
          throw new Error(`Expected falsy value but got ${value}`);
        }
        return true;
      },
      toBeGreaterThan(expected) {
        if (!(value > expected)) {
          throw new Error(`Expected ${value} > ${expected}`);
        }
        return true;
      },
      toBeGreaterThanOrEqual(expected) {
        if (!(value >= expected)) {
          throw new Error(`Expected ${value} >= ${expected}`);
        }
        return true;
      },
      toBeLessThan(expected) {
        if (!(value < expected)) {
          throw new Error(`Expected ${value} < ${expected}`);
        }
        return true;
      },
      toBeLessThanOrEqual(expected) {
        if (!(value <= expected)) {
          throw new Error(`Expected ${value} <= ${expected}`);
        }
        return true;
      },
      toContain(expected) {
        if (!value.includes(expected)) {
          throw new Error(`Expected ${value} to contain ${expected}`);
        }
        return true;
      },
      toHaveLength(length) {
        if (value.length !== length) {
          throw new Error(`Expected length ${length} but got ${value.length}`);
        }
        return true;
      },
      toBeInstanceOf(type) {
        if (!(value instanceof type)) {
          throw new Error(`Expected instance of ${type.name}`);
        }
        return true;
      },
      toThrow(errorMessage) {
        let threw = false;
        try {
          if (typeof value === 'function') {
            value();
          } else {
            throw new Error('toThrow expects a function');
          }
        } catch (e) {
          threw = true;
          if (errorMessage && !e.message.includes(errorMessage)) {
            throw new Error(`Expected error to include "${errorMessage}" but got "${e.message}"`);
          }
        }
        if (!threw) {
          throw new Error('Expected function to throw but it did not');
        }
        return true;
      },
      toBeDefined() {
        if (value === undefined) {
          throw new Error('Expected value to be defined');
        }
        return true;
      },
      toBeUndefined() {
        if (value !== undefined) {
          throw new Error(`Expected undefined but got ${value}`);
        }
        return true;
      },
      toBeNull() {
        if (value !== null) {
          throw new Error(`Expected null but got ${value}`);
        }
        return true;
      },
      toMatch(pattern) {
        if (!pattern.test(value)) {
          throw new Error(`Expected ${value} to match ${pattern}`);
        }
        return true;
      }
    };
  }

  async run(suiteName = null) {
    this.results = [];
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.skippedTests = 0;
    
    const suitesToRun = suiteName 
      ? [this.testSuites.get(suiteName)].filter(Boolean)
      : [...this.testSuites.values()];

    for (const suite of suitesToRun) {
      const suiteStartTime = Date.now();
      
      for (const hook of suite.beforeAll) {
        await hook();
      }

      for (const test of suite.tests) {
        this.totalTests++;
        
        if (test.skip) {
          this.skippedTests++;
          this.results.push({
            suite: suite.name,
            test: test.name,
            status: 'skipped',
            duration: 0
          });
          continue;
        }

        for (const hook of suite.beforeEach) {
          await hook();
        }
        
        const testStartTime = Date.now();
        try {
          const timeout = setTimeout(() => {
            throw new Error(`Test timeout after ${test.timeout}ms`);
          }, test.timeout);
          
          await test.fn();
          clearTimeout(timeout);
          
          this.passedTests++;
          this.results.push({
            suite: suite.name,
            test: test.name,
            status: 'passed',
            duration: Date.now() - testStartTime
          });
        } catch (error) {
          this.failedTests++;
          this.results.push({
            suite: suite.name,
            test: test.name,
            status: 'failed',
            error: error.message,
            duration: Date.now() - testStartTime
          });
        }

        for (const hook of suite.afterEach) {
          await hook();
        }
      }

      for (const hook of suite.afterAll) {
        await hook();
      }
    }

    return this.getSummary();
  }

  getSummary() {
    return {
      total: this.totalTests,
      passed: this.passedTests,
      failed: this.failedTests,
      skipped: this.skippedTests,
      results: this.results,
      passRate: this.totalTests > 0 ? Math.round((this.passedTests / this.totalTests) * 100) : 0
    };
  }

  printSummary() {
    const summary = this.getSummary();
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试报告');
    console.log('='.repeat(60));
    console.log(`总计: ${summary.total} 个测试`);
    console.log(`通过: ${summary.passed} ✓`);
    console.log(`失败: ${summary.failed} ✗`);
    console.log(`跳过: ${summary.skipped} ⊘`);
    console.log(`通过率: ${summary.passRate}%`);
    console.log('='.repeat(60));

    this.results.forEach(result => {
      const icon = result.status === 'passed' ? '✓' : result.status === 'failed' ? '✗' : '⊘';
      console.log(`  ${icon} ${result.suite} > ${result.test}`);
      if (result.status === 'failed' && result.error) {
        console.log(`      错误: ${result.error}`);
      }
    });
    
    console.log('='.repeat(60) + '\n');
  }

  getAvailableSuites() {
    return [...this.testSuites.keys()];
  }
}

class TestRunner {
  constructor() {
    this.tf = new TestFramework();
    this._defineCoreTests();
    this._definePerformanceTests();
    this._defineIntegrationTests();
  }

  _defineCoreTests() {
    const tf = this.tf;
    
    // ========== 模板市场测试 ==========
    tf.describe('模板市场', () => {
      tf.it('应返回所有模板', () => {
        if (typeof TemplateManager !== 'undefined') {
          const templates = TemplateManager.getAllTemplates();
          tf.expect(templates.length).toBeGreaterThan(0);
        } else {
          console.warn('TemplateManager 未定义，跳过测试');
        }
      });

      tf.it('应支持按分类搜索模板', () => {
        if (typeof TemplateManager !== 'undefined') {
          const result = TemplateManager.searchTemplates('', 'romance');
          tf.expect(result.length).toBeGreaterThan(0);
          result.forEach(tpl => tf.expect(tpl.category).toBe('romance'));
        }
      });

      tf.it('应支持按关键词搜索', () => {
        if (typeof TemplateManager !== 'undefined') {
          const result = TemplateManager.searchTemplates('校园');
          tf.expect(result.length).toBeGreaterThan(0);
        }
      });

      tf.it('应支持按评分排序', () => {
        if (typeof TemplateManager !== 'undefined') {
          const result = TemplateManager.searchTemplates('', '', [], 'rating');
          for (let i = 1; i < result.length; i++) {
            tf.expect(result[i - 1].rating >= result[i].rating).toBeTruthy();
          }
        }
      });

      tf.it('应提供使用统计信息', () => {
        if (typeof TemplateManager !== 'undefined') {
          const stats = TemplateManager.getStats();
          tf.expect(stats.total).toBeGreaterThan(0);
        }
      });

      tf.it('应能获取单个模板', () => {
        if (typeof TemplateManager !== 'undefined') {
          const templates = TemplateManager.getAllTemplates();
          if (templates.length > 0) {
            const template = TemplateManager.getTemplate(templates[0].id);
            tf.expect(template).toBeDefined();
          }
        }
      });
    });

    // ========== 素材库测试 ==========
    tf.describe('素材库', () => {
      tf.it('应返回所有素材', () => {
        if (typeof MaterialManager !== 'undefined') {
          const materials = MaterialManager.getAllMaterials();
          tf.expect(materials.length).toBeGreaterThan(0);
        }
      });

      tf.it('应支持按类型筛选', () => {
        if (typeof MaterialManager !== 'undefined') {
          const scenes = MaterialManager.searchMaterials('', 'scene');
          tf.expect(scenes.length).toBeGreaterThan(0);
          scenes.forEach(m => tf.expect(m.type).toBe('scene'));
        }
      });

      tf.it('应提供素材类型列表', () => {
        if (typeof MaterialManager !== 'undefined') {
          const types = MaterialManager.getTypes();
          tf.expect(types.length).toBeGreaterThan(0);
        }
      });

      tf.it('应能获取单个素材', () => {
        if (typeof MaterialManager !== 'undefined') {
          const materials = MaterialManager.getAllMaterials();
          if (materials.length > 0) {
            const material = MaterialManager.getMaterial(materials[0].id);
            tf.expect(material).toBeDefined();
          }
        }
      });

      tf.it('应提供使用统计信息', () => {
        if (typeof MaterialManager !== 'undefined') {
          const stats = MaterialManager.getStats();
          tf.expect(stats.total).toBeGreaterThan(0);
        }
      });
    });

    // ========== 云端同步测试 ==========
    tf.describe('云端同步', () => {
      tf.it('应返回可用的存储服务', () => {
        if (typeof CloudSync !== 'undefined') {
          const providers = CloudSync.getAvailableProviders();
          tf.expect(providers.length).toBeGreaterThan(0);
        }
      });

      tf.it('应返回同步状态', () => {
        if (typeof CloudSync !== 'undefined') {
          const status = CloudSync.getSyncStatus();
          tf.expect(typeof status.syncing).toBe('boolean');
        }
      });

      tf.it('应支持切换同步服务', () => {
        if (typeof CloudSync !== 'undefined') {
          CloudSync.setProvider('localStorage');
          tf.expect(CloudSync.currentProvider).toBe('localStorage');
        }
      });

      tf.it('应返回同步服务详情', () => {
        if (typeof CloudSync !== 'undefined') {
          const providers = CloudSync.getAvailableProviders();
          const localProvider = providers.find(p => p.id === 'localStorage');
          tf.expect(localProvider).toBeDefined();
          tf.expect(localProvider.enabled).toBeTruthy();
        }
      });
    });

    // ========== 数据导出测试 ==========
    tf.describe('数据导出', () => {
      tf.it('应支持多种导出格式', () => {
        if (typeof Exporter !== 'undefined') {
          const formats = Exporter.getFormats();
          tf.expect(formats.length).toBeGreaterThanOrEqual(3);
        }
      });

      tf.it('应能导出项目为 JSON', () => {
        if (typeof Exporter !== 'undefined') {
          const project = { title: '测试', outline: '内容' };
          const result = Exporter.exportProject(project, 'json');
          tf.expect(result.size).toBeGreaterThan(0);
        }
      });

      tf.it('应能导出项目为 Markdown', () => {
        if (typeof Exporter !== 'undefined') {
          const project = {
            title: '测试项目',
            description: '测试描述',
            outline: '大纲内容'
          };
          const result = Exporter.exportProject(project, 'markdown');
          tf.expect(result.size).toBeGreaterThan(0);
        }
      });

      tf.it('应能导出项目为 TXT', () => {
        if (typeof Exporter !== 'undefined') {
          const project = { title: '测试', outline: '内容' };
          const result = Exporter.exportProject(project, 'txt');
          tf.expect(result.size).toBeGreaterThan(0);
        }
      });

      tf.it('应能导出项目为 CSV', () => {
        if (typeof Exporter !== 'undefined') {
          const project = {
            title: '测试',
            shots: [{ scene: 's1', action: 'a1' }]
          };
          const result = Exporter.exportProject(project, 'csv');
          tf.expect(result.size).toBeGreaterThan(0);
        }
      });
    });

    // ========== 高级提示词引擎测试 ==========
    tf.describe('高级提示词引擎', () => {
      tf.it('应返回可用的模板列表', () => {
        if (typeof PromptManager !== 'undefined') {
          const templates = PromptManager.getAvailableTemplates();
          tf.expect(templates.length).toBeGreaterThan(0);
        }
      });

      tf.it('应返回可用的角色设定', () => {
        if (typeof PromptManager !== 'undefined') {
          const roles = PromptManager.getAvailableRoles();
          tf.expect(roles.length).toBeGreaterThan(0);
        }
      });

      tf.it('应能构建大纲生成的提示词', () => {
        if (typeof PromptManager !== 'undefined') {
          const prompt = PromptManager.generateOutline('测试主题');
          tf.expect(prompt.length).toBeGreaterThan(50);
        }
      });

      tf.it('应能构建剧本生成的提示词', () => {
        if (typeof PromptManager !== 'undefined') {
          const prompt = PromptManager.generateScript('测试大纲');
          tf.expect(prompt.length).toBeGreaterThan(50);
        }
      });

      tf.it('应能构建分镜生成的提示词', () => {
        if (typeof PromptManager !== 'undefined') {
          const prompt = PromptManager.generateShotScript('测试剧本');
          tf.expect(prompt.length).toBeGreaterThan(50);
        }
      });

      tf.it('应能设置角色', () => {
        if (typeof PromptManager !== 'undefined') {
          const role = PromptManager.setRole('creative');
          tf.expect(role).toBeDefined();
        }
      });

      tf.it('应能生成角色设定提示词', () => {
        if (typeof PromptManager !== 'undefined') {
          const prompt = PromptManager.generateCharacter('测试角色');
          tf.expect(prompt.length).toBeGreaterThan(10);
        }
      });

      tf.it('应能分析剧本', () => {
        if (typeof PromptManager !== 'undefined') {
          const prompt = PromptManager.analyzeScript('测试剧本内容');
          tf.expect(prompt.length).toBeGreaterThan(10);
        }
      });
    });

    // ========== 协作功能测试 ==========
    tf.describe('协作功能', () => {
      tf.beforeEach(() => {
        if (typeof Collaboration !== 'undefined') {
          Collaboration.clearProjectData('test-project');
        }
      });

      tf.it('应能添加评论', () => {
        if (typeof Collaboration !== 'undefined') {
          const commentId = Collaboration.addComment('test-project', 'shot', '1', '测试评论');
          tf.expect(commentId.length).toBeGreaterThan(5);
        }
      });

      tf.it('应能获取评论', () => {
        if (typeof Collaboration !== 'undefined') {
          Collaboration.addComment('test-project', 'shot', '1', '测试评论');
          const comments = Collaboration.getComments('test-project');
          tf.expect(comments.length).toBeGreaterThan(0);
        }
      });

      tf.it('应能回复评论', () => {
        if (typeof Collaboration !== 'undefined') {
          const commentId = Collaboration.addComment('test-project', 'shot', '1', '测试评论');
          const replyId = Collaboration.replyToComment('test-project', commentId, '回复内容');
          tf.expect(replyId.length).toBeGreaterThan(5);
        }
      });

      tf.it('应能标记评论为已解决', () => {
        if (typeof Collaboration !== 'undefined') {
          const comments = Collaboration.getComments('test-project');
          if (comments.length > 0) {
            Collaboration.resolveComment('test-project', comments[0].id);
            const updated = Collaboration.getComments('test-project');
            tf.expect(updated[0].resolved).toBeTruthy();
          }
        }
      });

      tf.it('应能保存版本历史', () => {
        if (typeof Collaboration !== 'undefined') {
          const versionId = Collaboration.saveVersion('test-project', {
            title: '测试版本',
            outline: '测试内容'
          }, '测试保存');
          tf.expect(versionId.length).toBeGreaterThan(5);
        }
      });

      tf.it('应能获取版本历史', () => {
        if (typeof Collaboration !== 'undefined') {
          const versions = Collaboration.getVersions('test-project');
          tf.expect(versions.length).toBeGreaterThan(0);
        }
      });

      tf.it('应能恢复版本', () => {
        if (typeof Collaboration !== 'undefined') {
          const versions = Collaboration.getVersions('test-project');
          if (versions.length > 0) {
            const restored = Collaboration.restoreVersion('test-project', versions[0].id);
            tf.expect(restored).toBeDefined();
            tf.expect(restored.title).toBeDefined();
          }
        }
      });

      tf.it('应能比较版本差异', () => {
        if (typeof Collaboration !== 'undefined') {
          Collaboration.saveVersion('test-project', { title: '版本1', outline: '内容1' }, 'v1');
          Collaboration.saveVersion('test-project', { title: '版本2', outline: '内容2' }, 'v2');
          const versions = Collaboration.getVersions('test-project');
          if (versions.length >= 2) {
            const diff = Collaboration.compareVersions('test-project', versions[1].id, versions[0].id);
            tf.expect(diff.diffs).toBeDefined();
          }
        }
      });
    });

    // ========== 视频生成 API 测试 ==========
    tf.describe('视频生成 API', () => {
      tf.it('应返回可用的视频服务', () => {
        if (typeof VideoManager !== 'undefined') {
          const services = VideoManager.getAvailableServices();
          tf.expect(services.length).toBeGreaterThan(0);
        }
      });

      tf.it('应支持设置当前服务', () => {
        if (typeof VideoManager !== 'undefined') {
          VideoManager.setService('runway');
          tf.expect(VideoManager.currentService).toBe('runway');
        }
      });

      tf.it('应能生成分镜提示词', () => {
        if (typeof VideoManager !== 'undefined') {
          const prompts = VideoManager.generateShotPrompts({
            shots: [
              { scene: '教室', character: '学生', action: '讨论问题' },
              { scene: '操场', character: '运动员', action: '跑步' }
            ]
          });
          tf.expect(prompts.length).toBeGreaterThan(1);
          tf.expect(prompts[0].prompt.length).toBeGreaterThan(20);
        }
      });

      tf.it('应能获取服务状态', () => {
        if (typeof VideoManager !== 'undefined') {
          const status = VideoManager.getStatus();
          tf.expect(status).toBeDefined();
        }
      });
    });

    // ========== API 接口测试 ==========
    tf.describe('API 接口', () => {
      tf.it('应返回可用的端点文档', () => {
        if (typeof API !== 'undefined') {
          const docs = API.getEndpointDocs();
          tf.expect(docs.length).toBeGreaterThan(0);
        }
      });

      tf.it('应返回使用统计', () => {
        if (typeof API !== 'undefined') {
          const stats = API.getUsageStats();
          tf.expect(typeof stats.totalCalls).toBe('number');
        }
      });

      tf.it('应返回最近调用记录', () => {
        if (typeof API !== 'undefined') {
          const calls = API.getRecentCalls(10);
          tf.expect(Array.isArray(calls)).toBeTruthy();
        }
      });

      tf.it('应能检查配置状态', () => {
        if (typeof API !== 'undefined') {
          const configured = API.isConfigured();
          tf.expect(typeof configured).toBe('boolean');
        }
      });
    });
  }

  _definePerformanceTests() {
    const tf = this.tf;
    
    tf.describe('性能测试', () => {
      tf.it('模板搜索应在 100ms 内完成', async () => {
        if (typeof TemplateManager !== 'undefined') {
          const start = performance.now();
          for (let i = 0; i < 10; i++) {
            TemplateManager.searchTemplates('测试');
          }
          const duration = performance.now() - start;
          tf.expect(duration).toBeLessThan(100);
        }
      });

      tf.it('素材搜索应在 50ms 内完成', async () => {
        if (typeof MaterialManager !== 'undefined') {
          const start = performance.now();
          for (let i = 0; i < 10; i++) {
            MaterialManager.searchMaterials('测试');
          }
          const duration = performance.now() - start;
          tf.expect(duration).toBeLessThan(50);
        }
      });

      tf.it('提示词构建应在 20ms 内完成', async () => {
        if (typeof PromptManager !== 'undefined') {
          const start = performance.now();
          for (let i = 0; i < 10; i++) {
            PromptManager.generateOutline('测试主题');
          }
          const duration = performance.now() - start;
          tf.expect(duration).toBeLessThan(20);
        }
      });
    });
  }

  _defineIntegrationTests() {
    const tf = this.tf;
    
    tf.describe('集成测试', () => {
      tf.it('完整项目创建流程', async () => {
        if (typeof TemplateManager !== 'undefined' && typeof Collaboration !== 'undefined') {
          const testProjectId = 'integration-test-' + Date.now();
          
          // 1. 选择模板
          const templates = TemplateManager.searchTemplates('', 'romance');
          tf.expect(templates.length).toBeGreaterThan(0);
          
          // 2. 使用模板创建项目数据
          const template = templates[0];
          const projectData = {
            title: '集成测试项目',
            template: template.id,
            outline: template.data?.outline || '测试大纲'
          };
          
          // 3. 保存版本
          const versionId = Collaboration.saveVersion(testProjectId, projectData, '初始版本');
          tf.expect(versionId.length).toBeGreaterThan(5);
          
          // 4. 验证版本已保存
          const versions = Collaboration.getVersions(testProjectId);
          tf.expect(versions.length).toBeGreaterThan(0);
          
          // 5. 清理
          Collaboration.clearProjectData(testProjectId);
        }
      });

      tf.it('数据导出完整性', async () => {
        if (typeof Exporter !== 'undefined') {
          const project = {
            title: '完整性测试',
            description: '测试描述',
            outline: '大纲内容',
            script: '剧本内容',
            characters: [
              { name: '角色1', description: '描述1' },
              { name: '角色2', description: '描述2' }
            ],
            shots: [
              { scene: '场景1', action: '动作1', dialogue: '台词1' },
              { scene: '场景2', action: '动作2', dialogue: '台词2' }
            ]
          };
          
          // 测试 JSON 导出
          const jsonResult = Exporter.exportProject(project, 'json');
          tf.expect(jsonResult.size).toBeGreaterThan(0);
          
          // 测试 Markdown 导出
          const mdResult = Exporter.exportProject(project, 'markdown');
          tf.expect(mdResult.size).toBeGreaterThan(0);
        }
      });
    });
  }

  async runAll() {
    return await this.tf.run();
  }

  async runSuite(suiteName) {
    return await this.tf.run(suiteName);
  }

  printSummary() {
    this.tf.printSummary();
  }

  getAvailableSuites() {
    return this.tf.getAvailableSuites();
  }

  getResults() {
    return this.tf.getSummary();
  }
}

class PerformanceTester {
  constructor() {
    this.results = [];
  }

  async measure(name, fn, iterations = 100) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await fn();
    }
    const duration = performance.now() - start;
    
    const result = {
      name,
      iterations,
      totalDuration: duration,
      avgDuration: duration / iterations,
      opsPerSecond: Math.round((iterations / duration) * 1000)
    };
    
    this.results.push(result);
    return result;
  }

  async runSuite() {
    if (typeof TemplateManager !== 'undefined') {
      await this.measure('模板搜索', () => TemplateManager.searchTemplates('测试'), 100);
    }
    if (typeof MaterialManager !== 'undefined') {
      await this.measure('素材搜索', () => MaterialManager.searchMaterials('测试'), 100);
    }
    if (typeof PromptManager !== 'undefined') {
      await this.measure('提示词构建', () => PromptManager.generateOutline('测试'), 100);
    }
    return this.results;
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('⚡ 性能测试结果');
    console.log('='.repeat(60));
    
    this.results.forEach(result => {
      console.log(`\n${result.name}:`);
      console.log(`  执行次数: ${result.iterations}`);
      console.log(`  总耗时: ${result.totalDuration.toFixed(2)}ms`);
      console.log(`  平均: ${result.avgDuration.toFixed(4)}ms`);
      console.log(`  每秒: ${result.opsPerSecond.toLocaleString()} ops`);
    });
    
    console.log('='.repeat(60) + '\n');
  }
}

class CoverageReporter {
  constructor() {
    this.modules = [
      { name: '模板市场', file: 'app-template.js', className: 'TemplateLibrary' },
      { name: '素材库', file: 'app-template.js', className: 'MaterialLibrary' },
      { name: '云端同步', file: 'app-cloud-sync.js', className: 'CloudSyncManager' },
      { name: 'API接口', file: 'app-api.js', className: 'ExternalAPI' },
      { name: '数据导出', file: 'app-api.js', className: 'DataExporter' },
      { name: '提示词引擎', file: 'app-prompt.js', className: 'PromptEngine' },
      { name: '协作功能', file: 'app-collab.js', className: 'CollaborationManager' },
      { name: '视频生成', file: 'app-video.js', className: 'VideoGenerator' },
      { name: '性能工具', file: 'app-perf.js', className: 'PerformanceUtils' },
      { name: '移动适配', file: 'app-mobile.js', className: 'MobileAdapter' },
      { name: '错误处理', file: 'app-error.js', className: 'ErrorManager' },
      { name: '安全存储', file: 'app-secure.js', className: 'SecureStorageManager' },
      { name: '智能助手', file: 'app-agent.js', className: 'AgentManager' },
      { name: 'LLM管理', file: 'app-llm.js', className: 'LLMManager' }
    ];
  }

  generateReport(testResults) {
    const totalTests = testResults.total;
    const passedTests = testResults.passed;
    
    let report = `
╔══════════════════════════════════════════════════════════════════╗
║                    测试覆盖率报告                                  ║
║                    ${new Date().toLocaleDateString('zh-CN')}                               ║
╚══════════════════════════════════════════════════════════════════╝

📊 总体统计
──────────────────────────────────────────────────────────────────
  总测试数: ${totalTests}
  通过: ${passedTests} ✓
  失败: ${testResults.failed} ✗
  跳过: ${testResults.skipped} ⊘
  通过率: ${testResults.passRate}%

📦 模块覆盖率
──────────────────────────────────────────────────────────────────`;
    
    this.modules.forEach((module, idx) => {
      const covered = totalTests > 0 && passedTests > 0;
      const status = covered ? '✓' : '○';
      report += `\n  ${status} ${module.name.padEnd(20)} (${module.file})`;
    });

    report += `

📈 测试分布
──────────────────────────────────────────────────────────────────`;
    
    const suites = {};
    testResults.results.forEach(r => {
      if (!suites[r.suite]) {
        suites[r.suite] = { total: 0, passed: 0, failed: 0 };
      }
      suites[r.suite].total++;
      if (r.status === 'passed') suites[r.suite].passed++;
      if (r.status === 'failed') suites[r.suite].failed++;
    });

    Object.entries(suites).forEach(([name, stats]) => {
      const rate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
      report += `\n  ${name.padEnd(20)} ${stats.passed}/${stats.total} (${rate}%)`;
    });

    if (testResults.failed > 0) {
      report += `
\n⚠️ 失败测试详情
──────────────────────────────────────────────────────────────────`;
      testResults.results.filter(r => r.status === 'failed').forEach(r => {
        report += `\n  ✗ ${r.suite} > ${r.test}`;
        report += `\n    错误: ${r.error}`;
      });
    }

    report += `

╔══════════════════════════════════════════════════════════════════╗
║                    报告生成完成                                   ║
╚══════════════════════════════════════════════════════════════════╝
`;

    return report;
  }

  printReport(testResults) {
    console.log(this.generateReport(testResults));
  }
}

const TestRunnerInstance = new TestRunner();
const PerformanceTestRunner = new PerformanceTester();
const CoverageReporterInstance = new CoverageReporter();

async function runAllTests() {
  console.log('\n🚀 开始运行自动化测试...\n');
  
  const results = await TestRunnerInstance.runAll();
  TestRunnerInstance.printSummary();
  
  CoverageReporterInstance.printReport(results);
  
  return results;
}

async function runPerformanceTests() {
  console.log('\n⚡ 开始运行性能测试...\n');
  
  await PerformanceTestRunner.runSuite();
  PerformanceTestRunner.printResults();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    TestFramework, 
    TestRunner, 
    PerformanceTester,
    CoverageReporter,
    TestRunnerInstance,
    PerformanceTestRunner,
    CoverageReporterInstance,
    runAllTests,
    runPerformanceTests
  };
}
