/**
 * node-merge.test.js
 * 知识点合并契约：合并表合法、合并后节点仍有内容、题型与结论不丢失。
 */
'use strict';

const merge = require('../js/node-merge.js');
const curriculum = require('../js/curriculum-data.js');
const patternLib = require('../js/pattern-data.js');

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
    try { fn(); passed++; console.log('  ✓ ' + name); }
    catch (e) { failed++; failures.push({ name, error: e.message }); console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || '断言失败'); }

console.log('\n[知识点合并：结构与内容不丢失]');

test('合并表 11 条，主节点均存在', () => {
    const ids = Object.keys(merge.merged);
    assert(ids.length === 11, '合并数 ' + ids.length);
    ids.forEach((id) => {
        assert(curriculum.nodes[id], '被合并节点不存在：' + id);
        assert(curriculum.nodes[merge.merged[id]], '主节点不存在：' + merge.merged[id]);
    });
});

test('合并后可见节点为 51 个', () => {
    const visible = Object.keys(curriculum.nodes).filter((id) => !merge.isMerged(id));
    assert(visible.length === 51, '可见节点数 ' + visible.length);
});

test('每个合并项都有合并理由', () => {
    Object.keys(merge.merged).forEach((id) => assert(merge.reason[id], id + ' 缺合并说明'));
});

test('被合并节点的题型可由主节点承载', () => {
    Object.keys(merge.merged).forEach((id) => {
        const host = merge.merged[id];
        const hostPatterns = patternLib.patterns.filter((p) => p.node === host).map((p) => p.id);
        const own = patternLib.patterns.filter((p) => p.node === id).map((p) => p.id);
        assert(hostPatterns.concat(own).length > 0, id + ' 合并后没有任何题型');
    });
});

test('主节点至少有一条结论可用', () => {
    Object.keys(merge.merged).forEach((id) => {
        const host = merge.merged[id];
        const has = curriculum.conclusions.some((c) => c.node === host || c.node === id);
        assert(has, host + ' 没有结论');
    });
});

console.log('\n========================================');
console.log('通过 ' + passed + ' / ' + (passed + failed));
if (failed > 0) { failures.forEach((f) => console.log('  - ' + f.name + ': ' + f.error)); process.exit(1); }
console.log('全部测试通过 ✓');
