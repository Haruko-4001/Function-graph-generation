/**
 * lesson.test.js
 * 精讲样章数据契约：章节、节数、例题、答案与题型引用。
 */
'use strict';

const { lessons } = require('../js/lesson-data.js');
const patternLib = require('../js/pattern-data.js');

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
    try { fn(); passed++; console.log('  ✓ ' + name); }
    catch (e) { failed++; failures.push({ name, error: e.message }); console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || '断言失败'); }

const lesson = lessons['D-2'];
const lesson1 = lessons['D-1'];
const lesson3 = lessons['D-3'];
const lesson4 = lessons['D-4'];
const lesson5 = lessons['D-5'];
const lesson6 = lessons['D-6'];
const lesson7 = lessons['D-7'];

console.log('\n[精讲样章：结构与内容]');

test('第五、六、七章各 2 道高考真题', () => {
    [lesson5, lesson6, lesson7].forEach((l, i) => {
        assert(l, '缺第' + (5 + i) + '章');
        assert(l.sections.reduce((n, s) => n + s.examples.length, 0) === 2, '第' + (5 + i) + '章题数');
    });
});

test('第三、四章各 2 道高考真题', () => {
    assert(lesson3 && lesson3.sections.reduce((n, s) => n + s.examples.length, 0) === 2, '第3章题数');
    assert(lesson4 && lesson4.sections.reduce((n, s) => n + s.examples.length, 0) === 2, '第4章题数');
});

test('第一章包含 3 节、4 道高考真题', () => {
    assert(lesson1, '缺少 D-1 样章');
    assert(lesson1.sections.length === 3, '节数 ' + lesson1.sections.length);
    assert(lesson1.sections.reduce((n, s) => n + s.examples.length, 0) === 4, '例题数不符');
});

test('第二章样章包含 3 节、6 道高考真题', () => {
    assert(lesson, '缺少 D-2 样章');
    assert(lesson.sections.length === 3, '节数 ' + lesson.sections.length);
    const count = lesson.sections.reduce((n, s) => n + s.examples.length, 0);
    assert(count === 6, '例题数 ' + count);
});

test('每节都有正文、通法与例题', () => {
    lesson.sections.forEach((s) => {
        assert(s.id && s.title && s.lead, s.id + ' 缺标题/导语');
        assert(Array.isArray(s.body) && s.body.length >= 2, s.id + ' 正文不足');
        assert(Array.isArray(s.method) && s.method.length >= 3, s.id + ' 通法不足');
        assert(s.examples.length >= 1, s.id + ' 例题不足');
    });
});

test('每道例题都有题干、分析、解答、答案、正文关联与易错点', () => {
    lesson.sections.forEach((s) => s.examples.forEach((ex) => {
        assert(ex.id && ex.tag && ex.problem && ex.source, ex.id + ' 缺题干/标签/来源');
        assert(/20\d\d 年/.test(ex.source), ex.id + ' 来源缺年份');
        assert(ex.analysis && ex.analysis.length > 10, ex.id + ' 缺分析');
        assert(Array.isArray(ex.steps) && ex.steps.length >= 3, ex.id + ' 解答步骤不足');
        assert(ex.answer && ex.link && ex.pitfall, ex.id + ' 缺答案/关联/易错');
    }));
});

test('例题 ID 唯一', () => {
    const ids = [];
    lesson.sections.forEach((s) => s.examples.forEach((ex) => ids.push(ex.id)));
    assert(new Set(ids).size === ids.length, '存在重复例题 ID');
});

test('样章引用的题型都存在', () => {
    lesson.sections.forEach((s) => (s.patterns || []).forEach((pid) => {
        assert(patternLib.byId[pid], s.id + ' 引用不存在的题型 ' + pid);
    }));
});

console.log('\n========================================');
console.log('通过 ' + passed + ' / ' + (passed + failed));
if (failed > 0) { failures.forEach((f) => console.log('  - ' + f.name + ': ' + f.error)); process.exit(1); }
console.log('全部测试通过 ✓');
