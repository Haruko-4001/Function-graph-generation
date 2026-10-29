/**
 * build.js —— 单文件发行版打包脚本
 * ============================================================
 * 把 index.html + css + js 打包成一个独立的 HTML 文件，便于
 * 直接分享、上传静态托管或离线使用。
 *
 * 用法：
 *   node build.js                 # 单文件版（第三方库走 CDN，约 110 KB）
 *   node build.js --offline       # 离线版（第三方库一并内联，约 5 MB，无需联网）
 *   node build.js --out 自定义名
 *
 * 产物默认输出到 dist/ 目录。
 * ============================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = __dirname;
const args = process.argv.slice(2);
const offline = args.includes('--offline');
const outIdx = args.indexOf('--out');
const outName = outIdx >= 0 && args[outIdx + 1] ? args[outIdx + 1] : null;

const APP_FILES = [
    'js/math-core.js',
    'js/curriculum-data.js',
    'js/facts.js',
    'js/storyboard.js',
    'js/player.js',
    'js/conic.js',
    'js/calculus.js',
    'js/codecheck.js',
    'js/codegen.js',
    'js/manifest.js',
    'js/glossary.js',
    'js/assistant.js',
    'js/motion.js',
    'js/visualizer.js',
    'js/ui.js',
    'js/learning.js',
    'js/main.js'
];

// 第三方库（仅 --offline 时使用）
const VENDOR = [
    { name: 'plotly.min.js', url: 'https://cdn.jsdelivr.net/npm/plotly.js@2.27.0/dist/plotly.min.js' },
    { name: 'math.min.js', url: 'https://cdn.jsdelivr.net/npm/mathjs@11.11.0/lib/browser/math.min.js' }
];

/** 内置脚本源码，避免源码中出现 </script> 破坏标签 */
function safeScript(src) {
    return src.replace(/<\/script/gi, '<\\/script');
}

function readIfExists(p) {
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function download(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'node' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return download(res.headers.location).then(resolve, reject);
            }
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error('下载失败 ' + url + ' -> ' + res.statusCode));
            }
            let data = '';
            res.setEncoding('utf8');
            res.on('data', (c) => { data += c; });
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function main() {
    let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const css = readIfExists(path.join(ROOT, 'css/styles.css'));

    // 注意：所有替换都必须用「函数形式」，否则源码中的 $& / $' / $1 等
    // 会被 String.replace 当作特殊替换模式，导致注入内容被破坏。
    const literal = (s) => () => s;

    // 1) CSS 内联
    html = html.replace(
        /<link rel="stylesheet" href="css\/styles.css">/,
        literal('<style>\n' + css + '\n</style>')
    );

    // 1.5) 去掉开发版独立加载的动效脚本；单文件版会在应用脚本块中内嵌执行
    html = html.replace(/\s*<script src="js\/motion\.js" defer><\/script>\n/, '\n');

    // 2) 应用脚本转为内嵌源码块
    const appBlocks = APP_FILES.map((f) => {
        const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
        return '<script type="text/x-app" data-name="' + f + '">\n' + safeScript(src) + '\n</script>';
    }).join('\n');

    // 3) 第三方库（离线模式内联到 head，使 math/Plotly 立即可用）
    let vendorBlocks = '';
    if (offline) {
        const vendorDir = path.join(ROOT, '.vendor-cache');
        fs.mkdirSync(vendorDir, { recursive: true });
        for (const lib of VENDOR) {
            const cachePath = path.join(vendorDir, lib.name);
            let src = readIfExists(cachePath);
            if (!src) {
                process.stdout.write('下载 ' + lib.name + ' ... ');
                src = await download(lib.url);
                fs.writeFileSync(cachePath, src);
                console.log('完成 (' + (src.length / 1024 / 1024).toFixed(2) + ' MB)');
            }
            vendorBlocks += '<script>/* ' + lib.name + ' */\n' + safeScript(src) + '\n</script>\n';
        }
        html = html.replace('</head>', literal(vendorBlocks + '</head>'));
    }

    // 4) 把内嵌块插入 body 末尾
    html = html.replace('</body>', literal(appBlocks + '\n</body>'));

    const dist = path.join(ROOT, 'dist');
    fs.mkdirSync(dist, { recursive: true });
    const outPath = path.join(dist, outName || (offline ? 'math-function-visualizer-offline.html' : 'math-function-visualizer.html'));
    fs.writeFileSync(outPath, html, 'utf8');

    const size = fs.statSync(outPath).size;
    console.log('已生成: ' + outPath);
    console.log('大小: ' + (size / 1024).toFixed(1) + ' KB' + (offline ? '（离线版）' : '（依赖 CDN）'));
}

main().catch((e) => {
    console.error('打包失败:', e.message);
    process.exit(1);
});
