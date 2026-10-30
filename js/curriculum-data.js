/**
 * curriculum-data.js
 * ============================================================
 * 课程内容数据：8 个模块、62 个知识节点、90 个题型标签、60 条结论。
 *
 * 数据结构刻意保持扁平，便于构建期校验、运行时搜索与后续扩充：
 *   modules[]      { id, title, stage, nodes[] }
 *   nodes{}        { title, stage, book, prereq[], summary, points[], patterns[], demo }
 *   conclusions[]  { id, node, text, condition, examUse, pitfall }
 * ============================================================
 */
(function (root) {
    'use strict';

    const modules = [
        { id: 'A', title: '函数概念与表示', stage: '高中 · 必修一', nodes: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'] },
        { id: 'B', title: '函数的基本性质', stage: '高中 · 必修一', nodes: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7'] },
        { id: 'C', title: '基本初等函数', stage: '高中 · 必修一', nodes: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'] },
        { id: 'D', title: '导数概念与运算', stage: '高中 · 选择性必修第二册', nodes: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'] },
        { id: 'E', title: '导数应用', stage: '高中 · 选择性必修第二册', nodes: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12'] },
        { id: 'F', title: '极限与积分', stage: '大学 · 高数上', nodes: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'] },
        { id: 'G', title: '圆锥曲线', stage: '高中 · 选择性必修第一册', nodes: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12'] },
        { id: 'H', title: '参数方程与极坐标', stage: '高中拓展 / 大学', nodes: ['H1', 'H2', 'H3'] }
    ];

    const nodes = {
        A1: {
            title: '函数定义与三要素',
            stage: '高中 · 必修一', book: '3.1 函数的概念及其表示', prereq: [],
            summary: '函数是定义域到值域的对应关系；定义域、对应关系、值域构成三要素。',
            points: ['判断两个函数是否相同，只看定义域与对应关系', '值域由定义域和对应关系共同决定'],
            patterns: ['函数关系判断', '三要素辨析'], demo: 'x^2 - 4'
        },
        A2: {
            title: '定义域',
            stage: '高中 · 必修一', book: '3.1 函数的概念及其表示', prereq: ['A1'],
            summary: '分母不为零、偶次根号内非负、对数真数为正、正切角不为 π/2+kπ。',
            points: ['先列全部限制，再取交集', '实际背景还要受物理意义约束'],
            patterns: ['定义域（分式/根式/对数）', '复合定义域', '实际定义域'], demo: '1/(x-1)+ln(x+2)'
        },
        A3: {
            title: '值域与最值',
            stage: '高中 · 必修一', book: '3.1–3.2', prereq: ['A1', 'B1'],
            summary: '值域是全体函数值；求法要按结构选择：单调、配方、换元、分离常数、判别式、基本不等式、导数。',
            points: ['分式优先分离常数，根式优先换元', '含参二次函数优先看对称轴与区间的位置'],
            patterns: ['值域（单调/配方）', '值域（换元/分离）', '值域（判别式/不等式）'], demo: 'x + 1/x'
        },
        A4: {
            title: '函数表示与解析式',
            stage: '高中 · 必修一', book: '3.1', prereq: ['A1'],
            summary: '解析式、表格、图像是函数的三种表示；求解析式常用待定系数、换元、方程组。',
            points: ['换元后必须写清新变量的范围', '分段函数要分段写解析式'],
            patterns: ['待定系数求解析式'], demo: 'a*x^2 + b*x + c'
        },
        A5: {
            title: '分段函数与绝对值',
            stage: '高中 · 必修一', book: '3.1', prereq: ['A1'],
            summary: '分段函数在每一段上有各自的解析式；绝对值本质是分段函数。',
            points: ['求值先判断自变量落在哪一段', '解方程/不等式要分段讨论并检验端点'],
            patterns: ['分段函数求值与图像'], demo: 'abs(x)'
        },
        A6: {
            title: '图像变换',
            stage: '高中 · 必修一', book: '3.1 拓展', prereq: ['A1'],
            summary: '平移、伸缩、对称、翻折；对 x 的变换与直觉相反。',
            points: ['y=f(x+a) 是左移 a（a>0）', 'y=f(|x|) 保留右侧再关于 y 轴对称'],
            patterns: [], demo: 'sin(x)'
        },

        B1: {
            title: '单调性',
            stage: '高中 · 必修一', book: '3.2 函数的基本性质', prereq: ['A2'],
            summary: '区间上自变量增大函数值也增大则为增函数；导数符号是判断工具。',
            points: ['定义法作差后因式分解定号', '复合函数遵循「同增异减」'],
            patterns: ['单调性判断', '定义法证明', '复合单调'], demo: 'x^3 - 3*x'
        },
        B2: {
            title: '奇偶性',
            stage: '高中 · 必修一', book: '3.2', prereq: ['B1'],
            summary: 'f(−x)=f(x) 为偶函数，f(−x)=−f(x) 为奇函数；前提是定义域关于原点对称。',
            points: ['先查定义域，再验恒等式', '奇函数若在 0 有定义，则 f(0)=0'],
            patterns: ['奇偶性判断', '由奇偶求参'], demo: 'x^3'
        },
        B3: {
            title: '周期性',
            stage: '高中 · 必修一', book: '3.2', prereq: ['B2'],
            summary: '存在 T>0 使 f(x+T)=f(x) 恒成立，最小正 T 为最小正周期。',
            points: ['f(x+a)=−f(x) ⇒ T=2a', 'f(x+a)=1/f(x) ⇒ T=2a'],
            patterns: ['周期求值', '周期推导'], demo: 'sin(x)'
        },
        B4: {
            title: '对称性',
            stage: '高中 · 必修一', book: '3.2 拓展', prereq: ['B2'],
            summary: '轴对称看 f(a+x)=f(a−x)，中心对称看 f(a+x)+f(a−x)=2b。',
            points: ['两条对称轴间距为半个周期', '一轴一中心间距为四分之一周期'],
            patterns: ['轴对称', '中心对称'], demo: 'x^2'
        },
        B5: {
            title: '零点与方程',
            stage: '高中 · 必修一', book: '3.2 / 4.5', prereq: ['B1'],
            summary: '零点即方程 f(x)=0 的根，也是图像与 x 轴交点的横坐标。',
            points: ['零点定理只保证存在，不保证唯一', '唯一性要另加单调性'],
            patterns: ['零点存在性', '零点个数'], demo: 'x^3 - 3*x'
        },
        B6: {
            title: '凹凸性与拐点',
            stage: '大学 / 高中拓展', book: '高数 3.4', prereq: ['B1', 'D7'],
            summary: 'f″>0 凹向上，f″<0 凹向下；f″ 变号处才是拐点。',
            points: ['f″=0 不一定是拐点（如 x⁴ 在 0）', '极点两侧 f″ 也会变号，但不是拐点'],
            patterns: ['拐点与凹凸'], demo: 'x^3'
        },
        B7: {
            title: '图像与性质综合',
            stage: '高中 · 必修一', book: '3.2 小结', prereq: ['B1', 'B2', 'B3', 'B4', 'B5'],
            summary: '由图像读性质、由性质选图像，是客观题的高频考法。',
            points: ['先看定义域与奇偶，再看特殊点与渐近线', '不要只看一个特征就下结论'],
            patterns: [], demo: 'exp(-x^2/4)*cos(3*x)'
        },

        C1: {
            title: '二次函数',
            stage: '高中 · 必修一', book: '2.3', prereq: ['A3'],
            summary: '对称轴、开口方向、判别式决定图像；区间最值看对称轴与区间的位置。',
            points: ['轴在区间左/内/右三类讨论', '根分布看 Δ、端点值、对称轴'],
            patterns: ['二次区间最值', '根分布'], demo: 'a*x^2 + b*x + c'
        },
        C2: {
            title: '幂函数',
            stage: '高中 · 必修一', book: '3.3', prereq: ['A1'],
            summary: 'y=x^α；α>0 过 (0,0)(1,1)，α<0 过 (1,1) 且有两支。',
            points: ['α 的奇偶决定奇偶性', 'α<0 时在第一象限递减'],
            patterns: ['幂函数图像'], demo: 'x^(1/2)'
        },
        C3: {
            title: '指数与指数函数',
            stage: '高中 · 必修一', book: '4.1–4.2', prereq: ['B1'],
            summary: 'a^x（a>0, a≠1）恒过 (0,1)；a>1 增，0<a<1 减。',
            points: ['比较大小先看同底/同指', '与 y=x 对称的是对数函数'],
            patterns: ['指数比较大小', '指数复合'], demo: '2^x'
        },
        C4: {
            title: '对数与对数函数',
            stage: '高中 · 必修一', book: '4.3–4.4', prereq: ['C3'],
            summary: 'log_a x 要求 x>0，恒过 (1,0)；与 a^x 互为反函数。',
            points: ['真数大于零是定义域前提', '底数分类讨论单调性'],
            patterns: ['对数定义域', '对数比较大小'], demo: 'ln(x)'
        },
        C5: {
            title: '三角函数图像与性质',
            stage: '高中 · 必修一', book: '5.4', prereq: ['B3'],
            summary: '正弦、余弦、正切的图像、周期、单调区间、对称轴与对称中心。',
            points: ['整体代换：把 ωx+φ 看成一个角', '对称轴处取最值'],
            patterns: ['三角五点法', '三角单调/对称'], demo: 'sin(x)'
        },
        C6: {
            title: 'y=Asin(ωx+φ)',
            stage: '高中 · 必修一', book: '5.6', prereq: ['C5'],
            summary: 'A 控振幅，ω 控周期，φ 控相位；平移时先把 ω 提出来。',
            points: ['T=2π/|ω|', '五点法先定相位，再取五個关键点'],
            patterns: ['Asin(ωx+φ) 图像', 'ω 范围'], demo: '2*sin(2*x + pi/3)'
        },
        C7: {
            title: '对勾函数 y=x+a/x',
            stage: '高中 · 必修一', book: '3.3 探究', prereq: ['C2'],
            summary: 'a>0 时在 (0,√a] 递减、[√a,+∞) 递增，最小值 2√a。',
            points: ['基本不等式取等条件 x=√a', 'a<0 时无最小值，单调性相反'],
            patterns: ['对勾函数最值'], demo: 'x + 4/x'
        },
        C8: {
            title: '复合函数',
            stage: '高中 · 必修一', book: '3.2 / 4.4', prereq: ['B1'],
            summary: '内外层函数的定义域、值域与单调性要分别处理。',
            points: ['内层值域是外层定义域', '单调性「同增异减」'],
            patterns: [], demo: 'ln(x^2 - 1)'
        },

        D1: {
            title: '平均变化率与瞬时变化率',
            stage: '高中 · 选择性必修第二册', book: '5.1.1', prereq: ['B1'],
            summary: '平均变化率是割线斜率，瞬时变化率是割线斜率的极限。',
            points: ['Δy/Δx 的几何意义是割线斜率', 'Δx→0 得到切线斜率'],
            patterns: ['平均/瞬时变化率'], demo: 'x^2'
        },
        D2: {
            title: '导数定义与可导',
            stage: '高中 · 选择性必修第二册', book: '5.1.2', prereq: ['D1'],
            summary: 'f′(x0)=lim [f(x0+Δx)−f(x0)]/Δx；可导必连续，连续不一定可导。',
            points: ['用定义求导要凑出标准形式', '|x| 在 0 连续但不可导'],
            patterns: ['导数定义'], demo: 'x^2'
        },
        D3: {
            title: '几何意义与切线',
            stage: '高中 · 选择性必修第二册', book: '5.1.2', prereq: ['D2'],
            summary: 'f′(x0) 是曲线在 x0 处切线的斜率。',
            points: ['在某点：y−f(x0)=f′(x0)(x−x0)', '过某点：先设切点，不能把点直接当切点'],
            patterns: ['在某点切线', '过点切线'], demo: 'x^3 - 3*x'
        },
        D4: {
            title: '基本求导公式',
            stage: '高中 · 选择性必修第二册', book: '5.2.1', prereq: ['D2'],
            summary: '幂、指数、对数、三角函数的导数公式。',
            points: ['(x^n)′=n x^(n−1)', '(e^x)′=e^x，(ln x)′=1/x'],
            patterns: ['基本求导'], demo: 'x^3 + sin(x)'
        },
        D5: {
            title: '导数四则运算',
            stage: '高中 · 选择性必修第二册', book: '5.2.2', prereq: ['D4'],
            summary: '和差、积、商的求导法则。',
            points: ['积法则 (uv)′=u′v+uv′', '商法则分子顺序不能反'],
            patterns: ['四则求导'], demo: '(x^2+1)/(x-1)'
        },
        D6: {
            title: '复合函数求导',
            stage: '高中 · 选择性必修第二册', book: '5.2.3', prereq: ['D5'],
            summary: '链式法则：由外向内逐层求导，再乘以内层导数。',
            points: ['先识别外层与内层', '多层复合逐层乘到底'],
            patterns: ['复合求导'], demo: 'sin(2*x + 1)'
        },
        D7: {
            title: '高阶导数与隐函数',
            stage: '高中拓展 / 大学', book: '高数 2.3–2.4', prereq: ['D6'],
            summary: '二阶导、隐函数求导、参数方程求导。',
            points: ['隐函数两边对 x 求导，把 y 看作 x 的函数', '参数方程 dy/dx=(dy/dt)/(dx/dt)'],
            patterns: ['高阶/隐函数'], demo: 'x^3 + y^3 - 3*x*y', exampleDemo: 'x^3 - 3*x'
        },
        E1: {
            title: '单调性判定与讨论',
            stage: '高中 · 选择性必修第二册', book: '5.3.1', prereq: ['D5', 'D6'],
            summary: '解 f′(x)>0 / f′(x)<0 得到单调区间；含参时按导数的根分类。',
            points: ['先求定义域，再解导数不等式', '含参按「根是否存在、是否在区间、根的大小」三层讨论'],
            patterns: ['单调区间', '含参单调'], demo: 'x^3 - 3*a*x'
        },
        E2: {
            title: '极值',
            stage: '高中 · 选择性必修第二册', book: '5.3.2', prereq: ['E1'],
            summary: 'f′(x0)=0 且左右符号改变，才是极值点。',
            points: ['左正右负为极大，左负右正为极小', 'f″>0 极小，f″<0 极大'],
            patterns: ['极值', '极值点个数'], demo: 'x^3 - 3*x'
        },
        E3: {
            title: '闭区间最值',
            stage: '高中 · 选择性必修第二册', book: '5.3.2', prereq: ['E2'],
            summary: '闭区间最值只在驻点与端点中产生。',
            points: ['把所有候选点代入比较', '不要漏掉端点'],
            patterns: ['闭区间最值', '恒成立最值'], demo: 'x^3 - 3*x'
        },
        E4: {
            title: '切线与法线',
            stage: '高中 · 选择性必修第二册', book: '5.3', prereq: ['D3'],
            summary: '切线斜率是导数值；法线斜率是负倒数。',
            points: ['法线斜率 −1/f′(x0)', '公切线要设两个切点'],
            patterns: ['切线与法线', '公切线'], demo: 'x^3 - 3*x'
        },
        E5: {
            title: '恒成立',
            stage: '高中 · 选择性必修第二册', book: '5.3 拓展', prereq: ['E3'],
            summary: '∀x∈D, f(x)≥m ⇔ min f≥m；端点效应可先缩范围再证。',
            points: ['先分离参数或直接求最值', '端点值为 0 时可用端点效应探路'],
            patterns: ['单参数恒成立', '端点效应'], demo: 'x^2 - 2*a*x + 1'
        },
        E6: {
            title: '存在性',
            stage: '高中 · 选择性必修第二册', book: '5.3 拓展', prereq: ['E3'],
            summary: '∃x∈D, f(x)≥m ⇔ max f≥m；注意量词顺序。',
            points: ['「任意」对应最小值，「存在」对应最大值', '任意+存在混合要分别处理'],
            patterns: ['存在性'], demo: 'x^2 - 2*a*x + 1'
        },
        E7: {
            title: '零点个数与隐零点',
            stage: '高中 · 选择性必修第二册', book: '5.3 拓展', prereq: ['E2', 'B5'],
            summary: '零点个数问题优先分离参数，转化为水平线与曲线交点。',
            points: ['分离后必须检查 g(x) 的单调性与渐近行为', '隐零点设而不求，用 f′(x0)=0 代换'],
            patterns: ['零点个数', '隐零点'], demo: 'ln(x) - a*x'
        },
        E8: {
            title: '不等式证明',
            stage: '高中 · 选择性必修第二册', book: '《导数的秘密》第 2 章', prereq: ['E1', 'E3'],
            summary: '移项构造函数，证明 h_min≥0；或用切线/割线放缩。',
            points: ['常用 e^x≥x+1、ln x≤x−1', '放缩后要检查取等条件'],
            patterns: ['不等式证明'], demo: 'exp(x) - 1 - x'
        },
        E9: {
            title: '极值点偏移',
            stage: '高中 · 选择性必修第二册', book: '《导数的秘密》第 5 章', prereq: ['E2', 'E8'],
            summary: '已知 f(x1)=f(x2)，比较 x1+x2 与 2x0；对称构造是通法。',
            points: ['构造 F(x)=f(x)−f(2x0−x)', '判断 F 的单调性与符号'],
            patterns: ['极值点偏移'], demo: 'x*exp(-x)'
        },
        E10: {
            title: '双变量与主元',
            stage: '高中 · 选择性必修第二册', book: '《导数的秘密》5.4/8.5', prereq: ['E8', 'E9'],
            summary: '双变量问题固定一个、或齐次化、或换元成一个变量。',
            points: ['先判断能否消元', '不能消元时把其中一个当主元'],
            patterns: ['双变量'], demo: 'ln(x)/x'
        },
        E11: {
            title: '参数讨论与整数解',
            stage: '高中 · 选择性必修第二册', book: '《导数的秘密》第 3 章', prereq: ['E5'],
            summary: '先必要条件缩小范围，再验证充分性；整数解要单独检验端点。',
            points: ['分类标准要一次说清', '整数问题常借助单调性与夹逼'],
            patterns: ['参数讨论/整数解'], demo: 'a*x^2 - x + 1'
        },
        E12: {
            title: '优化、比较与估值',
            stage: '高中 · 选择性必修第二册', book: '5.3 / 《导数的秘密》第 7 章', prereq: ['E3', 'E8'],
            summary: '实际问题建模求最值；比较大小用构造函数；估值用双侧逼近。',
            points: ['建模后写清定义域', '估值用切线给下界、割线给上界'],
            patterns: ['实际优化/估值'], demo: 'x/exp(x)'
        },

        F1: {
            title: '极限与连续',
            stage: '大学 · 高数上', book: '同济 1.2–1.3', prereq: ['A2'],
            summary: '极限描述趋近过程；连续要求极限值等于函数值。',
            points: ['先判型再选法', '等价无穷小替换只能在乘除中使用'],
            patterns: ['极限计算', '等价无穷小'], demo: 'sin(x)/x'
        },
        F2: {
            title: '间断点',
            stage: '大学 · 高数上', book: '同济 1.8', prereq: ['F1'],
            summary: '间断点分第一类（可去、跳跃）与第二类（无穷、振荡）。',
            points: ['左右极限都存在是第一类', '至少一侧不存在是第二类'],
            patterns: ['间断点分类'], demo: '1/x'
        },
        F3: {
            title: '中值定理',
            stage: '大学 · 高数上', book: '同济 3.1', prereq: ['F1', 'D2'],
            summary: '罗尔、拉格朗日、柯西中值定理；核心是构造辅助函数。',
            points: ['先验证闭连开导', '把结论改写成 f′(ξ)=... 再构造'],
            patterns: ['中值定理'], demo: 'x^2'
        },
        F4: {
            title: '泰勒公式',
            stage: '大学 · 高数上', book: '同济 3.3', prereq: ['D7'],
            summary: '用多项式逼近函数，余项刻画误差。',
            points: ['记住常见展开式与收敛域', '高中解答题不能直接引用'],
            patterns: ['泰勒展开'], demo: 'exp(x)'
        },
        F5: {
            title: '不定积分',
            stage: '大学 · 高数上', book: '同济 4.1–4.4', prereq: ['D4'],
            summary: '求原函数；换元与分部是两大通法。',
            points: ['换元后记得回代', '分部积分口诀「反对幂指三」'],
            patterns: ['不定积分'], demo: 'x*exp(x)'
        },
        F6: {
            title: '定积分与几何应用',
            stage: '大学 · 高数上', book: '同济 5–6 章', prereq: ['F5'],
            summary: '牛顿-莱布尼茨公式；面积取 |f|，旋转体用圆盘/壳法。',
            points: ['面积要按零点分段', '变上限积分求导是链式法则'],
            patterns: ['定积分与面积'], demo: 'sin(x)'
        },
        F7: {
            title: '反常积分',
            stage: '大学 · 高数上', book: '同济 5.4', prereq: ['F6'],
            summary: '无穷限或瑕点积分；先判收敛再计算。',
            points: ['比较判别法看阶数', 'p 积分是基准'],
            patterns: ['反常积分'], demo: '1/x^2'
        },

        G1: {
            title: '圆锥曲线定义与轨迹',
            stage: '高中 · 选择性必修第一册', book: '3.1–3.3', prereq: ['A2', 'B5'],
            summary: '椭圆到两焦点距离和为 2a；双曲线距离差绝对值为 2a；抛物线到焦点与准线等距。',
            points: ['先判断是否满足第一定义', '轨迹题要检验纯粹性与完备性'],
            patterns: ['定义与轨迹', '定义求最值'], demo: 'x^2/4 + y^2/9 = 1'
        },
        G2: {
            title: '标准方程',
            stage: '高中 · 选择性必修第一册', book: '3.1.1 / 3.2.1 / 3.3.1', prereq: ['G1'],
            summary: '先定焦点在哪条轴，再设标准式，用条件待定系数。',
            points: ['焦点在 x 轴与 y 轴方程不同', '抛物线要分清开口方向'],
            patterns: ['求标准方程', '焦点位置'], demo: 'x^2/4 - y^2/9 = 1'
        },
        G3: {
            title: '椭圆几何性质',
            stage: '高中 · 选择性必修第一册', book: '3.1.2', prereq: ['G2'],
            summary: 'a²=b²+c²，e=c/a∈(0,1)，范围 |x|≤a、|y|≤b。',
            points: ['长轴 2a、短轴 2b、焦距 2c', '离心率越大越扁'],
            patterns: ['椭圆性质'], demo: 'x^2/16 + y^2/9 = 1'
        },
        G4: {
            title: '双曲线几何性质',
            stage: '高中 · 选择性必修第一册', book: '3.2.2', prereq: ['G2'],
            summary: 'c²=a²+b²，e>1，渐近线 y=±(b/a)x。',
            points: ['实轴 2a、虚轴 2b', '焦点在实轴所在直线上'],
            patterns: ['双曲线性质'], demo: 'x^2/9 - y^2/16 = 1'
        },
        G5: {
            title: '抛物线几何性质',
            stage: '高中 · 选择性必修第一册', book: '3.3.2', prereq: ['G2'],
            summary: 'y²=2px 的焦点 (p/2,0)，准线 x=−p/2，焦半径 x0+p/2。',
            points: ['p 的几何意义是焦点到准线距离', '开口方向由一次项符号决定'],
            patterns: ['抛物线性质'], demo: 'y^2 = 4*x'
        },
        G6: {
            title: '离心率',
            stage: '高中 · 选择性必修第一册', book: '3.1–3.3', prereq: ['G3', 'G4'],
            summary: 'e=c/a；求值找 a、c 的齐次关系，求范围用几何约束。',
            points: ['把条件都化成 a、b、c 的方程', '范围题注意三角形两边之和大于第三边'],
            patterns: ['离心率求值', '离心率范围'], demo: 'x^2/16 + y^2/7 = 1'
        },
        G7: {
            title: '焦点三角形',
            stage: '高中 · 选择性必修第一册', book: '3.1–3.2 拓展', prereq: ['G3', 'G4'],
            summary: '椭圆 S=b²tan(θ/2)，双曲线 S=b²cot(θ/2)，θ=∠F₁PF₂。',
            points: ['先用定义写出两边和/差', '再用余弦定理与面积公式'],
            patterns: ['焦点三角形'], demo: 'x^2/25 + y^2/9 = 1'
        },
        G8: {
            title: '直线与圆锥曲线位置关系',
            stage: '高中 · 选择性必修第一册', book: '3.1–3.3 综合', prereq: ['G3', 'G4', 'G5'],
            summary: '联立消元后看判别式：Δ>0 相交、Δ=0 相切、Δ<0 相离。',
            points: ['先考虑斜率不存在的情况', '联立后注意二次项系数是否为 0'],
            patterns: ['位置关系'], demo: 'x^2/4 + y^2/9 = 1'
        },
        G9: {
            title: '弦长与中点弦',
            stage: '高中 · 选择性必修第一册', book: '3.1–3.3 综合', prereq: ['G8'],
            summary: '弦长 √(1+k²)|x1−x2|；中点弦用点差法。',
            points: ['椭圆中点弦 k_AB·k_OM=−b²/a²', '双曲线中点弦 k_AB·k_OM=b²/a²'],
            patterns: ['弦长/中点弦'], demo: 'x^2/16 + y^2/9 = 1'
        },
        G10: {
            title: '切线与切点弦',
            stage: '高中 · 选择性必修第一册', book: '3.1–3.3 拓展', prereq: ['G8'],
            summary: '曲线上一点的切线可用「代一半」公式；切点弦是极线。',
            points: ['椭圆 xx0/a²+yy0/b²=1', '抛物线 yy0=p(x+x0)'],
            patterns: ['切线/切点弦'], demo: 'x^2/4 + y^2/9 = 1'
        },
        G11: {
            title: '定点定值',
            stage: '高中 · 选择性必修第一册', book: '《圆锥曲线的秘密》第 4–5 章', prereq: ['G8', 'G9'],
            summary: '设线联立、韦达定理、消参；目标是证明结果与参数无关。',
            points: ['先猜后证：用特殊位置找定点', '齐次化处理斜率之和/积'],
            patterns: ['定点定值'], demo: 'y^2 = 4*x'
        },
        G12: {
            title: '最值范围与向量综合',
            stage: '高中 · 选择性必修第一册', book: '3.1–3.3 综合', prereq: ['G8', 'G9'],
            summary: '建立目标函数，消元后求值域；向量条件坐标化。',
            points: ['先写清变量范围', '面积最值常转化为点到直线距离'],
            patterns: ['面积最值', '距离最值', '向量综合', '轨迹范围', '焦点弦'], demo: 'x^2/4 + y^2 = 1'
        },

        H1: {
            title: '参数方程',
            stage: '高中拓展 / 大学', book: '选必一 / 同济 2.4', prereq: ['A2'],
            summary: '用参数 t 表示 x、y；消参得普通方程。',
            points: ['椭圆 (a cosθ, b sinθ)', '消参注意参数范围'],
            patterns: ['参数方程化普通'], demo: '3*cos(t)|2*sin(t)'
        },
        H2: {
            title: '极坐标',
            stage: '高中拓展 / 大学', book: '选必一 / 同济', prereq: ['H1'],
            summary: 'x=ρcosθ，y=ρsinθ；ρ 表示到极点距离。',
            points: ['极坐标方程可能多点重合', 'ρ<0 时方向相反'],
            patterns: ['极坐标方程'], demo: '1 - cos(theta)'
        },
        H3: {
            title: '参数与极坐标互化',
            stage: '高中拓展 / 大学', book: '选必一', prereq: ['H1', 'H2'],
            summary: '参数方程、极坐标方程、普通方程三者互化。',
            points: ['互化前后定义域要一致', '平方关系消参要注意符号'],
            patterns: ['参数/极坐标互化'], demo: '2*cos(t)|2*sin(t)'
        }
    };

    const conclusions = [
        { id: 'A-1', node: 'A1', text: '判断两个函数相同，只看定义域与对应关系，与自变量字母无关。', condition: '两个函数都在各自定义域内有意义', examUse: 'highschool', pitfall: '把解析式化简后相同当成同一函数，忽略定义域变化。' },
        { id: 'A-2', node: 'A2', text: '定义域是所有限制条件的交集。', condition: '分母、偶次根、对数、正切等限制同时存在', examUse: 'highschool', pitfall: '只解一个限制就写答案。' },
        { id: 'A-3', node: 'A3', text: '分式函数求值域优先分离常数；根式优先换元。', condition: '函数结构分别为一次分式或含根式', examUse: 'highschool', pitfall: '换元后忘记写新变量范围。' },
        { id: 'A-4', node: 'A6', text: 'y=f(x+a) 是 f(x) 向左平移 a 个单位（a>0）。', condition: 'a>0', examUse: 'highschool', pitfall: '把 f(x+1) 当成右移。' },
        { id: 'A-5', node: 'A5', text: '分段函数求值，先判断自变量落在哪一段。', condition: '分段定义', examUse: 'highschool', pitfall: '在分界点处不检验归属。' },
        { id: 'A-6', node: 'A4', text: '换元求解析式后，必须写清新变量的取值范围。', condition: '令 t=g(x)', examUse: 'highschool', pitfall: '直接把 t 当全体实数。' },
        { id: 'A-7', node: 'A1', text: '函数三要素是定义域、对应关系、值域。', condition: '无', examUse: 'highschool', pitfall: '把值域当成可以独立指定的要素。' },
        { id: 'A-8', node: 'A6', text: 'y=f(|x|) 的图像是保留 y=f(x) 右侧再关于 y 轴对称。', condition: 'f 在所需区间有定义', examUse: 'extension', pitfall: '把左半支直接翻折而不是对称复制。' },

        { id: 'B-1', node: 'B2', text: '奇偶性判断前，先看定义域是否关于原点对称。', condition: '定义域对称', examUse: 'highschool', pitfall: '定义域不对称仍套 f(−x)=±f(x)。' },
        { id: 'B-2', node: 'B4', text: 'f(a+x)=f(a−x) ⇔ 图像关于 x=a 对称。', condition: '等式对定义域内 x 恒成立', examUse: 'highschool', pitfall: '把对称轴写成 x=−a。' },
        { id: 'B-3', node: 'B4', text: 'f(a+x)+f(a−x)=2b ⇔ 图像关于 (a,b) 中心对称。', condition: '恒成立', examUse: 'highschool', pitfall: '把中心纵坐标漏掉。' },
        { id: 'B-4', node: 'B3', text: '两条对称轴 x=a、x=b ⇒ T=2|a−b|。', condition: '两条对称轴都存在', examUse: 'extension', pitfall: '把间距直接当周期。' },
        { id: 'B-5', node: 'B4', text: '一条对称轴与一个对称中心 ⇒ T=4|a−b|。', condition: '轴与中心都存在', examUse: 'extension', pitfall: '与双轴对称混淆。' },
        { id: 'B-6', node: 'B5', text: '零点定理只保证存在，不保证唯一。', condition: '闭区间连续、端点异号', examUse: 'highschool', pitfall: '由存在直接推出唯一。' },
        { id: 'B-7', node: 'B1', text: "f′(x)>0 的区间上函数严格递增。", condition: '区间内可导', examUse: 'highschool', pitfall: '把 f′(x)≥0 当成严格递增的充分条件而不排除恒零。' },
        { id: 'B-8', node: 'B6', text: '拐点是 f″ 变号的点，不是 f″=0 的点。', condition: 'f″ 在该点两侧异号', examUse: 'university', pitfall: '把 x⁴ 在 0 处当成拐点。' },

        { id: 'C-1', node: 'C3', text: 'a^x 恒过 (0,1)，log_a x 恒过 (1,0)。', condition: 'a>0, a≠1', examUse: 'highschool', pitfall: '把底数条件漏掉。' },
        { id: 'C-2', node: 'C4', text: '对数函数定义域由真数大于零决定。', condition: 'log_a g(x)', examUse: 'highschool', pitfall: '只写 g(x)>0 却忘了底数条件。' },
        { id: 'C-3', node: 'C4', text: 'y=a^x 与 y=log_a x 互为反函数，图像关于 y=x 对称。', condition: 'a>0, a≠1', examUse: 'extension', pitfall: '把对称轴写成 y 轴。' },
        { id: 'C-4', node: 'C5', text: '求 y=Asin(ωx+φ) 的单调区间，把 ωx+φ 整体代入。', condition: 'ω≠0', examUse: 'highschool', pitfall: '先解 x 再代回，导致区间错位。' },
        { id: 'C-5', node: 'C6', text: 'T=2π/|ω|，A 是振幅。', condition: 'A≠0, ω≠0', examUse: 'highschool', pitfall: '用 T=2π/ω 忽略 ω 的符号。' },
        { id: 'C-6', node: 'C7', text: 'x>0, a>0 时 x+a/x ≥ 2√a，当且仅当 x=√a 取等。', condition: 'x>0, a>0', examUse: 'highschool', pitfall: '在 x<0 时直接套用。' },
        { id: 'C-7', node: 'C2', text: '幂函数 y=x^α 恒过 (1,1)；α>0 时还过 (0,0)。', condition: 'α 为实数', examUse: 'highschool', pitfall: '忽略 α<0 时的两支。' },
        { id: 'C-8', node: 'C8', text: '复合函数单调性遵循「同增异减」。', condition: '内外层在相应区间单调', examUse: 'highschool', pitfall: '不先求定义域就讨论单调。' },

        { id: 'D-1', node: 'D3', text: '曲线在 x0 处的切线：y−f(x0)=f′(x0)(x−x0)。', condition: 'f 在 x0 可导', examUse: 'highschool', pitfall: '把「过点」当成「在点」。' },
        { id: 'D-2', node: 'D3', text: '过点 P 的切线必须设切点 t，解 b−f(t)=f′(t)(a−t)。', condition: 'P=(a,b)', examUse: 'highschool', pitfall: '直接把 P 的横坐标当切点，漏解。' },
        { id: 'D-3', node: 'D2', text: '可导 ⇒ 连续，连续 ⇏ 可导。', condition: '一元函数', examUse: 'highschool', pitfall: '由连续反推可导。' },
        { id: 'D-4', node: 'D4', text: '(x^n)′=n x^(n−1)，(e^x)′=e^x，(ln x)′=1/x。', condition: '在定义域内', examUse: 'highschool', pitfall: '把 (ln x)′ 写成 1/(x ln 10)。' },
        { id: 'D-5', node: 'D5', text: '商法则 (u/v)′=(u′v−uv′)/v²。', condition: 'v≠0', examUse: 'highschool', pitfall: '分子顺序写反。' },
        { id: 'D-6', node: 'D6', text: '复合函数求导：外层导数 × 内层导数。', condition: '各层可导', examUse: 'highschool', pitfall: '漏乘内层导数。' },

        { id: 'E-1', node: 'E1', text: '先求定义域，再解 f′(x)>0 / f′(x)<0。', condition: 'f 可导', examUse: 'highschool', pitfall: '在定义域外讨论单调性。' },
        { id: 'E-2', node: 'E2', text: '极值点必须满足 f′=0 且左右变号。', condition: 'f 在该点邻域可导', examUse: 'highschool', pitfall: '把 f′=0 的点都当极值点。' },
        { id: 'E-3', node: 'E3', text: '闭区间最值只需比较驻点与端点。', condition: 'f 在闭区间连续', examUse: 'highschool', pitfall: '漏掉端点。' },
        { id: 'E-4', node: 'E5', text: '∀x∈D, f(x)≥m ⇔ min f≥m。', condition: '最小值存在', examUse: 'highschool', pitfall: '把「任意」对应成最大值。' },
        { id: 'E-5', node: 'E6', text: '∃x∈D, f(x)≥m ⇔ max f≥m。', condition: '最大值存在', examUse: 'highschool', pitfall: '与恒成立混用。' },
        { id: 'E-6', node: 'E5', text: '量词与最值类型必须一一对应：任意—最小，存在—最大。', condition: '同一区间', examUse: 'highschool', pitfall: '任意+存在混合时不拆开。' },
        { id: 'E-7', node: 'E7', text: '零点个数可分离参数：y=a 与 y=g(x) 的交点个数。', condition: '参数可完全分离', examUse: 'highschool', pitfall: '分离后忽略 g 的定义域。' },
        { id: 'E-8', node: 'E7', text: '隐零点 x0 满足 f′(x0)=0，可用该式整体代换。', condition: 'f′ 有零点但不可显式解出', examUse: 'highschool', pitfall: '忘记说明零点存在区间。' },
        { id: 'E-9', node: 'E8', text: 'e^x≥x+1，当且仅当 x=0 取等。', condition: 'x∈R', examUse: 'highschool', pitfall: '在 x<0 时反向使用。' },
        { id: 'E-10', node: 'E8', text: 'ln x≤x−1（x>0），当且仅当 x=1 取等。', condition: 'x>0', examUse: 'highschool', pitfall: '把 ln x≤x 当成更紧的界。' },
        { id: 'E-11', node: 'E9', text: '极值点偏移比较 x1+x2 与 2x0，用对称构造 F(x)=f(x)−f(2x0−x)。', condition: 'f(x1)=f(x2)，x0 为极值点', examUse: 'highschool', pitfall: '不判断 F 的单调性就直接比较。' },
        { id: 'E-12', node: 'E12', text: '三次函数 f=ax³+bx²+cx+d 关于 x=−b/(3a) 中心对称。', condition: 'a≠0', examUse: 'extension', pitfall: '把对称中心横坐标写成 −b/(2a)。' },

        { id: 'F-1', node: 'F1', text: '等价无穷小替换只能在乘除中使用。', condition: 'x→0 时的乘除结构', examUse: 'university', pitfall: '在加减法中直接替换。' },
        { id: 'F-2', node: 'F2', text: '左右极限都存在是第一类间断点。', condition: '至少一侧极限不存在为第二类', examUse: 'university', pitfall: '把无穷间断点归为第一类。' },
        { id: 'F-3', node: 'F3', text: '拉格朗日中值定理：闭连开导 ⇒ 存在 ξ 使 f′(ξ)=(f(b)−f(a))/(b−a)。', condition: 'f 在 [a,b] 连续、(a,b) 可导', examUse: 'university', pitfall: '漏验连续或可导条件。' },
        { id: 'F-4', node: 'F4', text: 'e^x=1+x+x²/2!+…+xⁿ/n!+o(xⁿ)。', condition: 'x→0', examUse: 'university', pitfall: '高中解答题直接引用泰勒展开。' },
        { id: 'F-5', node: 'F6', text: '定积分面积要按零点分段取绝对值。', condition: 'f 在区间内变号', examUse: 'university', pitfall: '直接积分得到代数和而不是面积。' },

        { id: 'G-1', node: 'G1', text: '椭圆：|PF₁|+|PF₂|=2a，且 2a>|F₁F₂|。', condition: 'P 在椭圆上', examUse: 'highschool', pitfall: '把 2a=|F₁F₂| 当成椭圆（退化线段）。' },
        { id: 'G-2', node: 'G1', text: '双曲线：||PF₁|−|PF₂||=2a，且 2a<|F₁F₂|。', condition: 'P 在双曲线上', examUse: 'highschool', pitfall: '漏掉绝对值，只得到一个分支。' },
        { id: 'G-3', node: 'G1', text: '抛物线：|PF|=d(P,准线)。', condition: 'F 为焦点', examUse: 'highschool', pitfall: '把焦点到准线距离当成 p。' },
        { id: 'G-4', node: 'G3', text: '椭圆 a²=b²+c²，e=c/a∈(0,1)。', condition: 'a>b>0', examUse: 'highschool', pitfall: '把 a²=b²+c² 记成 c²=a²+b²。' },
        { id: 'G-5', node: 'G4', text: '双曲线 c²=a²+b²，e=c/a>1，渐近线 y=±(b/a)x。', condition: '焦点在 x 轴', examUse: 'highschool', pitfall: '把渐近线斜率写成 a/b。' },
        { id: 'G-6', node: 'G5', text: 'y²=2px 的焦点 (p/2,0)，准线 x=−p/2。', condition: 'p>0', examUse: 'highschool', pitfall: '把焦点写成 (p,0)。' },
        { id: 'G-7', node: 'G7', text: '椭圆焦点三角形面积 S=b²tan(θ/2)。', condition: 'θ=∠F₁PF₂', examUse: 'extension', pitfall: '把 θ 当成离心率角。' },
        { id: 'G-8', node: 'G7', text: '双曲线焦点三角形面积 S=b²cot(θ/2)。', condition: 'θ=∠F₁PF₂', examUse: 'extension', pitfall: '与椭圆公式混用。' },
        { id: 'G-9', node: 'G9', text: '中点弦：椭圆 k_AB·k_OM=−b²/a²=e²−1；双曲线为 b²/a²=e²−1。', condition: '弦 AB 存在，M 为中点，O 为中心', examUse: 'extension', pitfall: '弦过中心时点差法失效。' },
        { id: 'G-10', node: 'G10', text: '椭圆切线：xx₀/a²+yy₀/b²=1。', condition: '(x₀,y₀) 在椭圆上', examUse: 'extension', pitfall: '把切点弦方程当成切线方程。' },
        { id: 'G-11', node: 'G12', text: '抛物线两条切线交于准线上 ⇔ 两切线垂直且切点弦过焦点。', condition: '抛物线', examUse: 'extension', pitfall: '把「交点在准线上」与「交点在对称轴上」混淆。' },

        { id: 'H-1', node: 'H1', text: '椭圆参数方程 (a cosθ, b sinθ)，θ 为参数。', condition: '中心在原点、焦点在 x 轴', examUse: 'highschool', pitfall: '把 θ 当成倾斜角。' },
        { id: 'H-2', node: 'H2', text: '极坐标与直角坐标：x=ρcosθ，y=ρsinθ。', condition: '极点与原点重合、极轴与 x 轴正半轴重合', examUse: 'extension', pitfall: '忽略 ρ<0 的情形。' }
    ];

    const data = { modules, nodes, conclusions };
    if (typeof module === 'object' && module.exports) module.exports = data;
    else root.MathCurriculum = data;
}(typeof self !== 'undefined' ? self : this));
