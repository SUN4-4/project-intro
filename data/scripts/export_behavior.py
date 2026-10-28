"""Export the BEHAVIOR-1K task catalog and official demo thumbnails.

    ~/RoboRSI/.venv/bin/python website/data/scripts/export_behavior.py

Sources (read-only, never the simulator):
  * tasks, scenes, rooms, instructions and demo videos: the official 2026
    challenge Demo Gallery at ``https://behavior.stanford.edu/challenge/tasks/``
    (cached in ``gallery.json`` next to this script's output).
  * goals: ``bddl3/bddl/activity_definitions/<task>/problem0.bddl``
  * images: the official gallery thumbnail (vumbnail proxy for the Vimeo demo).

Why not local screenshots? Isaac Sim 5.1 on this host segfaults during RTX
scene-database startup with driver 595.99.02 (``librtx.scenedb.plugin`` ->
``libcarb.scenerenderer-rtx``). The official demo thumbnails are real task
frames and let the website ship independently; ``image_kind`` records the
provenance so local renders can replace them later.

Writes ``tasks.json``, ``gallery.json`` and ``render_report.json`` under ``--out``.
"""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

import yaml
from PIL import Image

BENCHMARK = "behavior"
LABEL = "BEHAVIOR-1K"
IMAGE_KIND = "demo_thumbnail"
IMAGE_SOURCE = "https://behavior.stanford.edu/challenge/tasks/"
GALLERY_URL = "https://behavior.stanford.edu/challenge/tasks/"
NOTE = "官方 BEHAVIOR-1K 演示视频截图；本机 Isaac Sim RTX 启动 segfault，暂不本地渲染"
IMAGE_SIZE = (512, 320)
GOAL_RAW_LIMIT = 400
GOAL_SUMMARY_LIMIT = 160
BACKGROUND = (255, 255, 255)

DEFAULT_ROOT = Path.home() / "robot-benchmarks" / "BEHAVIOR-1K"
DEFAULT_OUT = Path(__file__).resolve().parents[1] / "behavior"

SCENE_LABELS = {
    "house_double_floor_lower": "双层住宅 · 下层",
    "house_double_floor_upper": "双层住宅 · 上层",
    "house_single_floor": "单层住宅",
    "restaurant_diner": "餐厅",
    "Rs_int": "小型住宅 Rs_int",
    "office_cubicles_right": "右侧办公区",
    "hotel_suite_large": "大型酒店套房",
}
ROOM_LABELS = {
    "kitchen": "厨房",
    "living_room": "客厅",
    "bedroom": "卧室",
    "bathroom": "卫生间",
    "garage": "车库",
    "garden": "花园",
    "childs_room": "儿童房",
    "child's_room": "儿童房",
    "corridor": "走廊",
    "utility_room": "洗衣房",
    "dining_room": "餐厅",
    "entryway": "玄关",
    "private_office": "私人办公室",
    "shared_office": "共享办公室",
    "copy_room": "复印室",
    "bar": "吧台",
}


def readable_name(task: str) -> str:
    words = task.replace("_", " ").strip()
    return f"{words[:1].upper()}{words[1:]}."


