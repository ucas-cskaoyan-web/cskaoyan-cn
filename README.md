# 国科大计算机考研站点导航

一个可直接部署到 GitHub Pages 的静态站点，集中展示中国科学院大学及相关院所的计算机考研专题站。项目不需要安装依赖，也不需要构建步骤，浏览器会在运行时读取院校内容和卡片配置。

## 文件结构

| 文件 | 用途 |
| --- | --- |
| `sites.md` | 院校简称、完整名称、链接和介绍 |
| `scores/*.md` | 各研究所独立维护的历年分数线表格 |
| `site-config.js` | 卡片变体、封面、主题色和标题排版 |
| `script.js` | Markdown 解析、配置合并、卡片渲染和连通性检测 |
| `styles.css` | 页面基础样式和卡片变体样式 |
| `images/` | 卡片封面等图片资源 |
| `index.html` | 页面骨架、SEO 元数据和卡片模板 |
| `counter-worker/` | Cloudflare Worker + D1 卡片点击量服务 |

## 添加院校

先在 `sites.md` 增加一段内容。二级标题是卡片简称，链接文字是卡片主标题：

```md
## 新院所

[中国科学院新院所](https://example.cskaoyan.cn/)

这里填写院校介绍，可以写多行。
```

没有额外配置时，卡片会自动使用 `site-config.js` 中的 `defaults`。页面会自动检测站点连通性，并在卡片右上角显示状态。

## 自定义卡片

如果需要封面或特殊排版，在 `site-config.js` 的 `profiles` 中增加与 `sites.md` 二级标题完全相同的配置键：

```js
profiles: {
  新院所: {
    variant: "cover",
    image: {
      src: "https://image-host.example/new-cover.jpg",
      serverSrc: "https://source.cskaoyan.cn/img/new-cover.jpg",
      fallbackSrc: "images/new-cover.jpg",
      position: "center 20%",
    },
    theme: {
      color: "#00639b",
      aura: "#cce5ff",
    },
    linkLabel: "进入专题",
  },
}
```

可用字段：

- `variant`：内置 `standard`、`cover`、`title-only`、`institute-featured`。
- `image.src`：优先加载的图床地址；`image.serverSrc`：图床失败或 5 秒超时后从阿里云服务器获取的图片；`image.fallbackSrc`：前两级都失败或超时后，从 GitHub Pages 当前仓库加载的本地图片；`image.position`：图片裁切位置，例如 `center 20%`。加载顺序固定为图床 → 阿里云服务器 → GitHub Pages。
- `theme`：卡片主题色 `color` 和光晕色 `aura`。
- `monogram`：左上角简称，默认使用 `sites.md` 的二级标题。
- `titleParts`：分段标题数组，每项包含 `className` 和 `text`。
- `identity`：特色封面顶部信息，支持 `code` 和 `subtitle`。
- `linkLabel`：卡片底部入口文字。
- `counterId`：点击量统计 ID，需要同时存在于 `counter-worker/src/index.js` 的允许列表中。

要新增完全不同的视觉变体，在 `styles.css` 的“卡片变体”区域添加 `.site-card--变体名`，再把 profile 的 `variant` 设置为同名值。渲染脚本不需要增加院校名称判断。

## 维护历年分数线

每个研究所对应 `scores/` 下的一个 Markdown 文件，各自维护自己的分数线数据。文件路径在 `site-config.js` 的 `scoreFile` 字段中配置，完整格式见 [scores/README.md](scores/README.md)，通用示例见 [scores/example.md](scores/example.md)。

维护规则：

- 表头保持为：`年份`、`类型`、`专业`、`专业课代码`、`政治`、`英语`、`数学`、`专业课`、`总分线`。
- `专业课代码`填写`408`、`866`等考试科目代码；`专业课`填写对应的单科分数线。
- `类型`填写`学硕`或`专硕`，两种类型分别占一行。
- 同一年可以增加多行，用于填写不同专业。
- 年份行可以自由增加或删除，不要求每年都同时存在学硕和专硕。
- 首页按当前年份自动展示最近三年。当前日期为 2026 年时，展示 2024、2025、2026 年；旧年份可以保留在 Markdown 中，但不会出现在速览表里。
- 新增年份后不需要修改 JavaScript 或 HTML；年份进入最近三年范围后会自动显示。
- 速览表支持按研究所、年份、专业课代码和学硕/专硕类型组合筛选。

旧版 `sites.md` 中的 `![封面](images/example.jpg)`、`![标题封面](...)` 和 `![院所封面](...)` 写法仍可读取，适合迁移旧内容；新内容建议统一使用 `site-config.js`。

## 本地预览

页面需要通过 HTTP 服务运行，因为它会使用 `fetch` 读取 `sites.md` 和 ES 模块配置：

```bash
python3 -m http.server 4173
```

