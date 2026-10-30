/**
 * node-examples.test.js
 * 每个知识节点 3 道例题、答案可计算、自测判分有效。
 */
'use strict';

const curriculum = require('../js/curriculum-data.js');
const E = require('../js/node-examples.js');

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
    try { fn(); passed++; console.log('  ✓ ' + name); }
    catch (e) { failed++; failures.push({ name, error: e.message }); console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || '断言失败'); }

console.log('\n[节点例题：覆盖与可计算性]');

test('62 个节点每节点 3 道例题', () => {
    const ids = Object.keys(curriculum.nodes);
    ids.forEach((id) => {
        const tasks = E.tasksFor(Object.assign({ id }, curriculum.nodes[id]));
        assert(tasks.length === 3, id + ' 例题数 ' + tasks.length);
    });
});

test('所有例题都有题干、方法、易错点和可计算答案', () => {
    Object.keys(curriculum.nodes).forEach((id) => {
        E.tasksFor(Object.assign({ id }, curriculum.nodes[id])).forEach((t) => {
            assert(t.prompt && t.method && t.pitfall, id + ' 字段不足');
            assert(Number.isFinite(t.value), id + ' / ' + t.kind + ' 答案不可计算');
        });
    });
});

test('计算题库不少于 180 题', () => {
    const pool = E.quizPool(curriculum.nodes);
    assert(pool.length >= 180, '题库仅 ' + pool.length + ' 题');
});

test('判分容差正确', () => {
    const task = E.tasksFor(Object.assign({ id: 'E7' }, curriculum.nodes.E7))[0];
    assert(E.check(task, task.value), '原值应判对');
    assert(E.check(task, task.value + 0.0005 * Math.max(1, Math.abs(task.value))), '0.05% 误差应判对');
    assert(!E.check(task, task.value + 1), '明显错误应判错');
    assert(!E.check(task, 'abc'), '非数字应判错');
});

test('例题 ID 唯一', () => {
    const ids = [];
    Object.keys(curriculum.nodes).forEach((id) => {
        E.tasksFor(Object.assign({ id }, curriculum.nodes[id])).forEach((t) => ids.push(t.id));
    });
    assert(new Set(ids).size === ids.length, '存在重复例题 ID');
});

console.log('\n========================================');
console.log('通过 ' + passed + ' / ' + (passed + failed));
if (failed > 0) { failures.forEach((f) => console.log('  - ' + f.name + ': ' + f.error)); process.exit(1); }
console.log('全部测试通过 ✓');
