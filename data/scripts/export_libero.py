"""Export the LIBERO task catalog (names + instructions) for the website.

Runs inside the benchmark's own conda env so the task definitions come from
the benchmark itself, never from a hand-maintained list:

    ~/miniforge3/envs/libero/bin/python \
        website/data/scripts/export_libero.py --out website/data/libero

Writes ``tasks.json`` (array of task records) and leaves ``image`` null; the
renderer (``render_libero.py``) fills the image paths in.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
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
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    out = Path(args.out).expanduser().resolve()
    out.mkdir(parents=True, exist_ok=True)
    sys.path.insert(0, str(root))

    from libero.libero import benchmark  # noqa: E402

    registry = benchmark.get_benchmark_dict()
    records: list[dict] = []
    for suite in SUITES:
        if suite not in registry:
            print(f"skip missing suite {suite}", file=sys.stderr)
            continue
        instance = registry[suite]()
        count = instance.n_tasks
        for index in range(count):
            task = instance.get_task(index)
            records.append(
                {
                    "id": f"{suite}/{index}",
                    "benchmark": "libero",
                    "suite": suite,
                    "index": index,
                    "name": task.name,
                    "instruction": task.language,
                    "image": None,
                }
            )
        print(f"{suite}: {count} tasks", file=sys.stderr)

    payload = {
        "benchmark": "libero",
        "label": "LIBERO",
        "generated_by": "website/data/scripts/export_libero.py",
        "tasks": records,
    }
    (out / "tasks.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"wrote {len(records)} tasks -> {out / 'tasks.json'}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