def fetch_text(url: str, timeout: float = 30) -> str:
    request = urllib.request.Request(
        url, headers={"User-Agent": "Mozilla/5.0 RoboRSI-website-export"}
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", "replace")


def parse_gallery(html: str) -> list[dict]:
    start = html.find("const tasks = ")
    if start < 0:
        raise ValueError("official gallery page has no 'const tasks = ' array")
    array_start = html.find("[", start)
    if array_start < 0:
        raise ValueError("official gallery page has no task array")
    payload, _ = json.JSONDecoder().raw_decode(html[array_start:])
    if not isinstance(payload, list) or not payload:
        raise ValueError("official gallery task array is empty")
    return [item for item in payload if isinstance(item, dict)]


def load_gallery(args: argparse.Namespace, out: Path) -> list[dict]:
    cached = out / "gallery.json"
    if not args.refresh and cached.is_file():
        payload = json.loads(cached.read_text(encoding="utf-8"))
        if isinstance(payload, list) and payload:
            return payload
    html = fetch_text(GALLERY_URL)
    payload = parse_gallery(html)
    out.mkdir(parents=True, exist_ok=True)
    cached.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return payload


def extract_goal(bddl_text: str) -> str:
    start = bddl_text.find("(:goal")
    if start < 0:
        return ""
    depth = 0
    for index in range(start, len(bddl_text)):
        char = bddl_text[index]
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
            if depth == 0:
                return bddl_text[start : index + 1]
    return bddl_text[start:]


def summarize_goal(goal: str) -> str:
    text = goal.replace("?", "")
    text = re.sub(r"\.n\.\d+", "", text)
    text = re.sub(r"[()]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:GOAL_SUMMARY_LIMIT].strip()


def normalize_thumbnail(url: str) -> str:
    """Use the accessible vumbnail proxy for YouTube-hosted demo thumbnails."""
    match = re.search(r"img\.youtube\.com/vi/([^/]+)/", url)
    if match:
        return f"https://vumbnail.com/{match.group(1)}.jpg"
    return url


def download_thumbnail(
    url: str, target: Path, force: bool = False, retries: int = 4
) -> None:
    if target.is_file() and target.stat().st_size > 5000 and not force:
        return
    if not url:
        raise ValueError("missing thumbnail URL")
    url = normalize_thumbnail(url)
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            request = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 RoboRSI-website-export",
                    "Accept": "image/avif,image/webp,image/jpeg,image/*,*/*;q=0.8",
                },
            )
            with urllib.request.urlopen(request, timeout=45) as response:
                data = response.read()
            if len(data) < 2000:
                raise ValueError(f"thumbnail too small: {len(data)} bytes")
            temporary = target.with_suffix(".download")
            temporary.write_bytes(data)
            try:
                with Image.open(temporary) as raw:
                    image = raw.convert("RGB")
                    canvas = Image.new("RGB", IMAGE_SIZE, BACKGROUND)
                    image.thumbnail(IMAGE_SIZE, Image.LANCZOS)
                    offset = (
                        (IMAGE_SIZE[0] - image.width) // 2,
                        (IMAGE_SIZE[1] - image.height) // 2,
                    )
                    canvas.paste(image, offset)
                    target.parent.mkdir(parents=True, exist_ok=True)
                    canvas.save(target, "JPEG", quality=88, optimize=True)
            finally:
                temporary.unlink(missing_ok=True)
            return
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as error:
            last_error = error
            time.sleep(1.5 * (attempt + 1))
    raise last_error if last_error else RuntimeError("thumbnail download failed")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(DEFAULT_ROOT))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    parser.add_argument(
        "--refresh", action="store_true", help="re-fetch the official gallery page"
    )
    parser.add_argument(
        "--force-images",
        action="store_true",
        help="re-download every thumbnail even when a local image exists",
    )
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    out = Path(args.out).expanduser().resolve()
    images_dir = out / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    gallery = load_gallery(args, out)
    tasks_yaml = (
        root
        / "datasets/2026-challenge-task-instances/metadata/available_tasks.yaml"
    )
    definitions = root / "bddl3/bddl/activity_definitions"
    catalog = (
        yaml.safe_load(tasks_yaml.read_text(encoding="utf-8")) or {}
        if tasks_yaml.is_file()
        else {}
    )

    tasks: list[dict] = []
    failures: list[dict] = []
    written = 0

    for index, entry in enumerate(sorted(gallery, key=lambda item: str(item.get("id")))):
        task = str(entry.get("id") or "").strip()
        if not task:
            failures.append({"task": "", "stage": "metadata", "error": "missing id"})
            continue
        scene = str(entry.get("scene_model") or "").strip()
        if not scene and task in catalog:
            first = catalog[task][0]
            scene = str(first.get("scene_model") or "")
        rooms = [str(room) for room in (entry.get("rooms") or [])]
        name = str(entry.get("name") or readable_name(task)).strip()
        instruction = str(entry.get("instruction") or "").strip() or f"{name}."

        bddl_path = definitions / task / "problem0.bddl"
        goal_raw = ""
        goal_summary = ""
        if bddl_path.exists():
            goal = extract_goal(bddl_path.read_text(encoding="utf-8"))
            goal_raw = re.sub(r"\s+", " ", goal).strip()[:GOAL_RAW_LIMIT]
            goal_summary = summarize_goal(goal)
        else:
            failures.append(
                {"task": task, "stage": "goal", "error": f"missing {bddl_path}"}
            )

        image_rel = f"images/{task}.jpg"
        try:
            download_thumbnail(
                str(entry.get("thumbnail") or ""),
                out / image_rel,
                force=args.force_images,
            )
            written += 1
        except Exception as error:  # noqa: BLE001 - report, keep exporting
            failures.append(
                {"task": task, "stage": "image", "error": str(error)}
            )

        tasks.append(
            {
                "id": f"{BENCHMARK}/{task}",
                "benchmark": BENCHMARK,
                "suite": scene,
                "suite_label": SCENE_LABELS.get(scene, scene.replace("_", " ")),
                "index": index,
                "name": name,
                "display_name": name,
                "instruction": instruction,
                "rooms": rooms,
                "room_labels": [ROOM_LABELS.get(room, room) for room in rooms],
                "duration_seconds": entry.get("duration"),
                "video_url": entry.get("video") or "",
                "goal_raw": goal_raw,
                "goal_summary": goal_summary,
                "image": image_rel,
                "image_kind": IMAGE_KIND,
                "image_source": IMAGE_SOURCE,
                "note": NOTE,
            }
        )

    payload = {
        "benchmark": BENCHMARK,
        "label": LABEL,
        "generated_by": "website/data/scripts/export_behavior.py",
        "image_kind": IMAGE_KIND,
        "source": IMAGE_SOURCE,
        "tasks": tasks,
    }
    (out / "tasks.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    report = {
        "benchmark": BENCHMARK,
        "image_kind": IMAGE_KIND,
        "source": IMAGE_SOURCE,
        "size": list(IMAGE_SIZE),
        "tasks": len(tasks),
        "written": written,
        "failures": failures,
        "simulator": {
            "status": "segmentation fault",
            "component": "librtx.scenedb.plugin -> libcarb.scenerenderer-rtx",
            "gpu": "NVIDIA GeForce RTX 5070 Ti",
            "driver": "595.99.02",
            "note": "Isaac Sim 5.1 RTX scene database crashes on startup; use official demo thumbnails or a compatible driver/remote host.",
        },
    }
    (out / "render_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"tasks={len(tasks)} images_written={written} failures={len(failures)}")
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
