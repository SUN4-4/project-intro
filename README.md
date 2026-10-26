# Project Intro

一个无需构建步骤的响应式项目介绍页原型。页面当前使用“待定 / 待补充”文案，方便在项目信息确认后直接替换。

## 本地预览

在项目目录运行：

```bash
python3 -m http.server 8000 --directory .
```

然后访问 <http://localhost:8000>。

## 测试

```bash
node --test tests/site.test.mjs
```

## 内容替换

- 项目标题、页面描述和站点名称：`index.html` 顶部及页头
- 首页主标题和介绍：搜索 `hero__lead`
- 项目缘起：搜索 `id="idea"`
- 项目方向：搜索 `id="direction"`
- 当前进展：搜索 `id="progress"`
- 项目档案：搜索 `id="about"`
- 联系方式：搜索 `id="contact"`

视觉变量集中放在 `assets/styles.css` 顶部。修改 `--accent`、`--lime`、`--blue` 和字体栈，就可以整体调整页面风格。

## 目录

```text
.
├── index.html
├── assets/
│   ├── brand-mark.svg
│   ├── main.js
│   └── styles.css
├── tests/
│   └── site.test.mjs
└── README.md
```

## 发布

这是一个纯静态站点，可以直接部署到 GitHub Pages、Netlify、Cloudflare Pages 或任意静态文件服务器。上线前应替换示例域名、标题、介绍、联系方式以及 `meta` 描述。
