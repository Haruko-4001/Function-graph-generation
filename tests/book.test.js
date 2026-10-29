/**
 * book.test.js
 * 两本专著书目数据契约：章节、小节、题型引用完整。
 */
'use strict';

const bookLib = require('../js/book-data.js');
const patternLib = require('../js/pattern-data.js');

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
    try { fn(); passed++; console.log('  ✓ ' + name); }
    catch (e) { failed++; failures.push({ name, error: e.message }); console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || '断言失败'); }

console.log('\n[书目：规模与引用]');

test('两本书、十五章', () => {
    assert(bookLib.books.length === 2, '书数 ' + bookLib.books.length);
    const chapters = bookLib.books.reduce((n, b) => n + b.chapters.length, 0);
    assert(chapters === 15, '章节数 ' + chapters);
});

test('每章都有完整小节清单与摘要', () => {
    bookLib.books.forEach((b) => b.chapters.forEach((c) => {
        assert(c.id && c.title && c.summary, c.id + ' 缺字段');
        assert(Array.isArray(c.topics) && c.topics.length > 0, c.id + ' 缺小节');
        assert(c.topics.every((t) => typeof t === 'string' && t.length > 0), c.id + ' 小节为空');
    }));
});

test('章节 ID 唯一', () => {
    const ids = [];
    bookLib.books.forEach((b) => b.chapters.forEach((c) => ids.push(c.id)));
    assert(new Set(ids).size === ids.length, '存在重复章节 ID');
});

test('引用的题型都存在', () => {
    bookLib.books.forEach((b) => b.chapters.forEach((c) => {
        (c.patterns || []).forEach((pid) => assert(patternLib.byId[pid], c.id + ' 引用不存在的题型 ' + pid));
    }));
});

test('导数的秘密覆盖十章，圆锥曲线的秘密覆盖五章', () => {
    const d = bookLib.books.filter((b) => b.id === 'derivative')[0];
    const c = bookLib.books.filter((b) => b.id === 'conic')[0];
    assert(d && d.chapters.length === 10, '导数章数');
    assert(c && c.chapters.length === 5, '圆锥章数');
});

console.log('\n========================================');
console.log('通过 ' + passed + ' / ' + (passed + failed));
if (failed > 0) { failures.forEach((f) => console.log('  - ' + f.name + ': ' + f.error)); process.exit(1); }
console.log('全部测试通过 ✓');
