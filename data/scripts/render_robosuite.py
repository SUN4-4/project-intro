"""Render one initial-state frame per robosuite task for the website gallery.

Runs inside the benchmark's own conda env:

    MUJOCO_GL=egl ~/miniforge3/envs/robosuite/bin/python \
        website/data/scripts/render_robosuite.py --out website/data/robosuite

Each environment is created with the same kwargs the RoboRSI smoke check uses
(``roborsi/agents/benchmarks/control.py``), reset once and the ``agentview``
camera is captured before any robot motion. No policy is run and no
ground-truth state is read.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="website/data/robosuite")
    parser.add_argument("--robot", default="Panda")
    parser.add_argument("--size", type=int, default=512)
    parser.add_argument("--quality", type=int, default=80)
    parser.add_argument("--only", default=None, help="comma separated task ids")
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    out = Path(args.out).expanduser().resolve()
    images = out / "images"
    images.mkdir(parents=True, exist_ok=True)

    import numpy as np  # noqa: E402
    from PIL import Image  # noqa: E402

    import robosuite as suite  # noqa: E402

    catalog = json.loads((out / "tasks.json").read_text(encoding="utf-8"))
    wanted = set(args.only.split(",")) if args.only else None

    written = 0
    failures: list[dict] = []
    started = time.time()

    for record in catalog["tasks"]:
        env_name = record["id"]
        if wanted is not None and env_name not in wanted:
            continue
        if args.limit and written >= args.limit:
            break
        env = None
        try:
            kwargs = {
                "env_name": env_name,
                "robots": [args.robot, args.robot] if env_name.startswith("TwoArm") else args.robot,
                "has_renderer": False,
                "has_offscreen_renderer": True,
                "ignore_done": True,
                "use_camera_obs": True,
                "camera_names": "agentview",
                "camera_heights": args.size,
                "camera_widths": args.size,
                "reward_shaping": True,
            }
            if env_name.startswith("TwoArm"):
                kwargs["env_configuration"] = "opposed"
            env = suite.make(**kwargs)
            obs = env.reset()
            frame = np.flipud(obs["agentview_image"])[..., ::-1]
            Image.fromarray(np.ascontiguousarray(frame)).save(
                images / f"{env_name}.jpg", quality=args.quality, optimize=True
            )
            written += 1
            print(f"ok {env_name}", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001 - report, keep going
            failures.append({"id": env_name, "error": f"{type(exc).__name__}: {exc}"})
            print(f"FAIL {env_name}: {type(exc).__name__}: {exc}", file=sys.stderr)
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
