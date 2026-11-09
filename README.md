# RoboRSI Project Intro

> 本目录已归并到 RoboRSI 仓库的 `website/`，由 `website-agent` 负责维护。
> 预览、测试与归属说明见 [`../docs/WEBSITE.md`](../docs/WEBSITE.md)。

RoboRSI 的项目介绍页：项目定位、核心能力、最新评测进展，以及 5 个 benchmark
的 333 个 BM 任务。

## BM 任务目录

333 个 BM 任务由 `data/scripts/build_tasks_js.py` 统一生成。编号按
`LIBERO → RoboTwin → BEHAVIOR-1K → robosuite → RoboDojo` 顺序连续分配，写入
`data/bm/tasks.json`，并同步生成 `assets/tasks.js`。`data/bm/tasks.json`
同时保存每个 BM 任务的最新执行状态、尝试次数、轮次、耗时和失败原因。
后续要挂成功或失败视频时，直接在 `data/bm/tasks.json` 对应 BM 编号上填写
`success_video_url` / `failure_video_url` 并更新 `video_status`，再重跑生成
脚本；脚本会按 BM 编号保留已填写的结果和视频字段。

```bash
python3 data/scripts/build_tasks_js.py
```

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
├── assets/
│   ├── brand-mark.svg
│   ├── main.js
│   ├── styles.css
│   └── tasks.js
├── data/
│   ├── bm/tasks.json        # 333 个 BM 任务的统一编号目录
│   ├── libero/
│   ├── robotwin/
│   ├── robodojo/            # RoboDojo 42 个标准任务 + 缩略图
│   ├── robosuite/
│   ├── behavior/
│   └── scripts/
├── tests/
│   ├── site.test.mjs
│   └── tasks.test.mjs
└── README.md
```
