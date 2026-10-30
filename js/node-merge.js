/**
 * node-merge.js
 * ============================================================
 * 知识点合并表：把单薄、重复的节点并入主节点。
 * 合并后节点数 62 → 51，链接仍按原 ID 解析，不会失效。
 * ============================================================
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MathNodeMerge = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // 被合并的节点 → 主节点
    const merged = {
        A6: 'A4',   // 图像变换 → 函数表示与解析式
        B7: 'B1',   // 图像与性质综合 → 单调性
        C7: 'A3',   // 对勾函数 → 值域与最值
        C8: 'D6',   // 复合函数 → 复合函数求导
        E6: 'E5',   // 存在性 → 恒成立
        E11: 'E5',  // 参数讨论与整数解 → 恒成立
        F2: 'F1',   // 间断点 → 极限与连续
        F7: 'F6',   // 反常积分 → 定积分与几何应用
        G5: 'G2',   // 抛物线几何性质 → 标准方程
        G7: 'G3',   // 焦点三角形 → 椭圆几何性质
        H3: 'H2'    // 参数与极坐标互化 → 极坐标
    };

    const reason = {
        A6: '图像变换只是三种表示的变形，并入“函数表示与解析式”',
        B7: '由图读性质本质是单调性与奇偶性的综合，并入“单调性”',
        C7: '对勾函数的值域仍靠最值求，并入“值域与最值”',
        C8: '复合函数的核心是定义域与链式法则，并入“复合函数求导”',
        E6: '存在与恒成立互为量词对偶，并入“恒成立”',
        E11: '整数解讨论是参数恒成立的补充，并入“恒成立”',
        F2: '间断点是极限的分类，并入“极限与连续”',
        F7: '反常积分是定积分的极限推广，并入“定积分与几何应用”',
        G5: '抛物线的焦点准线由标准方程直接读出，并入“标准方程”',
        G7: '焦点三角形由定义与几何性质推出，并入“椭圆几何性质”',
        H3: '互化是坐标表示之间的换算，并入“极坐标”'
    };

    function target(id) { return merged[id] || id; }
    function isMerged(id) { return !!merged[id]; }
    function hostOf(id) {
        const out = [];
        Object.keys(merged).forEach((k) => { if (merged[k] === id) out.push(k); });
        return out;
    }

    return { merged, reason, target, isMerged, hostOf };
}));
