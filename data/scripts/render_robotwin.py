"""Render one initial-state frame per RoboTwin task for the website gallery.

Runs inside the benchmark's own conda env:

    ~/miniforge3/envs/robotwin/bin/python \
        website/data/scripts/render_robotwin.py --out website/data/robotwin

Each task is built with the benchmark's own ``setup_demo`` (the same call the
data collector uses) and the head camera is captured before any robot motion.
No policy is run and no ground-truth state is read: the frame is exactly what
the head camera sees at episode start.
"""

from __future__ import annotations

import argparse
import importlib
import json
import os
import sys
import time
from pathlib import Path

import yaml


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=os.path.expanduser("~/robot-benchmarks/RoboTwin"))
    parser.add_argument("--out", default="website/data/robotwin")
    parser.add_argument("--config", default="demo_clean")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--size", type=int, default=512)
    parser.add_argument("--quality", type=int, default=80)
    parser.add_argument("--only", default=None, help="comma separated task ids")
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    out = Path(args.out).expanduser().resolve()
    images = out / "images"
    images.mkdir(parents=True, exist_ok=True)
    os.chdir(root)
    sys.path.insert(0, str(root))

    import numpy as np  # noqa: E402
    from PIL import Image  # noqa: E402

    from envs._GLOBAL_CONFIGS import CONFIGS_PATH  # noqa: E402

    catalog = json.loads((out / "tasks.json").read_text(encoding="utf-8"))
    wanted = set(args.only.split(",")) if args.only else None

    with open(os.path.join(CONFIGS_PATH, f"{args.config}.yml"), encoding="utf-8") as handle:
        base_args = yaml.load(handle.read(), Loader=yaml.FullLoader)
    with open(os.path.join(CONFIGS_PATH, "_embodiment_config.yml"), encoding="utf-8") as handle:
        embodiment_types = yaml.load(handle.read(), Loader=yaml.FullLoader)

    embodiment = base_args["embodiment"][0]
    robot_file = embodiment_types[embodiment]["file_path"]
    with open(os.path.join(robot_file, "config.yml"), encoding="utf-8") as handle:
        embodiment_config = yaml.load(handle.read(), Loader=yaml.FullLoader)

    base_args["left_robot_file"] = robot_file
    base_args["right_robot_file"] = robot_file
    base_args["dual_arm_embodied"] = True
    base_args["left_embodiment_config"] = embodiment_config
    base_args["right_embodiment_config"] = embodiment_config
    base_args["embodiment_name"] = str(embodiment)
    base_args["task_config"] = args.config
    base_args["render_freq"] = 0
    base_args["save_data"] = False
    base_args["collect_data"] = False
    base_args["eval_mode"] = False
    base_args["need_plan"] = False
    base_args["camera"] = dict(base_args["camera"])
    base_args["camera"]["head_camera_type"] = "Large_D435"
    base_args["camera"]["collect_head_camera"] = True
    base_args["camera"]["collect_wrist_camera"] = False

    written = 0
    failures: list[dict] = []
    started = time.time()

    for record in catalog["tasks"]:
        task_name = record["id"]
        if wanted is not None and task_name not in wanted:
            continue
        if args.limit and written >= args.limit:
            break
        env = None
        try:
            module = importlib.import_module(f"envs.{task_name}")
            env = getattr(module, task_name)()
            task_args = dict(base_args)
            task_args["task_name"] = task_name
            env.setup_demo(now_ep_num=0, seed=args.seed, **task_args)
            env._update_render()
            env.cameras.update_picture()
            camera = env.cameras.static_camera_list[env.cameras.head_camera_id]
            frame = camera.get_picture("Color")[..., :3]
            frame = np.clip(frame * 255.0, 0, 255).astype(np.uint8)
            image = Image.fromarray(frame)
            if image.size != (args.size, args.size):
                image = image.resize((args.size, args.size), Image.LANCZOS)
            image.save(images / f"{task_name}.jpg", quality=args.quality, optimize=True)
            written += 1
            print(f"ok {task_name}", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001 - report, keep going
            failures.append({"id": task_name, "error": f"{type(exc).__name__}: {exc}"})
            print(f"FAIL {task_name}: {type(exc).__name__}: {exc}", file=sys.stderr)
        finally:
            if env is not None:
                try:
                    env.close_env(clear_cache=True)
                except Exception:  # noqa: BLE001
                    pass

    elapsed = time.time() - started
    report = {
        "written": written,
        "failures": failures,
        "seconds": round(elapsed, 1),
        "seconds_per_task": round(elapsed / max(written, 1), 2),
    }
    (out / "render_report.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
