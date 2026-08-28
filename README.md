# scw-singbox

在 Scaleway Serverless Containers（0.1 vCPU / 128MB / 无 TCP 端口 / 仅 HTTP）上部署 sing-box VLESS+WS 代理。

## 架构

```
客户端 ──HTTPS/WSS──> Cloudflare Worker (自定义域名)
                         ├── WS 路径 → 反代到 Scaleway 容器域名 (Host 覆写)
                         │                    └── sing-box VLESS+WS (0.0.0.0:PORT)
                         └── 其他路径 → 返回伪装页面
```

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `UUID` | 是 | — | VLESS 用户 UUID。缺失则容器启动失败。可用 `sing-box generate uuid` 生成 |
| `WS_PATH` | 否 | `/db/CLIENT_LTSC_EVAL_x64FRE_zh-cn.iso` | WebSocket 路径。建议部署时设置为高熵文件路径格式 |
| `PORT` | 否 | `8080` | Scaleway 会自动注入，本地调试用 |
| `LOG_LEVEL` | 否 | `error` | sing-box 日志级别。可选 `trace`/`debug`/`info`/`warn`/`error`/`fatal`/`panic` |

## Scaleway 部署步骤

### 1. 推送代码到 GitHub

```bash
git clone https://github.com/your-username/scw-singbox.git
cd scw-singbox
git remote set-url origin https://github.com/your-username/scw-singbox.git
git push -u origin main
```

GitHub Actions 会自动构建镜像并推送到 GHCR：
```
ghcr.io/your-username/scw-singbox:latest
```

确认 Actions 构建成功后再继续。

### 2. 创建 Scaleway Serverless Container

在 Scaleway 控制台：

1. 进入 **Serverless Containers**
2. 创建新容器，命名空间随意（如 `proxy`）
3. 镜像填写：`ghcr.io/your-username/scw-singbox:latest`
4. 资源配置：
   - **vCPU**: 100m (0.1)
   - **内存**: 128 MB
   - **并发**: 建议保持默认或设为 1-2
5. 端口：**8080**（HTTP 协议，非 TCP）
6. 环境变量：
   - `UUID` = 你的 UUID（用 `sing-box generate uuid` 或 `uuidgen` 生成）
   - `WS_PATH` = 你的 WS 路径（如 `/db/CLIENT_LTSC_EVAL_x64FRE_zh-cn.iso`）
   - `LOG_LEVEL` = `error`
7. 部署

### 3. 获取容器域名

部署成功后，Scaleway 会分配一个域名，格式类似：
```
https://your-container-name-xxx.functions.fnc.fr-par.scw.cloud
```

记下这个域名，后续配置 Cloudflare Worker 时需要。

### 4. 配置 Cloudflare Worker

（详见下一步：CF 端配置）

## 构建说明

- sing-box 版本：v1.13.12
- 构建不带任何 `-tags`，只包含 VLESS + WS 核心功能
- 运行时使用 busybox:1.36-musl，镜像极小
- Go 运行时参数针对 0.1 vCPU / 128MB 优化：GOMAXPROCS=1, GOMEMLIMIT=90MiB, GOGC=off

## 本地调试

```bash
# 构建
docker build -t scw-singbox .

# 运行（替换 UUID）
docker run -e PORT=8080 -e UUID=your-uuid-here -p 8080:8080 scw-singbox

# 测试 WS 连接（需要客户端配合）
# 访问 http://localhost:8080/ 会返回 404（sing-box 不处理非 WS 请求）
```
