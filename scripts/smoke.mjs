/**
 * scripts/smoke.mjs
 * ============================================================
 * 浏览器冒烟测试：真正把页面打开，检查有没有渲染、有没有报错。
 *
 * 单元测试覆盖不到「Plotly 到底画出来没有」「点击后有反应吗」这类问题，
 * 所以单独留一个端到端脚本。
 *
 * 用法：
 *   npm run build && npm run smoke
 *   MFV_BROWSER="/path/to/chrome" node scripts/smoke.mjs
 *   MFV_TARGET=index.html node scripts/smoke.mjs      # 测开发版
 *
 * 找不到浏览器时以 0 退出（跳过），不阻塞 CI。
 * ============================================================
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.MFV_PORT || 9431);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findBrowser() {
    if (process.env.MFV_BROWSER && fs.existsSync(process.env.MFV_BROWSER)) return process.env.MFV_BROWSER;
    const candidates = [
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser'
    ];
    return candidates.find((p) => fs.existsSync(p)) || null;
}

const browserPath = findBrowser();
if (!browserPath) {
    console.log('· 未找到 Chrome / Edge，跳过浏览器冒烟测试（可用 MFV_BROWSER 指定）');
    process.exit(0);
}

const targetFile = process.env.MFV_TARGET
    ? path.resolve(ROOT, process.env.MFV_TARGET)
    : path.resolve(ROOT, 'dist/math-function-visualizer.html');

if (!fs.existsSync(targetFile)) {
    console.error('× 目标文件不存在：' + targetFile + '\n  请先执行 npm run build，或用 MFV_TARGET=index.html');
    process.exit(1);
}

const target = pathToFileURL(targetFile).href;
const profile = path.join(ROOT, '.smoke-profile');
const browser = spawn(browserPath, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run', '--disable-gpu', '--enable-unsafe-swiftshader',
    '--window-size=1440,1000', 'about:blank'
], { stdio: 'ignore' });

async function waitPort() {
    for (let i = 0; i < 80; i++) {
        try {
            const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
            if (r.ok) return r.json();
        } catch (e) { /* 还没起来 */ }
        await sleep(400);
    }
    throw new Error('浏览器调试端口未就绪');
}

let ws;
try {
    const version = await waitPort();
    ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.addEventListener('open', resolve));
} catch (e) {
    console.error('× ' + e.message);
    browser.kill();
    process.exit(1);
}

let seq = 0;
const pending = new Map();
const listeners = [];
const exceptions = [];
ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
    }
    listeners.forEach((fn) => fn(msg));
});

function browserSend(method, params = {}) {
    const id = ++seq;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        setTimeout(() => pending.has(id) && (pending.delete(id), reject(new Error('超时：' + method))), 60000);
    });
}

const { targetId } = await browserSend('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await browserSend('Target.attachToTarget', { targetId, flatten: true });

let seq2 = 0;
const pending2 = new Map();
listeners.push((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.id && pending2.has(m.id)) {
        const p = pending2.get(m.id);
        pending2.delete(m.id);
        m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
    }
    if (m.method === 'Runtime.exceptionThrown') {
        exceptions.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
    }
});

function send(method, params = {}) {
    const id = ++seq2 + 100000;
    ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((resolve, reject) => {
        pending2.set(id, { resolve, reject });
        setTimeout(() => pending2.has(id) && (pending2.delete(id), reject(new Error('超时：' + method))), 60000);
    });
}

const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
};

const checks = [];
function check(name, ok, detail) {
    checks.push({ name, ok, detail });
    console.log((ok ? '  ✓ ' : '  ✗ ') + name + (detail && !ok ? '\n      ' + detail : ''));
}

