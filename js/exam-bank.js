/**
 * exam-bank.js
 * ============================================================
 * 真题题库：各地高考真题与模拟卷。
 * 每题标明卷别、年份、题号（可含第几小问），并给出结论型答案与思路。
 * 难度与《导数的秘密》《圆锥曲线的秘密》精讲例题相当。
 * ============================================================
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MathExamBank = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const items = [
        {
            id: 'MB-2023-LJ4-21-1',
            source: '2023 届高三一轮复习联考（四）· 全国卷 · 理科数学 · 第 21 题（1）',
            kind: '模拟卷',
            topic: '导数单调性与参数范围',
            node: 'E1',
            difficulty: '中档',
            prompt: '已知函数 f(x)=e<sup>2x</sup>−a x<sup>2</sup>−1/2。若 f(x) 在 R 上单调递增，求 a 的取值范围。',
            answer: '0 ≤ a ≤ 2e',
            steps: [
                'f′(x)=2e<sup>2x</sup>−2ax，单调递增等价于 f′(x)≥0 对任意 x∈R 成立。',
                '当 x&gt;0 时：a ≤ e<sup>2x</sup>/x。该函数在 x=1/2 处取最小值 2e，故 a≤2e。',
                '当 x&lt;0 时：a x ≤ e<sup>2x</sup>，即 a ≥ e<sup>2x</sup>/x；令 x→−∞ 得 a ≥ 0。',
                '综合得 0 ≤ a ≤ 2e。'
            ],
            note: '分类讨论的要点是：同一个不等式在 x&gt;0 与 x&lt;0 时，除数的符号不同，不能合并处理。'
        },
        {
            id: 'MB-MINGXIAO-21-1',
            source: '名校联盟 · 2023 届高三 5 月冲刺压轴大联考 · 数学 · 第 21 题（1）',
            kind: '模拟卷',
            topic: '双曲线渐近线与离心率',
            node: 'G6',
            difficulty: '中档',
            prompt: '已知双曲线 C：x<sup>2</sup>/2 − y<sup>2</sup>/b<sup>2</sup>=1 (b&gt;0) 的一个焦点到它的一条渐近线的距离等于它的离心率，求双曲线 C 的方程。',
            answer: 'b<sup>2</sup>=2，即 x<sup>2</sup>/2 − y<sup>2</sup>/2 = 1',
            steps: [
                '焦点 F(c,0)，c<sup>2</sup>=2+b<sup>2</sup>；渐近线为 bx∓√2y=0。',
                'F 到渐近线的距离 = bc/√(b<sup>2</sup>+2) = bc/c = b。',
                '离心率 e=c/√2，条件给出 b = c/√2。',
                '两边平方：b<sup>2</sup>=c<sup>2</sup>/2=(2+b<sup>2</sup>)/2，解得 b<sup>2</sup>=2。'
            ],
            note: '焦点到渐近线的距离恒等于 b，这是双曲线的一个常用结论，值得记住。'
        },
        {
            id: 'MB-T8-21-1',
            source: '2023 届高三八省联考（T8 联考）· 数学 · 第 21 题（Ⅰ）',
            kind: '模拟卷',
            topic: '抛物线焦点弦与面积最值',
            node: 'G3',
            difficulty: '中档',
            prompt: '已知抛物线 C：y<sup>2</sup>=2px (p&gt;0) 的准线与 x 轴交于 H，直线 l 过焦点 F 且与 C 交于 A、B 两点，△HAB 的面积最小值为 4，求 C 的方程。',
            answer: 'C：y<sup>2</sup>=4x',
            steps: [
                '设 l 过焦点 F(p/2,0)，与 C 交于 A、B，由抛物线焦半径性质可把 |AF|、|BF| 写成 x 坐标式。',
                '△HAB 面积最小时对应 l 垂直于 x 轴，此时 A、B 关于 x 轴对称。',
                '化简得面积最小值 = p<sup>2</sup>，由 p<sup>2</sup>=4 得 p=2。',
                '故 C：y<sup>2</sup>=4x。'
            ],
            note: '面积最值题常把动直线压到“最对称”的位置再算，这是几何直觉的入口。'
        },
        {
            id: 'MB-JINTAIYANG-22-1',
            source: '2023 年 11 月高三金太阳联考 · 数学 · 第 22 题（1）',
            kind: '模拟卷',
            topic: '分离参数求最值',
            node: 'E5',
            difficulty: '中档',
            prompt: '已知函数 f(x)=ln x−a√x+1 (x&gt;0)。若 f(x)≤0，求 a 的取值范围。',
            answer: 'a ≥ 1 + 1/√e',
            steps: [
                'f(x)≤0 等价于 a ≥ (2ln√x+1)/√x。',
                '令 t=√x&gt;0，则 a ≥ g(t)=(2ln t+1)/t。',
                'g′(t)=(t−2ln t)/t<sup>2</sup>，令 t−2ln t=0 得 t=√e 为唯一极小值点。',
                'g(√e)=1+1/√e，故 a ≥ 1+1/√e。'
            ],
            note: '分离参数后必须求右端函数的最小值（当系数在左边时），并确认取等条件。'
        },
        {
            id: 'GK-BJ-2018-18-1',
            source: '2018 年普通高等学校招生全国统一考试（北京卷·理科）数学 · 第 18 题（Ⅰ）',
            kind: '高考真题',
            topic: '导数几何意义与切线',
            node: 'D3',
            difficulty: '基础',
            prompt: '设函数 f(x)=[a x<sup>2</sup>−(4a+1)x+4a+3]e<sup>x</sup>。若曲线 y=f(x) 在点 (1, f(1)) 处的切线与 x 轴平行，求 a。',
            answer: 'a = 1',
            steps: [
                '记 P(x)=a x<sup>2</sup>−(4a+1)x+4a+3，则 f(x)=P(x)e<sup>x</sup>，f′(x)=[P′(x)+P(x)]e<sup>x</sup>。',
                'P(1)=a+2，P′(1)=−2a−1，故 f′(1)=(1−a)e。',
                '切线与 x 轴平行 ⇔ f′(1)=0，所以 a=1。'
            ],
            note: '指数函数与多项式相乘时，先把 e<sup>x</sup> 单独提出，导数结构立刻清晰。'
        },
        {
            id: 'GK-BJ-2018-18-2',
            source: '2018 年普通高等学校招生全国统一考试（北京卷·理科）数学 · 第 18 题（Ⅱ）',
            kind: '高考真题',
            topic: '极值点与参数范围',
            node: 'D2',
            difficulty: '中档',
            prompt: '设函数 f(x)=[a x<sup>2</sup>−(4a+1)x+4a+3]e<sup>x</sup>。若 f(x) 在 x=2 处取得极小值，求 a 的取值范围。',
            answer: 'a ≥ 1/2',
            steps: [
                '仍记 P(x)=a x<sup>2</sup>−(4a+1)x+4a+3。',
                'P(2)=1，P′(2)=−1，故 f′(2)=(P′(2)+P(2))e<sup>2</sup>=0，恒成立。',
                'f″(x)=[P″(x)+2P′(x)+P(x)]e<sup>x</sup>，故 f″(2)=(2a−1)e<sup>2</sup>。',
                'x=2 为极小值点需 f″(2)≥0，即 2a−1≥0，所以 a≥1/2。'
            ],
            note: '先验证 f′(2)=0 是否自动成立，再由二阶导定极小，能省掉一次分类讨论。'
        }
    ];

    return { items };
}));
