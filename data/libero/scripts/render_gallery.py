import json, os, sys, time
import numpy as np
from PIL import Image

sys.path.insert(0, ".")
from libero.libero import benchmark, get_libero_path
from libero.libero.envs import OffScreenRenderEnv

OUT = sys.argv[1]
SUITES = sys.argv[2].split(",")
SIZE = int(sys.argv[3]) if len(sys.argv) > 3 else 512
os.makedirs(os.path.join(OUT, "images"), exist_ok=True)

rows = []
for suite in SUITES:
    inst = benchmark.get_benchmark_dict()[suite]()
    n = inst.n_tasks
    for idx in range(n):
        task = inst.get_task(idx)
        entry = {
            "id": f"{suite}/{idx}",
            "suite": suite,
            "index": idx,
            "name": task.name,
            "instruction": task.language,
            "image": None,
        }
        safe = f"{suite}_{idx:03d}"
        try:
            init = inst.get_task_init_states(idx)
            bddl = os.path.join(get_libero_path("bddl_files"), task.problem_folder, task.bddl_file)
            env = OffScreenRenderEnv(bddl_file_name=bddl, camera_heights=SIZE, camera_widths=SIZE)
            env.reset()
            obs = env.set_init_state(init[0])
            for _ in range(5):
                obs, _, _, _ = env.step([0.0] * 7)
            img = np.flipud(obs["agentview_image"])
            Image.fromarray(img).save(os.path.join(OUT, "images", safe + ".jpg"), quality=80)
            entry["image"] = f"images/{safe}.jpg"
            env.close()
        except Exception as exc:
            entry["error"] = f"{type(exc).__name__}: {exc}"
        rows.append(entry)
        print(json.dumps({"id": entry["id"], "ok": entry["image"] is not None}), flush=True)

with open(os.path.join(OUT, "tasks.json"), "w", encoding="utf-8") as fh:
    json.dump(rows, fh, ensure_ascii=False, indent=1)
print("DONE", len(rows), sum(1 for r in rows if r["image"]))
