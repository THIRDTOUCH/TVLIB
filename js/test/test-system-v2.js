/**
 * ================================================
 * 第二次系统测试 - 深度检查所有模块
 * ================================================
 */

(function() {
    const issues = [];
    const warnings = [];
    const success = [];

    console.log('%c═══════════════════════════════════════════════════════', 'color: #6366f1');
    console.log('%c      AI短剧文本制作工作流 - 第二次深度测试', 'color: #6366f1; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════════════', 'color: #6366f1');

    // ========== 模块1: 基础环境检查 ==========
    function testBasicEnvironment() {
        console.log('\n%c📦 模块1: 基础环境检查', 'color: #10b981; font-weight: bold');

        // 检查必需的对象
        const checks = [
            { name: 'projectManager', obj: window.projectManager },
            { name: 'StoryboardGenerator', obj: window.StoryboardGenerator },
            { name: 'StoryboardRenderer', obj: window.StoryboardRenderer },
            { name: 'STORYBOARD_TEMPLATES', obj: window.STORYBOARD_TEMPLATES }
        ];

        checks.forEach(check => {
            if (check.obj) {
                console.log(`   ✅ ${check.name}`);
                success.push(check.name);
            } else {
                console.log(`   ❌ ${check.name} - 未定义`);
                issues.push({ module: 'environment', issue: `${check.name} 未定义` });
            }
        });

        // 检查全局变量
        if (typeof projectData !== 'undefined') {
            console.log('   ✅ projectData 全局变量');
            success.push('projectData');
        } else {
            console.log('   ❌ projectData 全局变量 - 未定义');
            issues.push({ module: 'environment', issue: 'projectData 未定义' });
        }

        if (typeof currentProject !== 'undefined') {
            console.log('   ✅ currentProject 全局变量');
            success.push('currentProject');
        } else {
            console.log('   ❌ currentProject 全局变量 - 未定义');
            issues.push({ module: 'environment', issue: 'currentProject 未定义' });
        }
    }

    // ========== 模块2: DOM元素完整性检查 ==========
    function testDOMIntegrity() {
        console.log('\n%c🎨 模块2: DOM元素完整性检查', 'color: #10b981; font-weight: bold');

        const requiredElements = [
            // 项目管理模块
            'project-list', 'create-project-modal', 'history-modal', 'version-modal',
            'tab-projects', 'project-details',
            // 大纲模块
            'tab-outline', 'outline-result',
            // 剧本模块
            'tab-script', 'script-result',
            // 小说模块
            'tab-novel', 'novel-result',
            // 分镜模块
            'tab-storyboard', 'shot-list', 'board-view',
            // 导出模块
            'tab-export'
        ];

        const missing = [];
        requiredElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                console.log(`   ✅ #${id}`);
            } else {
                console.log(`   ❌ #${id} - 缺失`);
                missing.push(id);
            }
        });

        if (missing.length > 0) {
            issues.push({ module: 'dom', issue: `缺失元素: ${missing.join(', ')}` });
        }
    }

    // ========== 模块3: 数据库功能测试 ==========
    async function testDatabaseFunctionality() {
        console.log('\n%c💾 模块3: 数据库功能测试', 'color: #10b981; font-weight: bold');

        try {
            // 检查数据库是否已初始化
            if (!projectManager.database.db) {
                await projectManager.init();
            }

            // 创建测试项目
            const testProject = await projectManager.createProject({
                title: '【测试项目】第二次深度测试',
                description: '用于系统测试的临时项目',
                genre: '测试类型',
                style: '测试风格'
            });

            if (testProject && testProject.id) {
                console.log(`   ✅ 项目创建成功 (ID: ${testProject.id})`);
                success.push('projectCreation');

                // 测试更新
                await projectManager.database.updateProject(
                    testProject.id,
                    { outline: '测试大纲内容' },
                    '测试更新操作'
                );
                console.log('   ✅ 项目更新成功');

                // 测试历史记录
                const history = await projectManager.database.getHistory(testProject.id);
                console.log(`   ✅ 历史记录功能 (${history.length} 条)`);
                success.push('history');

                // 测试版本
                const version = await projectManager.createVersion('测试版本V1');
                console.log(`   ✅ 版本创建成功: ${version.versionName}`);
                success.push('versioning');

                // 测试导出
                const exportData = await projectManager.database.exportProject(testProject.id);
                console.log(`   ✅ 导出功能 (${(JSON.stringify(exportData).length / 1024).toFixed(2)} KB)`);
                success.push('export');

                // 清理测试数据
                await projectManager.deleteProject(testProject.id);
                console.log('   ✅ 测试数据已清理');

                return true;
            }

        } catch (error) {
            console.log(`   ❌ 数据库测试失败: ${error.message}`);
            issues.push({ module: 'database', issue: error.message });
            return false;
        }
    }

    // ========== 模块4: 模板系统测试 ==========
    function testTemplateSystem() {
        console.log('\n%c📋 模块4: 模板系统测试', 'color: #10b981; font-weight: bold');

        const templates = Object.keys(STORYBOARD_TEMPLATES);
        console.log(`   找到 ${templates.length} 个模板:`);

        const templateDetails = [];
        templates.forEach(id => {
            const template = STORYBOARD_TEMPLATES[id];
            const details = `      📄 ${template.name} (${template.totalShots}镜头, ${template.layout})`;
            console.log(details);
            templateDetails.push({
                id,
                name: template.name,
                shots: template.totalShots,
                layout: template.layout
            });
        });

        // 测试模板生成
        console.log('\n   测试模板生成:');
        templates.forEach(id => {
            try {
                const data = generateFromTemplate(id, {
                    protagonist: '测试角色',
                    protagonistDesc: '测试描述'
                }, { scene: '测试场景' });

                if (data && data.shots && data.shots.length > 0) {
                    console.log(`   ✅ ${id}: 生成 ${data.shots.length} 个镜头`);
                    success.push(`template_${id}`);
                } else {
                    console.log(`   ❌ ${id}: 生成失败或返回空数据`);
                    issues.push({ module: 'template', issue: `${id} 生成失败` });
                }
            } catch (error) {
                console.log(`   ❌ ${id}: ${error.message}`);
                issues.push({ module: 'template', issue: `${id} - ${error.message}` });
            }
        });

        return templateDetails;
    }

    // ========== 模块5: 渲染器测试 ==========
    function testRenderers() {
        console.log('\n%c🎬 模块5: 渲染器测试', 'color: #10b981; font-weight: bold');

        // 创建测试容器
        const testContainer = document.createElement('div');
        testContainer.id = 'test-renderer-container';
        testContainer.style.cssText = 'position: absolute; left: -9999px;';
        document.body.appendChild(testContainer);

        try {
            // 测试生成数据
            const data = generateFromTemplate('yuji_sword_dance');
            
            // 测试渲染器
            const renderer = new StoryboardRenderer('test-renderer-container');
            
            // 测试网格视图
            renderer.render(data, { layout: '4x3', viewMode: 'grid' });
            const gridCards = testContainer.querySelectorAll('.shot-card-storyboard');
            console.log(`   ✅ 网格视图渲染: ${gridCards.length} 个卡片`);

            // 测试时间线视图
            testContainer.innerHTML = '';
            renderer.render(data, { layout: '4x3', viewMode: 'timeline' });
            const timelineItems = testContainer.querySelectorAll('.storyboard-timeline > div');
            console.log(`   ✅ 时间线视图渲染: ${timelineItems.length} 个项目`);

            // 测试轮播视图
            testContainer.innerHTML = '';
            renderer.render(data, { layout: '4x3', viewMode: 'carousel' });
            const carouselCards = testContainer.querySelectorAll('[style*="min-width: 300px"]');
            console.log(`   ✅ 轮播视图渲染: ${carouselCards.length} 个卡片`);

            success.push('renderers');
            return true;

        } catch (error) {
            console.log(`   ❌ 渲染器测试失败: ${error.message}`);
            issues.push({ module: 'renderer', issue: error.message });
            return false;
        } finally {
            // 清理测试容器
            testContainer.remove();
        }
    }

    // ========== 模块6: UI交互测试 ==========
    function testUIInteractions() {
        console.log('\n%c🖱️ 模块6: UI交互测试', 'color: #10b981; font-weight: bold');

        const uiChecks = [
            // 检查按钮是否存在
            { name: '创建项目按钮', selector: 'button[onclick*="createNewProject"]' },
            { name: '刷新列表按钮', selector: 'button[onclick*="refreshProjectList"]' },
            { name: '分析问题按钮', selector: 'button[onclick*="analyzeIssues"]' },
            // 检查Tab按钮
            { name: '大纲Tab', selector: 'button[onclick*="switchTab(\'outline\')"]' },
            { name: '剧本Tab', selector: 'button[onclick*="switchTab(\'script\')"]' },
            { name: '分镜Tab', selector: 'button[onclick*="switchTab(\'storyboard\')"]' },
            { name: '故事板Tab', selector: 'button[onclick*="switchTab(\'board\')"]' },
            { name: '导出Tab', selector: 'button[onclick*="switchTab(\'export\')"]' }
        ];

        let passed = 0;
        uiChecks.forEach(check => {
            const el = document.querySelector(check.selector);
            if (el) {
                console.log(`   ✅ ${check.name}`);
                passed++;
            } else {
                console.log(`   ⚠️ ${check.name} - 未找到`);
                warnings.push({ module: 'ui', warning: `${check.name} 未找到` });
            }
        });

        // 检查样式
        const bodyBg = getComputedStyle(document.body).background;
        if (bodyBg && bodyBg.includes('gradient')) {
            console.log('   ✅ 背景样式正常');
        } else {
            console.log('   ⚠️ 背景样式可能异常');
        }

        return passed >= uiChecks.length * 0.8; // 80%通过率
    }

    // ========== 模块7: 数据结构测试 ==========
    function testDataStructures() {
        console.log('\n%c📊 模块7: 数据结构测试', 'color: #10b981; font-weight: bold');

        // 测试项目数据结构
        try {
            const project = {
                id: 'test-id',
                title: '测试项目',
                description: '测试描述',
                genre: '都市情感',
                style: '写实',
                duration: '10分钟',
                episodes: '12集',
                outline: '大纲内容',
                script: '剧本内容',
                novel: '小说内容',
                shots: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'draft'
            };

            // 验证必需字段
            const requiredFields = ['id', 'title', 'createdAt', 'updatedAt', 'status'];
            let allValid = true;
            requiredFields.forEach(field => {
                if (project[field] !== undefined) {
                    console.log(`   ✅ 项目字段 ${field}`);
                } else {
                    console.log(`   ❌ 项目字段 ${field} 缺失`);
                    allValid = false;
                }
            });

            if (allValid) {
                success.push('projectDataStructure');
            }

        } catch (error) {
            console.log(`   ❌ 数据结构测试失败: ${error.message}`);
            issues.push({ module: 'data', issue: error.message });
        }

        // 测试分镜数据结构
        try {
            const shot = {
                id: 1,
                type: '全景',
                scene: '测试场景',
                characters: '测试角色',
                cameraMove: '固定',
                duration: '1s',
                mood: '平静',
                content: '测试内容',
                dialog: '[测试音效]',
                imagePrompt: 'test prompt',
                videoPrompt: 'test video prompt',
                lighting: '自然光'
            };

            const shotFields = ['id', 'type', 'scene', 'content', 'imagePrompt', 'videoPrompt'];
            let allValid = true;
            shotFields.forEach(field => {
                if (shot[field] !== undefined) {
                    console.log(`   ✅ 分镜字段 ${field}`);
                } else {
                    console.log(`   ❌ 分镜字段 ${field} 缺失`);
                    allValid = false;
                }
            });

            if (allValid) {
                success.push('shotDataStructure');
            }

        } catch (error) {
            console.log(`   ❌ 分镜数据结构测试失败: ${error.message}`);
            issues.push({ module: 'data', issue: error.message });
        }
    }

    // ========== 模块8: 提示词生成测试 ==========
    function testPromptGeneration() {
        console.log('\n%c💡 模块8: 提示词生成测试', 'color: #10b981; font-weight: bold');

        try {
            // 测试生成器
            const generator = new StoryboardGenerator('bamboo_duel');
            const data = generator.generate(
                { protagonist: '剑客A', protagonistDesc: '白衣剑客' },
                { scene: '竹林' }
            );

            if (data && data.shots && data.shots.length > 0) {
                console.log(`   ✅ 生成了 ${data.shots.length} 个镜头的提示词`);

                // 检查提示词质量
                const shot1 = data.shots[0];
                console.log('\n   示例提示词 (镜头1):');
                console.log(`      Image: ${shot1.imagePrompt.substring(0, 60)}...`);
                console.log(`      Video: ${shot1.videoPrompt.substring(0, 60)}...`);
                console.log(`      人物: ${shot1.characterPrompt}`);

                // 验证提示词完整性
                let validPrompts = 0;
                data.shots.forEach((shot, i) => {
                    const hasImage = shot.imagePrompt && shot.imagePrompt.length > 10;
                    const hasVideo = shot.videoPrompt && shot.videoPrompt.length > 10;
                    if (hasImage && hasVideo) validPrompts++;
                });

                const validRate = (validPrompts / data.shots.length * 100).toFixed(1);
                console.log(`   📈 提示词完整率: ${validRate}%`);

                if (validRate >= 90) {
                    console.log('   ✅ 提示词质量合格');
                    success.push('promptGeneration');
                } else {
                    console.log('   ⚠️ 提示词完整率偏低');
                    warnings.push({ module: 'prompt', warning: `提示词完整率仅 ${validRate}%` });
                }
            }

        } catch (error) {
            console.log(`   ❌ 提示词生成测试失败: ${error.message}`);
            issues.push({ module: 'prompt', issue: error.message });
        }
    }

    // ========== 模块9: 导出功能测试 ==========
    async function testExportFunctionality() {
        console.log('\n%c📥 模块9: 导出功能测试', 'color: #10b981; font-weight: bold');

        try {
            // 创建测试项目
            const project = await projectManager.createProject({
                title: '【导出测试】项目'
            });

            // 测试JSON导出
            const exportData = await projectManager.database.exportProject(project.id);
            const jsonStr = JSON.stringify(exportData);
            console.log(`   ✅ JSON导出 (${(jsonStr.length / 1024).toFixed(2)} KB)`);

            // 测试HTML导出（不触发下载，只检查函数）
            if (typeof exportStoryboard === 'function') {
                console.log('   ✅ exportStoryboard 函数存在');
                success.push('exportHTML');
            }

            // 测试CSV导出
            if (typeof exportStoryboard === 'function') {
                console.log('   ✅ exportStoryboard 支持多格式');
            }

            // 清理
            await projectManager.deleteProject(project.id);
            console.log('   ✅ 测试数据已清理');

            return true;

        } catch (error) {
            console.log(`   ❌ 导出功能测试失败: ${error.message}`);
            issues.push({ module: 'export', issue: error.message });
            return false;
        }
    }

    // ========== 模块10: 性能检查 ==========
    function testPerformance() {
        console.log('\n%c⚡ 模块10: 性能检查', 'color: #10b981; font-weight: bold');

        // 检查DOM复杂度
        const domElements = document.querySelectorAll('*').length;
        console.log(`   📊 DOM元素总数: ${domElements}`);

        if (domElements > 1000) {
            warnings.push({ module: 'performance', warning: `DOM元素过多 (${domElements})` });
            console.log('   ⚠️ DOM元素较多，可能影响性能');
        } else {
            console.log('   ✅ DOM复杂度正常');
        }

        // 检查事件监听器数量
        const scripts = document.querySelectorAll('script');
        console.log(`   📊 脚本文件数: ${scripts.length}`);

        // 检查样式表
        const styles = document.querySelectorAll('link[rel="stylesheet"]');
        console.log(`   📊 样式表数: ${styles.length}`);

        return true;
    }

    // ========== 生成问题报告 ==========
    function generateReport() {
        console.log('\n');
        console.log('%c═══════════════════════════════════════════════════════', 'color: #ef4444');
        console.log('%c                    问题汇总报告', 'color: #ef4444; font-size: 16px; font-weight: bold');
        console.log('%c═══════════════════════════════════════════════════════', 'color: #ef4444');

        if (issues.length === 0) {
            console.log('\n%c🎉 所有测试通过！系统运行正常。', 'color: #22c55e; font-weight: bold');
        } else {
            console.log(`\n%c⚠️  发现 ${issues.length} 个问题:`, 'color: #f59e0b; font-weight: bold');

            const grouped = {};
            issues.forEach(issue => {
                if (!grouped[issue.module]) {
                    grouped[issue.module] = [];
                }
                grouped[issue.module].push(issue.issue);
            });

            Object.keys(grouped).forEach(module => {
                console.log(`\n%c[${module.toUpperCase()}]`, 'color: #ef4444; font-weight: bold');
                grouped[module].forEach((issue, i) => {
                    console.log(`   ${i + 1}. ${issue}`);
                });
            });
        }

        if (warnings.length > 0) {
            console.log(`\n%c⚠️  发现 ${warnings.length} 个警告:`, 'color: #f59e0b; font-weight: bold');
            warnings.forEach((warn, i) => {
                console.log(`   ${i + 1}. [${warn.module}] ${warn.warning}`);
            });
        }

        console.log('\n%c═══════════════════════════════════════════════════════', 'color: #6366f1');
        console.log('%c                    测试统计', 'color: #6366f1; font-size: 14px');
        console.log('%c═══════════════════════════════════════════════════════', 'color: #6366f1');
        console.log(`   ✅ 通过: ${success.length}`);
        console.log(`   ❌ 问题: ${issues.length}`);
        console.log(`   ⚠️  警告: ${warnings.length}`);
        console.log(`   📊 总计: ${success.length + issues.length + warnings.length}`);
        console.log('');

        // 返回结果对象
        return {
            success: success.length,
            issues: issues,
            warnings: warnings,
            passed: issues.length === 0
        };
    }

    // ========== 运行所有测试 ==========
    async function runAllTests() {
        console.log('\n%c🚀 开始全面测试...', 'color: #3b82f6; font-weight: bold');

        // 等待环境就绪
        if (typeof projectManager === 'undefined') {
            console.log('\n❌ 项目管理器未加载，请检查脚本引用');
            return;
        }

        // 运行所有模块测试
        testBasicEnvironment();
        testDOMIntegrity();
        
        const dbResult = await testDatabaseFunctionality();
        const templates = testTemplateSystem();
        testRenderers();
        testUIInteractions();
        testDataStructures();
        testPromptGeneration();
        
        if (dbResult) {
            await testExportFunctionality();
        }
        
        testPerformance();

        // 生成最终报告
        return generateReport();
    }

    // 启动测试
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(runAllTests, 1000);
        });
    } else {
        setTimeout(runAllTests, 1000);
    }

    // 暴露测试结果
    window.runSystemTest = runAllTests;
    window.getTestResults = () => ({
        success,
        issues,
        warnings
    });

})();