try {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: target });
    await sleep(4000);
    // 首屏字体与 Plotly 初始化耗时随构建体积变化，轮询等待就绪，避免固定 sleep 误判
    for (let i = 0; i < 40; i++) {
        const ready = await evaluate(`typeof window.MathCore === 'object'
            && !!document.querySelector('#graph-container .plotly')`);
        if (ready) break;
        await sleep(500);
    }

    const boot = await evaluate(`({
        title: document.title,
        MathCore: typeof window.MathCore,
        Facts: typeof window.MathFacts,
        Player: typeof window.MathStoryboardPlayer,
        Codegen: typeof window.MathCodegen,
        props: document.querySelectorAll('#properties-panel .prop').length,
        svg: document.querySelectorAll('#graph-container svg').length
    })`);

    check('页面标题正确', /数学函数可视化/.test(boot.title), boot.title);
    check('核心模块已加载', boot.MathCore === 'object' && boot.Facts === 'object'
        && boot.Player === 'function' && boot.Codegen === 'object',
        JSON.stringify(boot));
    check('图形已渲染', boot.svg > 0, 'svg=' + boot.svg);
    check('性质报告已生成', boot.props >= 10, 'props=' + boot.props);

    // 切换到一个有极值与零点的函数，验证重绘链路
    const rerender = await evaluate(`(async () => {
        document.getElementById('function-expr').value = 'x^2 - 4';
        document.getElementById('plot-btn').click();
        await new Promise(r => setTimeout(r, 3000));
        return {
            props: document.querySelectorAll('#properties-panel .prop').length,
            err: document.getElementById('graph-error').textContent
        };
    })()`);
    check('切换函数后重绘成功', rerender.props >= 10 && !rerender.err, JSON.stringify(rerender));

    // 分步讲解
    const story = await evaluate(`(async () => {
        document.getElementById('story-btn').click();
        await new Promise(r => setTimeout(r, 6500));
        const cap = document.getElementById('story-caption');
        return {
            caption: cap.textContent.trim(),
            shown: cap.classList.contains('show'),
            facts: document.getElementById('story-facts').textContent.trim()
        };
    })()`);
    check('分步讲解能播放', story.shown && story.caption.length > 0, JSON.stringify(story));
    check('数值自检有输出', /数值自检/.test(story.facts), story.facts);

    const conic = await evaluate(`(async () => {
        document.querySelector('.view-btn[data-view="conic"]').click();
        await new Promise(r => setTimeout(r, 600));
        document.getElementById('conic-expr').value = 'x^2/4 + y^2/9 = 1';
        document.getElementById('plot-btn').click();
        await new Promise(r => setTimeout(r, 3500));
        return {
            text: document.getElementById('properties-panel').innerText,
            err: document.getElementById('graph-error').textContent
        };
    })()`);
    check('圆锥曲线模式可用', /椭圆/.test(conic.text) && !conic.err, JSON.stringify(conic).slice(0, 200));

    const learn = await evaluate(`(async () => {
        document.getElementById('learn-btn').click();
        await new Promise(r => setTimeout(r, 600));
        const groups = document.querySelectorAll('.learn-group').length;
        const title = (document.querySelector('.learn-card h3') || {}).textContent || '';
        document.querySelector('.learn-tab[data-learn-tab="patterns"]').click();
        await new Promise(r => setTimeout(r, 300));
        const patterns = document.querySelectorAll('.learn-pattern-node').length;
        document.querySelector('.learn-pattern-node').click();
        await new Promise(r => setTimeout(r, 200));
        const practiceBtn = document.querySelector('[data-start-practice="pattern"]');
        if (practiceBtn) practiceBtn.click();
        await new Promise(r => setTimeout(r, 300));
        const options = document.querySelectorAll('.practice-option').length;
        document.querySelector('.learn-tab[data-learn-tab="experiments"]').click();
        await new Promise(r => setTimeout(r, 300));
        const experiments = document.querySelectorAll('.experiment-btn').length;
        document.querySelector('.experiment-btn[data-experiment="ellipse"]').click();
        await new Promise(r => setTimeout(r, 900));
        const expTraces = document.getElementById('experiment-chart').data
            ? document.getElementById('experiment-chart').data.length : -1;
        document.querySelector('.learn-tab[data-learn-tab="nodes"]').click();
        await new Promise(r => setTimeout(r, 300));
        document.querySelector('[data-node="E7"]').click();
        await new Promise(r => setTimeout(r, 300));
        const bookContext = document.querySelectorAll('.book-context-item').length;
        document.querySelector('[data-node="E8"]').click();
        await new Promise(r => setTimeout(r, 400));
        const examExamples = document.querySelectorAll('.lesson-example').length;
        const examSources = document.querySelectorAll('.lesson-source').length;
        const lessonSecs = document.querySelectorAll('.lesson-sec').length;
        document.querySelector('[data-node="D2"]').click();
        await new Promise(r => setTimeout(r, 400));
        const lesson1Examples = document.querySelectorAll('.lesson-example').length;
        document.getElementById('learn-close').click();
        await new Promise(r => setTimeout(r, 260));
        return { groups, title, patterns, options, experiments, expTraces, bookContext, examExamples, examSources, lessonSecs, lesson1Examples, hidden: document.getElementById('learn-overlay').hidden };
    })()`);
    check('知识地图与书目融合/真题样章可用',
        learn.groups === 5 && learn.title.length > 0 && learn.patterns === 71
        && learn.options === 4 && learn.experiments === 7 && learn.expTraces >= 2
        && learn.bookContext > 0 && learn.examExamples === 6 && learn.examSources === 6 && learn.lessonSecs === 3
        && learn.lesson1Examples === 4 && learn.hidden,
        JSON.stringify(learn));

    check('运行期无异常', exceptions.length === 0, exceptions.slice(0, 3).join('\n'));

    const failed = checks.filter((c) => !c.ok);
    console.log('\n' + (failed.length ? '冒烟测试失败：' + failed.length + ' 项' : '冒烟测试通过：' + checks.length + ' 项'));
    browser.kill();
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* ignore */ }
    process.exit(failed.length ? 1 : 0);
} catch (e) {
    console.error('× 冒烟测试出错：' + e.message);
    browser.kill();
    process.exit(1);
}
