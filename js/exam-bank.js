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
        },
        {
            id: 'GK-2015-I-21-1',
            source: '2015 年普通高等学校招生全国统一考试（全国Ⅰ卷·理科）数学 · 第 21 题（Ⅰ）',
            kind: '高考真题',
            topic: '切线方程与参数',
            node: 'D3',
            difficulty: '中档',
            prompt: '已知函数 <code>f(x)=x<sup>3</sup>+a x+1/4</code>，g(x)=−ln x。当 x 轴为曲线 y=f(x) 的切线时，求 a 的值。',
            answer: 'a = −3/4',
            steps: [
                'x 轴是曲线 y=f(x) 的切线 ⇒ 切点 x₀ 满足 f(x₀)=0 且 f′(x₀)=0。',
                'f′(x)=3x<sup>2</sup>+a=0 ⇒ a=−3x₀<sup>2</sup>。',
                '代入 f(x₀)=0：<code>x₀<sup>3</sup>−3x₀<sup>3</sup>+1/4=0</code> ⇒ x₀=1/2。',
                '故 a=−3(1/2)<sup>2</sup>=−3/4。'
            ],
            note: '“x 轴为切线”同时给出两个条件：切点在轴上、切线斜率为 0，缺一不可。'
        },
        {
            id: 'GK-2016-I-21',
            source: '2016 年普通高等学校招生全国统一考试（全国Ⅰ卷·理科）数学 · 第 21 题',
            kind: '高考真题',
            topic: '零点个数与偏移',
            node: 'E9',
            difficulty: '压轴',
            prompt: '已知函数 <code>f(x)=(x−2)e<sup>x</sup>+a(x−1)<sup>2</sup></code> 有两个零点。<br>（1）求 a 的取值范围；<br>（2）设 x<sub>1</sub>, x<sub>2</sub> 是两个零点，证明 <code>x<sub>1</sub>+x<sub>2</sub>&lt;2</code>。',
            answer: '（1）a&gt;0；（2）由 f(2−x<sub>2</sub>)&lt;0 与 f 在 (−∞,1) 递减得证。',
            steps: [
                '<code>f′(x)=(x−1)(e<sup>x</sup>+2a)</code>。a≤0 时 x&lt;1 有 f&lt;0、x&gt;1 至多一个零点，不可能有两个。',
                'a&gt;0 时 f 在 (−∞,1) 减、(1,+∞) 增，最小值 f(1)=−e&lt;0，两端趋于 +∞，故恰有两个零点。',
                '（2）设 x<sub>1</sub>&lt;1&lt;x<sub>2</sub>。由 f(x<sub>2</sub>)=0 得 <code>a(x<sub>2</sub>−1)<sup>2</sup>=(2−x<sub>2</sub>)e<sup>x<sub>2</sub></sup></code>。',
                '代入得 <code>f(2−x<sub>2</sub>)=e<sup>2−x<sub>2</sub></sup>[(2−x<sub>2</sub>)e<sup>2x<sub>2</sub>−2</sup>−x<sub>2</sub>]</code>，由 <code>(1−t)e<sup>2t</sup>&lt;1+t (t∈(0,1))</code> 得 f(2−x<sub>2</sub>)&lt;0。',
                'f 在 (−∞,1) 递减，f(2−x<sub>2</sub>)&lt;f(x<sub>1</sub>)=0 ⇒ 2−x<sub>2</sub>&gt;x<sub>1</sub>，即 x<sub>1</sub>+x<sub>2</sub>&lt;2。'
            ],
            note: '偏移题的固定动作：把 x₁ 与 2−x₂ 放进同一单调区间，再用零点关系消参。'
        },
        {
            id: 'GK-2014-21',
            source: '2014 年普通高等学校招生全国统一考试（全国卷·理科）数学 · 第 21 题',
            kind: '高考真题',
            topic: '抛物线焦半径与焦点弦',
            node: 'G5',
            difficulty: '压轴',
            prompt: '已知抛物线 <code>C:y<sup>2</sup>=2px (p&gt;0)</code> 的焦点为 F，直线 y=4 与 y 轴的交点为 P，与 C 的交点为 Q，且 <code>|QF|=(5/4)|PQ|</code>。<br>（1）求 C 的方程；<br>（2）过 F 的直线 l 与 C 相交于 A、B，若 AB 的垂直平分线 l′ 与 C 相交于 M、N，且 A、M、B、N 四点共圆，求 l 的方程。',
            answer: '（1）y<sup>2</sup>=4x；（2）<code>x−y−1=0</code> 或 <code>x+y−1=0</code>。',
            steps: [
                '（1）设 Q(x₀,4)，则 x₀=8/p，<code>|PQ|=8/p</code>，<code>|QF|=8/p+p/2</code>。',
                '由 <code>|QF|=(5/4)|PQ|</code> 得 8/p+p/2=10/p ⇒ p=2，故 C: y<sup>2</sup>=4x。',
                '（2）设 l: <code>x=my+1</code>，代入得 <code>y<sup>2</sup>−4my−4=0</code>，由韦达定理 <code>y<sub>1</sub>+y<sub>2</sub>=4m, y<sub>1</sub>y<sub>2</sub>=−4</code>，<code>|AB|=4(m<sup>2</sup>+1)</code>。',
                'l′ 斜率为 −m，同样代入求出 |MN| 与中点；由 A、M、B、N 共圆等价于以 AB、FN 中点为圆心半径相等，化简得 m<sup>2</sup>=1。',
                '故 l: <code>x−y−1=0</code> 或 <code>x+y−1=0</code>。'
            ],
            note: '焦半径公式 |PF|=x+p/2 能把焦点条件直接变成横坐标条件，是抛物线题的通用入口。'
        },
        {
            id: 'GK-2017-I-22-1',
            source: '2017 年普通高等学校招生全国统一考试（全国Ⅰ卷·理科）数学 · 第 22 题（1）',
            kind: '高考真题',
            topic: '参数方程与直线',
            node: 'H1',
            difficulty: '基础',
            prompt: '在直角坐标系 xOy 中，曲线 C 的参数方程为 <code>x=3cosθ, y=sinθ</code>，直线 l 的参数方程为 <code>x=a+4t, y=1−t</code>。当 a=−1 时，求 C 与 l 的交点坐标。',
            answer: '交点为 (3, 0) 与 (−21/25, 24/25)',
            steps: [
                'C 消参得 <code>x<sup>2</sup>/9+y<sup>2</sup>=1</code>；l 消参得 <code>x+4y=3</code>（a=−1）。',
                '把 x=3−4y 代入椭圆：<code>(3−4y)<sup>2</sup>/9+y<sup>2</sup>=1</code> ⇒ 25y<sup>2</sup>−24y=0。',
                'y=0 时 x=3；y=24/25 时 x=−21/25。',
                '故交点为 (3, 0) 与 (−21/25, 24/25)。'
            ],
            note: '参数方程题的标准动作：先把参数方程化为直线方程，再联立消参。'
        },
        {
            id: 'GK-2019-I-21-1',
            source: '2019 年普通高等学校招生全国统一考试（全国Ⅰ卷·理科）数学 · 第 21 题（1）',
            kind: '高考真题',
            topic: '轨迹方程与圆锥曲线',
            node: 'G1',
            difficulty: '中档',
            prompt: '已知点 A(−2,0)，B(2,0)，动点 M(x,y) 满足直线 AM 与 BM 的斜率之积为 −1/2，记 M 的轨迹为曲线 C。求 C 的方程，并说明 C 是什么曲线。',
            answer: 'C：<code>x<sup>2</sup>/4 + y<sup>2</sup>/2 = 1</code>，是焦点在 y 轴上的椭圆。',
            steps: [
                '<code>k<sub>AM</sub>·k<sub>BM</sub> = y²/[(x+2)(x−2)] = −1/2</code>。',
                '整理得 <code>2y<sup>2</sup> = 4−x<sup>2</sup></code>，即 <code>x<sup>2</sup>/4 + y<sup>2</sup>/2 = 1</code>。',
                '与标准式比较：长轴在 y 轴上，a<sup>2</sup>=2，b<sup>2</sup>=4，c<sup>2</sup>=2。',
                '故 C 是焦点在 y 轴上、离心率 e=√2/2 的椭圆。'
            ],
            note: '斜率之积型轨迹：乘开分母直接得到二次曲线，再对照标准式判断焦点位置。'
        },
        {
            id: 'GK-2019-II-20-1',
            source: '2019 年普通高等学校招生全国统一考试（全国Ⅱ卷·理科）数学 · 第 20 题（1）',
            kind: '高考真题',
            topic: '焦点弦与弦长',
            node: 'G9',
            difficulty: '中档',
            prompt: '已知抛物线 <code>C:y<sup>2</sup>=4x</code> 的焦点为 F，过 F 的直线 l 与 C 交于 A、B 两点，且 <code>|AB|=8</code>，求 l 的方程。',
            answer: '<code>y=x−1</code> 或 <code>y=−x+1</code>',
            steps: [
                '设 <code>l:y=k(x−1)</code>，代入 y²=4x 得 <code>k<sup>2</sup>x<sup>2</sup>−(2k<sup>2</sup>+4)x+k<sup>2</sup>=0</code>，判别式 Δ=16(k²+1)。',
                '<code>|x₁−x₂|=4√(k²+1)/k²</code>，<code>|AB|=|x₁−x₂|√(1+k²)=4(k²+1)/k²</code>。',
                '由 |AB|=8 得 k²=1。'
            ],
            note: '焦点弦长公式 |AB|=(1+k²)·4/k² 是抛物线焦点弦的常用结论。'
        },
        {
            id: 'GK-2018-II-21',
            source: '2018 年普通高等学校招生全国统一考试（全国Ⅱ卷·理科）数学 · 第 21 题',
            kind: '高考真题',
            topic: '不等式证明与唯一零点',
            node: 'E7',
            difficulty: '中档',
            prompt: '已知函数 <code>f(x)=e<sup>x</sup>−a x<sup>2</sup></code>。<br>（1）若 a=1，证明：当 x≥0 时 f(x)≥1；<br>（2）若 f(x) 在 (0,+∞) 只有一个零点，求 a。',
            answer: '（1）见解答；（2）<code>a=e<sup>2</sup>/4</code>。',
            steps: [
                '（1）用 <code>e<sup>x</sup>≥1+x+x<sup>2</sup>/2</code>：当 0≤x≤2 时 1+x+x<sup>2</sup>/2 ≥ 1+x²；当 x≥2 时再加 x³/6 仍成立，故 e<sup>x</sup>−x²≥1。',
                '（2）零点等价于 <code>a=e<sup>x</sup>/x<sup>2</sup></code>。令 h=e<sup>x</sup>/x<sup>2</sup>，<code>h′=e<sup>x</sup>(x−2)/x<sup>3</sup></code>，最小值 h(2)=e²/4。',
                '故只有 a=e²/4 时恰有一个零点。'
            ],
            note: '分离参数后求 h 的最小值，是“唯一零点”问题的固定动作。'
        },
        {
            id: 'GK-2017-III-21-1',
            source: '2017 年普通高等学校招生全国统一考试（全国Ⅲ卷·理科）数学 · 第 21 题（1）',
            kind: '高考真题',
            topic: '恒成立与参数',
            node: 'E5',
            difficulty: '中档',
            prompt: '已知函数 <code>f(x)=x−1−a ln x</code>（x>0）。若 f(x)≥0，求 a 的值。',
            answer: 'a = 1',
            steps: [
                'f′(x)=1−a/x=(x−a)/x：当 a>0 时，f 在 (0,a) 递减、在 (a,+∞) 递增，最小值 f(a)=a−1−a ln a。',
                '又 f(1)=0 恒成立，且 x=1 是最小值点，故 f′(1)=0，得 a=1。',
                '此时 f(x)=x−1−ln x≥0 即 ln x≤x−1，成立。'
            ],
            note: '“恒成立”先看等号点：由 f(1)=0 与最小值条件直接锁定参数。'
        },
        {
            id: 'GK-2021-Y-20',
            source: '2021 年普通高等学校招生全国统一考试（全国乙卷·理科）数学 · 第 20 题',
            kind: '高考真题',
            topic: '换元与不等式证明',
            node: 'E8',
            difficulty: '压轴',
            prompt: '设函数 <code>f(x)=ln(a−x)</code>，已知 x=0 是函数 <code>y=x f(x)</code> 的极值点。<br>（1）求 a；<br>（2）设函数 <code>g(x)=(x+f(x))/(x f(x))</code>，证明：g(x)&lt;1。',
            answer: '（1）a=1；（2）换元 t=1−x 后证 1−t+t ln t&gt;0。',
            steps: [
                '（1）F(x)=x ln(a−x)，F′(0)=ln a=0 ⇒ a=1；F″(0)=−2&lt;0，确为极大值点。',
                '（2）此时 x f(x)&lt;0（x&lt;1 且 x≠0），故 g(x)&lt;1 等价于 x+f(x)&gt;x f(x)，即 x+(1−x)ln(1−x)&gt;0。',
                '令 t=1−x&gt;0，t≠1，则需证 <code>h(t)=1−t+t ln t&gt;0</code>。h′(t)=ln t，h 在 (0,1) 递减、(1,+∞) 递增，最小值 h(1)=0。'
            ],
            note: '分式不等式先定分母符号；换元后只需证一个一元不等式。'
        },
    ];

    return { items };
}));
