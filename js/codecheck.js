/**
 * codecheck.js
 * ============================================================
 * 生成代码的静态检查（对应 Math-To-Manim 的 `verify_scene`）。
 *
 * 只做「能不能安全地交给用户去跑」这一层判断：
 *   - 导入白名单
 *   - 危险调用黑名单
 *   - 结构完整性（必须有 f(x)、区间常量、main 保护）
 *   - 括号配平
 *
 * 它不是沙箱，也不执行代码。真正的执行验证在 tests 里用本机 Python 完成。
 * ============================================================
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MathCodeCheck = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /** 允许导入的模块（含子模块前缀匹配） */
    const ALLOWED_IMPORTS = [
        '__future__',
        'math',
        'numpy',
        'matplotlib',
        'matplotlib.pyplot'
    ];

    /** 出现即视为危险，直接拒绝 */
    const FORBIDDEN = [
        { re: /\beval\s*\(/, why: 'eval() 可执行任意字符串' },
        { re: /\bexec\s*\(/, why: 'exec() 可执行任意字符串' },
        { re: /__import__/, why: '__import__ 可绕过导入白名单' },
        { re: /\bopen\s*\(/, why: 'open() 可读写本地文件' },
        { re: /\bos\s*[.\s]/, why: 'os 模块可操作系统资源' },
        { re: /\bsubprocess\b/, why: 'subprocess 可执行外部命令' },
        { re: /\bsocket\b/, why: 'socket 可发起网络连接' },
        { re: /\bshutil\b/, why: 'shutil 可删除/移动文件' },
        { re: /\brequests\b/, why: 'requests 可发起网络请求' },
        { re: /\bsys\.exit\s*\(/, why: '请用 SystemExit 或 return 代替 sys.exit' },
        { re: /\bctypes\b/, why: 'ctypes 可调用本地动态库' }
    ];

    /** 结构要求 */
    const REQUIRED = [
        { re: /^def\s+f\s*\(\s*x\s*\)\s*:/m, why: '缺少 f(x) 定义' },
        { re: /^X_MIN\b[^\n]*=/m, why: '缺少 X_MIN 常量' },
        { re: /^X_MAX\b[^\n]*=/m, why: '缺少 X_MAX 常量' },
        { re: /^SAMPLES\b[^\n]*=/m, why: '缺少 SAMPLES 常量' },
        { re: /^def\s+main\s*\(\s*\)\s*:/m, why: '缺少 main() 定义' },
        { re: /^if\s+__name__\s*==\s*["']__main__["']\s*:/m, why: '缺少 main 保护块' }
    ];

    /**
     * 校验一段生成的 Python 代码。
     * @returns {{ok:boolean, errors:string[], stats:object}}
     */
    function checkPython(code) {
        const errors = [];
        const src = String(code || '');

        if (!src.trim()) {
            return { ok: false, errors: ['代码为空'], stats: { lines: 0, imports: 0 } };
        }

        // 1) 导入白名单
        const importRe = /^[ \t]*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm;
        let m, importCount = 0;
        while ((m = importRe.exec(src)) !== null) {
            importCount++;
            const mod = m[1] || m[2];
            const allowed = ALLOWED_IMPORTS.some(function (a) {
                return mod === a || mod.indexOf(a + '.') === 0;
            });
            if (!allowed) errors.push('不允许的导入：' + mod);
        }

        // 2) 危险调用
        FORBIDDEN.forEach(function (item) {
            if (item.re.test(src)) errors.push('检测到危险操作（' + item.why + '）');
        });

        // 3) 结构完整性
        REQUIRED.forEach(function (item) {
            if (!item.re.test(src)) errors.push(item.why);
        });

        // 4) 括号配平（字符串内的括号按简单状态机跳过）
        const balance = checkBalance(src);
        if (!balance.ok) errors.push(balance.error);

        return {
            ok: errors.length === 0,
            errors: errors,
            stats: {
                lines: src.split('\n').length,
                imports: importCount,
                chars: src.length
            }
        };
    }

    /** 简易括号配平：跳过字符串与注释 */
    function checkBalance(src) {
        const stack = [];
        const pairs = { ')': '(', ']': '[', '}': '{' };
        let inStr = null;
        for (let i = 0; i < src.length; i++) {
            const ch = src[i];
            if (inStr) {
                if (ch === '\\') { i++; continue; }
                if (ch === inStr) inStr = null;
                continue;
            }
            if (ch === '#') {
                while (i < src.length && src[i] !== '\n') i++;
                continue;
            }
            if (ch === '"' || ch === "'") {
                // 三引号
                if (src.slice(i, i + 3) === ch + ch + ch) {
                    const end = src.indexOf(ch + ch + ch, i + 3);
                    i = end < 0 ? src.length : end + 2;
                    continue;
                }
                inStr = ch;
                continue;
            }
            if (ch === '(' || ch === '[' || ch === '{') stack.push(ch);
            else if (ch === ')' || ch === ']' || ch === '}') {
                if (stack.pop() !== pairs[ch]) {
                    return { ok: false, error: '括号不配平（第 ' + (i + 1) + ' 个字符附近）' };
                }
            }
        }
        if (stack.length) return { ok: false, error: '存在未闭合的括号' };
        return { ok: true };
    }

    return {
        checkPython,
        ALLOWED_IMPORTS,
        FORBIDDEN
    };
}));
