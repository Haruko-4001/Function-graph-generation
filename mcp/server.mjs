/**
 * mcp/server.mjs
 * ============================================================
 * 把本项目的分析能力以 MCP（Model Context Protocol）暴露出去。
 *
 * 参考 Math-To-Manim 的 `math-to-manim serve-mcp`：工具的价值不只在界面，
 * 还在于「别的智能体能不能调用它」。
 *
 * 传输：stdio，按行分隔的 JSON-RPC 2.0。
 * 注意：stdout 只能输出协议消息，日志一律走 stderr。
 *
 * 启动：
 *   npm run mcp
 *
 * 提供的工具：
 *   analyze_function   分析函数性质（含逐条残差自检）
 *   build_storyboard   生成讲解分镜（动词表 JSON）
 *   export_python      生成可运行的 matplotlib 脚本
 * ============================================================
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const MathFacts = require('../js/facts.js');
const MathStoryboard = require('../js/storyboard.js');
const MathCodegen = require('../js/codegen.js');
const MathManifest = require('../js/manifest.js');

const PROTOCOL = '2024-11-05';

const TOOLS = [
    {
        name: 'analyze_function',
        description: '分析一元函数的性质：零点、极值、单调区间、凹凸与拐点、三类渐近线、奇偶性、周期、值域，'
            + '并对每条结论给出独立复算的残差。返回 JSON。',
        inputSchema: {
            type: 'object',
            properties: {
                expression: { type: 'string', description: '函数表达式，如 "x^2 - 4" 或 "sin(x)/x"' },
                xMin: { type: 'number', description: 'x 下界，默认 -10' },
                xMax: { type: 'number', description: 'x 上界，默认 10' }
            },
            required: ['expression']
        }
    },
    {
        name: 'build_storyboard',
        description: '把函数性质编排成一段分步讲解分镜（固定动词 + 字幕 + 时长），返回 JSON。',
        inputSchema: {
            type: 'object',
            properties: {
                expression: { type: 'string' },
                xMin: { type: 'number' },
                xMax: { type: 'number' },
                yMin: { type: 'number' },
                yMax: { type: 'number' }
            },
            required: ['expression']
        }
    },
    {
        name: 'export_python',
        description: '生成一份只依赖 numpy + matplotlib 的 Python 脚本：绘制函数、标注结论，'
            + '并用 verify() 复算每条结论。返回脚本源码。',
        inputSchema: {
            type: 'object',
            properties: {
                expression: { type: 'string' },
                xMin: { type: 'number' },
                xMax: { type: 'number' },
                yMin: { type: 'number' },
                yMax: { type: 'number' }
            },
            required: ['expression']
        }
    },
    {
        name: 'export_manifest',
        description: '生成运行清单：输入、算法参数、结论统计与产物指纹，便于复现。返回 JSON。',
        inputSchema: {
            type: 'object',
            properties: {
                expression: { type: 'string' },
                xMin: { type: 'number' },
                xMax: { type: 'number' }
            },
            required: ['expression']
        }
    }
];

function buildFacts(expression, args) {
    if (!expression || typeof expression !== 'string') throw new Error('缺少 expression');
    const xMin = Number.isFinite(args.xMin) ? args.xMin : -10;
    const xMax = Number.isFinite(args.xMax) ? args.xMax : 10;
    if (!(xMax > xMin)) throw new Error('xMax 必须大于 xMin');
    return MathFacts.buildFacts(expression, { xMin, xMax });
}

function callTool(name, args) {
    args = args || {};
    if (name === 'analyze_function') {
        const facts = buildFacts(args.expression, args);
        const r = facts.report;
        return JSON.stringify({
            expression: facts.expression,
            window: facts.window,
            summary: facts.summary,
            range: r.range,
            zeros: r.zeros.map((p) => Number(p.x.toPrecision(12))),
            maxima: r.extrema.maxima.map((p) => ({ x: p.x, y: p.y })),
            minima: r.extrema.minima.map((p) => ({ x: p.x, y: p.y })),
            monotonic: r.monotonic,
            inflections: r.inflections,
            concavity: r.concavity,
            asymptotes: r.asymptotes,
            parity: r.parity,
            period: r.period,
            claims: facts.claims.map((c) => ({
                id: c.id,
                label: c.label,
                residual: c.verification.residual,
                tol: c.verification.tol,
                ok: c.verification.ok
            }))
        }, null, 2);
    }

    if (name === 'build_storyboard') {
        const facts = buildFacts(args.expression, args);
        const sb = MathStoryboard.buildStoryboard(facts, { yRange: [args.yMin, args.yMax] });
        const check = MathStoryboard.validateStoryboard(sb);
        return JSON.stringify({ storyboard: sb, validation: check }, null, 2);
    }

    if (name === 'export_python') {
        const facts = buildFacts(args.expression, args);
        const out = MathCodegen.buildPython({
            expression: args.expression,
            xMin: facts.window.xMin,
            xMax: facts.window.xMax,
            yMin: args.yMin,
            yMax: args.yMax,
            facts
        });
        return out.code;
    }

    if (name === 'export_manifest') {
        const facts = buildFacts(args.expression, args);
        const sb = MathStoryboard.buildStoryboard(facts);
        return JSON.stringify(MathManifest.buildManifest({
            expression: args.expression,
            mode: '2d',
            view: 'explicit',
            window: { xMin: facts.window.xMin, xMax: facts.window.xMax },
            facts,
            storyboard: sb
        }), null, 2);
    }

    throw new Error('未知工具：' + name);
}

/* ---------------- JSON-RPC over stdio ---------------- */

function write(msg) {
    process.stdout.write(JSON.stringify(msg) + '\n');
}

function reply(id, result, error) {
    if (id === undefined || id === null) return;
    if (error) write({ jsonrpc: '2.0', id, error });
    else write({ jsonrpc: '2.0', id, result });
}

function handle(msg) {
    const method = msg.method;
    const id = msg.id;

    if (method === 'initialize') {
        reply(id, {
            protocolVersion: PROTOCOL,
            capabilities: { tools: {} },
            serverInfo: { name: 'math-function-visualizer', version: MathManifest.APP_VERSION }
        });
        return;
    }
    if (method === 'notifications/initialized' || method === 'initialized') return;
    if (method === 'ping') { reply(id, {}); return; }

    if (method === 'tools/list') {
        reply(id, { tools: TOOLS });
        return;
    }

    if (method === 'tools/call') {
        const params = msg.params || {};
        try {
            const text = callTool(params.name, params.arguments);
            reply(id, { content: [{ type: 'text', text }] });
        } catch (e) {
            reply(id, { content: [{ type: 'text', text: '调用失败：' + e.message }], isError: true });
        }
        return;
    }

    if (id !== undefined) {
        reply(id, null, { code: -32601, message: '不支持的方法：' + method });
    }
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        let msg;
        try {
            msg = JSON.parse(line);
        } catch (e) {
            write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON 解析失败' } });
            continue;
        }
        handle(msg);
    }
});

process.stdin.on('end', () => process.exit(0));
process.stderr.write('[mfv-mcp] ready, tools: ' + TOOLS.map((t) => t.name).join(', ') + '\n');
