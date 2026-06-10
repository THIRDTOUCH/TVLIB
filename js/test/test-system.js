/**
 * ================================================
 * 系统测试脚本 - 发现潜在问题
 * ================================================
 */

(function() {
    console.log('🔍 开始系统测试...\n');
    const issues = [];

    // 测试1: 检查数据库初始化
    async function testDatabase() {
        console.log('📊 测试1: 数据库初始化');
        try {
            await projectManager.init();
            console.log('✅ 数据库初始化成功');
            return true;
        } catch (error) {
            console.log('❌ 数据库初始化失败:', error.message);
            issues.push({ type: 'database', message: error.message });
            return false;
        }
    }

    // 测试2: 检查模板加载
    function testTemplates() {
        console.log('\n📋 测试2: 模板系统');
        if (typeof STORYBOARD_TEMPLATES === 'undefined') {
            console.log('❌ STORYBOARD_TEMPLATES 未定义');
            issues.push({ type: 'template', message: '模板系统未加载' });
            return false;
        }
        
        const templates = Object.keys(STORYBOARD_TEMPLATES);
        console.log(`✅ 找到 ${templates.length} 个模板:`);
        templates.forEach(t => console.log(`   - ${t}`));
        return true;
    }

    // 测试3: 检查DOM元素
    function testDOMElements() {
        console.log('\n🎨 测试3: DOM元素检查');
        const requiredElements = [
            'project-list',
            'create-project-modal',
            'history-modal',
            'version-modal',
            'tab-projects',
            'board-view',
            'shot-list'
        ];

        let allFound = true;
        requiredElements.forEach(id => {
            const el = document.getElementById(id);
            if (!el) {
                console.log(`❌ 缺少元素: #${id}`);
                issues.push({ type: 'dom', message: `缺少元素 #${id}` });
                allFound = false;
            }
        });

        if (allFound) {
            console.log('✅ 所有必需的DOM元素都存在');
        }
        return allFound;
    }

    // 测试4: 检查项目创建流程
    async function testProjectCreation() {
        console.log('\n📁 测试4: 项目创建流程');
        try {
            const project = await projectManager.createProject({
                title: '测试项目',
                description: '这是一个测试项目',
                genre: '都市情感'
            });
            console.log(`✅ 项目创建成功: ${project.id}`);
            return project;
        } catch (error) {
            console.log('❌ 项目创建失败:', error.message);
            issues.push({ type: 'project', message: error.message });
            return null;
        }
    }

    // 测试5: 检查模板生成
    function testTemplateGeneration() {
        console.log('\n🎬 测试5: 模板生成测试');
        try {
            const data = generateFromTemplate('yuji_sword_dance', {
                protagonist: '虞姬',
                protagonistDesc: '25岁美女，剑法出众'
            }, {
                scene: '古代舞台'
            });

            if (!data) {
                console.log('❌ 模板生成返回空数据');
                issues.push({ type: 'generator', message: '模板生成返回空数据' });
                return false;
            }

            console.log(`✅ 生成了 ${data.shots.length} 个镜头`);
            console.log(`   总时长: ${data.totalDuration.toFixed(1)}秒`);
            return true;
        } catch (error) {
            console.log('❌ 模板生成失败:', error.message);
            issues.push({ type: 'generator', message: error.message });
            return false;
        }
    }

    // 测试6: 检查历史记录功能
    async function testHistory(projectId) {
        console.log('\n📜 测试6: 历史记录功能');
        try {
            await projectManager.database.addHistory(
                projectId,
                'test',
                '测试操作',
                { test: true }
            );
            const history = await projectManager.database.getHistory(projectId);
            console.log(`✅ 历史记录功能正常 (${history.length} 条记录)`);
            return true;
        } catch (error) {
            console.log('❌ 历史记录功能失败:', error.message);
            issues.push({ type: 'history', message: error.message });
            return false;
        }
    }

    // 测试7: 检查版本功能
    async function testVersioning(projectId) {
        console.log('\n📌 测试7: 版本管理功能');
        try {
            const version = await projectManager.database.createVersion(projectId, '测试版本V1');
            console.log(`✅ 版本创建成功: ${version.versionName}`);
            
            const versions = await projectManager.database.getVersions(projectId);
            console.log(`   当前版本数: ${versions.length}`);
            return true;
        } catch (error) {
            console.log('❌ 版本功能失败:', error.message);
            issues.push({ type: 'version', message: error.message });
            return false;
        }
    }

    // 测试8: 检查导出功能
    async function testExport(projectId) {
        console.log('\n📥 测试8: 导出功能');
        try {
            const data = await projectManager.database.exportProject(projectId);
            const jsonStr = JSON.stringify(data);
            console.log(`✅ 导出成功 (${(jsonStr.length / 1024).toFixed(2)} KB)`);
            return true;
        } catch (error) {
            console.log('❌ 导出功能失败:', error.message);
            issues.push({ type: 'export', message: error.message });
            return false;
        }
    }

    // 测试9: 检查提示词生成
    function testPromptGeneration() {
        console.log('\n💡 测试9: 提示词生成');
        try {
            const template = STORYBOARD_TEMPLATES['bamboo_duel'];
            if (!template || !template.shots || template.shots.length === 0) {
                console.log('❌ 模板数据不完整');
                issues.push({ type: 'prompt', message: '竹林对决模板数据不完整' });
                return false;
            }

            const shot = template.shots[0];
            console.log(`   镜头1: ${shot.type} - ${shot.scene}`);
            console.log(`   运镜: ${shot.camera} - ${shot.mood}`);
            console.log('✅ 提示词数据完整');
            return true;
        } catch (error) {
            console.log('❌ 提示词生成测试失败:', error.message);
            issues.push({ type: 'prompt', message: error.message });
            return false;
        }
    }

    // 运行所有测试
    async function runAllTests() {
        console.log('═══════════════════════════════════════');
        console.log('      AI短剧文本制作工作流 - 系统测试');
        console.log('═══════════════════════════════════════\n');

        // 等待DOM加载
        if (typeof projectManager === 'undefined') {
            console.log('❌ 项目管理器未加载!');
            return;
        }

        await testDatabase();
        testTemplates();
        testDOMElements();
        
        const testProject = await testProjectCreation();
        if (testProject) {
            await testHistory(testProject.id);
            await testVersioning(testProject.id);
            await testExport(testProject.id);
        }

        testTemplateGeneration();
        testPromptGeneration();

        // 汇总问题
        console.log('\n═══════════════════════════════════════');
        console.log('            测试结果汇总');
        console.log('═══════════════════════════════════════');
        
        if (issues.length === 0) {
            console.log('\n✅ 所有测试通过！系统运行正常。\n');
        } else {
            console.log(`\n⚠️  发现 ${issues.length} 个问题:\n`);
            issues.forEach((issue, i) => {
                console.log(`${i + 1}. [${issue.type.toUpperCase()}] ${issue.message}`);
            });
            console.log('');
        }
    }

    // 监听管理器就绪事件
    document.addEventListener('projectManagerReady', () => {
        console.log('📡 项目管理器已就绪');
        setTimeout(runAllTests, 500);
    });

    // 如果已经就绪，直接运行
    if (typeof projectManager !== 'undefined' && projectManager.database.db) {
        console.log('📡 项目管理器已就绪');
        setTimeout(runAllTests, 500);
    }
})();
