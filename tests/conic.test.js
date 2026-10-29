/**
 * conic.test.js
 * ============================================================
 * 圆锥曲线内核测试：识别、性质、切线。
 * 所有期望值都用量纲关系独立验算，不依赖实现细节。
 * ============================================================
 */
'use strict';

const MathConic = require('../js/conic.js');

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
        (msg || '数值不符') + '：期望 ' + b + '，实际 ' + a + '（容差 ' + tol + '）');
}

console.log('\n[圆锥曲线：识别与性质]');

test('圆：x²+y²=9', () => {
    const c = MathConic.analyze('x^2 + y^2 - 9 = 0');
    assert(c.type === 'circle', '类型应为圆，实际 ' + c.type);
    near(c.radius, 3, 1e-9);
    near(c.center.x, 0, 1e-9);
    near(c.center.y, 0, 1e-9);
});

test('椭圆：x²/4+y²/9=1（焦点在 y 轴）', () => {
    const c = MathConic.analyze('x^2/4 + y^2/9 = 1');
    assert(c.type === 'ellipse');
    near(c.a, 3, 1e-9);
    near(c.b, 2, 1e-9);
    near(c.c, Math.sqrt(5), 1e-9);
    near(c.e, Math.sqrt(5) / 3, 1e-9);
    assert(c.foci.length === 2 && c.foci[0].x === 0, '焦点应在 y 轴上');
    near(c.foci[1].y, Math.sqrt(5), 1e-9);
});

test('双曲线：x²/4−y²/9=1', () => {
    const c = MathConic.analyze('x^2/4 - y^2/9 = 1');
    assert(c.type === 'hyperbola');
    near(c.a, 2, 1e-9);
    near(c.b, 3, 1e-9);
    near(c.c, Math.sqrt(13), 1e-9);
    near(c.e, Math.sqrt(13) / 2, 1e-9);
    assert(c.asymptotes.length === 2, '应有两条渐近线');
    assert(c.asymptotes[0].indexOf('1.5') >= 0, '渐近线斜率应为 1.5：' + c.asymptotes[0]);
});

test('抛物线：y²=4x', () => {
    const c = MathConic.analyze('y^2 = 4*x');
    assert(c.type === 'parabola');
    near(c.p, 2, 1e-9);
    near(c.focus.x, 1, 1e-9);
    near(c.focus.y, 0, 1e-9);
    assert(c.directrix.indexOf('-1') >= 0, '准线应为 x=-1：' + c.directrix);
});

test('平移后的椭圆保留中心与轴长', () => {
    const c = MathConic.analyze('(x-2)^2/4 + (y+1)^2/9 = 1');
    near(c.center.x, 2, 1e-9);
    near(c.center.y, -1, 1e-9);
    near(c.a, 3, 1e-9);
    near(c.b, 2, 1e-9);
});

test('含 xy 项：只识别类型并给出警告', () => {
    const c = MathConic.analyze('x^2 + x*y + y^2 - 1 = 0');
    assert(c.type === 'ellipse', '应为椭圆，实际 ' + c.type);
    assert(c.warnings.length > 0, '应给出旋转情形警告');
});

test('非二次曲线应拒绝', () => {
    let msg = '';
    try { MathConic.analyze('sin(x) + y'); } catch (e) { msg = e.message; }
    assert(msg.indexOf('不是二次曲线') >= 0, '应提示不是二次曲线：' + msg);
});

console.log('\n[圆锥曲线：切线]');

test('椭圆在 (2,0) 处的切线为 x=2', () => {
    const t = MathConic.tangentAt('x^2/4 + y^2/9 = 1', 2, 0);
    assert(t.equation.indexOf('x') === 0, '切线应以 x 开头：' + t.equation);
    near(t.point.x, 2, 1e-12);
});

test('抛物线在 (1,2) 处的切线斜率为 1', () => {
    // y²=4x，2y y' = 4 ⇒ y'=1
    const t = MathConic.tangentAt('y^2 = 4*x', 1, 2);
    near(t.slope, 1, 1e-9);
});

test('点不在曲线上应拒绝', () => {
    let msg = '';
    try { MathConic.tangentAt('x^2/4 + y^2/9 = 1', 1, 1); } catch (e) { msg = e.message; }
    assert(msg.indexOf('不在曲线上') >= 0, '应提示点不在曲线上：' + msg);
});

console.log('\n[圆锥曲线：弦长与中点]');

test('椭圆被 y=0 截得的弦长为 4，中点在原点', () => {
    const r = MathConic.chord('x^2/4 + y^2/9 = 1', 0, 0);
    assert(r.status === '相交');
    near(r.length, 4, 1e-9);
    near(r.midpoint.x, 0, 1e-9);
    near(r.midpoint.y, 0, 1e-9);
});

test('切线位置弦长为 0', () => {
    const r = MathConic.chord('x^2/4 + y^2/9 = 1', 0, 3);
    assert(r.status === '相切', r.status);
    near(r.length, 0, 1e-9);
});

test('竖直线 x=0 截椭圆得弦长 6', () => {
    const r = MathConic.chordVertical('x^2/4 + y^2/9 = 1', 0);
    assert(r.status === '相交');
    near(r.length, 6, 1e-9);
});

test('相离时没有交点', () => {
    const r = MathConic.chord('x^2/4 + y^2/9 = 1', 0, 10);
    assert(r.status === '相离');
    assert(r.points.length === 0);
});

console.log('\n========================================');
console.log('通过 ' + passed + ' / ' + (passed + failed));
if (failed > 0) {
    failures.forEach((f) => console.log('  - ' + f.name + ': ' + f.error));
    process.exit(1);
}
console.log('全部测试通过 ✓');
