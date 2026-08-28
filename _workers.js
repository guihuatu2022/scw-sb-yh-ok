// scw-singbox Cloudflare Worker — 优化版
// 配合 scw-singbox 项目使用，实现 VLESS+WS 反代 + 多页面伪装站
//
// 环境变量（在 Worker Settings → Variables 中配置）：
//   WS_PATH        — WebSocket 路径，必须与 Scaleway 容器的 WS_PATH 一致
//   ORIGIN_DOMAIN  — Scaleway 容器分配的域名（如 xxx.functions.fnc.fr-par.scw.cloud）
//
// 部署后在 Worker Settings → Variables 中添加以上两个变量。
// 建议将 ORIGIN_DOMAIN 设为 Secret（加密存储）。

export default {
    async fetch(request, env) {
        let url = new URL(request.url);

        // ============================================================
        // 1. 核心代理逻辑：仅转发合法的 WebSocket 升级请求
        // ============================================================
        if (url.pathname === env.WS_PATH) {
            // 检查是否为完整的 WebSocket 升级请求
            const upgradeHeader = request.headers.get('Upgrade');
            const connectionHeader = request.headers.get('Connection');
            const wsKey = request.headers.get('Sec-WebSocket-Key');

            if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket'
                || !wsKey || !connectionHeader || !connectionHeader.toLowerCase().includes('upgrade')) {
                // 普通 GET 命中 WS 路径 → 返回与下载上下文一致的页面，不暴露 sing-box
                return new Response(PAGES.fileAccess, {
                    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
                });
            }

            // 合法 WebSocket 升级 → 反代到 Scaleway 容器
            url.protocol = 'https:';
            url.hostname = env.ORIGIN_DOMAIN;

            let newHeaders = new Headers(request.headers);
            // 覆写 Host，使容器平台网关接受请求
            newHeaders.set('Host', env.ORIGIN_DOMAIN);

            let new_request = new Request(url, {
                method: request.method,
                headers: newHeaders,
                body: request.body,
                redirect: request.redirect
            });

            let response = await fetch(new_request);

            // 清理上游响应头，避免泄露 sing-box 指纹
            let cleanHeaders = new Headers();
            let ct = response.headers.get('Content-Type');
            if (ct) cleanHeaders.set('Content-Type', ct);
            // 保留 WebSocket 相关头
            let upgrade = response.headers.get('Upgrade');
            if (upgrade) cleanHeaders.set('Upgrade', upgrade);
            let conn = response.headers.get('Connection');
            if (conn) cleanHeaders.set('Connection', conn);
            let wsAccept = response.headers.get('Sec-WebSocket-Accept');
            if (wsAccept) cleanHeaders.set('Sec-WebSocket-Accept', wsAccept);
            let wsProtocol = response.headers.get('Sec-WebSocket-Protocol');
            if (wsProtocol) cleanHeaders.set('Sec-WebSocket-Protocol', wsProtocol);
            let wsVersion = response.headers.get('Sec-WebSocket-Version');
            if (wsVersion) cleanHeaders.set('Sec-WebSocket-Version', wsVersion);

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: cleanHeaders
            });
        }

        // ============================================================
        // 2. 多页面伪装站路由
        // ============================================================
        switch (url.pathname) {
            case '/':
                return new Response(PAGES.home, {
                    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
                });
            case '/about':
                return new Response(PAGES.about, {
                    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
                });
            case '/downloads':
                return new Response(PAGES.downloads, {
                    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
                });
            case '/docs':
                return new Response(PAGES.docs, {
                    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
                });
            case '/contact':
                return new Response(PAGES.contact, {
                    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
                });
            default:
                // 未知路径返回标准 404，符合正常网站行为
                return new Response(PAGES.notFound, {
                    status: 404,
                    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
                });
        }
    }
};

// ============================================================
// 伪装页面模板
// 风格统一为简约项目文档站，无凭据收集表单
// ============================================================

