/**
 * exam-bank.test.js
 * 真题题库契约：来源、答案、思路、难度与关联节点完整。
 */
'use strict';

const { items } = require('../js/exam-bank.js');
const curriculum = require('../js/curriculum-data.js');

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
    try { fn(); passed++; console.log('  ✓ ' + name); }
    catch (e) { failed++; failures.push({ name, error: e.message }); console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || '断言失败'); }

console.log('\n[真题题库：来源与字段]');

test('题库含 15 道独立收录的真题与模拟卷', () => {
    assert(items.length === 15, '题量 ' + items.length);
});

test('每题都有来源、难度、题干、答案与思路', () => {
    items.forEach((it) => {
        assert(it.id && it.source && it.kind && it.topic && it.difficulty, it.id + ' 缺字段');
        assert(it.prompt && it.answer, it.id + ' 缺题干或答案');
        assert(Array.isArray(it.steps) && it.steps.length >= 3, it.id + ' 思路不足');
        assert(it.note, it.id + ' 缺易错提示');
    });
});

test('ID 唯一', () => {
    const ids = items.map((i) => i.id);
    assert(new Set(ids).size === ids.length, '存在重复 ID');
});

test('同时包含高考真题与模拟卷', () => {
    const kinds = new Set(items.map((i) => i.kind));
    assert(kinds.has('高考真题') && kinds.has('模拟卷'), [...kinds].join(','));
});

test('关联节点存在', () => {
    items.forEach((it) => assert(curriculum.nodes[it.node], it.id + ' 关联节点不存在：' + it.node));
});

console.log('\n========================================');
console.log('通过 ' + passed + ' / ' + (passed + failed));
if (failed > 0) { failures.forEach((f) => console.log('  - ' + f.name + ': ' + f.error)); process.exit(1); }
console.log('全部测试通过 ✓');
