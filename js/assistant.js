/**
 * assistant.js
 * ============================================================
 * 智能数学助手：理解中文自然语言提问，调用 MathCore 完成求解，
 * 并给出带步骤的解答说明。
 *
 * 支持意图：
 *  - 绘制函数（"y = x^2 - 4"、"画 sin(x)"）
 *  - 求导（"求导"、"二阶导数"）
 *  - 定积分（"积分从 0 到 3.14"、"∫[0, pi]"）
 *  - 求根 / 零点 / 解方程
 *  - 极限（"x 趋近于 0 的极限"、"x->无穷 的极限"）
 *  - 泰勒展开（"在 x=0 处展开 4 阶泰勒"）
 *  - 交点（当前输入两个函数时）
 *  - 性质查询：零点/极值/单调性/凹凸/拐点/渐近线/周期/奇偶/值域/定义域
 * ============================================================
 */
(function (root) {
    'use strict';

    const MathCore = root.MathCore;

    /** 把数字格式化为易读文本 */
    function n(v, digits) {
        if (v === null || v === undefined) return '—';
        if (!Number.isFinite(v)) return String(v);
        return MathCore.fmt(v, digits === undefined ? 6 : digits);
    }

    /** 从文本中提取第一个数字（支持负数、小数、pi、e 的简单形式） */
    function parseNumber(text) {
        const m = text.match(/-?\d+(\.\d+)?/);
        return m ? parseFloat(m[0]) : null;
    }

    class MathAssistant {
        /**
         * @param {object} ctx 运行上下文
         * ctx.getExpression()      当前表达式（字符串或数组）
         * ctx.getRange()           { xMin, xMax, yMin, yMax }
         * ctx.getMode()            当前模式
         * ctx.setExpression(expr)  设置表达式并触发重绘
         * ctx.getReport()          最近一次分析报告（可能为 null）
         * ctx.refreshReport()      重新生成分析报告
         * ctx.say(text, role)      输出消息（role: 'user' | 'bot'）
         */
        constructor(ctx) {
            this.ctx = ctx;
        }

        /** 主入口：处理一条用户消息 */
        handle(text) {
            const t = (text || '').trim();
            if (!t) return;
            this.ctx.say(t, 'user');

            try {
                const answer = this._route(t);
                this.ctx.say(answer, 'bot');
            } catch (e) {
                this.ctx.say('处理时出错：' + (e && e.message ? e.message : e), 'bot');
            }
        }

        _route(t) {
            const s = t.replace(/\s+/g, '');

            // 1) 明确意图优先
            if (/二阶导|二阶微分/.test(s)) return this.answerDerivative(2);
            if (/导数|求导|微分/.test(s)) return this.answerDerivative(1);
            if (/不定积分|原函数/.test(s)) return this.answerIndefiniteIntegral();
            if (/定积分|积分|∫|面积/.test(s)) return this.answerIntegral(t);
            if (/泰勒|级数展开|幂级数|展开/.test(s)) return this.answerTaylor(t);
            if (/极限|趋近|趋于|->/.test(s)) return this.answerLimit(t);
            if (/交点|相交/.test(s)) return this.answerIntersection();
            if (/零点|求根|解方程|根是多少|等于0|等于零/.test(s)) return this.answerRoots();
            if (/极值|最值|最大值|最小值/.test(s)) return this.answerFromReport('extrema');
            if (/单调/.test(s)) return this.answerFromReport('monotonic');
            if (/凹凸|拐点|凸性/.test(s)) return this.answerFromReport('concavity');
            if (/渐近线/.test(s)) return this.answerFromReport('asymptotes');
            if (/周期/.test(s)) return this.answerFromReport('period');
            if (/奇偶/.test(s)) return this.answerFromReport('parity');
            if (/值域/.test(s)) return this.answerFromReport('range');
            if (/定义域/.test(s)) return this.answerFromReport('domain');

            // 2) 绘图 / 直接输入表达式
            const expr = this._extractExpression(t);
            if (expr) return this.answerPlot(expr);

            // 3) 帮助
            return this.helpText();
        }

        /* ---------------- 工具 ---------------- */

        _currentExpr() {
            let e = this.ctx.getExpression();
            if (Array.isArray(e)) e = e[0];
            e = MathCore.normalizeExpression(e || '');
            if (!e) throw new Error('请先在左侧输入一个函数表达式');
            return e;
        }

        _extractExpression(t) {
            let s = t.replace(/\s+/g, '');
            // 常见中文前缀
            s = s.replace(/^(请|帮我|帮忙)?(画|绘制|画出|作出|作|plot)/, '');
            const normalized = MathCore.normalizeExpression(s);
            if (!normalized) return '';
            if (/^[\d.]+$/.test(normalized)) return '';
            if (!/[a-zA-Z]/.test(normalized)) return '';
            // 校验可编译
            try {
                MathCore.compile(normalized);
                return normalized;
            } catch (e) {
                return '';
            }
        }

        /* ---------------- 各意图实现 ---------------- */

        answerPlot(expr) {
            this.ctx.setExpression(expr);
            return [
                '已为你绘制 y = ' + expr + '。',
                '提示：左侧「性质分析」面板已同步更新，可继续问我「零点」「导数」「积分从 a 到 b」「极限」「泰勒展开」等。'
            ].join('\n');
        }

        answerDerivative(order) {
            const expr = this._currentExpr();
            const d = MathCore.symbolicDerivative(expr, 'x', order);
            if (d === null) return '对该表达式进行符号求导失败，可尝试化简后再试。';

            const steps = ['【求导】f(x) = ' + expr];
            if (order === 1) {
                steps.push('步骤 1：对 f(x) 关于 x 应用求导法则（和差、积、商、链式法则）');
                steps.push('结果：f\'(x) = ' + d);
            } else {
                const d1 = MathCore.symbolicDerivative(expr, 'x', 1);
                steps.push('步骤 1：先求一阶导 f\'(x) = ' + (d1 || '（无法化简）'));
                steps.push('步骤 2：再对一阶导求导');
                steps.push('结果：f\'\'(x) = ' + d);
            }
            // 数值验证
            const f = MathCore.makeFunction(expr, ['x']);
            const dnum = MathCore.numericDerivative(f, 1);
            steps.push('数值验证：在 x = 1 处数值导数 ≈ ' + n(dnum, 6) + '（与符号结果一致则正确）');
            return steps.join('\n');
        }

        answerIndefiniteIntegral() {
            return [
                '当前版本专注于数值计算，暂不支持符号不定积分（求原函数）。',
                '替代方案：告诉我积分上下限，例如「积分从 0 到 2」，我会用自适应 Simpson 法给出高精度数值结果与误差估计。'
            ].join('\n');
        }

        answerIntegral(t) {
            const expr = this._currentExpr();
            const range = this.ctx.getRange();
            let a = null, b = null;

            // 匹配 "从 a 到 b" / "[a,b]" / "a到b"
            let m = t.match(/从\s*(-?\d+\.?\d*(?:pi|e)?)\s*到\s*(-?\d+\.?\d*(?:pi|e)?)/);
            if (!m) m = t.match(/\[(-?\d+\.?\d*)\s*[,，]\s*(-?\d+\.?\d*)\]/);
            if (!m) m = t.match(/(-?\d+\.?\d*)\s*到\s*(-?\d+\.?\d*)/);
            if (m) {
                a = this._parseConst(m[1]);
                b = this._parseConst(m[2]);
            } else {
                a = range.xMin; b = range.xMax;
            }
            if (a === null || b === null) {
                return '未能识别积分上下限，请写成「积分从 a 到 b」的形式（a、b 可为数字或 pi）。';
            }

            const res = MathCore.adaptiveSimpson(expr, a, b, 1e-9, 22);
            const steps = [
                '【定积分】∫[' + n(a) + ', ' + n(b) + '] (' + expr + ') dx',
                '步骤 1：采用自适应 Simpson 复合求积，自动在变化剧烈区域加密剖分',
                '步骤 2：通过 Richardson 外推估计误差，迭代至误差 < 1e-9'
            ];
            if (res.converged || Number.isFinite(res.value)) {
                steps.push('结果：≈ ' + n(res.value, 10));
                steps.push('误差估计：≤ ' + MathCore.fmt(res.error, 3) + '（共求值 ' + res.evaluations + ' 次）');
                if (res.note) steps.push('注意：' + res.note);
            } else {
                steps.push('积分失败：' + (res.note || '被积函数不可积或存在奇点'));
            }
            return steps.join('\n');
        }

        _parseConst(text) {
            if (/pi/i.test(text)) {
                const m = text.match(/(-?\d+\.?\d*)/);
                return (m ? parseFloat(m[1]) : 1) * Math.PI;
            }
            if (/e/i.test(text) && !/\d/.test(text.replace(/e/i, ''))) return Math.E;
            const v = parseFloat(text);
            return Number.isFinite(v) ? v : null;
        }

        answerRoots() {
            const expr = this._currentExpr();
            const range = this.ctx.getRange();
            const f = MathCore.makeFunction(expr, ['x']);
            const roots = MathCore.findZeros(f, range.xMin, range.xMax);

            const steps = [
                '【求根】解方程 ' + expr + ' = 0，区间 [' + n(range.xMin) + ', ' + n(range.xMax) + ']',
                '步骤 1：将区间均匀剖分为 1000 段，扫描函数值变号区间',
                '步骤 2：对每个变号区间使用 Brent 方法（割线/反二次插值 + 二分兜底）精确化',
                '步骤 3：对不变号的切触零点，通过 |f(x)| 的局部极小检测'
            ];
            if (roots.length) {
                steps.push('共找到 ' + roots.length + ' 个根：');
                roots.forEach((r, i) => steps.push('  x' + (i + 1) + ' ≈ ' + n(r, 10) + '，验证 f(x) = ' + n(f(r), 3)));
            } else {
                steps.push('该区间内未发现实根。可尝试扩大 x 范围后重试。');
            }
            return steps.join('\n');
        }

        answerLimit(t) {
            const expr = this._currentExpr();
            let point = 0;
            let pointText = '0';
            if (/无穷|∞|Infinity/i.test(t)) {
                point = /负|-/.test(t.split(/无穷|∞|Infinity/i)[0].slice(-3)) || /-\s*∞|负无穷/.test(t) ? -Infinity : Infinity;
                pointText = point === Infinity ? '+∞' : '-∞';
            } else {
                const m = t.match(/(?:趋近[于向]?|趋于|->|→)\s*(-?\d+\.?\d*)/);
                if (m) { point = parseFloat(m[1]); pointText = m[1]; }
            }

            const res = MathCore.numericLimit(expr, point);
            const steps = [
                '【极限】lim(x→' + pointText + ') ' + expr,
                '步骤 1：从两侧以 10^-1 … 10^-9 的步距逐步逼近',
                '步骤 2：观察函数值序列的收敛性'
            ];
            if (point === Infinity || point === -Infinity) {
                steps.push(res.converged
                    ? '结果：极限 ≈ ' + n(res.value, 8)
                    : '极限不存在或不收敛（' + (res.note || '') + '）');
            } else {
                steps.push('左极限 ≈ ' + n(res.left, 8) + '，右极限 ≈ ' + n(res.right, 8));
                steps.push(res.converged
                    ? '结果：极限 ≈ ' + n(res.value, 8)
                    : '结论：' + (res.note || '极限不存在'));
            }
            return steps.join('\n');
        }

        answerTaylor(t) {
            const expr = this._currentExpr();
            let a = 0, degree = 4;
            const ma = t.match(/x\s*=\s*(-?\d+\.?\d*)/);
            if (ma) a = parseFloat(ma[1]);
            const md = t.match(/(\d+)\s*阶/);
            if (md) degree = parseInt(md[1], 10);

            const res = MathCore.taylor(expr, a, degree);
            if (res.error) return '泰勒展开失败：' + res.error;

            const steps = [
                '【泰勒展开】f(x) = ' + expr + '，在 x = ' + n(a) + ' 处展开 ' + degree + ' 阶',
                '步骤 1：逐阶计算符号导数 f^(k)(x)',
                '步骤 2：系数 c_k = f^(k)(' + n(a) + ') / k!'
            ];
            steps.push('展开式：P(x) ≈ ' + res.polynomial);
            const err = Math.abs(res.evaluate(a + 0.5) - MathCore.makeFunction(expr, ['x'])(a + 0.5));
            steps.push('精度参考：在 x = ' + n(a + 0.5) + ' 处与原函数误差 ≈ ' + MathCore.fmt(err, 3));
            return steps.join('\n');
        }

        answerIntersection() {
            let exprs = this.ctx.getExpression();
            if (!Array.isArray(exprs) || exprs.length < 2) {
                return '求交点需要在「显函数」模式下用 ; 分隔输入两个函数，例如：x^2 ; 2*x';
            }
            const range = this.ctx.getRange();
            const pts = MathCore.intersections(exprs[0], exprs[1], range.xMin, range.xMax);
            const steps = [
                '【交点】求解 ' + exprs[0] + ' = ' + exprs[1],
                '步骤 1：构造差函数 g(x) = (' + exprs[0] + ') - (' + exprs[1] + ')',
                '步骤 2：求 g(x) = 0 在区间内的全部根'
            ];
            if (pts.length) {
                steps.push('共 ' + pts.length + ' 个交点：');
                pts.forEach((p, i) => steps.push('  (' + n(p.x, 8) + ', ' + n(p.y, 8) + ')'));
            } else {
                steps.push('当前区间内两函数无交点。');
            }
            return steps.join('\n');
        }

        /* ---------------- 性质报告查询 ---------------- */

        answerFromReport(topic) {
            const report = this.ctx.refreshReport();
            if (!report) return '请先在左侧绘制一个显函数 y = f(x)，我才能分析它的性质。';

            switch (topic) {
                case 'extrema': {
                    const lines = ['【极值】' + report.expression];
                    if (report.extrema.maxima.length) {
                        lines.push('极大值点：' + report.extrema.maxima.map((p) => '(' + n(p.x, 6) + ', ' + n(p.y, 6) + ')').join('，'));
                    } else lines.push('极大值：区间内无');
                    if (report.extrema.minima.length) {
                        lines.push('极小值点：' + report.extrema.minima.map((p) => '(' + n(p.x, 6) + ', ' + n(p.y, 6) + ')').join('，'));
                    } else lines.push('极小值：区间内无');
                    lines.push('判定依据：导数零点处左正右负为极大、左负右正为极小。');
                    return lines.join('\n');
                }
                case 'monotonic': {
                    const lines = ['【单调性】' + report.expression];
                    report.monotonic.slice(0, 8).forEach((seg) => {
                        lines.push((seg.dir > 0 ? '↗ 递增' : '↘ 递减') + '：[' + n(seg.from, 4) + ', ' + n(seg.to, 4) + ']');
                    });
                    if (!report.monotonic.length) lines.push('区间内近似为常函数。');
                    return lines.join('\n');
                }
                case 'concavity': {
                    const lines = ['【凹凸性】' + report.expression];
                    report.concavity.slice(0, 8).forEach((seg) => {
                        lines.push((seg.dir > 0 ? '∪ 凹（下凸）' : '∩ 凸（上凸）') + '：[' + n(seg.from, 4) + ', ' + n(seg.to, 4) + ']');
                    });
                    if (report.inflections.length) {
                        lines.push('拐点：' + report.inflections.map((x) => 'x ≈ ' + n(x, 6)).join('，'));
                    } else lines.push('拐点：区间内无');
                    return lines.join('\n');
                }
                case 'asymptotes': {
                    const a = report.asymptotes;
                    const lines = ['【渐近线】' + report.expression];
                    lines.push('垂直：' + (a.vertical.length ? a.vertical.map((x) => 'x ≈ ' + n(x, 6)).join('，') : '无'));
                    lines.push('水平：' + (a.horizontal.length ? a.horizontal.map((h) => 'y ≈ ' + n(h.y, 6) + '（x→' + h.side + '）').join('，') : '无'));
                    lines.push('斜：' + (a.oblique.length ? a.oblique.map((o) => 'y ≈ ' + n(o.m, 6) + 'x + ' + n(o.c, 6) + '（x→' + o.side + '）').join('，') : '无'));
                    return lines.join('\n');
                }
                case 'period': {
                    if (report.constant) return '【周期性】' + report.expression + ' 近似为常函数，任意正数都是其周期。';
                    return '【周期性】' + report.expression + (report.period
                        ? ' 的最小正周期 ≈ ' + n(report.period, 8)
                        : ' 在常见周期候选（π、2π、1~10 等）中未发现周期，可能非周期函数。');
                }
                case 'parity': {
                    const map = { even: '偶函数（图像关于 y 轴对称）', odd: '奇函数（图像关于原点对称）', none: '非奇非偶' };
                    return '【奇偶性】' + report.expression + '：' + map[report.parity];
                }
                case 'range': {
                    if (!report.range) return '当前区间内函数无可求值点。';
                    return '【值域（采样区间内）】[' + n(report.range.min, 8) + ', ' + n(report.range.max, 8) + ']';
                }
                case 'domain': {
                    const lines = ['【定义域】' + report.expression];
                    lines.push('采样区间 [' + n(report.xRange[0]) + ', ' + n(report.xRange[1]) + '] 内可求值比例：' + MathCore.fmt(report.definedRatio * 100, 4) + '%');
                    if (report.domainBreaks.length) {
                        lines.push('疑似未定义点：' + report.domainBreaks.map((x) => 'x ≈ ' + n(x, 6)).join('，'));
                    } else {
                        lines.push('未发现未定义点。');
                    }
                    return lines.join('\n');
                }
            }
            return this.helpText();
        }

        helpText() {
            return [
                '我可以帮你做这些事：',
                '· 绘图：直接发表达式，如「y = x^2 - 4」「画 sin(x)」',
                '· 求导：「导数」「二阶导数」',
                '· 积分：「积分从 0 到 3.14」',
                '· 求根：「零点」「解方程」',
                '· 极限：「x 趋近于 0 的极限」「x->无穷 的极限」',
                '· 泰勒：「在 x=0 处 4 阶泰勒展开」',
                '· 性质：「极值」「单调性」「凹凸」「渐近线」「周期」「奇偶」「值域」「定义域」',
                '· 交点：输入两个函数（用 ; 分隔）后问「交点」'
            ].join('\n');
        }
    }

    root.MathAssistant = MathAssistant;
}(typeof self !== 'undefined' ? self : this));
