"""Export the robosuite task catalog (names + goals) for the website.

Runs inside the benchmark's own conda env so the task list comes from the
benchmark itself:

    ~/miniforge3/envs/robosuite/bin/python \
        website/data/scripts/export_robosuite.py --out website/data/robosuite

Task names are ``robosuite.environments.ALL_ENVIRONMENTS``. The goal text is
written from each environment's ``_check_success`` predicate in the benchmark
source (cited per entry below), so the description states what the simulator
actually scores. Writes ``tasks.json`` and leaves ``image`` null.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

GOALS = {
    "Lift": (
        "Lift the cube off the table: the cube must end higher than the table top "
        "by more than 4 cm (lift.py:433)."
    ),
    "Stack": (
        "Stack cube A on top of cube B: A is lifted above the table, released by the "
        "gripper and in contact with B (stack.py:268,485)."
    ),
    "NutAssembly": (
        "Pick up each nut and place it around its matching peg, then move the arm "
        "away (nut_assembly.py:622)."
    ),
    "NutAssemblySingle": (
        "Pick up the single nut and place it around its matching peg, then move the "
        "arm away (nut_assembly.py:622, single_object_mode)."
    ),
    "NutAssemblySquare": (
        "Pick up the square nut and place it around the square peg, then move the arm "
        "away (nut_assembly.py:622, single_object_mode)."
    ),
    "NutAssemblyRound": (
        "Pick up the round nut and place it around the round peg, then move the arm "
        "away (nut_assembly.py:622, single_object_mode)."
    ),
    "PickPlace": (
        "Pick up each object and drop it into its matching bin, then move the arm away "
        "(pick_place.py:737)."
    ),
    "PickPlaceSingle": (
        "Pick up the single object and drop it into its matching bin, then move the arm "
        "away (pick_place.py:737, single_object_mode)."
    ),
    "PickPlaceMilk": (
        "Pick up the milk carton and drop it into the correct bin, then move the arm "
        "away (pick_place.py:737, single_object_mode)."
    ),
    "PickPlaceBread": (
        "Pick up the bread and drop it into the correct bin, then move the arm away "
        "(pick_place.py:737, single_object_mode)."
    ),
    "PickPlaceCereal": (
        "Pick up the cereal box and drop it into the correct bin, then move the arm "
        "away (pick_place.py:737, single_object_mode)."
    ),
    "PickPlaceCan": (
        "Pick up the can and drop it into the correct bin, then move the arm away "
        "(pick_place.py:737, single_object_mode)."
    ),
    "Door": (
        "Pull the door handle to open the door: the hinge angle must exceed 0.3 rad "
        "(door.py:425)."
    ),
    "Wipe": (
        "Wipe the table clean: every dirt marker must be wiped (wipe.py:698)."
    ),
    "ToolHang": (
        "Assemble the frame and hang the tool on its hook so the tool rests on the "
        "frame without the robot holding it (tool_hang.py:597,661)."
    ),
    "TwoArmLift": (
        "Both arms lift the pot together: the pot bottom must rise more than 10 cm "
        "above the table (two_arm_lift.py:490)."
    ),
    "TwoArmHandover": (
        "Hand the hammer from one arm to the other: the receiving arm holds the handle, "
        "the giving arm has released it and the hammer is lifted above the table "
        "(two_arm_handover.py:545)."
    ),
    "TwoArmPegInHole": (
        "Insert the peg into the hole: the peg must be aligned with the hole axis and "
        "inserted to the right depth (two_arm_peg_in_hole.py:488)."
    ),
    "TwoArmTransport": (
        "Carry the payload into the target bin and the trash into the trash bin "
        "(two_arm_transport.py:596)."
    ),
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="website/data/robosuite")
    args = parser.parse_args()

    out = Path(args.out).expanduser().resolve()
    out.mkdir(parents=True, exist_ok=True)

    import robosuite  # noqa: E402

    names = sorted(robosuite.environments.ALL_ENVIRONMENTS)
    records: list[dict] = []
    missing: list[str] = []
    for index, name in enumerate(names):
        goal = GOALS.get(name)
        if goal is None:
            missing.append(name)
        records.append(
            {
                "id": name,
                "benchmark": "robosuite",
                "suite": "robosuite",
                "index": index,
                "name": name,
                "instruction": goal,
                "image": None,
            }
        )

    payload = {
        "benchmark": "robosuite",
        "label": "Robosuite",
        "generated_by": "website/data/scripts/export_robosuite.py",
        "tasks": records,
    }
    (out / "tasks.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"wrote {len(records)} tasks -> {out / 'tasks.json'}", file=sys.stderr)
    if missing:
        print(f"missing goal text: {missing}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
