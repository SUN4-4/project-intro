"""Render one initial-state frame per LIBERO task for the website gallery.

Runs inside the benchmark's own conda env:

    MUJOCO_GL=egl ~/miniforge3/envs/libero/bin/python \
        website/data/scripts/render_libero.py --out website/data/libero

Each task is reset to its first public init state and the agentview camera is
captured before any robot motion. No policy is run and no ground-truth state
is read: the frame is exactly what a camera would see at episode start.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

SUITES = (
    "libero_goal",
    "libero_object",
    "libero_spatial",
    "libero_10",
    "libero_90",
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=os.path.expanduser("~/robot-benchmarks/LIBERO"))
    parser.add_argument("--out", default="website/data/libero")
    parser.add_argument("--size", type=int, default=512)
    parser.add_argument("--quality", type=int, default=80)
    parser.add_argument("--only", default=None, help="comma separated task ids")
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    out = Path(args.out).expanduser().resolve()
    images = out / "images"
    images.mkdir(parents=True, exist_ok=True)
    sys.path.insert(0, str(root))

    import numpy as np  # noqa: E402
    from PIL import Image  # noqa: E402

    from libero.libero import benchmark, get_libero_path  # noqa: E402
    from libero.libero.envs import OffScreenRenderEnv  # noqa: E402

    wanted = set(args.only.split(",")) if args.only else None
    registry = benchmark.get_benchmark_dict()
    written = 0
    failures: list[dict] = []
    started = time.time()

    for suite in SUITES:
        if suite not in registry:
            continue
        instance = registry[suite]()
        for index in range(instance.n_tasks):
            task_id = f"{suite}/{index}"
            if wanted is not None and task_id not in wanted:
                continue
            if args.limit and written >= args.limit:
                break
            task = instance.get_task(index)
            bddl = os.path.join(
                get_libero_path("bddl_files"), task.problem_folder, task.bddl_file
            )
            env = None
            try:
                env = OffScreenRenderEnv(
                    bddl_file_name=bddl,
                    camera_heights=args.size,
                    camera_widths=args.size,
                )
                env.reset()
                init_states = instance.get_task_init_states(index)
                obs = env.set_init_state(init_states[0])
                for _ in range(5):
                    obs, _, _, _ = env.step(np.zeros(7))
                frame = obs["agentview_image"]
                safe = task_id.replace("/", "__")
                Image.fromarray(np.ascontiguousarray(frame[::-1])).save(
                    images / f"{safe}.jpg", quality=args.quality, optimize=True
                )
                written += 1
                print(f"ok {task_id} {task.name}", file=sys.stderr)
            except Exception as exc:  # noqa: BLE001 - report, keep going
                failures.append({"id": task_id, "error": f"{type(exc).__name__}: {exc}"})
                print(f"FAIL {task_id}: {type(exc).__name__}: {exc}", file=sys.stderr)
            finally:
                if env is not None:
                    try:
                        env.close()
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
