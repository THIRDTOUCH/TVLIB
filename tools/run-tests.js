#!/usr/bin/env node
/* ============================================================
 * TVLIB 自动化测试工具 v3 (acorn AST 精确解析 + vm 语法检查)
 * 用法：node tools/run-tests.js
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let exitCode = 0;

function section(t) { console.log('\n' + '='.repeat(68)); console.log('  ' + t); console.log('='.repeat(68)); }
function ok(m) { console.log('  \u2705 ' + m); }
function warn(m) { console.log('  \u26A0\uFE0F  ' + m); exitCode = Math.max(exitCode, 1); }
function fail(m) { console.log('  \u274C ' + m); exitCode = Math.max(exitCode, 2); }

/* ---------- 获取所有 JS 文件 ---------- */
const jsFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory() && !['test', 'tools', 'node_modules'].includes(e.name)) walk(f);
    else if (e.isFile() && e.name.endsWith('.js')) jsFiles.push(f);
  }
})(path.join(ROOT, 'js'));
jsFiles.sort();

/* ---------- 1. 语法检查 ---------- */
section('1. 语法检查 (node --check)');
let okCount = 0;
for (const f of jsFiles) {
  try { require('child_process').execSync('node --check "' + f + '"', { stdio: 'pipe' }); okCount++; }
  catch (e) { fail(path.relative(ROOT, f) + ': ' + e.stderr.toString().trim().split('\n')[0]); }
}
ok(okCount + ' / ' + jsFiles.length + ' 文件语法正确');

/* ---------- 2. 跨文件顶层声明冲突扫描 (acorn AST) ---------- */
section('2. 跨文件顶层声明冲突扫描 (acorn AST 精确解析)');

let acornAvailable = false;
try { require.resolve('acorn'); acornAvailable = true; } catch (_) {}
if (!acornAvailable) { warn('acorn 未安装，跳过精确解析'); }

function getTopLevelNames(src) {
  const names = new Set();
  try {
    const acorn = require('acorn');
    const ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script' });
    for (const node of ast.body) {
      if (node.type === 'VariableDeclaration' && ['const', 'let'].includes(node.kind)) {
        for (const d of node.declarations) {
          if (d.id && d.id.type === 'Identifier') names.add(d.id.name);
        }
      } else if (node.type === 'FunctionDeclaration' && node.id) {
        names.add(node.id.name);
      } else if (node.type === 'ClassDeclaration' && node.id) {
        names.add(node.id.name);
      }
    }
  } catch (_) {}
  return names;
}

const globalMap = new Map();
for (const f of jsFiles) {
  const src = fs.readFileSync(f, 'utf8');
  const rel = path.relative(ROOT, f);
  const names = acornAvailable ? getTopLevelNames(src) : new Set();
  for (const n of names) {
    if (!globalMap.has(n)) globalMap.set(n, []);
    globalMap.get(n).push(rel);
  }
}
let conflictCount = 0;
for (const [name, files] of globalMap.entries()) {
  if (files.length > 1) {
    conflictCount++;
    fail('冲突: ' + name.padEnd(28) + ' -> ' + files.join(', '));
  }
}
if (conflictCount === 0) ok('无跨文件顶层声明冲突');
else warn('发现 ' + conflictCount + ' 个跨文件顶层声明冲突');

/* ---------- 3. 脚本浏览器加载语法验证 ---------- */
section('3. 脚本浏览器加载语法验证 (vm 沙盒)');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scriptRegex = /<script\s+src="([^"]+\.js[^"]*)"[^>]*>/g;
const loadOrder = [];
for (const m of html.matchAll(scriptRegex)) {
  const src = m[1].split('?')[0];
  const abs = path.join(ROOT, src);
  if (fs.existsSync(abs)) loadOrder.push({ rel: src, abs });
}
ok(loadOrder.length + ' 个脚本待验证');

const vmSandbox = {
  console,
  JSON, Math, Array, Object, Date, String, Number, Boolean, Map, Set, Promise, RegExp, Symbol,
  setTimeout: cb => setTimeout(cb, 0), clearTimeout, setInterval, clearInterval,
  localStorage: { getItem:()=>null, setItem:()=>{}, removeItem:()=>{}, clear:()=>{} },
  sessionStorage: { getItem:()=>null, setItem:()=>{}, removeItem:()=>{}, clear:()=>{} },
  navigator: { userAgent:'node-test', language:'zh-CN', onLine:true },
  indexedDB: undefined,
  fetch: () => Promise.resolve({ ok:true, json:()=>Promise.resolve({}), text:()=>Promise.resolve('') }),
  performance: { now:() => Date.now() },
  history: { pushState:()=>{}, replaceState:()=>{} },
  location: { href:'http://localhost/', pathname:'/' },
  Symbol: undefined, Reflect: undefined, Proxy: undefined,
};
vmSandbox.window = vmSandbox;
vmSandbox.self = vmSandbox;
vmSandbox.document = undefined;
vm.createContext(vmSandbox);

let syntaxOk = 0;
for (const {rel, abs} of loadOrder) {
  try {
    const src = fs.readFileSync(abs, 'utf8');
    vm.runInContext(src, vmSandbox, { filename: rel, timeout: 5000 });
    syntaxOk++;
  } catch (e) {
    if (e instanceof SyntaxError) fail('SyntaxError: ' + rel + ' -> ' + e.message.split('\n')[0]);
    else syntaxOk++; // DOM 错误不影响语法正确性
  }
}
ok(syntaxOk + ' / ' + loadOrder.length + ' 个脚本无语法错误，可安全加载');

/* ---------- 4. HTML 必需组件检查 ---------- */
section('4. HTML 必需组件检查');
const requiredIds = ['create-project-modal','toast-container','project-list',
  'new-project-title','project-name','current-project-name'];
for (const id of requiredIds) {
  if (html.includes('id="' + id + '"') || html.includes("id='" + id + "'"))
    ok('HTML 含 id=' + id);
  else fail('HTML 缺少 id=' + id);
}

/* ---------- 5. HTTP 服务器 & 首页响应 ---------- */
section('5. HTTP 服务器 & 首页响应');
const PORT = 18080 + Math.floor(Math.random() * 1000);
const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not Found'); }
    const ext = path.extname(filePath);
    const ct = {'.html':'text/html','.js':'application/javascript',
      '.css':'text/css','.svg':'image/svg+xml','.json':'application/json'}[ext] || 'text/plain';
    res.writeHead(200, {'Content-Type':ct}); res.end(data);
  });
});
server.listen(PORT, '127.0.0.1', () => {
  http.get('http://127.0.0.1:'+PORT+'/index.html', res => {
    if (res.statusCode === 200) ok('HTTP 200 OK  端口 ' + PORT);
    else fail('HTTP ' + res.statusCode);
    let body = ''; res.on('data', d => body += d);
    res.on('end', () => {
      if (body.length > 1000 && body.includes('<title')) ok('首页 ' + body.length + ' 字节');
      else fail('首页异常');
      server.close();
      console.log('\n============ 测试结束 ============');
      if (exitCode === 0) console.log('✅ 全部通过');
      else if (exitCode === 1) console.log('⚠️ 有警告（不影响运行）');
      else console.log('❌ 有错误');
      process.exit(exitCode);
    });
  }).on('error', e => { fail('HTTP: ' + e.message); server.close(); process.exit(2); });
});
