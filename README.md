# Project Intro

> 本目录已归并到 RoboRSI 仓库的 `website/`，由 `website-agent` 负责维护。
> 预览、测试与归属说明见 [`../docs/WEBSITE.md`](../docs/WEBSITE.md)。

一个无需构建步骤的响应式项目介绍页。主页面展示 4 个 benchmark 的 299 个任务；`libero-plus.html` 单独展示 LIBERO-Plus 的 10,030 个扰动实例。

## 本地预览

在项目目录运行：

```bash
python3 -m http.server 8000 --directory .
```

然后访问 <http://localhost:8000>。

## 测试

```bash
node --test tests/*.test.mjs
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
├── index.html
├── libero-plus.html
├── assets/
│   ├── brand-mark.svg
│   ├── main.js
│   ├── styles.css
│   ├── tasks.js
│   ├── libero-plus.css
│   └── libero-plus.js
├── data/
│   ├── libero/
│   ├── robotwin/
│   ├── robosuite/
│   ├── behavior/
│   └── libero-plus/
├── tests/
│   ├── site.test.mjs
│   ├── tasks.test.mjs
│   └── libero-plus.test.mjs
└── README.md
```
