/**
 * glossary.js
 * ============================================================
 * 术语库（对应 Math-To-Manim 的 knowledge map）。
 *
 * 助手遇到「什么是拐点」这类问题时，不该只给结论，而应回答：
 * 定义是什么、这个工具怎么算的、最容易错在哪。
 *
 * 每条术语的结构：
 *   name      正名
 *   aliases   别名（用于匹配）
 *   def       一句话定义
 *   how       本工具的计算方式（与代码对应）
 *   pitfall   常见误区
 *   related   相关术语 id
 * ============================================================
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MathGlossary = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const TERMS = [
        {
            id: 'zero',
            name: '零点',
            aliases: ['零点', '根', '解', '求根'],
            def: '使 f(x) = 0 的 x 值，也就是曲线与 x 轴交点的横坐标。',
            how: '把区间等分 1000 段扫描符号变化，再用 Brent 法精化到 1e-13；'
                + '对不变号的切触零点（如 (x−1)²），改用 |f| 的局部极小 + 黄金分割检测。',
            pitfall: '「零点」是 x 值，不是点 (x, y)；切触零点两侧不变号，只找变号会整个漏掉。',
            related: ['extremum', 'domain']
        },
        {
            id: 'extremum',
            name: '极值',
            aliases: ['极值', '极大值', '极小值', '最值'],
            def: '在某点邻域内取得的最大或最小值，是局部概念，不等于整个区间上的最值。',
            how: '先求 f\'(x) 的零点作为候选，再用左右导数符号（左正右负为极大）或二阶导判定，'
                + '最后用黄金分割在该点附近精化。',
            pitfall: '导数为零只是候选（如 x³ 在 0 处），还要看两侧符号是否真的改变。'
                + '极值是局部概念，别和闭区间最值混为一谈。',
            related: ['monotonic', 'inflection']
        },
        {
            id: 'monotonic',
            name: '单调区间',
            aliases: ['单调', '递增', '递减'],
            def: '函数在该区间上只增不减（或只减不增）。',
            how: '用临界点与断点把区间切开，在每段内取 7 个采样点求导数中位数判号，'
                + '避免恰好命中导数为零的点而误判。',
            pitfall: '开区间与闭区间的写法要一致；断点两侧必须分段讨论，不能连起来说。',
            related: ['extremum']
        },
        {
            id: 'inflection',
            name: '拐点',
            aliases: ['拐点', '凹凸性改变'],
            def: '曲线凹凸性发生改变的点，也就是 f\'\'(x) 变号的点。',
            how: '采样二阶导，检测变号后用 Brent 精化；同时用二阶导的中位数量级做门槛，'
                + '把「极点两侧变号」排除掉。',
            pitfall: 'f\'\'(x)=0 不一定是拐点（如 x⁴ 在 0 处）；极点两侧二阶导也会变号，但那不是拐点。',
            related: ['concavity']
        },
        {
            id: 'concavity',
            name: '凹凸性',
            aliases: ['凹凸', '凹', '凸', '下凸', '上凸'],
            def: 'f\'\' > 0 时为凹向上（下凸，像 ∪），f\'\' < 0 时为凹向下（上凸，像 ∩）。',
            how: '采样二阶导的符号，按符号分段；符号改变处即为拐点候选。',
            pitfall: '中文教材的「凹/凸」命名不统一，说方向时最好直接讲「开口向上/向下」。',
            related: ['inflection']
        },
        {
            id: 'asymptote',
            name: '渐近线',
            aliases: ['渐近线', '垂直渐近线', '水平渐近线', '斜渐近线'],
            def: '曲线无限接近但永不相交的直线，分垂直、水平、斜三种。',
            how: '垂直：把极点当作 g = 1/f 的零点用 Brent 求；'
                + '水平：看 x→±∞ 的极限；斜：检验 f(x)/x 与 f(x)−mx 是否收敛。',
            pitfall: '有水平渐近线就不会再有同方向的斜渐近线；'
                + '垂直渐近线处函数无定义，不能写进定义域。',
            related: ['domain']
        },
        {
            id: 'parity',
            name: '奇偶性',
            aliases: ['奇偶', '奇函数', '偶函数'],
            def: 'f(−x) = f(x) 为偶函数（关于 y 轴对称），f(−x) = −f(x) 为奇函数（关于原点对称）。',
            how: '在 ±x 对称点上采样比对，误差超过 1e-6 的相对量级就判为不满足。',
            pitfall: '定义域必须关于原点对称才谈得上奇偶性；只验几个点容易误判。',
            related: ['period']
        },
        {
            id: 'period',
            name: '周期性',
            aliases: ['周期', '最小正周期'],
            def: '存在 T > 0 使 f(x + T) = f(x) 对定义域内所有 x 成立，最小的 T 叫最小正周期。',
            how: '在候选表（π/2、π、2π、4π、0.25~10）上逐一代入验证，取第一个成立的。',
            pitfall: '这是启发式：0.7 这类不在候选表里的周期识别不出来。常函数任意正数都是周期。',
            related: ['parity']
        },
        {
            id: 'range',
            name: '值域',
            aliases: ['值域', '取值范围'],
            def: '函数所有可能取值的集合。',
            how: '在可视区间内采样取极小极大，并剔除极点邻域；存在极点时标记「可能无界」。',
            pitfall: '这里给的是**区间内的采样值域**，不是全局值域；1/x 的真实值域是 (−∞,0)∪(0,+∞)。',
            related: ['domain']
        },
        {
            id: 'domain',
            name: '定义域',
            aliases: ['定义域', '未定义点'],
            def: '函数有意义的自变量取值集合。',
            how: '通过采样统计可求值比例，并把极点与断点列为「未定义点」。',
            pitfall: '分母为零、偶次根号内为负、对数真数非正，都要从定义域里排除。',
            related: ['asymptote', 'range']
        },
        {
            id: 'limit',
            name: '极限',
            aliases: ['极限', '趋近', '趋于'],
            def: '自变量趋近某点时函数值趋近的那个数。',
            how: '从两侧以 10⁻¹…10⁻⁹ 的步距逐步逼近，观察序列是否收敛；'
                + '左右极限不等则判为极限不存在。',
            pitfall: '极限存在不要求函数在该点有定义；左右极限必须都存在且相等。',
            related: ['asymptote']
        },
        {
            id: 'integral',
            name: '定积分',
            aliases: ['定积分', '积分', '面积'],
            def: '曲线与 x 轴之间带符号的面积（x 轴下方记为负）。',
            how: '自适应 Simpson 复合求积，变化剧烈处自动加密，并给出误差估计；'
                + '未收敛时会明确标注。',
            pitfall: '被积函数在区间内有奇点时，普通数值积分不成立，需要先判断广义积分是否收敛。',
            related: ['limit']
        }
    ];

    const BY_ID = {};
    TERMS.forEach(function (t) { BY_ID[t.id] = t; });

    /** 按文本匹配术语（最长别名优先，避免「极值」抢走「极大值」） */
    function lookup(text) {
        const s = String(text || '');
        let best = null;
        let bestLen = 0;
        TERMS.forEach(function (t) {
            t.aliases.forEach(function (a) {
                if (s.indexOf(a) >= 0 && a.length > bestLen) {
                    best = t;
                    bestLen = a.length;
                }
            });
        });
        return best;
    }

    /** 判断一句话是否在问「是什么」 */
    function isDefinitionQuestion(text) {
        const s = String(text || '').replace(/\s+/g, '');
        // 注意：不要把「定义」单独放进前缀——「定义域」会被误判成在问定义
        return /^(什么是|啥是|什么叫|解释一下|解释一下|请问)/.test(s)
            || /(是什么|是啥|什么意思|的定义)$/.test(s);
    }

    /** 渲染成助手回复 */
    function render(term) {
        if (!term) return '';
        const lines = [
            '【' + term.name + '】' + term.def,
            '本工具怎么算：' + term.how,
            '常见误区：' + term.pitfall
        ];
        if (term.related && term.related.length) {
            const names = term.related.map(function (id) {
                return BY_ID[id] ? BY_ID[id].name : id;
            });
            lines.push('相关：' + names.join('、'));
        }
        return lines.join('\n');
    }

    /** 术语目录（用于界面展示） */
    function catalog() {
        return TERMS.map(function (t) { return { id: t.id, name: t.name }; });
    }

    return { TERMS, BY_ID, lookup, isDefinitionQuestion, render, catalog };
}));
