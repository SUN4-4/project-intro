"""Export the LIBERO-Plus 10,030-task perturbation catalog.

    ~/RoboRSI/.venv/bin/python website/data/scripts/export_libero_plus.py

Source: ``LIBERO-plus/libero/libero/benchmark/task_classification.json``.
LIBERO-Plus is a stress-test variant of the four LIBERO suites. Each row is one
perturbation instance; the website shows the full catalog in a searchable,
paginated page and uses a reference simulation frame per suite rather than
duplicating 10,000 near-identical images.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

from PIL import Image

BENCHMARK = "libero-plus"
LABEL = "LIBERO-Plus"
IMAGE_KIND = "suite_reference"
NOTE = "LIBERO-Plus 扰动实例；图片为对应基础 suite 的仿真参考帧"
IMAGE_SIZE = (640, 400)
BACKGROUND = (255, 255, 255)

DEFAULT_ROOT = Path.home() / "robot-benchmarks" / "LIBERO-plus"
DEFAULT_LIBERO_IMAGES = Path(__file__).resolve().parents[1] / "libero" / "images"
DEFAULT_OUT = Path(__file__).resolve().parents[1] / "libero-plus"

SUITE_LABELS = {
    "libero_spatial": "LIBERO-Spatial · 空间关系",
    "libero_object": "LIBERO-Object · 物体",
    "libero_goal": "LIBERO-Goal · 目标",
    "libero_10": "LIBERO-10 · 长序列",
}
CATEGORY_LABELS = {
    "Background Textures": "背景纹理",
    "Camera Viewpoints": "相机视角",
    "Light Conditions": "光照条件",
    "Objects Layout": "物体布局",
    "Robot Initial States": "机器人初始状态",
    "Sensor Noise": "传感器噪声",
    "Language Instructions": "语言指令",
}

_SUFFIX = re.compile(
    r"_(?:table|view|initstate|noise|light|language|layout|background|camera|"
    r"object|robot|sensor)[_-].*$",
    re.IGNORECASE,
)


def base_task(name: str) -> str:
    return _SUFFIX.sub("", name).strip("_")


def humanize(name: str) -> str:
    text = name.replace("_", " ").strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text[:1].upper() + text[1:] if text else text


def fit_reference(source: Path, target: Path) -> None:
    with Image.open(source) as raw:
        image = raw.convert("RGB")
        canvas = Image.new("RGB", IMAGE_SIZE, BACKGROUND)
        image.thumbnail(IMAGE_SIZE, Image.LANCZOS)
        offset = (
            (IMAGE_SIZE[0] - image.width) // 2,
            (IMAGE_SIZE[1] - image.height) // 2,
        )
        canvas.paste(image, offset)
        target.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(target, "JPEG", quality=90, optimize=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(DEFAULT_ROOT))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    parser.add_argument("--libero-images", default=str(DEFAULT_LIBERO_IMAGES))
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    out = Path(args.out).expanduser().resolve()
    source = root / "libero" / "libero" / "benchmark" / "task_classification.json"
    payload = json.loads(source.read_text(encoding="utf-8"))
    libero_images = Path(args.libero_images).expanduser().resolve()

    images_dir = out / "images"
    suite_images: dict[str, str] = {}
    for suite in payload:
        candidates = [
            libero_images / f"{suite}_000.jpg",
            libero_images / f"{suite}_000.png",
        ]
        reference = next((path for path in candidates if path.is_file()), None)
        if reference is None:
            continue
        image_rel = f"data/libero-plus/images/{suite}.jpg"
        fit_reference(reference, out / "images" / f"{suite}.jpg")
        suite_images[suite] = image_rel

    hero_source = root / "static" / "images" / "libero-plus.jpg"
    if hero_source.is_file():
        fit_reference(hero_source, out / "hero.jpg")

    tasks: list[dict] = []
    suite_counts: Counter[str] = Counter()
    category_counts: Counter[str] = Counter()
    difficulty_counts: Counter[int] = Counter()
    for suite, rows in payload.items():
        for row in rows:
            name = str(row.get("name") or "").strip()
            if not name:
                continue
            base = base_task(name)
            readable = humanize(base)
            category = str(row.get("category") or "")
            difficulty = int(row.get("difficulty_level") or 0)
            suite_counts[suite] += 1
            category_counts[category] += 1
            difficulty_counts[difficulty] += 1
            tasks.append(
                {
                    "id": f"{BENCHMARK}/{suite}/{row.get('id')}",
                    "benchmark": BENCHMARK,
                    "suite": suite,
                    "suite_label": SUITE_LABELS.get(suite, suite),
                    "index": int(row.get("id") or 0),
                    "name": name,
                    "base_task": base,
                    "display_name": readable,
                    "instruction": f"{readable}.",
                    "category": category,
                    "category_label": CATEGORY_LABELS.get(category, category),
                    "difficulty": difficulty,
                    "difficulty_label": f"L{difficulty}" if difficulty else "未分级",
                    "image": suite_images.get(suite, ""),
                    "image_kind": IMAGE_KIND,
                    "note": NOTE,
                }
            )

    out.mkdir(parents=True, exist_ok=True)
    (out / "tasks.json").write_text(
        json.dumps(
            {
                "benchmark": BENCHMARK,
                "label": LABEL,
                "generated_by": "website/data/scripts/export_libero_plus.py",
                "source": str(source),
                "image_kind": IMAGE_KIND,
                "stats": {
                    "total": len(tasks),
                    "suites": dict(suite_counts),
                    "categories": dict(category_counts),
                    "difficulties": dict(sorted(difficulty_counts.items())),
                },
                "tasks": tasks,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
        + "\n",
        encoding="utf-8",
    )
    report = {
        "benchmark": BENCHMARK,
        "tasks": len(tasks),
        "suites": dict(suite_counts),
        "categories": dict(category_counts),
        "difficulties": dict(sorted(difficulty_counts.items())),
        "suite_images": suite_images,
        "hero": "data/libero-plus/hero.jpg"
        if (out / "hero.jpg").is_file()
        else "",
    }
    (out / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"tasks={len(tasks)} suites={len(suite_counts)} "
        f"categories={len(category_counts)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
