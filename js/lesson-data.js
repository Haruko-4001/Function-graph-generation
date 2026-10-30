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
                        '移项后如果一阶导仍不能定号，不要急着换方法，先看二阶导；很多含参不等式的关键，是把参数放到最小值点后再证明一个关于参数的单变量不等式。'
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
                        }
                    ]
                },
                {
                    id: 'D-2-2',
                    title: '2.2 分拆函数',
                    lead: '把两个函数分别处理，再用最小值或图像交点把它们接起来。',
                    body: [
                        '分拆的关键是“各管一段”：先把 f 与 g 分别化成只含一个最值的函数，再比较两个最小值。',
                        '当题目要求“同一条水平线与两条曲线共有三个交点”时，先找两条曲线的公共点，再用公共点把另外两个交点的横坐标表示出来。'
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
                            id: '真题 2',
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
                        }
                    ]
                },
                {
                    id: 'D-2-3',
                    title: '2.3 常见不等式放缩',
                    lead: '放缩不是“随便放”，而是先确定目标，再选合适的不等式。',
                    body: [
                        '放缩的方向由目标决定：要证“大于”就找下界，要证“小于”就找上界。',
                        '零点个数问题里，放缩的任务往往不是证明不等式，而是把函数“压”到某个区间之外，从而排除多余的零点。'
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
                            id: '真题 3',
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
                        }
                    ]
                }
            ]
        }
    };

    return { lessons };
}));
