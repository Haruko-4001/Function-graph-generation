/**
 * calculus.test.js
 * 导数工具内核测试：切线、过点切线、单调表、闭区间最值。
 */
'use strict';

const K = require('../js/calculus.js');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
    try { fn(); passed++; console.log('  ✓ ' + name); }
    catch (e) { failed++; failures.push({ name, error: e.message }); console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || '断言失败'); }
function near(a, b, tol, msg) {
    assert(Number.isFinite(a) && Math.abs(a - b) <= tol,
        (msg || '数值不符') + '：期望 ' + b + '，实际 ' + a);
}

console.log('\n[切线 / 法线]');

test('y=x² 在 x=1 处：切线斜率 2', () => {
    const t = K.tangentAt('x^2', 1);
    near(t.slope, 2, 1e-5);
    near(t.y0, 1, 1e-12);
    assert(t.tangent === 'y = 2x − 1', '切线方程不对：' + t.tangent);
    assert(t.normal.indexOf('-0.5') >= 0, '法线斜率应为 -0.5：' + t.normal);
});

test('常函数：切线水平、法线竖直', () => {
    const t = K.tangentAt('3', 2);
    near(t.slope, 0, 1e-9);
    assert(t.normal.indexOf('x = 2') >= 0, '法线应为 x=2：' + t.normal);
});

test('过点 (0,-1) 作 y=x² 的切线有两条', () => {
    const r = K.tangentThrough('x^2', 0, -1);
    assert(r.count === 2, '应有 2 条，实际 ' + r.count);
    near(r.lines[0].t, -1, 1e-6);
    near(r.lines[1].t, 1, 1e-6);
});

test('过曲线上一点：至少包含该点的切线', () => {
    const r = K.tangentThrough('x^2', 1, 1);
    assert(r.count >= 1, '应至少 1 条');
    assert(r.lines.some((l) => Math.abs(l.t - 1) < 1e-6), '应包含 t=1 的切线');
});

console.log('\n[单调表与区间最值]');

test('y=x²−4 在 [-1,3]：最小值 -4，最大值 5', () => {
    const g = K.globalExtrema('x^2 - 4', -1, 3);
    near(g.min.y, -4, 1e-8);
    near(g.min.x, 0, 1e-4);
    near(g.max.y, 5, 1e-8);
    near(g.max.x, 3, 1e-10);
    assert(g.max.kind.indexOf('端点') >= 0, '最大值应来自端点');
});

test('单调表给出递减与递增两段', () => {
    const t = K.monotonicTable('x^2 - 4', -5, 5);
    assert(t.rows.length === 2, '应有两段，实际 ' + t.rows.length);
    assert(t.rows[0].dir === -1 && t.rows[1].dir === 1, '应先减后增');
    assert(t.critical.length === 1, '应有一个驻点');
});

test('零点个数随参数变化：x²−a', () => {
    const r = K.zeroCountScan('x^2 - a', 'a', 1, 4, 3, -10, 10);
    assert(r.rows.length === 4, '应有 4 个采样点');
    r.rows.forEach((row) => assert(row.count === 2, 'a=' + row.value + ' 应有 2 个零点，实际 ' + row.count));
});

test('参数名不在表达式中应报错', () => {
    let msg = '';
    try { K.zeroCountScan('x^2 - 1', 'a', -1, 1, 3, -10, 10); } catch (e) { msg = e.message; }
    assert(msg.indexOf('没有参数') >= 0, '应提示缺少参数：' + msg);
});

test('非法区间应报错', () => {
    let msg = '';
    try { K.globalExtrema('x', 2, 1); } catch (e) { msg = e.message; }
    assert(msg.indexOf('区间无效') >= 0, '应提示区间无效');
});

console.log('\n========================================');
console.log('通过 ' + passed + ' / ' + (passed + failed));
if (failed > 0) {
    failures.forEach((f) => console.log('  - ' + f.name + ': ' + f.error));
    process.exit(1);
}
console.log('全部测试通过 ✓');
