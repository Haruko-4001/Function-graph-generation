/**
 * export.test.js
 * ============================================================
 * 导出链路的测试：表达式翻译 → Python 代码生成 → 静态检查 → 运行清单。
 *
 * 如果本机装了 Python（python / python3），还会**真的把生成的脚本跑一遍**，
 * 断言退出码为 0 且输出「全部通过」。这一步是本文件的核心：
 * 只做静态检查的代码生成器很容易生成「语法对但跑不通」的代码。
 *
 * 可用 MFV_PYTHON 指定解释器路径；找不到则跳过运行测试（不算失败）。
 * ============================================================
 */
'use strict';

const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MathFacts = require('../js/facts.js');
const MathCodegen = require('../js/codegen.js');
const MathCodeCheck = require('../js/codecheck.js');
const MathManifest = require('../js/manifest.js');

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log('  ✓ ' + name);
    } catch (e) {
        failed++;
        failures.push({ name, error: e.message });
        console.log('  ✗ ' + name + '\n      ' + e.message);
    }
}

function skip(name, why) {
    skipped++;
    console.log('  - ' + name + '（跳过：' + why + '）');
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg || '断言失败');
}

/* ---------------- 表达式翻译 ---------------- */
console.log('\n[codegen：表达式翻译]');

test('幂运算与基本四则', () => {
    assert(MathCodegen.translateExpression('x^2 - 4') === 'x**2 - 4');
    assert(MathCodegen.translateExpression('x^3 - 3*x') === 'x**3 - 3*x');
});

test('函数映射到 numpy', () => {
    assert(MathCodegen.translateExpression('sin(x)') === 'np.sin(x)');
    assert(MathCodegen.translateExpression('exp(-x^2/4)*cos(3*x)')
        === 'np.exp(-x**2/4)*np.cos(3*x)');
});

test('常量 pi / e 不误伤函数名', () => {
    // exp 里的 e 不能被当成常数
    assert(MathCodegen.translateExpression('exp(x)') === 'np.exp(x)');
    assert(MathCodegen.translateExpression('sin(pi*x)') === 'np.sin(np.pi*x)');
    assert(MathCodegen.translateExpression('e^x') === 'np.e**x');
});

test('未知函数直接拒绝，不生成跑不通的代码', () => {
    let msg = '';
    try { MathCodegen.translateExpression('gamma(x)'); } catch (e) { msg = e.message; }
    assert(msg.indexOf('暂不支持') >= 0, '应拒绝未知函数，实际：' + msg);
});

/* ---------------- 代码生成 ---------------- */
console.log('\n[codegen：生成结果]');

function build(expr, a, b) {
    const facts = MathFacts.buildFacts(expr, { xMin: a, xMax: b });
    const out = MathCodegen.buildPython({ expression: expr, xMin: a, xMax: b, facts });
    return { facts, out };
}

test('生成物通过静态检查', () => {
    ['x^2 - 4', 'sin(x)', '1/x', 'x^3 - 3*x', 'exp(-x^2/4)*cos(3*x)'].forEach((e) => {
        const { out } = build(e, -10, 10);
        const chk = MathCodeCheck.checkPython(out.code);
        assert(chk.ok, e + ' 未通过：' + chk.errors.join('；'));
    });
});

test('生成物包含区间、采样、自检与 main 保护', () => {
    const { out } = build('sin(x)', -10, 10);
    assert(/^X_MIN = /m.test(out.code), '缺少 X_MIN');
    assert(/^SAMPLES = \d+/m.test(out.code), '缺少 SAMPLES');
    assert(out.code.indexOf('def verify(') >= 0, '缺少 verify()');
    assert(out.code.indexOf('if __name__ == "__main__":') >= 0, '缺少 main 保护');
});

test('文件名由表达式派生且安全', () => {
    assert(MathCodegen.slug('x^2 - 4') === 'xp2_4');
    assert(MathCodegen.slug('sin(x)/x') === 'sin_x_x');
    assert(/^[\w.-]+$/.test(MathCodegen.slug('1/x')), '文件名含非法字符');
});

test('结论数量写进生成物', () => {
    const { out } = build('x^2 - 4', -10, 10);
    assert(out.counts.zeros === 2, '零点数应为 2');
    assert(out.counts.extrema === 1, '极值数应为 1');
});

/* ---------------- 静态检查的反例 ---------------- */
console.log('\n[codecheck：应拦住危险代码]');

const BASE = [
    'import numpy as np',
    'import matplotlib',
    'matplotlib.use("Agg")',
    'import matplotlib.pyplot as plt',
    'X_MIN = -1.0',
    'X_MAX = 1.0',
    'SAMPLES = 10',
    'def f(x):',
    '    return np.sin(x)',
    'def main():',
    '    return 0',
    'if __name__ == "__main__":',
    '    raise SystemExit(main())',
    ''
].join('\n');

test('合法骨架通过', () => {
    const chk = MathCodeCheck.checkPython(BASE);
    assert(chk.ok, '应通过，实际：' + chk.errors.join('；'));
});

