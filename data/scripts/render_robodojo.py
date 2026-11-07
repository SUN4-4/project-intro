"""Render one initial-state head-camera frame per RoboDojo task.

The renderer runs in the RoboRSI environment and asks the ``robodojo`` backend
to spawn the Isaac Sim service for each canonical task. It saves the first
frame returned by ``reset(seed=0)`` before any robot motion, matching the
LIBERO / RoboTwin / robosuite thumbnails.

    ~/RoboRSI/.venv/bin/python website/data/scripts/render_robodojo.py \
        --out website/data/robodojo

Use ``--only task_a,task_b`` to retry a subset and ``--limit N`` for a smoke
run. A JSON report is written next to ``tasks.json``.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

WEB_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = WEB_ROOT.parent


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(WEB_ROOT / "data" / "robodojo"))
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--size", type=int, default=512)
    parser.add_argument("--quality", type=int, default=85)
    parser.add_argument("--only", default=None, help="comma-separated task ids")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--startup-timeout", type=float, default=300)
    parser.add_argument("--reset-timeout", type=float, default=300)
    parser.add_argument("--skip-existing", action="store_true")
    args = parser.parse_args()

    out = Path(args.out).expanduser().resolve()
    images = out / "images"
    images.mkdir(parents=True, exist_ok=True)
    catalog = json.loads((out / "tasks.json").read_text(encoding="utf-8"))
    wanted = set(args.only.split(",")) if args.only else None

    os.environ["ROBORSI_ROBODOJO_HTTP_TIMEOUT"] = str(args.reset_timeout)
    os.environ["ROBORSI_ROBODOJO_STARTUP_TIMEOUT"] = str(args.startup_timeout)
    sys.path.insert(0, str(REPO_ROOT))
    import cv2

    from roborsi.embodied.agent_loop import get_backend

    backend = get_backend("robodojo")
    ok, reason = backend.available()
    if not ok:
        print(f"[render_robodojo] backend unavailable: {reason}", file=sys.stderr)
        return 2

    written = 0
    failures: list[dict] = []
    started = time.time()

    for record in catalog["tasks"]:
        task = record["id"]
        if wanted is not None and task not in wanted:
            continue
        if args.limit and written >= args.limit:
            break
        env = None
        task_started = time.time()
        path = images / f"{task}.jpg"
        if args.skip_existing and path.is_file():
            print(f"skip {task} (exists)", file=sys.stderr)
            continue
        try:
            env = backend.make_env(task, {"startup_timeout": args.startup_timeout})
            obs = env.reset(args.seed)
            rgb = obs.images.get("head_camera")
            if rgb is None:
                raise RuntimeError(f"no head_camera in observation: {sorted(obs.images)}")
            image = cv2.resize(rgb, (args.size, args.size), interpolation=cv2.INTER_AREA)
            cv2.imwrite(
                str(path),
                cv2.cvtColor(image, cv2.COLOR_RGB2BGR),
                [cv2.IMWRITE_JPEG_QUALITY, args.quality],
            )
            written += 1
            print(
                f"ok {task} ({time.time() - task_started:.1f}s) -> {path.name}",
                file=sys.stderr,
            )
        except Exception as exc:  # noqa: BLE001 - report and continue
            failures.append({"id": task, "error": f"{type(exc).__name__}: {exc}"})
            print(f"FAIL {task}: {type(exc).__name__}: {exc}", file=sys.stderr)
        finally:
            if env is not None:
                process = getattr(env, "_process", None)
                if process is not None and process.poll() is None:
                    process.kill()
                    try:
                        process.wait(timeout=10)
                    except Exception:  # noqa: BLE001
                        pass

    report = {
        "benchmark": "robodojo",
        "seed": args.seed,
        "size": args.size,
        "written": written,
        "failures": failures,
        "elapsed_s": round(time.time() - started, 1),
    }
    (out / "render_report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(
        f"[render_robodojo] wrote {written} images, {len(failures)} failures "
        f"in {report['elapsed_s']}s",
        file=sys.stderr,
    )
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
