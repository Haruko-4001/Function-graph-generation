/**
 * node-examples.js
 * ============================================================
 * 知识节点例题引擎：每个节点 3 道典型题，答案由现有数值内核实时计算。
 *
 * 设计取舍：
 *  - 不用固定题库，避免 62 个节点 × 3 道题带来的重复与维护成本
 *  - 题目以节点的 demo 为载体，覆盖零点、单调、极值、切线、积分、极限、圆锥性质
 *  - 每题带方法提示与易错点，答案可在实验室复核
 *  - 自测使用同一批题，要求输入数值，难度与例题一致
 * ============================================================
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./math-core.js'), require('./conic.js'), require('./calculus.js'));
    } else {
        root.MathNodeExamples = factory(root.MathCore, root.MathConic, root.MathCalculus);
    }
}(typeof self !== 'undefined' ? self : this, function (MathCore, MathConic, MathCalculus) {
    'use strict';

    const XMIN = -10, XMAX = 10;

    function sanitize(expr, vars) {
        let s = MathCore.normalizeExpression(String(expr || ''), { stripPrefix: true });
        if (s.indexOf('|') >= 0) return s;
        let names = [];
        try { names = MathCore.freeSymbols(s, vars || ['x']); } catch (e) { names = []; }
        names.forEach(function (name) {
            if (name === 'x' || name === 'y' || name === 't' || name === 'theta' || name === 'e' || name === 'pi') return;
            try { s = MathCore.substituteVariable(s, name, 1); } catch (err) { /* ignore */ }
        });
        return s;
    }

    function num(v, digits) {
        if (!Number.isFinite(v)) return '—';
        return Number(v.toFixed(digits === undefined ? 4 : digits)).toString();
    }

    function genericPitfall(node) {
        return node && node.pitfalls && node.pitfalls[0]
            ? node.pitfalls[0]
            : '忽略定义域或区间端点，是这类题最常见的失分点。';
    }

    const METHODS = {
        zeros: '先确定定义域，再在区间内找变号点与切触点；按图像交点计数。',
        monotonic: '求导，解 f′>0 与 f′<0，按临界点把定义域分成若干单调区间。',
        extrema: '求 f′=0 的点，再验左右是否变号；极大与极小分别计数。',
        derivative: '先求导，再把 x=1 代入；注意先看 x=1 是否在定义域内。',
        tangent: '切线斜率等于 f′(1)；先确认 f 在 x=1 可导。',
        integral: '用牛顿-莱布尼茨或自适应 Simpson；先确认被积函数在 [1,2] 上连续。',
        limit: '先判型，再用代入、因式分解或等价无穷小；不要一上来就洛必达。',
        conicE: '标准化后读出 a、b、c，再用 e=c/a；先判断焦点在哪条轴。',
        conicFocal: '焦距是 2c；椭圆用 c²=a²−b²，双曲线用 c²=a²+b²。',
        conicChord: '联立直线与曲线，求两个交点，再用两点间距离公式。'
    };

    function makeTask(node, kind, index) {
        const expr = sanitize(node.exampleDemo || node.demo, ['x']);
        const base = { nodeId: node.id, kind: kind, index: index, expr: expr };
        let value, prompt, answerText;

        try {
            if (kind === 'zeros') {
                const f = MathCore.makeFunction(expr, ['x']);
                value = MathCore.findZeros(f, XMIN, XMAX, { samples: 1200 }).length;
                prompt = '设 f(x)=' + expr + '。求 f(x) 在 [' + XMIN + ',' + XMAX + '] 上的零点个数。';
                answerText = value + ' 个';
            } else if (kind === 'monotonic') {
                const r = MathCore.analyzeFunction(expr, { xMin: XMIN, xMax: XMAX });
                value = r.monotonic.length;
                prompt = '设 f(x)=' + expr + '。求 f(x) 在 [' + XMIN + ',' + XMAX + '] 上的单调区间个数。';
                answerText = value + ' 个';
            } else if (kind === 'extrema') {
                const r = MathCore.analyzeFunction(expr, { xMin: XMIN, xMax: XMAX });
                value = r.extrema.maxima.length + r.extrema.minima.length;
                prompt = '设 f(x)=' + expr + '。求 f(x) 在 [' + XMIN + ',' + XMAX + '] 上的极值点个数。';
                answerText = value + ' 个';
            } else if (kind === 'derivative') {
                const f = MathCore.makeFunction(expr, ['x']);
                value = MathCore.numericDerivative(f, 1);
                prompt = '设 f(x)=' + expr + '。求 f′(1)。';
                answerText = num(value);
            } else if (kind === 'tangent') {
                const f = MathCore.makeFunction(expr, ['x']);
                value = MathCore.numericDerivative(f, 1);
                prompt = '设 f(x)=' + expr + '。求曲线在 x=1 处的切线斜率。';
                answerText = num(value);
            } else if (kind === 'integral') {
                const f = MathCore.makeFunction(expr, ['x']);
                value = MathCore.adaptiveSimpson(f, 1, 2, 1e-8, 20).value;
                prompt = '计算 ∫₁² ' + expr + ' dx（保留 4 位小数）。';
                answerText = num(value);
            } else if (kind === 'limit') {
                const f = MathCore.makeFunction(expr, ['x']);
                const r = MathCore.numericLimit(f, 1);
                value = r.value;
                prompt = '求 lim(x→1) ' + expr + '（保留 4 位小数）。';
                answerText = num(value);
            } else if (kind === 'conicE') {
                const info = MathConic.analyze(expr);
                value = info.e;
                prompt = '曲线 ' + expr + ' 的离心率是多少？（保留 4 位小数）';
                answerText = num(value);
            } else if (kind === 'conicFocal') {
                const info = MathConic.analyze(expr);
                value = info.c === null || info.c === undefined ? 0 : 2 * info.c;
                prompt = '曲线 ' + expr + ' 的焦距是多少？（保留 4 位小数）';
                answerText = num(value);
            } else if (kind === 'conicChord') {
                let r = null;
                [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 1]].some(function (km) {
                    const t = MathConic.chord(expr, km[0], km[1]);
                    if (t.points.length === 2) { r = t; return true; }
                    return false;
                });
                value = r ? r.length : 0;
                prompt = '用一条与曲线相交于两点的直线截 ' + expr + '，求其中一条弦长（保留 4 位小数）。';
                answerText = r ? num(value) + '（示例取 y=' + (r.axis === 'vertical' ? 'c' : 'kx+m') + ' 的一条弦）' : '—';
            }
        } catch (e) {
            value = NaN;
            prompt = '以 f(x)=' + expr + ' 为例，完成与「' + node.title + '」相关的计算。';
            answerText = '请在实验室核对';
        }

        prompt = String(prompt).replace(/\blog\(/g, 'ln(');
        return Object.assign(base, {
            prompt: prompt,
            method: METHODS[kind] || '先明确研究对象，再选择定义、导数或图像。',
            pitfall: genericPitfall(node),
            value: value,
            answerText: answerText,
            id: node.id + '-' + kind
        });
    }

    function tasksFor(node) {
        if (!node) return [];
        const module = node.id.charAt(0);
        if (module === 'G') return ['conicE', 'conicFocal', 'conicChord'].map((k, i) => makeTask(node, k, i));
        if (module === 'F') return ['integral', 'limit', 'derivative'].map((k, i) => makeTask(node, k, i));
        if (module === 'D') return ['derivative', 'tangent', 'zeros'].map((k, i) => makeTask(node, k, i));
        if (module === 'E') return ['extrema', 'zeros', 'tangent'].map((k, i) => makeTask(node, k, i));
        return ['zeros', 'monotonic', 'extrema'].map((k, i) => makeTask(node, k, i));
    }

    /** 自测：从节点例题中随机抽题，要求输入数值 */
    function quizPool(nodes) {
        const pool = [];
        Object.keys(nodes).forEach(function (id) {
            tasksFor(Object.assign({ id: id }, nodes[id])).forEach(function (t) {
                if (Number.isFinite(t.value)) pool.push(t);
            });
        });
        return pool;
    }

    function check(task, input) {
        if (!task || !Number.isFinite(task.value)) return false;
        const v = Number(input);
        if (!Number.isFinite(v)) return false;
        return Math.abs(v - task.value) <= 1e-3 * Math.max(1, Math.abs(task.value));
    }

    return { tasksFor, quizPool, check, METHODS };
}));
