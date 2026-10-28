"""Export the RoboTwin task catalog (names + instructions) for the website.

Runs inside the benchmark's own conda env so the task list comes from the
benchmark itself, never from a hand-maintained list:

    ~/miniforge3/envs/robotwin/bin/python \
        website/data/scripts/export_robotwin.py --out website/data/robotwin

Task names are the modules under ``envs/`` (private ``_``-prefixed modules and
the ``_TASK_FILE_EXCLUDES`` set are skipped). The natural-language instruction
is the ``full_description`` field of ``description/task_instruction/<task>.json``.
Writes ``tasks.json`` and leaves ``image`` null; the renderer fills it in.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

TASK_FILE_EXCLUDES = {
    "__init__",
    "_base_task",
    "_GLOBAL_CONFIGS",
    "model_utils",
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=os.path.expanduser("~/robot-benchmarks/RoboTwin"))
    parser.add_argument("--out", default="website/data/robotwin")
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    out = Path(args.out).expanduser().resolve()
    out.mkdir(parents=True, exist_ok=True)

    envs_dir = root / "envs"
    instruction_dir = root / "description" / "task_instruction"
    names = sorted(
        path.stem
        for path in envs_dir.glob("*.py")
        if not path.stem.startswith("_") and path.stem not in TASK_FILE_EXCLUDES
    )

    records: list[dict] = []
    missing_instruction: list[str] = []
    for name in names:
        instruction = None
        instruction_file = instruction_dir / f"{name}.json"
        if instruction_file.is_file():
            payload = json.loads(instruction_file.read_text(encoding="utf-8"))
            instruction = payload.get("full_description")
        else:
            missing_instruction.append(name)
        records.append(
            {
                "id": name,
                "benchmark": "robotwin",
                "suite": "robotwin",
                "index": len(records),
                "name": name,
                "instruction": instruction,
                "image": None,
            }
        )

    payload = {
        "benchmark": "robotwin",
        "label": "RoboTwin",
        "generated_by": "website/data/scripts/export_robotwin.py",
        "tasks": records,
    }
    (out / "tasks.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"wrote {len(records)} tasks -> {out / 'tasks.json'}", file=sys.stderr)
    if missing_instruction:
        print(f"missing instruction json: {missing_instruction}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
