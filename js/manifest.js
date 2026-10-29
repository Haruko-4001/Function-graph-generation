/**
 * manifest.js
 * ============================================================
 * 运行清单（对应 Math-To-Manim 的 `runs/<id>/manifest.json`）。
 *
 * 目的：让「这张图是怎么来的」可追溯——输入是什么、用了哪些算法参数、
 * 得到了多少条结论、导出的每个文件指纹是多少。
 *
 * 指纹用 FNV-1a 32 位，只作内容一致性比对，**不是密码学哈希**。
 * ============================================================
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MathManifest = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /** 与 package.json 的 version 保持一致（有测试兜底） */
    const APP_VERSION = '3.0.0';
    const SCHEMA = 'mfv/manifest@1';

    /** 递归按 key 排序，保证同一份数据序列化结果稳定 */
    function stableStringify(value) {
        if (value === null || typeof value !== 'object') return JSON.stringify(value);
        if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
        const keys = Object.keys(value).sort();
        return '{' + keys.map(function (k) {
            return JSON.stringify(k) + ':' + stableStringify(value[k]);
        }).join(',') + '}';
    }

    /** FNV-1a 32 位 */
    function fnv1a(str) {
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 0x01000193);
        }
        return (h >>> 0).toString(16).padStart(8, '0');
    }

    /**
     * 内容指纹，形如 `fnv1a:1a2b3c4d:1234`（末段为字符数）。
     * @param {string|object} value
     */
    function fingerprint(value) {
        const s = typeof value === 'string' ? value : stableStringify(value);
        return 'fnv1a:' + fnv1a(s) + ':' + s.length;
    }

    /**
     * 组装运行清单。
     *
     * @param {object} opts
     *   expression, mode, view,
     *   window {xMin,xMax,yMin,yMax},
     *   facts, storyboard,
     *   artifacts [{role, name, content}]
     */
    function buildManifest(opts) {
        opts = opts || {};
        const facts = opts.facts || null;
        const sb = opts.storyboard || null;
        const report = facts ? facts.report : null;

        const result = report ? {
            claims: facts.summary.total,
            passed: facts.summary.passed,
            failed: facts.summary.failed,
            zeros: report.zeros.length,
            maxima: report.extrema.maxima.length,
            minima: report.extrema.minima.length,
            inflections: report.inflections.length,
            asymptotes: {
                vertical: report.asymptotes.vertical.length,
                horizontal: report.asymptotes.horizontal.length,
                oblique: report.asymptotes.oblique.length
            },
            boundedRange: report.range ? report.range.bounded !== false : null
        } : null;

        const artifacts = (opts.artifacts || []).map(function (a) {
            return {
                role: a.role,
                name: a.name,
                bytes: typeof a.content === 'string' ? a.content.length : 0,
                fingerprint: fingerprint(a.content)
            };
        });

        return {
            schema: SCHEMA,
            tool: { name: 'math-function-visualizer', version: APP_VERSION },
            generatedAt: new Date().toISOString(),
            input: {
                expression: opts.expression || '',
                mode: opts.mode || '2d',
                view: opts.view || 'explicit',
                window: opts.window || null
            },
            algorithm: {
                rootSamples: 1000,
                plotSamples: 1600,
                analyzeSamples: 800,
                derivative: 'central-difference',
                integrator: 'adaptive-simpson',
                integratorEps: 1e-9,
                inflectionGuard: 'abs(d2) <= max(1e-2, 0.01 * median|d2|)',
                verification: {
                    zero: 1e-6,
                    extremum: 1e-4,
                    inflection: 1e-2,
                    parity: 1e-6,
                    period: 1e-5,
                    asymptote: 1e-3
                }
            },
            result: result,
            storyboard: sb ? { beats: sb.beats.length, totalSeconds: sb.totalSeconds } : null,
            artifacts: artifacts,
            fingerprints: {
                expression: fingerprint(opts.expression || ''),
                facts: facts ? fingerprint(facts.claims) : null,
                storyboard: sb ? fingerprint(sb.beats) : null
            },
            environment: {
                runtime: typeof navigator !== 'undefined' ? 'browser' : 'node',
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
                language: typeof navigator !== 'undefined' ? navigator.language : null
            }
        };
    }

    return {
        APP_VERSION,
        SCHEMA,
        buildManifest,
        fingerprint,
        stableStringify
    };
}));