const PAGES = {
    home: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DevOps CI/CD Pipeline Documentation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; color: #24292e; line-height: 1.6; }
        nav { background: #24292e; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
        .logo { color: #fff; font-weight: 700; font-size: 1.1rem; }
        .nav-links a { color: #c9d1d9; text-decoration: none; margin-left: 20px; font-size: 0.9rem; }
        .nav-links a:hover { color: #58a6ff; }
        .container { max-width: 800px; margin: 40px auto; padding: 0 24px; }
        h1 { font-size: 1.8rem; margin-bottom: 12px; }
        .subtitle { color: #6a737d; font-size: 1.05rem; margin-bottom: 32px; }
        .card { background: #fff; border: 1px solid #e1e4e8; border-radius: 8px; padding: 24px; margin-bottom: 20px; }
        .card h2 { font-size: 1.2rem; margin-bottom: 8px; }
        .card p { color: #444; font-size: 0.95rem; }
        .card a { color: #0366d6; text-decoration: none; }
        .card a:hover { text-decoration: underline; }
        .badge { display: inline-block; background: #e1e4e8; color: #444; font-size: 0.75rem; padding: 2px 8px; border-radius: 12px; margin-right: 6px; }
        footer { text-align: center; padding: 32px; color: #6a737d; font-size: 0.85rem; }
    </style>
</head>
<body>
    <nav>
        <div class="logo">Pipeline Docs</div>
        <div class="nav-links">
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/downloads">Downloads</a>
            <a href="/docs">Docs</a>
            <a href="/contact">Contact</a>
        </div>
    </nav>
    <div class="container">
        <h1>DevOps CI/CD Pipeline</h1>
        <p class="subtitle">Containerized deployment pipeline documentation and resources.</p>
        <div class="card">
            <h2>Overview</h2>
            <p>This site provides documentation for the internal CI/CD pipeline used by the infrastructure team. It covers container deployment, configuration management, and monitoring.</p>
            <span class="badge">v2.4.1</span>
            <span class="badge">Updated: Aug 2026</span>
        </div>
        <div class="card">
            <h2>Quick Links</h2>
            <p><a href="/docs">Read the documentation</a> · <a href="/downloads">Download resources</a> · <a href="/about">About this project</a></p>
        </div>
        <div class="card">
            <h2>Status</h2>
            <p>All systems operational. Last deployment: Aug 27, 2026 14:32 UTC.</p>
        </div>
    </div>
    <footer>&copy; 2026 Infrastructure Team. Internal use only.</footer>
</body>
</html>`,

    about: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About — Pipeline Docs</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; color: #24292e; line-height: 1.6; }
        nav { background: #24292e; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
        .logo { color: #fff; font-weight: 700; font-size: 1.1rem; }
        .nav-links a { color: #c9d1d9; text-decoration: none; margin-left: 20px; font-size: 0.9rem; }
        .nav-links a:hover { color: #58a6ff; }
        .container { max-width: 800px; margin: 40px auto; padding: 0 24px; }
        h1 { font-size: 1.8rem; margin-bottom: 24px; }
        p { color: #444; margin-bottom: 16px; font-size: 0.95rem; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
        footer { text-align: center; padding: 32px; color: #6a737d; font-size: 0.85rem; }
    </style>
</head>
<body>
    <nav>
        <div class="logo">Pipeline Docs</div>
        <div class="nav-links">
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/downloads">Downloads</a>
            <a href="/docs">Docs</a>
            <a href="/contact">Contact</a>
        </div>
    </nav>
    <div class="container">
        <h1>About This Project</h1>
        <p>This documentation site covers the CI/CD pipeline used internally by the infrastructure team for containerized deployments on Scaleway Serverless Containers.</p>
        <p>The pipeline includes automated image building via GitHub Actions, container deployment to Scaleway, and reverse proxy configuration through Cloudflare.</p>
        <p>For access to internal resources, please contact the infrastructure team. See <a href="/contact">Contact</a> for details.</p>
        <p><a href="/">&larr; Back to home</a></p>
    </div>
    <footer>&copy; 2026 Infrastructure Team. Internal use only.</footer>
</body>
</html>`,

    downloads: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Downloads — Pipeline Docs</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; color: #24292e; line-height: 1.6; }
        nav { background: #24292e; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
        .logo { color: #fff; font-weight: 700; font-size: 1.1rem; }
        .nav-links a { color: #c9d1d9; text-decoration: none; margin-left: 20px; font-size: 0.9rem; }
        .nav-links a:hover { color: #58a6ff; }
        .container { max-width: 800px; margin: 40px auto; padding: 0 24px; }
        h1 { font-size: 1.8rem; margin-bottom: 24px; }
        .file-list { list-style: none; }
        .file-list li { background: #fff; border: 1px solid #e1e4e8; border-radius: 8px; padding: 16px 20px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
        .file-name { font-weight: 600; font-size: 0.95rem; }
        .file-meta { color: #6a737d; font-size: 0.85rem; }
        .restricted { color: #cb1b1b; font-size: 0.85rem; font-weight: 500; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
        footer { text-align: center; padding: 32px; color: #6a737d; font-size: 0.85rem; }
    </style>
</head>
<body>
    <nav>
        <div class="logo">Pipeline Docs</div>
        <div class="nav-links">
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/downloads">Downloads</a>
            <a href="/docs">Docs</a>
            <a href="/contact">Contact</a>
        </div>
    </nav>
    <div class="container">
        <h1>Downloads</h1>
        <ul class="file-list">
            <li>
                <div>
                    <div class="file-name">pipeline-config-v2.4.tar.gz</div>
                    <div class="file-meta">14.2 MB &middot; Aug 27, 2026</div>
                </div>
                <span class="restricted">Access restricted</span>
            </li>
            <li>
                <div>
                    <div class="file-name">container-deploy-guide.pdf</div>
                    <div class="file-meta">3.8 MB &middot; Aug 25, 2026</div>
                </div>
                <span class="restricted">Access restricted</span>
            </li>
            <li>
                <div>
                    <div class="file-name">monitoring-dashboards.json</div>
                    <div class="file-meta">512 KB &middot; Aug 24, 2026</div>
                </div>
                <span class="restricted">Access restricted</span>
            </li>
        </ul>
        <p style="margin-top:20px;font-size:0.9rem;color:#6a737d;">Downloads require infrastructure team authorization. Contact the team for access.</p>
        <p><a href="/">&larr; Back to home</a></p>
    </div>
    <footer>&copy; 2026 Infrastructure Team. Internal use only.</footer>
</body>
</html>`,

    docs: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation — Pipeline Docs</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; color: #24292e; line-height: 1.6; }
        nav { background: #24292e; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
        .logo { color: #fff; font-weight: 700; font-size: 1.1rem; }
        .nav-links a { color: #c9d1d9; text-decoration: none; margin-left: 20px; font-size: 0.9rem; }
        .nav-links a:hover { color: #58a6ff; }
        .container { max-width: 800px; margin: 40px auto; padding: 0 24px; }
        h1 { font-size: 1.8rem; margin-bottom: 24px; }
        h2 { font-size: 1.2rem; margin: 24px 0 8px; }
        p { color: #444; margin-bottom: 12px; font-size: 0.95rem; }
        code { background: #f1f1f1; padding: 2px 6px; border-radius: 3px; font-size: 0.85rem; font-family: 'SF Mono', monospace; }
        pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; margin-bottom: 16px; font-size: 0.85rem; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
        footer { text-align: center; padding: 32px; color: #6a737d; font-size: 0.85rem; }
    </style>
</head>
<body>
    <nav>
        <div class="logo">Pipeline Docs</div>
        <div class="nav-links">
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/downloads">Downloads</a>
            <a href="/docs">Docs</a>
            <a href="/contact">Contact</a>
        </div>
    </nav>
    <div class="container">
        <h1>Documentation</h1>
        <h2>Container Deployment</h2>
        <p>Containers are deployed to Scaleway Serverless Containers with the following configuration:</p>
        <pre>vCPU: 100m
Memory: 128MB
Port: 8080 (HTTP)
Timeout: 3600s</pre>
        <h2>Environment Variables</h2>
        <p>The following variables must be set during deployment:</p>
        <pre>UUID: VLESS user identifier
WS_PATH: WebSocket endpoint path
LOG_LEVEL: Logging verbosity (default: error)</pre>
        <h2>Reverse Proxy</h2>
        <p>Cloudflare Worker handles reverse proxying and TLS termination. The Worker validates WebSocket upgrade requests and forwards them to the container.</p>
        <p><a href="/">&larr; Back to home</a></p>
    </div>
    <footer>&copy; 2026 Infrastructure Team. Internal use only.</footer>
</body>
</html>`,

    contact: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact — Pipeline Docs</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; color: #24292e; line-height: 1.6; }
        nav { background: #24292e; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
        .logo { color: #fff; font-weight: 700; font-size: 1.1rem; }
        .nav-links a { color: #c9d1d9; text-decoration: none; margin-left: 20px; font-size: 0.9rem; }
        .nav-links a:hover { color: #58a6ff; }
        .container { max-width: 800px; margin: 40px auto; padding: 0 24px; }
        h1 { font-size: 1.8rem; margin-bottom: 24px; }
        p { color: #444; margin-bottom: 16px; font-size: 0.95rem; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
        footer { text-align: center; padding: 32px; color: #6a737d; font-size: 0.85rem; }
    </style>
</head>
<body>
    <nav>
        <div class="logo">Pipeline Docs</div>
        <div class="nav-links">
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/downloads">Downloads</a>
            <a href="/docs">Docs</a>
            <a href="/contact">Contact</a>
        </div>
    </nav>
    <div class="container">
        <h1>Contact</h1>
        <p>For questions about the CI/CD pipeline, container deployment, or access requests, please reach out to the infrastructure team through internal channels.</p>
        <p>Response time: 1-2 business days.</p>
        <p><a href="/">&larr; Back to home</a></p>
    </div>
    <footer>&copy; 2026 Infrastructure Team. Internal use only.</footer>
</body>
</html>`,

    fileAccess: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Access Restricted — Pipeline Docs</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; color: #24292e; line-height: 1.6; }
        nav { background: #24292e; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
        .logo { color: #fff; font-weight: 700; font-size: 1.1rem; }
        .nav-links a { color: #c9d1d9; text-decoration: none; margin-left: 20px; font-size: 0.9rem; }
        .nav-links a:hover { color: #58a6ff; }
        .container { max-width: 600px; margin: 80px auto; padding: 0 24px; text-align: center; }
        h1 { font-size: 1.6rem; margin-bottom: 16px; }
        p { color: #6a737d; margin-bottom: 24px; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
        footer { text-align: center; padding: 32px; color: #6a737d; font-size: 0.85rem; }
    </style>
</head>
<body>
    <nav>
        <div class="logo">Pipeline Docs</div>
        <div class="nav-links">
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/downloads">Downloads</a>
            <a href="/docs">Docs</a>
            <a href="/contact">Contact</a>
        </div>
    </nav>
    <div class="container">
        <h1>Access Restricted</h1>
        <p>This resource requires authorization from the infrastructure team.</p>
        <p>Please contact the team through internal channels to request access.</p>
        <p><a href="/">&larr; Back to home</a></p>
    </div>
    <footer>&copy; 2026 Infrastructure Team. Internal use only.</footer>
</body>
</html>`,

    notFound: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 — Page Not Found</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; color: #24292e; line-height: 1.6; }
        nav { background: #24292e; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
        .logo { color: #fff; font-weight: 700; font-size: 1.1rem; }
        .nav-links a { color: #c9d1d9; text-decoration: none; margin-left: 20px; font-size: 0.9rem; }
        .nav-links a:hover { color: #58a6ff; }
        .container { max-width: 600px; margin: 120px auto; padding: 0 24px; text-align: center; }
        h1 { font-size: 3rem; color: #6a737d; margin-bottom: 16px; }
        p { color: #6a737d; margin-bottom: 24px; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
        footer { text-align: center; padding: 32px; color: #6a737d; font-size: 0.85rem; }
    </style>
</head>
<body>
    <nav>
        <div class="logo">Pipeline Docs</div>
        <div class="nav-links">
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/downloads">Downloads</a>
            <a href="/docs">Docs</a>
            <a href="/contact">Contact</a>
        </div>
    </nav>
    <div class="container">
        <h1>404</h1>
        <p>The page you are looking for does not exist or has been moved.</p>
        <p><a href="/">&larr; Back to home</a></p>
    </div>
    <footer>&copy; 2026 Infrastructure Team. Internal use only.</footer>
</body>
</html>`
};
