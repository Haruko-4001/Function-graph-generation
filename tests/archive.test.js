/**
 * archive.test.js
 * 参考资料库数据契约：去重、分组、关联引用、状态、内容边界。
 */
'use strict';

const archive = require('../js/archive-data.js');
const curriculum = require('../js/curriculum-data.js');
const bookLib = require('../js/book-data.js');
const mergeLib = require('../js/node-merge.js');

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
    try { fn(); passed++; console.log('  ✓ ' + name); }
    catch (e) { failed++; failures.push({ name, error: e.message }); console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || '断言失败'); }

console.log('\n[参考资料库：结构与引用]');

test('元数据自洽：26 扫描 / 21 独立 / 5 重复副本', () => {
    const m = archive.meta;
    assert(m.scannedFiles === 26, '扫描总数 ' + m.scannedFiles);
    assert(m.uniqueFiles === archive.sources.length, '独立条目数与 sources 不符');
    assert(m.duplicateCopies === archive.duplicates.length, '重复副本数不符');
    assert(m.scannedFiles - m.duplicateCopies === m.uniqueFiles, '总数 - 副本 ≠ 独立');
    assert(m.allScanned === true, '应标记全部扫描版');
});

test('8 个分组，order 唯一且连续 1..8', () => {
    assert(archive.groups.length === 8, '分组数 ' + archive.groups.length);
    const orders = archive.groups.map((g) => g.order).sort((a, b) => a - b);
    assert(orders.join(',') === '1,2,3,4,5,6,7,8', 'order 不连续：' + orders.join(','));
});

test('每条资料字段齐全且 id 唯一', () => {
    const ids = {};
    archive.sources.forEach((s) => {
        assert(!ids[s.id], '重复 id：' + s.id);
        ids[s.id] = true;
        assert(s.file && s.title && s.author && s.pages > 0, s.id + ' 缺基础字段');
        assert(s.format && s.level && s.nature && s.summary && s.status, s.id + ' 缺描述字段');
        assert(Array.isArray(s.nodes) && Array.isArray(s.chapters), s.id + ' 缺 nodes/chapters 数组');
        assert(Array.isArray(s.keywords) && s.keywords.length > 0, s.id + ' 缺关键词');
    });
});

test('分组引用有效', () => {
    const gset = new Set(archive.groups.map((g) => g.id));
    archive.sources.forEach((s) => assert(gset.has(s.group), s.id + ' 分组无效：' + s.group));
});

test('关联节点均存在且非被合并节点', () => {
    archive.sources.forEach((s) => (s.nodes || []).forEach((n) => {
        assert(curriculum.nodes[n], s.id + ' 节点不存在：' + n);
        assert(!mergeLib.isMerged(n), s.id + ' 指向被合并节点：' + n);
    }));
});

test('关联精讲章节均存在', () => {
    const chapters = new Set();
    bookLib.books.forEach((b) => b.chapters.forEach((c) => chapters.add(c.id)));
    archive.sources.forEach((s) => (s.chapters || []).forEach((c) => {
        assert(chapters.has(c), s.id + ' 章节不存在：' + c);
    }));
});

test('重复副本指向存在的资料且 md5 一致', () => {
    const byId = {};
    archive.sources.forEach((s) => { byId[s.id] = s; });
    archive.duplicates.forEach((d) => {
        assert(byId[d.sameAs], '副本指向不存在：' + d.sameAs);
        assert(d.md5 === byId[d.sameAs].md5, '副本 md5 与主文件不一致：' + d.file);
    });
});

test('状态取值合法', () => {
    const allowed = new Set(['indexed', 'already-integrated', 'extension', 'culture']);
    archive.sources.forEach((s) => assert(allowed.has(s.status), s.id + ' 非法状态：' + s.status));
});

test('两本核心专著标记为已纳入精讲', () => {
    const integrated = archive.sources.filter((s) => s.status === 'already-integrated').map((s) => s.id);
    assert(integrated.indexOf('REF-11') >= 0 && integrated.indexOf('REF-12') >= 0,
        '核心专著未标记已整合：' + integrated.join(','));
});

test('内容边界声明存在', () => {
    assert(archive.meta.extractPolicy && archive.meta.extractPolicy.length > 20, '缺少内容边界声明');
    assert(/不逐字搬运|版权|扫描/.test(archive.meta.extractPolicy), '边界声明缺少关键字');
});

console.log('\n========================================');
console.log('通过 ' + passed + ' / ' + (passed + failed));
if (failed > 0) { failures.forEach((f) => console.log('  - ' + f.name + ': ' + f.error)); process.exit(1); }
console.log('全部测试通过 ✓');