test('拦截 os / subprocess 导入', () => {
    const a = MathCodeCheck.checkPython('import os\n' + BASE);
    assert(!a.ok && a.errors.some((e) => e.indexOf('不允许的导入') >= 0), '应报非法导入');
    const b = MathCodeCheck.checkPython('import subprocess\n' + BASE);
    assert(!b.ok, 'subprocess 应被拦截');
});

test('拦截 eval / exec / open', () => {
    ['eval("1")', 'exec("x=1")', 'open("a.txt")'].forEach((bad) => {
        const code = BASE.replace('    return 0', '    ' + bad + '\n    return 0');
        const chk = MathCodeCheck.checkPython(code);
        assert(!chk.ok, bad + ' 应被拦截');
    });
});

test('拦截括号不配平', () => {
    const chk = MathCodeCheck.checkPython(BASE.replace('np.sin(x)', 'np.sin((x)'));
    assert(!chk.ok && chk.errors.some((e) => e.indexOf('括号') >= 0), '应报括号问题');
});

test('拦截缺失 main 保护', () => {
    const chk = MathCodeCheck.checkPython(BASE.replace('if __name__ == "__main__":\n    raise SystemExit(main())\n', ''));
    assert(!chk.ok, '缺 main 保护应被拦截');
});

/* ---------------- 运行清单 ---------------- */
console.log('\n[manifest：运行清单]');

test('清单记录输入、算法、结果与指纹', () => {
    const { facts, out } = build('sin(x)', -10, 10);
    const man = MathManifest.buildManifest({
        expression: 'sin(x)',
        mode: '2d',
        view: 'explicit',
        window: { xMin: -10, xMax: 10, yMin: -5, yMax: 5 },
        facts,
        storyboard: { beats: [1, 2, 3], totalSeconds: 20 },
        artifacts: [{ role: 'python', name: out.filename, content: out.code }]
    });
    assert(man.schema === 'mfv/manifest@1');
    assert(man.input.expression === 'sin(x)');
    assert(man.result.claims === facts.summary.total);
    assert(man.artifacts.length === 1 && man.artifacts[0].bytes > 0);
    assert(/^fnv1a:[0-9a-f]{8}:\d+$/.test(man.artifacts[0].fingerprint), '指纹格式不对');
    assert(man.storyboard.beats === 3);
});

test('相同内容指纹稳定，改动后指纹变化', () => {
    const a = MathManifest.fingerprint({ x: 1, y: [2, 3] });
    const b = MathManifest.fingerprint({ y: [2, 3], x: 1 });
    assert(a === b, 'key 顺序不应影响指纹');
    assert(a !== MathManifest.fingerprint({ x: 2, y: [2, 3] }), '内容变化后指纹应变化');
});

test('清单版本号与 package.json 一致', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    assert(pkg.version === MathManifest.APP_VERSION,
        'package.json ' + pkg.version + ' 与 manifest ' + MathManifest.APP_VERSION + ' 不一致');
});

/* ---------------- 真跑 Python ---------------- */
console.log('\n[python：真跑生成的脚本]');

function findPython() {
    const candidates = [process.env.MFV_PYTHON, 'python', 'python3', 'py'].filter(Boolean);
    for (const c of candidates) {
        try {
            // 先确认依赖齐全，避免生成脚本跑到一半因缺 numpy 失败
            execFileSync(c, ['-c', 'import numpy, matplotlib'], { stdio: 'ignore', timeout: 30000 });
            // 再解析成绝对路径：Windows 上 python/py 可能是转发器，直接调用会落到别的解释器
            const exe = execFileSync(c, ['-c', 'import sys; print(sys.executable)'], {
                encoding: 'utf8', timeout: 30000
            }).trim();
            return exe || c;
        } catch (e) { /* 继续找 */ }
    }
    return null;
}

const python = findPython();

if (!python) {
    skip('生成的脚本能跑通并自检通过', '未找到 Python');
} else {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mfv-'));
    ['x^2 - 4', 'sin(x)', '1/x', 'x^3 - 3*x'].forEach((expr) => {
        test('运行 ' + expr + ' 的生成脚本', () => {
            const { out } = build(expr, -10, 10);
            const file = path.join(tmpDir, out.filename);
            fs.writeFileSync(file, out.code, 'utf8');
            let stdout = '';
            try {
                stdout = execFileSync(python, [file], {
                    cwd: tmpDir,
                    encoding: 'utf8',
                    timeout: 120000,
                    stdio: ['ignore', 'pipe', 'pipe']
                });
            } catch (e) {
                throw new Error('脚本退出码非 0：' + (e.stdout || '') + (e.stderr || e.message));
            }
            assert(stdout.indexOf('全部通过') >= 0, '自检未全部通过，输出：' + stdout.slice(-400));
            assert(stdout.indexOf('已保存图片') >= 0, '未产出图片');
        });
    });
    // 产出图片后清理
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
}

/* ---------------- 汇总 ---------------- */
console.log('\n========================================');
console.log('通过 ' + passed + ' / ' + (passed + failed) + (skipped ? '，跳过 ' + skipped : ''));
if (failed > 0) {
    console.log('失败用例:');
    failures.forEach((f) => console.log('  - ' + f.name + ': ' + f.error));
    process.exit(1);
}
console.log('全部测试通过 ✓');
