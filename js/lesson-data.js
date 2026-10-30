/**
 * lesson-data.js
 * ============================================================
 * 精讲样章：以《导数的秘密》第二章「妙话函数不等式」的节序为骨架。
 *
 * 题目来源：只选用公开高考真题，逐题标注年份、卷别、题号。
 * 解答：独立撰写，不抄教辅解析，也不复制原书例题。
 * ============================================================
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MathLessons = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const lessons = {
        'D-3': {
            chapterId: 'D-3',
            nodeId: 'E5',
            title: '必要性探路巧解恒成立',
            badge: '高考真题精讲',
            intro: '先由端点、极值点或特殊值取得必要条件，再证明这个条件足够。',
            note: '2 道高考真题，逐题标注来源；解答独立撰写。',
            sections: [
                {
                    id: 'D-3-1',
                    title: '3.1 端点与极值点必要性',
                    lead: 'x=0 是极值点，就先让一阶导为 0；若一阶导恒为 0，再看更高阶。',
                    body: [
                        '必要性探路的核心是：不急着求全局，先在一个特殊点取得参数必须满足的条件。端点、极值点、切线点都是常用特殊点。',
                        '如果一阶导在特殊点恒为 0，就不能直接得到参数；要看二阶、三阶，直到第一个不为 0 的导数。极大值要求第一个非零偶数阶导为负。'
                    ],
                    method: [
                        '把特殊点代入 f′=0（或切线斜率条件）。',
                        '若得到恒等式，继续求高阶导。',
                        '用局部展开判断极大/极小，确定参数。',
                        '最后回代，说明这个参数确实使特殊点成为极值点。'
                    ],
                    patterns: ['E-5', 'E-11'],
                    examples: [
                        {
                            id: '真题 1',
                            source: '2018 年普通高等学校招生全国统一考试（全国Ⅲ卷·理科）数学 · 第 21 题',
                            tag: '高考真题',
                            problem: '已知函数 <code>f(x)=(2+x+a x<sup>2</sup>)ln(1+x)−2x</code>。<br>（1）若 a=0，证明：当 −1&lt;x&lt;0 时 f(x)&lt;0，当 x&gt;0 时 f(x)&gt;0；<br>（2）若 x=0 是 f(x) 的极大值点，求 a。',
                            analysis: '第（1）问连续求导；第（2）问在 x=0 处一阶、二阶导都为 0，需要看三阶项。用局部展开最快。',
                            steps: [
                                '（1）a=0 时 f=(2+x)ln(1+x)−2x。<code>f′(x)=ln(1+x)+x/(1+x)</code>，<code>f″(x)=1/(1+x)+1/(1+x)<sup>2</sup>&gt;0</code>。',
                                'f′(0)=0，f′ 严格递增，所以 x&lt;0 时 f′&lt;0、x&gt;0 时 f′&gt;0；f(0)=0，故 x&lt;0 时 f&lt;0，x&gt;0 时 f&gt;0。',
                                '（2）在 x=0 附近展开：<code>ln(1+x)=x−x<sup>2</sup>/2+x<sup>3</sup>/3−x<sup>4</sup>/4+…</code>。',
                                '乘开后，f 的 x<sup>3</sup> 项系数为 <code>a+1/6</code>。若 a+1/6≠0，f 在 0 两侧异号，x=0 不是极值点；故必须有 a=−1/6。',
                                '当 a=−1/6 时，x<sup>4</sup> 项系数为 −1/12，故 <code>f(x)=−x<sup>4</sup>/12+o(x<sup>4</sup>)&lt;0</code>（x≠0 且充分接近 0），x=0 为极大值点。'
                            ],
                            answer: '（1）证明见解答。（2）a=−1/6。',
                            link: '对应 3.1：先用 f′(0)=0 探路，发现不够；继续看三阶项，得到必要条件 a=−1/6，再回代验证。',
                            pitfall: '不要因为 f′(0)=0 就直接下结论；这里二阶导也为 0，必须继续检查。'
                        }
                    ]
                },
                {
                    id: 'D-3-2',
                    title: '3.2 分离参数与最大值',
                    lead: '把参数放到一边，把 x 放到另一边，再求另一边函数的最大值。',
                    body: [
                        '恒成立问题最稳的通法是分离参数。分离前先确认除数的符号；分离后，问题变成求一个函数的最大值或最小值。',
                        '如果分离后的函数最值点不在端点，就要用导数定位；定位后还要说明这是全局最大，而不是局部最大。'
                    ],
                    method: [
                        '移项，把 a 与 x 分离。',
                        '对分离后的函数求导，找临界点。',
                        '比较临界点与端点，确定全局最值。',
                        '由“a≥最大值”或“a≤最小值”写出范围。'
                    ],
                    patterns: ['E-5'],
                    examples: [
                        {
                            id: '真题 2',
                            source: '2020 年普通高等学校招生全国统一考试（全国Ⅰ卷·理科）数学 · 第 21 题',
                            tag: '高考真题',
                            problem: '已知函数 <code>f(x)=e<sup>x</sup>+a x<sup>2</sup>−x</code>。当 x≥0 时，<code>f(x)≥(1/2)x<sup>3</sup>+1</code>，求 a 的取值范围。',
                            analysis: 'x=0 时恒等；x&gt;0 时分离出 <code>a≥φ(x)</code>，再证 φ 的最大值在 x=2。',
                            steps: [
                                'x=0 时 1≥1；x&gt;0 时不等式等价于 <code>a≥φ(x)=(x<sup>3</sup>/2+x+1−e<sup>x</sup>)/x<sup>2</sup></code>。',
                                '<code>φ′(x)=[x<sup>3</sup>/2+(2−x)e<sup>x</sup>−x−2]/x<sup>3</sup></code>，令分子为 N(x)。',
                                'N(2)=0；N′ 先正后负，N 先增后减，且 N(0)=N(2)=0，所以 N 在 (0,2) 为正、在 (2,+∞) 为负。',
                                '故 φ 在 (0,2) 递增、在 (2,+∞) 递减，最大值 <code>φ(2)=(7−e<sup>2</sup>)/4</code>。因此 <code>a≥(7−e<sup>2</sup>)/4</code>。'
                            ],
                            answer: '<code>a≥(7−e<sup>2</sup>)/4</code>。',
                            link: '对应 3.2：先分离参数，再用 N 的符号确定 φ 的全局最大值；最大值点 x=2 是整道题的必要条件来源。',
                            pitfall: '分离参数时不能只算 x=0 的二阶导；必须在整个 x&gt;0 上求最大值。'
                        }
                    ]
                }
            ]
        },
        'D-4': {
            chapterId: 'D-4',
            nodeId: 'E7',
            title: '取点手段的多彩应用',
            badge: '高考真题精讲',
            intro: '零点问题不只看单调，还要会“取”到函数值为正、为负的点。',
            note: '2 道高考真题，逐题标注来源；解答独立撰写。',
            sections: [
                {
                    id: 'D-4-1',
                    title: '4.1 零点存在性与取点',
                    lead: '在每个单调区间内，各取一个端点或极限点，确认符号相反。',
                    body: [
                        '取点的目的不是求零点，而是证明零点存在。常用点有：0、1、e、e²、参数端点，以及能让指数/对数项消失的点。',
                        '取点时先看单调区间；每个单调区间至多一个零点。再用两个符号相反的函数值确认恰好一个。'
                    ],
                    method: [
                        '求导定单调区间。',
                        '在每个区间选两个点，计算或估计函数值符号。',
                        '用零点定理确认存在；由单调性确认唯一。',
                        '最后汇总各区间零点个数。'
                    ],
                    patterns: ['E-7'],
                    examples: [
                        {
                            id: '真题 3',
                            source: '2017 年普通高等学校招生全国统一考试（全国Ⅰ卷·理科）数学 · 第 21 题',
                            tag: '高考真题',
                            problem: '已知函数 <code>f(x)=a e<sup>2x</sup>+(a−2)e<sup>x</sup>−x</code>。若 f(x) 有两个零点，求 a 的取值范围。',
                            analysis: '先定 a&gt;0 与最小值点，再由最小值小于 0 得 0&lt;a&lt;1；最后用两端极限确认两侧各一个零点。',
                            steps: [
                                '<code>f′(x)=(a e<sup>x</sup>−1)(2e<sup>x</sup>+1)</code>。a≤0 时 f′&lt;0，至多一个零点。',
                                'a&gt;0 时最小值在 <code>x=−ln a</code>，<code>f<sub>min</sub>=1−1/a+ln a</code>。',
                                '令 g(a)=1−1/a+ln a，g′(a)&gt;0，g(1)=0，所以 0&lt;a&lt;1 时最小值小于 0。',
                                'x→−∞ 时 f→+∞（−x 项主导）；x→+∞ 时 f→+∞。最小值小于 0，故最小值两侧各取到一个零点，共两个。'
                            ],
                            answer: '0&lt;a&lt;1。',
                            link: '对应 4.1：最小值点给出中间负值，两端极限给出正值，合起来就是“取点”证明两个零点。',
                            pitfall: '只写“最小值小于 0”不够，还要说明两端能取到正值，否则无法确认有两个零点。'
                        }
                    ]
                },
                {
                    id: 'D-4-2',
                    title: '4.2 唯一零点与水平线',
                    lead: '把零点个数转化为水平线与函数图象的交点个数。',
                    body: [
                        '唯一零点问题常可分离参数：把方程写成 a=h(x)，零点个数就是水平线 y=a 与 h 的图象交点个数。',
                        'h 的单调性与最小值决定交点个数；这比直接对原函数求导更清晰。'
                    ],
                    method: [
                        '把方程整理成 a=h(x)。',
                        '求 h′，确定单调区间与极值。',
                        '画出/描述 h 的变化趋势与两端极限。',
                        '由水平线与 h 的交点个数确定 a。'
                    ],
                    patterns: ['E-7'],
                    examples: [
                        {
                            id: '真题 4',
                            source: '2018 年普通高等学校招生全国统一考试（全国Ⅱ卷·理科）数学 · 第 21 题',
                            tag: '高考真题',
                            problem: '已知函数 <code>f(x)=e<sup>x</sup>−a x<sup>2</sup></code>。若 f(x) 在 (0,+∞) 只有一个零点，求 a。',
                            analysis: '分离参数 a=e<sup>x</sup>/x<sup>2</sup>，求其最小值；水平线只在最小值处与曲线有一个交点。',
                            steps: [
                                'x&gt;0 时 f(x)=0 等价于 <code>a=e<sup>x</sup>/x<sup>2</sup></code>。令 h=e<sup>x</sup>/x<sup>2</sup>。',
                                '<code>h′(x)=e<sup>x</sup>(x−2)/x<sup>3</sup></code>，h 在 (0,2) 递减、在 (2,+∞) 递增，最小值 <code>e<sup>2</sup>/4</code>。',
                                'x→0<sup>+</sup> 与 x→+∞ 时 h→+∞，所以水平线 y=a 只在 <code>a=e<sup>2</sup>/4</code> 时与 h 有一个交点。',
                                '故 a=e<sup>2</sup>/4。'
                            ],
                            answer: '<code>a=e<sup>2</sup>/4</code>。',
                            link: '对应 4.2：把“一个零点”转化为“水平线与 h 一个交点”，再用 h 的最小值定位。',
                            pitfall: 'a 小于最小值时无交点，大于最小值时有两个交点；不要只写“a 等于最小值”而不说明原因。'
                        }
                    ]
                }
            ]
        },
                'D-1': {
            chapterId: 'D-1',
            nodeId: 'D2',
            title: '导数基础与不等式汇总',
            badge: '高考真题精讲',
            intro: '第一章解决三件事：导数怎么算、单调性怎么判、不等式从哪里来。'
                + '本批用 4 道高考真题把“求导—定号—最值—不等式”串成一条线。',
            note: '4 道高考真题，逐题标注年份、卷别、题号；解答独立撰写，不照录教辅解析。',
            sections: [
                {
                    id: 'D-1-1',
                    title: '1.1 导数运算与单调性',
                    lead: '先求导，再把导数写成能定号的形式。',
                    body: [
                        '导数题的第一步不是“构造”，而是把 f′ 算对、化简到能看出符号。分式函数通常通分，把分子写成二次式；含指数、对数的函数则优先提取公因式。',
                        '单调性讨论的标准顺序是：定义域 → f′=0 的根 → 根是否在定义域内 → 按根分区间定号。参数题还要看二次方程判别式与根的符号。'
                    ],
                    method: [
                        '先写定义域，再求导并通分/因式分解。',
                        '解 f′=0，判断根的存在性与位置。',
                        '按根把定义域分段，逐段判断 f′ 的符号。',
                        '含参时按判别式、根的大小、根是否在定义域内分类。'
                    ],
                    patterns: ['D-4', 'D-5', 'E-1'],
                    examples: [
                        {
                            id: '真题 1',
                            source: '2018 年普通高等学校招生全国统一考试（全国Ⅰ卷·理科）数学 · 第 21 题',
                            tag: '高考真题',
                            problem: '已知函数 <code>f(x)=1/x−x+a ln x</code>。<br>（1）讨论 f(x) 的单调性；<br>（2）若 f(x) 存在两个极值点 x<sub>1</sub>, x<sub>2</sub>，证明：<code>(f(x<sub>1</sub>)−f(x<sub>2</sub>))/(x<sub>1</sub>−x<sub>2</sub>)&lt;a−2</code>。',
                            analysis: '第（1）问把 f′ 通分后，分子是二次式，按判别式与根的正负分类；第（2）问利用两根之积为 1，把差商化成只含 x<sub>1</sub>/x<sub>2</sub> 的式子。',
                            steps: [
                                '定义域 x&gt;0。<code>f′(x)=−1/x<sup>2</sup>−1+a/x=−(x<sup>2</sup>−a x+1)/x<sup>2</sup></code>。',
                                '若 a≤2，则对 x&gt;0 有 x<sup>2</sup>−a x+1≥0，故 f′≤0，f 在 (0,+∞) 上单调递减（a=2 时仅在 x=1 处 f′=0）。',
                                '若 a&gt;2，方程 x<sup>2</sup>−a x+1=0 有两个正根 <code>x<sub>2</sub>&lt;1&lt;x<sub>1</sub></code>，且 x<sub>1</sub>x<sub>2</sub>=1。f′ 在 (0,x<sub>2</sub>) 与 (x<sub>1</sub>,+∞) 为负，在 (x<sub>2</sub>,x<sub>1</sub>) 为正；所以 f 在两个外侧区间递减、在中间递增。',
                                '第（2）问：两个极值点说明 a&gt;2。设 x<sub>1</sub>&gt;x<sub>2</sub>，则 <code>x<sub>1</sub>−x<sub>2</sub>=√(a<sup>2</sup>−4)</code>，x<sub>1</sub>x<sub>2</sub>=1。',
                                '差商 <code>=(1/x<sub>1</sub>−1/x<sub>2</sub>−(x<sub>1</sub>−x<sub>2</sub>)+a ln(x<sub>1</sub>/x<sub>2</sub>))/(x<sub>1</sub>−x<sub>2</sub>)</code>。由 x<sub>1</sub>x<sub>2</sub>=1，前两项合并为 −2，故差商 <code>=−2+a ln(x<sub>1</sub>/x<sub>2</sub>)/(x<sub>1</sub>−x<sub>2</sub>)</code>。',
                                '要证差商 &lt;a−2，只需证 <code>ln(x<sub>1</sub>/x<sub>2</sub>)&lt;x<sub>1</sub>−x<sub>2</sub></code>。令 t=x<sub>1</sub>&gt;1，则 x<sub>1</sub>−x<sub>2</sub>=t−1/t，而 <code>ln(x<sub>1</sub>/x<sub>2</sub>)=2ln t&lt;t−1/t</code>（t&gt;1 时成立），故原不等式得证。'
                            ],
                            answer: '（1）a≤2 时在 (0,+∞) 递减；a&gt;2 时在 (0,x<sub>2</sub>)、(x<sub>1</sub>,+∞) 递减，在 (x<sub>2</sub>,x<sub>1</sub>) 递增，其中 x<sub>1,2</sub>=(a±√(a<sup>2</sup>−4))/2。（2）差商 =−2+a ln(x<sub>1</sub>/x<sub>2</sub>)/(x<sub>1</sub>−x<sub>2</sub>)&lt;a−2。',
                            link: '对应 1.1：先通分定号，再用两根关系把差商降成单变量。二次方程的判别式与根的正负，是本章最基本的分类依据。',
                            pitfall: 'a≤2 时不要只写“f′&lt;0”；a=2 时 f′ 在 x=1 处为 0，仍是单调递减。'
                        }
                    ]
                },
                {
                    id: 'D-1-2',
                    title: '1.2 单调性与零点',
                    lead: '先定单调，再用端点值或极限确认零点个数。',
                    body: [
                        '零点个数不是只看 f′=0 的个数，而是看“单调区间 + 端点符号”。每个单调区间内至多一个零点，再用零点定理确认存在。',
                        '含参零点问题通常先求最小值，再令最小值与 0 比较；参数的分界点往往来自最小值等于 0 的方程。'
                    ],
                    method: [
                        '求导并因式分解，确定单调区间与最小值点。',
                        '写出最小值关于参数的表达式。',
                        '令最小值与 0 比较，解参数的分界值。',
                        '用两端极限/特殊值确认零点确实存在。'
                    ],
                    patterns: ['E-2', 'E-7'],
                    examples: [
                        {
                            id: '真题 2',
                            source: '2017 年普通高等学校招生全国统一考试（全国Ⅰ卷·理科）数学 · 第 21 题',
                            tag: '高考真题',
                            problem: '已知函数 <code>f(x)=a e<sup>2x</sup>+(a−2)e<sup>x</sup>−x</code>。<br>（1）讨论 f(x) 的单调性；<br>（2）若 f(x) 有两个零点，求 a 的取值范围。',
                            analysis: 'f′ 能因式分解为 <code>(a e<sup>x</sup>−1)(2e<sup>x</sup>+1)</code>；第二问先由最小值小于 0 得到 a 的范围，再用两端极限确认两个零点。',
                            steps: [
                                '<code>f′(x)=2a e<sup>2x</sup>+(a−2)e<sup>x</sup>−1=(a e<sup>x</sup>−1)(2e<sup>x</sup>+1)</code>。',
                                '若 a≤0，则 a e<sup>x</sup>−1&lt;0，f′&lt;0，f 在 R 上递减，至多一个零点。',
                                '若 a&gt;0，f′=0 当且仅当 <code>e<sup>x</sup>=1/a</code>，即 x=−ln a。x&lt;−ln a 时 f′&lt;0，x&gt;−ln a 时 f′&gt;0。',
                                '最小值 <code>f(−ln a)=1/a+(a−2)/a+ln a=1−1/a+ln a</code>。令 g(a)=1−1/a+ln a，g′(a)=1/a<sup>2</sup>+1/a&gt;0，g(1)=0，所以 0&lt;a&lt;1 时最小值小于 0。',
                                '当 0&lt;a&lt;1 时，x→−∞ 与 x→+∞ 都有 f→+∞（注意 −x 项），最小值小于 0，故在最小值两侧各有一个零点，共两个。a=1 时最小值为 0，只有一个零点；a&gt;1 时无零点。'
                            ],
                            answer: '（1）a≤0 时在 R 上递减；a&gt;0 时在 (−∞,−ln a) 递减、在 (−ln a,+∞) 递增。（2）0&lt;a&lt;1。',
                            link: '对应 1.2：先由 f′ 的因式分解定单调，再比较最小值与 0；参数的临界值来自 g(1)=0。',
                            pitfall: 'a≤0 时 f 递减但仍可能有一个零点；题目要求“两个”，所以必须排除。'
                        }
                    ]
                },
                {
                    id: 'D-1-3',
                    title: '1.3 不等式与参数',
                    lead: '把不等式整理成“参数 ≥ 某个函数”，再求那个函数的最大值。',
                    body: [
                        '含参不等式恒成立，常见做法是分离参数：把 a 放到一边，把 x 放到另一边，转化为求一个函数的最值。分离时要注意 x 的符号，避免不等号方向出错。',
                        '如果参数无法分离，就先找必要条件（端点、切线、二阶导），再证明充分性。这一章先建立“最值—参数范围”的基本链条。'
                    ],
                    method: [
                        '移项，把参数与 x 分离；注意除数符号。',
                        '对分离后的函数求导，找最大值或最小值。',
                        '由最值写出参数范围。',
                        '回代验证端点与等号条件。'
                    ],
                    patterns: ['E-5', 'E-8'],
                    examples: [
                        {
                            id: '真题 3',
                            source: '2018 年普通高等学校招生全国统一考试（全国Ⅱ卷·理科）数学 · 第 21 题',
                            tag: '高考真题',
                            problem: '已知函数 <code>f(x)=e<sup>x</sup>−a x<sup>2</sup></code>。<br>（1）若 a=1，证明：当 x≥0 时，f(x)≥1；<br>（2）若 f(x) 在 (0,+∞) 只有一个零点，求 a。',
                            analysis: '第（1）问构造 g=e<sup>x</sup>−x<sup>2</sup>−1，连续求导定号；第（2）问分离参数 a=e<sup>x</sup>/x<sup>2</sup>，求其最小值。',
                            steps: [
                                '（1）令 <code>g(x)=e<sup>x</sup>−x<sup>2</sup>−1</code>，g(0)=0。g′(x)=e<sup>x</sup>−2x，g″(x)=e<sup>x</sup>−2。',
                                'g′ 在 x=ln2 取最小值 <code>2−2ln2&gt;0</code>，所以 g′&gt;0，g 在 [0,+∞) 递增，g(x)≥g(0)=0。',
                                '（2）x&gt;0 时 f(x)=0 等价于 <code>a=e<sup>x</sup>/x<sup>2</sup></code>。令 h(x)=e<sup>x</sup>/x<sup>2</sup>，则 <code>h′(x)=e<sup>x</sup>(x−2)/x<sup>3</sup></code>。',
                                'h 在 (0,2) 递减、在 (2,+∞) 递增，最小值 <code>h(2)=e<sup>2</sup>/4</code>；且 x→0<sup>+</sup> 与 x→+∞ 时 h→+∞。',
                                '因此当且仅当 <code>a=e<sup>2</sup>/4</code> 时，水平线 y=a 与 h 的图象只有一个交点，即 f 在 (0,+∞) 只有一个零点。'
                            ],
                            answer: '（1）证明见解答。（2）<code>a=e<sup>2</sup>/4</code>。',
                            link: '对应 1.3：第（2）问就是“分离参数 + 求最小值”的标准流程；第（1）问则是不等式证明的连续求导。',
                            pitfall: '第（2）问不要忘记 x&gt;0；a 小于最小值时无零点，大于最小值时有两个零点。'
                        },
                        {
                            id: '真题 4',
                            source: '2020 年普通高等学校招生全国统一考试（全国Ⅰ卷·理科）数学 · 第 21 题',
                            tag: '高考真题',
                            problem: '已知函数 <code>f(x)=e<sup>x</sup>+a x<sup>2</sup>−x</code>。<br>（1）当 a=1 时，讨论 f(x) 的单调性；<br>（2）当 x≥0 时，<code>f(x)≥(1/2)x<sup>3</sup>+1</code>，求 a 的取值范围。',
                            analysis: '第（1）问连续求导；第（2）问分离参数，转化为求 <code>φ(x)=(x<sup>3</sup>/2+x+1−e<sup>x</sup>)/x<sup>2</sup></code> 的最大值。',
                            steps: [
                                '（1）a=1 时 <code>f′(x)=e<sup>x</sup>+2x−1</code>，f″(x)=e<sup>x</sup>+2&gt;0，f′ 严格递增；f′(0)=0，所以 x&lt;0 时 f′&lt;0，x&gt;0 时 f′&gt;0。f 在 (−∞,0) 递减、在 (0,+∞) 递增。',
                                '（2）x=0 时不等式为 1≥1，恒成立。x&gt;0 时分离参数：<code>a≥φ(x)=(x<sup>3</sup>/2+x+1−e<sup>x</sup>)/x<sup>2</sup></code>。',
                                '<code>φ′(x)=[x<sup>3</sup>/2+(2−x)e<sup>x</sup>−x−2]/x<sup>3</sup></code>。令分子为 N(x)，则 N(2)=0，<code>N′(x)=3x<sup>2</sup>/2+(1−x)e<sup>x</sup>−1</code>，N″(x)=x(3−e<sup>x</sup>)。',
                                'N′(0)=0，N′ 在 (0,ln3) 递增、在 (ln3,+∞) 递减，且 N′(2)=5−e<sup>2</sup>&lt;0，所以 N′ 先正后负，N 先增后减；又 N(0)=N(2)=0，故 0&lt;x&lt;2 时 N&gt;0，x&gt;2 时 N&lt;0。',
                                '所以 φ 在 (0,2) 递增、在 (2,+∞) 递减，最大值 <code>φ(2)=(7−e<sup>2</sup>)/4</code>。因此 <code>a≥(7−e<sup>2</sup>)/4</code>。'
                            ],
                            answer: '（1）在 (−∞,0) 递减、在 (0,+∞) 递增。（2）<code>a≥(7−e<sup>2</sup>)/4</code>。',
                            link: '对应 1.3：分离参数后，关键是证明 φ 的最大值在 x=2；这类“最大值点恰好是整数”的题，常用 N′ 的单调性定位。',
                            pitfall: '第（2）问不能只由 x=0 的二阶导得到范围；必须在整个 x&gt;0 上求 φ 的最大值。'
                        }
                    ]
                }
            ]
        },
                'D-2': {
            chapterId: 'D-2',
            nodeId: 'E8',
            title: '妙话函数不等式',
            badge: '高考真题样章',
            intro: '函数不等式不是一类题，而是一条链：移项 → 构造 → 求导 → 定号 → 取等。'
                + '本样章按原书节序，只用高考真题，逐题给出方法定位、完整解答与易错提醒。',
            note: '共 3 节、3 道高考真题。题目来源已逐题标注；解答为独立撰写，不照录教辅或原书答案。',
            sections: [
                {
                    id: 'D-2-1',
                    title: '2.1 构造函数',
                    lead: '把要证的不等式变成一个新函数的符号问题，让导数替你说话。',
                    body: [
                        '构造函数的目标不是“造一个复杂的函数”，而是造一个导数容易定号的函数。先看取等点、区间端点与参数位置，再决定移项、取对数还是作商。',
                        '移项后如果一阶导仍不能定号，不要急着换方法，先看二阶导；很多含参不等式的关键，是把参数放到最小值点后再证明一个关于参数的单变量不等式。',
                        '取等点为什么重要？如果 h(x<sub>0</sub>)=0 且 h′(x<sub>0</sub>)=0，那么 x<sub>0</sub> 就是 h 的驻点；再判断 h′ 在两侧是否变号，就能确认它是最小值点。很多构造不是“想出来的”，而是从取等点倒推出来的。',
                        '构造的外壳要服从目标。证明幂的大小关系时，直接作差往往无法求导，取对数可以把“比较两个幂”变成“比较两个积”；证明含分式的不等式时，先判断分母符号，再决定是否同乘，避免不等号方向写反。',
                        '含参不等式通常有两层：先用 x 的最值把 f(x) 压成一个只含参数的式子，再证明这个参数不等式。两层最值的自变量不同，不能把 x 与 a 混在一起讨论。'
                    ],
                    method: [
                        '移项定主元，写成 h(x)=左−右，明确要证 h≥0 还是 h≤0。',
                        '找取等点，猜测它是最小值点还是端点。',
                        '求导定号；一次导不够就再求一次。',
                        '含参时先求最小值，再把问题转化为关于参数的不等式。'
                    ],
                    patterns: ['E-8'],
                    examples: [
                        {
                            id: '真题 1',
                            source: '2023 年普通高等学校招生全国统一考试（新课标Ⅰ卷）数学 · 第 19 题',
                            tag: '高考真题',
                            problem: '已知函数 <code>f(x)=a(e<sup>x</sup>+a)−x</code>。<br>（1）讨论 f(x) 的单调性；<br>（2）证明：当 <code>a&gt;0</code> 时，<code>f(x)&gt;2ln a+3/2</code>。',
                            analysis: '第（1）问按 a≤0 与 a>0 分类；第（2）问先用第（1）问的最小值把 f(x) 压到 <code>1+a<sup>2</sup>+ln a</code>，再构造关于 a 的函数。',
                            steps: [
                                '求导：<code>f′(x)=a e<sup>x</sup>−1</code>。',
                                '若 <code>a≤0</code>，则 <code>f′(x)&lt;0</code> 恒成立，f 在 R 上单调递减。',
                                '若 <code>a&gt;0</code>，令 <code>f′(x)=0</code> 得 <code>x=−ln a</code>。当 <code>x&lt;−ln a</code> 时 f′&lt;0；当 <code>x&gt;−ln a</code> 时 f′&gt;0。所以 f 在 <code>(−∞,−ln a)</code> 递减，在 <code>(−ln a,+∞)</code> 递增。',
                                '第（2）问：由第（1）问，a&gt;0 时最小值在 <code>x=−ln a</code> 处取得，<code>f<sub>min</sub>=a(1/a+a)+ln a=1+a<sup>2</sup>+ln a</code>。',
                                '于是只需证 <code>1+a<sup>2</sup>+ln a&gt;2ln a+3/2</code>，即 <code>a<sup>2</sup>−ln a−1/2&gt;0</code>。',
                                '令 <code>h(a)=a<sup>2</sup>−ln a−1/2</code>（a&gt;0），则 <code>h′(a)=2a−1/a=(2a<sup>2</sup>−1)/a</code>。h 在 <code>a=1/√2</code> 取最小值，<code>h(1/√2)=1/2+ln√2−1/2=(ln2)/2&gt;0</code>。故原不等式成立。'
                            ],
                            answer: '（1）a≤0 时在 R 上递减；a&gt;0 时在 (−∞,−ln a) 递减、在 (−ln a,+∞) 递增。（2）最小值 <code>1+a<sup>2</sup>+ln a</code>，再证 <code>a<sup>2</sup>−ln a−1/2&gt;0</code>，最小值为 <code>(ln2)/2&gt;0</code>。',
                            link: '对应 2.1「构造函数」：先用第（1）问把 f 化成关于 a 的最小值，再构造 h(a)。这是“含参不等式 → 最值 → 单变量不等式”的标准链条。',
                            pitfall: '不要直接对 f(x) 整个式子放缩；第（2）问的自变量是 x，但参数 a 也要满足一个不等式，两层最值不能混。'
                        },
                        {
                            id: '真题 2',
                            source: '2021 年普通高等学校招生全国统一考试（全国乙卷·理科）数学 · 第 20 题',
                            tag: '高考真题',
                            problem: '设函数 <code>f(x)=ln(a−x)</code>，已知 <code>x=0</code> 是函数 <code>y=x f(x)</code> 的极值点。<br>（1）求 a；<br>（2）设函数 <code>g(x)=(x+f(x))/(x f(x))</code>，证明：<code>g(x)&lt;1</code>。',
                            analysis: '第（1）问用“极值点处导数为 0”求 a，并回代验证；第（2）问先判断 x f(x) 的符号，把分式不等式转化为整式不等式，再换元构造 h(t)。',
                            steps: [
                                'f 的定义域为 x&lt;a。令 <code>F(x)=x ln(a−x)</code>，则 <code>F′(x)=ln(a−x)−x/(a−x)</code>。',
                                'x=0 是极值点且 F 在 0 的邻域可导，故 <code>F′(0)=ln a=0</code>，得 a=1。回代：<code>F″(0)=−1−1=−2&lt;0</code>，x=0 确为极大值点。',
                                '此时 f(x)=ln(1−x)，定义域 x&lt;1。对 x&lt;1 且 x≠0，<code>x f(x)&lt;0</code>（0&lt;x&lt;1 时 x&gt;0、f&lt;0；x&lt;0 时 x&lt;0、f&gt;0）。',
                                '因为分母为负，<code>g(x)&lt;1</code> 等价于 <code>x+f(x)&gt;x f(x)</code>，即 <code>x+(1−x)ln(1−x)&gt;0</code>。',
                                '令 t=1−x（t&gt;0，t≠1），则待证式变为 <code>h(t)=1−t+t ln t&gt;0</code>。',
                                '求导：<code>h′(t)=ln t</code>。h 在 (0,1) 递减、在 (1,+∞) 递增，最小值 h(1)=0；t≠1 时 h(t)&gt;0。故 g(x)&lt;1。'
                            ],
                            answer: '（1）a=1。（2）x f(x)&lt;0，原式等价于 <code>x+(1−x)ln(1−x)&gt;0</code>；令 t=1−x，证 <code>1−t+t ln t&gt;0</code>，最小值在 t=1 取得。',
                            link: '对应 2.1「构造函数」：先由极值点求参数，再把分式不等式等价变形，最后构造 h(t)。关键不是直接对 g 求导，而是先把分母的符号定下来。',
                            pitfall: '两边同乘 x f(x) 时，必须说明它是负的，否则不等号方向会写反。'
                        }
                    ]
                },
                {
                    id: 'D-2-2',
                    title: '2.2 分拆函数',
                    lead: '把两个函数分别处理，再用最小值或图像交点把它们接起来。',
                    body: [
                        '分拆的关键是“各管一段”：先把 f 与 g 分别化成只含一个最值的函数，再比较两个最小值。',
                        '当题目要求“同一条水平线与两条曲线共有三个交点”时，先找两条曲线的公共点，再用公共点把另外两个交点的横坐标表示出来。',
                        '分拆不是“拆得越多越好”。每一段都要为最终目标服务：如果拆开后某一项的下界太松，合并后的结果就证不出题目要求的精度；这时要换更强的基准不等式，而不是继续加项。',
                        '按区间分拆是另一种常用策略。同一个不等式在不同区间上的最佳放缩可能不同；先确定“哪一段最难”，再针对这一段单独选界，往往比全场用一个界更有效。',
                        '分拆后的两个等号能否同时成立，是检查答案的快速方法：能同时成立，通常得到“≥”；不能同时成立，往往能得到严格“&gt;”。写解答时要把这件事说清楚，否则会丢掉题目要求的严格性。'
                    ],
                    method: [
                        '分别求 f、g 的单调性与最小值，注意定义域。',
                        '由“最小值相同”建立方程，构造关于参数的函数证明解唯一。',
                        '找两条曲线的公共点，确定水平线的高度。',
                        '用互为反函数的结构（<code>g(e<sup>t</sup>)=f(t)</code>）把另一个交点的横坐标表示出来。'
                    ],
                    patterns: ['E-7', 'E-8', 'E-10'],
                    examples: [
                        {
                            id: '真题 3',
                            source: '2022 年普通高等学校招生全国统一考试（新高考Ⅰ卷）数学 · 第 22 题',
                            tag: '高考真题',
                            problem: '已知函数 <code>f(x)=e<sup>x</sup>−ax</code> 和 <code>g(x)=ax−ln x</code> 有相同的最小值。<br>（1）求 a；<br>（2）证明：存在直线 <code>y=b</code>，其与两条曲线 <code>y=f(x)</code> 和 <code>y=g(x)</code> 共有三个不同的交点，并且从左到右的三个交点的横坐标成等差数列。',
                            analysis: '第（1）问分别求两个最小值，建立方程后构造 φ(a) 证明唯一解；第（2）问先找公共点，再用 <code>g(e<sup>t</sup>)=f(t)</code> 把三个横坐标联系起来。',
                            steps: [
                                'a≤0 时 f 单调递增、g 单调递减，都没有最小值，故 a&gt;0。',
                                'f′(x)=e<sup>x</sup>−a，最小值在 <code>x=ln a</code> 处，<code>f<sub>min</sub>=a−a ln a</code>。',
                                'g′(x)=a−1/x，最小值在 <code>x=1/a</code> 处，<code>g<sub>min</sub>=1+ln a</code>。',
                                '由最小值相等：<code>a−a ln a=1+ln a</code>，即 <code>ln a=(a−1)/(a+1)</code>。令 <code>φ(a)=ln a−(a−1)/(a+1)</code>，则 <code>φ′(a)=(a<sup>2</sup>+1)/(a(a+1)<sup>2</sup>)&gt;0</code>，φ 严格递增；φ(1)=0，所以 a=1。',
                                'a=1 时 <code>f(x)=e<sup>x</sup>−x</code>，<code>g(x)=x−ln x</code>，最小值都为 1，分别在 x=0、x=1 取得。',
                                '取 x<sub>0</sub>∈(0,1) 使 f(x<sub>0</sub>)=g(x<sub>0</sub>)：令 <code>u(x)=e<sup>x</sup>−2x+ln x</code>，u→−∞（x→0<sup>+</sup>），u(1)=e−2&gt;0，故存在这样的 x<sub>0</sub>。令 <code>b=f(x<sub>0</sub>)=g(x<sub>0</sub>)</code>，则 b&gt;1。',
                                'f(x)=b 有两个根：一个 <code>x<sub>1</sub>&lt;0</code>，一个 x<sub>0</sub>；g(x)=b 有两个根：x<sub>0</sub> 与 <code>x<sub>4</sub>&gt;1</code>。三个不同交点的横坐标为 x<sub>1</sub>&lt;x<sub>0</sub>&lt;x<sub>4</sub>。',
                                '由 <code>g(e<sup>x<sub>1</sub></sup>)=e<sup>x<sub>1</sub></sup>−x<sub>1</sub>=f(x<sub>1</sub>)=b</code>，且 <code>e<sup>x<sub>1</sub></sup>∈(0,1)</code>，得 <code>e<sup>x<sub>1</sub></sup>=x<sub>0</sub></code>；同理 <code>f(ln x<sub>0</sub>)=x<sub>0</sub>−ln x<sub>0</sub>=g(x<sub>0</sub>)=b</code>，且 ln x<sub>0</sub>&lt;0，得 <code>x<sub>1</sub>=ln x<sub>0</sub></code>；又 <code>g(e<sup>x<sub>0</sub></sup>)=f(x<sub>0</sub>)=b</code> 且 e<sup>x<sub>0</sub></sup>&gt;1，得 <code>x<sub>4</sub>=e<sup>x<sub>0</sub></sup></code>。',
                                '由 f(x<sub>0</sub>)=g(x<sub>0</sub>) 得 <code>e<sup>x<sub>0</sub></sup>=2x<sub>0</sub>−ln x<sub>0</sub></code>，所以 <code>x<sub>1</sub>+x<sub>4</sub>=ln x<sub>0</sub>+e<sup>x<sub>0</sub></sup>=2x<sub>0</sub></code>，三根成等差数列。'
                            ],
                            answer: '（1）a=1。（2）取公共点 x<sub>0</sub>∈(0,1)，b=f(x<sub>0</sub>)，三个交点为 x<sub>1</sub>=ln x<sub>0</sub>、x<sub>0</sub>、x<sub>4</sub>=e<sup>x<sub>0</sub></sup>，满足 x<sub>1</sub>+x<sub>4</sub>=2x<sub>0</sub>。',
                            link: '对应 2.2「分拆函数」：先把 f、g 分别化为最小值问题，再找公共点；最后用 <code>g(e<sup>t</sup>)=f(t)</code> 把两条曲线上的点拆开又接起来。',
                            pitfall: '不要默认 b 可以任意取；必须先找两条曲线的公共点，否则水平线会有四个交点而不是三个。'
                        },
                        {
                            id: '真题 4',
                            source: '2019 年普通高等学校招生全国统一考试（全国Ⅱ卷·理科）数学 · 第 20 题',
                            tag: '高考真题',
                            problem: '已知函数 <code>f(x)=ln x−(x+1)/(x−1)</code>。<br>（1）讨论 f(x) 的单调性，并证明 f(x) 有且仅有两个零点；<br>（2）设 x<sub>0</sub> 是 f(x) 的一个零点，证明曲线 <code>y=ln x</code> 在点 <code>A(x<sub>0</sub>, ln x<sub>0</sub>)</code> 处的切线也是曲线 <code>y=e<sup>x</sup></code> 的切线。',
                            analysis: '第（1）问先求导，再在 (0,1) 与 (1,+∞) 两个区间分别用单调性 + 极限/端点值定零点；第（2）问把“同一条切线”转化为两个切点处切线方程完全相同。',
                            steps: [
                                '定义域为 (0,1)∪(1,+∞)。<code>f′(x)=1/x+2/(x−1)<sup>2</sup>&gt;0</code>，所以 f 在 (0,1) 与 (1,+∞) 上分别严格递增。',
                                '当 x→0<sup>+</sup> 时 f(x)→−∞；当 x→1<sup>−</sup> 时 <code>(x+1)/(x−1)→−∞</code>，f(x)→+∞，故 (0,1) 内有且仅有一个零点。',
                                '当 x→1<sup>+</sup> 时 f(x)→−∞；当 x→+∞ 时 f(x)→+∞，故 (1,+∞) 内有且仅有一个零点。所以 f 有且仅有两个零点。',
                                '设 f(x<sub>0</sub>)=0，则 <code>ln x<sub>0</sub>=(x<sub>0</sub>+1)/(x<sub>0</sub>−1)</code>。曲线 y=ln x 在 A 处的切线为 <code>y=x/x<sub>0</sub>+ln x<sub>0</sub>−1</code>。',
                                '取 <code>B(−ln x<sub>0</sub>, 1/x<sub>0</sub>)</code>，它满足 <code>e<sup>−ln x<sub>0</sub></sup>=1/x<sub>0</sub></code>，所以在 y=e<sup>x</sup> 上。曲线 y=e<sup>x</sup> 在 B 处的切线为 <code>y=x/x<sub>0</sub>+(ln x<sub>0</sub>+1)/x<sub>0</sub></code>。',
                                '只需证两切线截距相等：<code>ln x<sub>0</sub>−1=(ln x<sub>0</sub>+1)/x<sub>0</sub></code>，等价于 <code>(x<sub>0</sub>−1)ln x<sub>0</sub>=x<sub>0</sub>+1</code>，这正是 f(x<sub>0</sub>)=0。故两切线重合。'
                            ],
                            answer: '（1）在 (0,1) 与 (1,+∞) 上分别递增，各有且仅有一个零点，共两个。（2）两个切点分别为 A(x<sub>0</sub>,ln x<sub>0</sub>) 与 B(−ln x<sub>0</sub>,1/x<sub>0</sub>)，切线方程相同。',
                            link: '对应 2.2「分拆函数」：第（1）问把定义域拆成两段分别处理；第（2）问把“同一条切线”拆成“同斜率 + 同截距”，再用 f(x<sub>0</sub>)=0 把两段接起来。',
                            pitfall: '只证明“斜率相等”不够，必须同时证明截距相等，否则可能是两条平行切线。'
                        }
                    ]
                },
                {
                    id: 'D-2-3',
                    title: '2.3 常见不等式放缩',
                    lead: '放缩不是“随便放”，而是先确定目标，再选合适的不等式。',
                    body: [
                        '放缩的方向由目标决定：要证“大于”就找下界，要证“小于”就找上界。',
                        '零点个数问题里，放缩的任务往往不是证明不等式，而是把函数“压”到某个区间之外，从而排除多余的零点。',
                        '放缩是有层级的。以 e<sup>x</sup> 为例，最粗的界是 e<sup>x</sup>≥1+x，往上一层是 e<sup>x</sup>≥1+x+x<sup>2</sup>/2；以 ln x 为例，上界有 ln x≤x−1，下界有 ln x≥1−1/x。题目要求的精度越高，越要选靠上的层级。',
                        '上界不会凭空出现。e<sup>x</sup>≤1/(1−x)（0&lt;x&lt;1）可以通过令 g(x)=(1−x)e<sup>x</sup> 并证明 g 递减得到；遇到不熟悉的上界，先把它改写成“某个函数≤某个常数”，再构造求导。',
                        '放缩过头和放缩不足都不可取。判断标准不是“界看起来漂亮”，而是“能否在等号点或端点处达到题目要求的数值”。如果差一点，优先补一项 Taylor 项或改用双侧夹逼，而不是反复换元。'
                    ],
                    method: [
                        '先确定要排除哪一段区间，再选择在该区间上单调的放缩。',
                        '用 <code>sin x≤1</code>、<code>ln(1+x)≥ln(1+x<sub>0</sub>)</code> 这类简单界，把函数符号定死。',
                        '在剩余区间用单调性 + 零点定理证明恰好一个零点。',
                        '最后按区间汇总，说明“有且仅有”几个零点。'
                    ],
                    patterns: ['E-7', 'E-8'],
                    examples: [
                        {
                            id: '真题 5',
                            source: '2019 年普通高等学校招生全国统一考试（全国Ⅰ卷·理科）数学 · 第 20 题',
                            tag: '高考真题',
                            problem: '已知函数 <code>f(x)=sin x−ln(1+x)</code>，<code>f′(x)</code> 为 f(x) 的导数。证明：<br>（1）<code>f′(x)</code> 在区间 <code>(−1, π/2)</code> 存在唯一极大值点；<br>（2）f(x) 有且仅有 2 个零点。',
                            analysis: '第（1）问对 f′ 再求导，用二阶导定号；第（2）问按区间分段：先排除 (−1,π/2) 上的零点，再在 [π/2,π] 找唯一零点，最后排除 x≥π。',
                            steps: [
                                '令 <code>g(x)=f′(x)=cos x−1/(1+x)</code>，则 <code>g′(x)=−sin x+1/(1+x)<sup>2</sup></code>，<code>g″(x)=−cos x−2/(1+x)<sup>3</sup></code>。',
                                '在 <code>(−1,π/2)</code> 上 cos x&gt;0，所以 g″&lt;0，g′ 严格递减。',
                                '又 <code>g′(0)=1&gt;0</code>，<code>g′(π/2)=−1+1/(1+π/2)<sup>2</sup>&lt;0</code>，故存在唯一 <code>x<sub>0</sub>∈(0,π/2)</code> 使 g′(x<sub>0</sub>)=0。g′ 左正右负，g 在 x<sub>0</sub> 取唯一极大值。',
                                '第（2）问：f(0)=0。在 (−1,0) 上，g′&gt;0，g 递增且 g(0)=0，所以 g&lt;0，f′&lt;0，f 递减；由 f(0)=0 得 f&gt;0，无零点。',
                                '在 (0,π/2) 上，g 先增后减，g(0)=0、g(π/2)&lt;0，所以 g 在 (0,π/2) 内恰有一个零点 x<sub>1</sub>；f 在 (0,x<sub>1</sub>) 增、在 (x<sub>1</sub>,π/2) 减，且 f(0)=0、f(π/2)=1−ln(1+π/2)&gt;0，故 f&gt;0，无零点。',
                                '在 [π/2,π] 上，sin x 递减、ln(1+x) 递增，所以 f 严格递减；f(π/2)&gt;0，f(π)=−ln(1+π)&lt;0，由零点定理恰有一个零点。',
                                '当 x≥π 时，<code>sin x≤1</code>，<code>ln(1+x)≥ln(1+π)&gt;1</code>，所以 f(x)&lt;0，无零点。',
                                '综上，f 有且仅有 2 个零点：x=0 与 (π/2,π) 内的唯一零点。'
                            ],
                            answer: '（1）g=f′ 在 (−1,π/2) 上有唯一极大值点 x<sub>0</sub>∈(0,π/2)。（2）两个零点分别为 x=0 和 (π/2,π) 内的唯一零点。',
                            link: '对应 2.3「放缩」：在 x≥π 上用 <code>sin x≤1</code> 与 <code>ln(1+x)&gt;1</code> 直接排除零点；在 [π/2,π] 上改用单调性，避免过度放缩。',
                            pitfall: '不要在 (0,π/2) 上直接说“f′ 先正后负”就结束；必须说明 g(π/2)&lt;0 才能确定 g 的零点位置。'
                        },
                        {
                            id: '真题 6',
                            source: '2019 年普通高等学校招生全国统一考试（全国Ⅰ卷·文科）数学 · 第 20 题',
                            tag: '高考真题',
                            problem: '已知函数 <code>f(x)=2sin x−x cos x−x</code>，f′(x) 为 f(x) 的导数。证明：<br>（1）f′(x) 在区间 (0,π) 存在唯一零点；<br>（2）若 x∈[0,π] 时，<code>f(x)≥a x</code>，求 a 的取值范围。',
                            analysis: '第（1）问对 f′ 再求导，用 f″ 的符号分段；第（2）问先由端点 x=π 推出必要条件 a≤0，再证明 a≤0 时 f(x)≥0，从而充分。',
                            steps: [
                                '<code>f′(x)=2cos x−cos x+x sin x−1=cos x+x sin x−1</code>，<code>f″(x)=−sin x+sin x+x cos x=x cos x</code>。',
                                '在 (0,π/2) 上 f″&gt;0，f′ 递增；在 (π/2,π) 上 f″&lt;0，f′ 递减。',
                                '又 <code>f′(0)=0</code>，<code>f′(π/2)=π/2−1&gt;0</code>，<code>f′(π)=−2&lt;0</code>，所以 f′ 在 (π/2,π) 内有唯一零点。',
                                '第（2）问：x=0 时不等式恒成立；x=π 时 f(π)=0−π(−1)−π=0，不等式为 0≥aπ，故必有 a≤0。',
                                '当 a≤0 时，只需证 f(x)≥0（x∈[0,π]）。由第（1）问，f′ 在 (0,x<sub>0</sub>) 为正、在 (x<sub>0</sub>,π) 为负（x<sub>0</sub> 是 f′ 的唯一零点），所以 f 先增后减。',
                                'f(0)=0，f(π)=0，故 f(x)≥0。于是 f(x)≥0≥a x（a≤0，x≥0），充分性成立。'
                            ],
                            answer: '（1）f′ 在 (0,π) 内有唯一零点。（2）a≤0。',
                            link: '对应 2.3「放缩」：先由端点值取得必要条件 a≤0，再用 f≥0 完成充分性。这里的“放缩”不是复杂不等式，而是用 0 作为下界。',
                            pitfall: '只由 f(x)≥0 推出 a≤0 还不够，必须回证 a≤0 时对任意 x∈[0,π] 都有 f(x)≥a x。'
                        }
                    ]
                }
            ]
        }
    };

    return { lessons };
}));
