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
      src: "images/new-cover.jpg",
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
- `image.src`：封面路径；`image.position`：图片裁切位置，例如 `center 20%`。
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

卡片点击量由 `counter-worker/` 下的 Cloudflare Worker 记录，并保存在 D1 数据库中。首页只统计用户从卡片进入专题站的点击，不读取目标网站访问量。

新增院所时需要完成两项配置：

- 在 `site-config.js` 对应 profile 中增加唯一的 `counterId`。
- 在 `counter-worker/src/index.js` 的 `SITE_IDS` 中加入同一个 ID。

修改 Worker 后，在 WSL 中部署：

```bash
cd counter-worker
npm install
npm run db:apply
npm run deploy
```

`db:apply` 用于创建或更新表结构，不会清空已有点击量。线上接口地址配置在 `site-config.js` 的 `clickCounter.apiBaseUrl`。

## 部署

将仓库内容提交到 GitHub，在 Pages 设置中选择从目标分支的根目录部署即可。项目包含 `.nojekyll`、`sitemap.xml`、`robots.txt`、canonical、Open Graph 和 Schema.org 结构化数据。

部署后可以向 Google Search Console、Bing Webmaster Tools 和百度搜索资源平台提交：

```text
https://cskaoyan.cn/sitemap.xml
```

欢迎通过 [GitHub 仓库](https://github.com/ucas-cskaoyan-web/cskaoyan-cn) 提交 Issue 或 Pull Request，补充站点、修正介绍或改进页面。
