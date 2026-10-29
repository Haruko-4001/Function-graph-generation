/**
 * pattern.test.js
 * 题型库数据契约：71 族 / 90 子型，字段与节点引用完整。
 */
'use strict';

const patternLib = require('../js/pattern-data.js');
const curriculum = require('../js/curriculum-data.js');

let passed = 0;
let failed = 0;
const failures = [];
function test(name, fn) {
    try { fn(); passed++; console.log('  ✓ ' + name); }
    catch (e) { failed++; failures.push({ name, error: e.message }); console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || '断言失败'); }

console.log('\n[题型库：规模与引用]');

test('71 个题型族，90 个子型', () => {
    assert(patternLib.patterns.length === 71, '族数 ' + patternLib.patterns.length);
    assert(patternLib.variantCount() === 90, '子型数 ' + patternLib.variantCount());
});

test('题型 ID 唯一', () => {
    const ids = patternLib.patterns.map((p) => p.id);
    assert(new Set(ids).size === ids.length, '存在重复 ID');
});

test('每个题型都挂在存在的知识节点上', () => {
    patternLib.patterns.forEach((p) => {
        assert(curriculum.nodes[p.node], p.id + ' 指向不存在的节点 ' + p.node);
        assert(p.stage, p.id + ' 缺少学段');
    });
});

test('识别信号、通法、易错点、示例齐全', () => {
    patternLib.patterns.forEach((p) => {
        assert(p.title && p.signals && p.pitfalls && p.demo, p.id + ' 缺字段');
        assert(Array.isArray(p.steps) && p.steps.length >= 2, p.id + ' 通法步骤不足');
        assert(Array.isArray(p.variants) && p.variants.length > 0, p.id + ' 缺子型');
    });
});

test('模块分布与课程数据一致', () => {
    const by = patternLib.patterns.reduce((a, p) => { a[p.module] = (a[p.module] || 0) + 1; return a; }, {});
    assert(by.A === 6 && by.B === 7 && by.C === 8 && by.D === 8, JSON.stringify(by));
    assert(by.E === 12 && by.F === 8 && by.G === 18 && by.H === 4, JSON.stringify(by));
});

console.log('\n========================================');
console.log('通过 ' + passed + ' / ' + (passed + failed));
if (failed > 0) {
    failures.forEach((f) => console.log('  - ' + f.name + ': ' + f.error));
    process.exit(1);
}
console.log('全部测试通过 ✓');
