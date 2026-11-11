"""Regenerate the BM catalog and website/assets/tasks.js.

    ~/RoboRSI/.venv/bin/python website/data/scripts/build_tasks_js.py

BM = RoboRSI Embodied Brain task Goal set. Every deployed benchmark task gets
one stable BM id (BM-001 ...), a video placeholder, and the original task ids
needed to resolve it back to the simulator.

The main gallery is intentionally static JS so it works from a plain static
host (including GitHub Pages) without a fetch on first paint. The same catalog
is also written to data/bm/tasks.json for non-browser tooling.
"""

from __future__ import annotations

import json
from pathlib import Path

WEB_ROOT = Path(__file__).resolve().parents[2]
GROUPS = (
    ("libero", "LIBERO"),
    ("robotwin", "RoboTwin"),
    ("behavior", "BEHAVIOR-1K"),
    ("robosuite", "robosuite"),
    ("robodojo", "RoboDojo"),
)

# robosuite registers 19 environments, but eight are object/layout variants of
# two task families. Keep one BM task per semantic family and record the
# variants underneath it.
ROBOSUITE_FAMILIES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("Door", ()),
    ("Lift", ()),
    ("NutAssembly", ("NutAssemblySingle", "NutAssemblySquare", "NutAssemblyRound")),
    (
        "PickPlace",
        (
            "PickPlaceSingle",
            "PickPlaceMilk",
            "PickPlaceBread",
            "PickPlaceCereal",
            "PickPlaceCan",
        ),
    ),
    ("Stack", ()),
    ("ToolHang", ()),
    ("TwoArmHandover", ()),
    ("TwoArmLift", ()),
    ("TwoArmPegInHole", ()),
    ("TwoArmTransport", ()),
    ("Wipe", ()),
)

BM_DESCRIPTION = (
    "RoboRSI 需要让具身大脑完成的任务目标集合。每个任务一个 BM 编号，"
    "成功视频、执行记录和技能后续都挂在该编号下。"
)


def _load_tasks(benchmark: str) -> list[dict]:
    path = WEB_ROOT / "data" / benchmark / "tasks.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    return payload.get("tasks") or []


def _robosuite_family_tasks(tasks: list[dict]) -> list[dict]:
    by_id = {task["id"]: task for task in tasks}
    family_tasks: list[dict] = []
    for family, variants in ROBOSUITE_FAMILIES:
        if family not in by_id:
            raise SystemExit(f"missing robosuite task: {family}")
        task = dict(by_id[family])
        task["variants"] = list(variants)
        task["source_ids"] = [family, *variants]
        family_tasks.append(task)
    return family_tasks


def _previous_video_state() -> dict[str, dict]:
    """Keep video slots attached to their BM id across catalog rebuilds."""
    path = WEB_ROOT / "data" / "bm" / "tasks.json"
    if not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    return {
        task["bm_id"]: task
        for task in payload.get("tasks") or []
        if task.get("bm_id")
    }


def _previous_results_summary() -> dict | None:
    path = WEB_ROOT / "data" / "bm" / "tasks.json"
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    summary = payload.get("results_summary")
    return summary if isinstance(summary, dict) else None


_EXEC_FIELDS = (
    "blender_status",
    "failure_video_url",
    "failure_video_status",
    "video_kind",
    "exec_status",
    "exec_success_rate",
    "exec_attempts",
    "exec_rounds",
    "exec_duration_s",
    "exec_failure_reason",
    "exec_note",
    "exec_checked_at",
    "agent_success_videos",
    "agent_success_count",
    "agent_loop_updated_at",
    "success_video_label",
    "agent_status",
    "agent_attempts",
    "agent_rounds",
    "agent_started_at",
    "agent_finished_at",
    "agent_duration_s",
    "agent_failure_reason",
    "agent_analysis",
    "agent_success_video_url",
    "agent_last_failure_video_url",
    "agent_clean_success",
    "agent_success_kind",
    "agent_success_note",
    "agent_clean_grasp_trajectory_url",
    "agent_confirmed_success",
    "agent_replay_status",
    "agent_replay_success",
    "agent_replay_video_url",
    "agent_replay_failure_video_url",
    "agent_replay_attempts",
    "agent_replay_finished_at",
    "agent_replay_note",
    "agent_thinking_s",
    "agent_time_breakdown",
    "agent_tool_counts",
    "agent_thinking",
    "agent_reflections",
    "agent_failure_counts",
    "agent_mode",
    "agent_tool_calls",
)


def _prepare_task(
    task: dict,
    benchmark: str,
    benchmark_label: str,
    seq: int,
    previous: dict[str, dict],
) -> dict:
    prepared = dict(task)
    bm_id = f"BM-{seq:03d}"
    prepared["bm_id"] = bm_id
    prepared["bm_seq"] = seq
    prepared["benchmark"] = benchmark
    prepared["benchmark_label"] = benchmark_label

    prior = previous.get(bm_id) or {}
    prepared["video_status"] = prior.get("video_status") or "pending"
    prepared["success_video_url"] = prior.get("success_video_url")
    for field in _EXEC_FIELDS:
        if field in prior:
            prepared[field] = prior[field]

    if "video_url" in prepared:
        prepared["demo_video_url"] = prepared.pop("video_url")
    return prepared


def main() -> int:
    groups: list[dict] = []
    flat_tasks: list[dict] = []
    previous = _previous_video_state()
    seq = 0

    for benchmark, label in GROUPS:
        tasks = _load_tasks(benchmark)
        if benchmark == "robosuite":
            tasks = _robosuite_family_tasks(tasks)

        prepared_tasks = []
        for task in tasks:
            seq += 1
            prepared_tasks.append(
                _prepare_task(task, benchmark, label, seq, previous)
            )

        group = {
            "benchmark": benchmark,
            "label": label,
            "dataDir": f"data/{benchmark}",
            "bm_start": prepared_tasks[0]["bm_id"],
            "bm_end": prepared_tasks[-1]["bm_id"],
            "tasks": prepared_tasks,
        }
        groups.append(group)
        flat_tasks.extend(prepared_tasks)

    catalog = {
        "schema": "roborsi.bm_catalog.v1",
        "name": "BM",
        "description": BM_DESCRIPTION,
        "total": len(flat_tasks),
        "groups": groups,
        "tasks": flat_tasks,
    }
    previous_summary = _previous_results_summary()
    if previous_summary:
        catalog["results_summary"] = previous_summary

    catalog_path = WEB_ROOT / "data" / "bm" / "tasks.json"
    catalog_path.parent.mkdir(parents=True, exist_ok=True)
    catalog_path.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    output = WEB_ROOT / "assets" / "tasks.js"
    body = json.dumps(catalog, ensure_ascii=False, separators=(",", ":"))
    output.write_text(
        "// Generated by data/scripts/build_tasks_js.py; do not edit by hand.\n"
        f"window.BM_CATALOG = {body};\n"
        "window.BENCHMARK_TASKS = window.BM_CATALOG.groups;\n"
        "window.BM_TASKS = window.BM_CATALOG.tasks;\n",
        encoding="utf-8",
    )

    print(
        f"wrote {output} and {catalog_path} with {len(groups)} groups and "
        f"{len(flat_tasks)} BM tasks"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
