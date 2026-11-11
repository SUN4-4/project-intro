# RoboRSI Project Intro

> 本目录已归并到 RoboRSI 仓库的 `website/`，由 `website-agent` 负责维护。
> 预览、测试与归属说明见 [`../docs/WEBSITE.md`](../docs/WEBSITE.md)。

RoboRSI 的项目介绍页：项目定位、核心能力、最新评测进展，以及 5 个 benchmark
的 333 个 BM 任务。

## 发布

公网地址：<https://sun4-4.github.io/project-intro/>

`website/` 是源文件。任何修改 `website/` 的 commit 都会触发
`.githooks/post-commit`，由 `scripts/publish-website` 同步到
`SUN4-4/project-intro` GitHub Pages 镜像，作为阶段性成果自动发布。
新克隆仓库后运行一次：

```bash
./scripts/install-website-publish-hook
```

手动发布：`./scripts/publish-website`。发布日志在
`~/.cache/roborsi/website-publish.log`。

## BM 任务目录

333 个 BM 任务由 `data/scripts/build_tasks_js.py` 统一生成。编号按
`LIBERO → RoboTwin → BEHAVIOR-1K → robosuite → RoboDojo` 顺序连续分配，写入
`data/bm/tasks.json`，并同步生成 `assets/tasks.js`。

源码目录只保存任务定义。执行状态、尝试次数、失败原因、视频和轨迹位于：

```text
$ROBORSI_ARTIFACT_DIR/website/data/
```

发布会把外部 artifact 临时叠加到源码后再生成完整站点，因此运行 campaign
不会把结果写回这个 checkout。

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
