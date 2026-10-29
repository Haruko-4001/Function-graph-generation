/**
 * scripts/mcp-smoke.mjs
 * ============================================================
 * MCP 服务器的端到端冒烟：真的启动子进程、走一遍 JSON-RPC 握手与工具调用。
 *
 *   npm run mcp:smoke
 * ============================================================
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const child = spawn(process.execPath, [path.join(ROOT, 'mcp', 'server.mjs')], {
    cwd: ROOT,
    stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';
const waiters = new Map();
let stderr = '';

child.stderr.setEncoding('utf8');
child.stderr.on('data', (d) => { stderr += d; });

child.stdout.setEncoding('utf8');
child.stdout.on('data', (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        let msg;
        try { msg = JSON.parse(line); } catch (e) { continue; }
        const w = waiters.get(msg.id);
        if (w) { waiters.delete(msg.id); w(msg); }
    }
});

let seq = 0;
function request(method, params) {
    const id = ++seq;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('超时：' + method)), 30000);
        waiters.set(id, (msg) => { clearTimeout(timer); resolve(msg); });
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
}

function notify(method, params) {
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}

const checks = [];
function check(name, ok, detail) {
    checks.push({ name, ok });
    console.log((ok ? '  ✓ ' : '  ✗ ') + name + (ok ? '' : '\n      ' + detail));
}

try {
    const init = await request('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'smoke', version: '1.0.0' }
    });
    check('initialize 握手', init.result && init.result.protocolVersion === '2024-11-05', JSON.stringify(init));
    check('serverInfo 带版本号', init.result && /^\d+\.\d+\.\d+$/.test(init.result.serverInfo.version),
        JSON.stringify(init.result && init.result.serverInfo));

    notify('notifications/initialized', {});

    const tools = await request('tools/list', {});
    const names = (tools.result.tools || []).map((t) => t.name);
    check('列出 4 个工具', names.length === 4, names.join(','));
    check('工具含 analyze_function / export_python',
        names.includes('analyze_function') && names.includes('export_python'), names.join(','));

    const analyze = await request('tools/call', {
        name: 'analyze_function',
        arguments: { expression: 'x^2 - 4', xMin: -10, xMax: 10 }
    });
    const text = analyze.result.content[0].text;
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (e) { /* 断言里处理 */ }
    check('analyze_function 返回可解析 JSON', !!parsed, text.slice(0, 120));
    check('分析结果含自检摘要',
        parsed && parsed.summary && parsed.summary.total > 0 && parsed.summary.passed === parsed.summary.total,
        JSON.stringify(parsed && parsed.summary));
    check('零点识别正确', parsed && parsed.zeros.length === 2, JSON.stringify(parsed && parsed.zeros));

    const story = await request('tools/call', {
        name: 'build_storyboard',
        arguments: { expression: 'sin(x)', xMin: -10, xMax: 10 }
    });
    const sb = JSON.parse(story.result.content[0].text);
    check('分镜通过契约校验', sb.validation.ok === true, JSON.stringify(sb.validation.errors));

    const py = await request('tools/call', {
        name: 'export_python',
        arguments: { expression: 'x^3 - 3*x', xMin: -5, xMax: 5 }
    });
    const code = py.result.content[0].text;
    check('导出脚本含 f(x) 与 verify()',
        code.startsWith('#!/usr/bin/env python3') && code.includes('def f(x):') && code.includes('def verify('),
        code.slice(0, 80));

    const manifest = await request('tools/call', {
        name: 'export_manifest',
        arguments: { expression: 'sin(x)' }
    });
    const man = JSON.parse(manifest.result.content[0].text);
    check('清单 schema 正确', man.schema === 'mfv/manifest@1', JSON.stringify(man.schema));

    const bad = await request('tools/call', {
        name: 'analyze_function',
        arguments: { expression: 'sin(' }
    });
    check('错误输入返回 isError 而不是崩溃',
        bad.result && bad.result.isError === true, JSON.stringify(bad.result).slice(0, 120));

    const unknown = await request('tools/call', { name: 'nope', arguments: {} });
    check('未知工具被拒绝', unknown.result && unknown.result.isError === true, JSON.stringify(unknown.result).slice(0, 100));

    const failed = checks.filter((c) => !c.ok);
    console.log('\n' + (failed.length ? 'MCP 冒烟失败：' + failed.length + ' 项' : 'MCP 冒烟通过：' + checks.length + ' 项'));
    child.kill();
    process.exit(failed.length ? 1 : 0);
} catch (e) {
    console.error('× MCP 冒烟出错：' + e.message);
    if (stderr) console.error('server stderr:\n' + stderr.slice(0, 800));
    child.kill();
    process.exit(1);
}