然后打开 [http://localhost:4173/](http://localhost:4173/)。不要直接双击 `index.html`，否则浏览器会拦截 `file://` 页面中的模块和 Markdown 请求。

## 卡片点击量

卡片点击量由 `counter-tencent/` 下的 Tencent CloudBase HTTP 云函数记录，并保存在 NoSQL 数据库中。首页只统计用户从卡片进入专题站的点击，不读取目标网站访问量。网页端只包含公开的 HTTPS 接口地址，不包含 CloudBase API Key、限流密钥或任何云端凭据。

点击接口带有多层轻量防刷：同一浏览器同一卡片 10 秒内只上报一次；Cloudflare 在边缘节点限制突发请求；D1 再按浏览器标识和 IP 精确限制为每张卡片每分钟最多接受 5 次。此外，同一浏览器或同一 IP 跨所有院所卡片每个自然小时最多记录 10 次，并按北京时间每天最多记录 20 次。超过任一限制都不会增加点击量，并返回 `429`。IP 只参与带密钥的哈希计算，数据库不保存明文 IP。限流是反滥用措施，不是严格的审计计数；代理池或大量真实设备仍可能绕过。

新增院所时需要完成两项配置：

- 在 `site-config.js` 对应 profile 中增加唯一的 `counterId`。
- 在 `counter-tencent/index.js` 的 `SITE_IDS` 中加入同一个 ID，并在数据库中创建对应文档。

修改云函数后，在 WSL 中仅更新代码：

```bash
cd counter-tencent
npm install
tcb fn code update cskaoyan-counter --dir . --deployMode cos
```

不要把 `CLOUDBASE_APIKEY` 或 `RATE_LIMIT_SECRET` 写入仓库、前端代码、`cloudbaserc.json` 或 README。它们只在 CloudBase 云函数的环境变量中配置；`TCB_ENV_ID` 可以写入配置文件，因为它是环境标识而不是凭据。线上接口地址配置在 `site-config.js` 的 `clickCounter.apiBaseUrl`。

部署前可在本地检查：

```bash
git grep -n -E 'CLOUDBASE_APIKEY|SECRETID|SECRETKEY|SECRET_KEY|PRIVATE_KEY|RATE_LIMIT_SECRET' -- ':!node_modules'
```

命令应只匹配服务端代码中对环境变量名称的引用，不应出现任何密钥值。

## 自建图片与计数服务

`source-server/` 是部署在 `iie-server` 上的独立 Docker 服务，与现有 `/srv/iie-cskaoyan`、`iie-api.service`、`iie-web.service` 和 PostgreSQL 完全隔离。服务器部署目录为 `/srv/cskaoyan-source`，容器名为 `cskaoyan-source`，只绑定宿主机的 `127.0.0.1:9100`，公网请求由 `source.cskaoyan.cn` 的独立 Nginx 虚拟主机转发。

接口如下：

```text
GET  https://source.cskaoyan.cn/img/<文件名>
GET  https://source.cskaoyan.cn/count/counts
POST https://source.cskaoyan.cn/count/click/<counterId>?visitor=<浏览器标识>
GET  https://source.cskaoyan.cn/health
```

运行数据不写入镜像：

- `/srv/cskaoyan-source/images/`：公开图片，替换文件后不需要重新构建容器。
- `/srv/cskaoyan-source/data/counter.db`：SQLite 点击量和限流数据。
- `/srv/cskaoyan-source/.env`：HMAC 密钥，权限为 `600`，禁止提交到仓库。

常用维护命令：

```bash
ssh iie-server
cd /srv/cskaoyan-source
docker compose ps
docker compose logs --tail 100
docker compose up -d --build
curl http://127.0.0.1:9100/health
```

备份计数数据库时先使用 SQLite 在线备份，不要直接复制正在写入的 WAL 数据库：

```bash
docker exec cskaoyan-source python -c \
  'import sqlite3; src=sqlite3.connect("/data/counter.db"); dst=sqlite3.connect("/data/counter-backup.db"); src.backup(dst); dst.close(); src.close()'
```

截至 2026 年 8 月 18 日，容器、图片、SQLite、限流和 Nginx HTTP 虚拟主机已经部署。该计数实现目前只作为备用方案，正式环境使用 Tencent CloudBase。阿里云公网目前以 `Non-compliance ICP Filing` 拦截新子域名，因此网站暂不把它作为稳定图片源。完成 `source.cskaoyan.cn` 的阿里云备案接入后，在服务器运行：

```bash
certbot --nginx -d source.cskaoyan.cn --redirect
```

确认 HTTPS 的 `/health` 和图片接口均可访问后，可继续把 `https://source.cskaoyan.cn/img/<文件名>` 保留为每张卡片的 `image.serverSrc`。正式计数接口继续使用 Tencent CloudBase；只有明确迁移统计服务时才修改 `clickCounter.apiBaseUrl`。本地图像 `fallbackSrc` 继续保留。

## 部署

将仓库内容提交到 GitHub，在 Pages 设置中选择从目标分支的根目录部署即可。项目包含 `.nojekyll`、`sitemap.xml`、`robots.txt`、canonical、Open Graph 和 Schema.org 结构化数据。

部署后可以向 Google Search Console、Bing Webmaster Tools 和百度搜索资源平台提交：

```text
https://cskaoyan.cn/sitemap.xml
```

欢迎通过 [GitHub 仓库](https://github.com/ucas-cskaoyan-web/cskaoyan-cn) 提交 Issue 或 Pull Request，补充站点、修正介绍或改进页面。
