/**
 * curriculum.test.js
 * 课程数据完整性与契约测试。
 */
'use strict';

const data = require('../js/curriculum-data.js');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
    try { fn(); passed++; console.log('  ✓ ' + name); }
    catch (e) { failed++; failures.push({ name, error: e.message }); console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || '断言失败'); }

const ids = Object.keys(data.nodes);

console.log('\n[课程数据：规模]');

test('8 个模块、62 个节点、90 个题型、60 条结论', () => {
    assert(data.modules.length === 8, '模块数 ' + data.modules.length);
    assert(ids.length === 62, '节点数 ' + ids.length);
    let patterns = 0;
    ids.forEach((id) => { patterns += (data.nodes[id].patterns || []).length; });
    assert(patterns === 90, '题型标签数 ' + patterns);
    assert(data.conclusions.length === 60, '结论数 ' + data.conclusions.length);
});

test('所有节点都被模块收录，且没有多余引用', () => {
    const listed = new Set();
    data.modules.forEach((m) => m.nodes.forEach((id) => listed.add(id)));
    assert(listed.size === ids.length, '模块收录 ' + listed.size + ' 个节点');
    ids.forEach((id) => assert(listed.has(id), '节点未挂到模块：' + id));
});

test('节点 ID 唯一', () => {
    const set = new Set(ids);
    assert(set.size === ids.length, '存在重复节点 ID');
});

console.log('\n[课程数据：引用完整性]');

test('所有前置节点都存在', () => {
    ids.forEach((id) => {
        (data.nodes[id].prereq || []).forEach((p) => {
            assert(data.nodes[p], id + ' 的前置节点不存在：' + p);
        });
    });
});

test('所有结论都挂在存在的节点上', () => {
    data.conclusions.forEach((c) => {
        assert(data.nodes[c.node], c.id + ' 指向不存在的节点：' + c.node);
    });
});

test('结论 ID 唯一，且四件套字段齐全', () => {
    const seen = new Set();
    data.conclusions.forEach((c) => {
        assert(!seen.has(c.id), '结论 ID 重复：' + c.id);
        seen.add(c.id);
        assert(c.text && c.condition && c.pitfall, c.id + ' 缺字段');
        assert(['highschool', 'extension', 'university', 'caution'].indexOf(c.examUse) >= 0,
            c.id + ' 的 examUse 非法：' + c.examUse);
    });
});

test('每个节点都有标题、教材出处与摘要', () => {
    ids.forEach((id) => {
        const n = data.nodes[id];
        assert(n.title && n.book && n.summary, id + ' 缺少必要字段');
        assert(Array.isArray(n.points) && n.points.length > 0, id + ' 缺少要点');
        assert(n.demo, id + ' 缺少可复现示例');
    });
});

console.log('\n[课程数据：学段分布]');

test('大学方法被明确标记', () => {
    const uni = data.conclusions.filter((c) => c.examUse === 'university');
    assert(uni.length >= 5, '大学方法结论过少：' + uni.length);
    assert(uni.every((c) => c.id), '大学方法结论缺 ID');
});

test('高中可用结论占多数', () => {
    const high = data.conclusions.filter((c) => c.examUse === 'highschool').length;
    const ratio = high / data.conclusions.length;
    assert(ratio > 0.6, '高中可用结论占比过低：' + ratio.toFixed(2));
});

console.log('\n========================================');
console.log('通过 ' + passed + ' / ' + (passed + failed));
if (failed > 0) {
    failures.forEach((f) => console.log('  - ' + f.name + ': ' + f.error));
    process.exit(1);
}
console.log('全部测试通过 ✓');
