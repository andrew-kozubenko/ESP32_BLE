from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .mqtt_consumer import start_mqtt_loop
from .persistence import load_beacons, db
from .config import BEACONS_FILE, PATH_OUT
from .utils import hausdorff
import os
import numpy as np

app = FastAPI(title="Hackyadro Backend", version="1.0")

# -------------------
# Middleware
# -------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # во время хакатона проще открыть всем
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------
# Startup
# -------------------
@app.on_event("startup")
def startup_event():
    start_mqtt_loop()
    print("MQTT consumer started")

# -------------------
# Health & Info
# -------------------
@app.get("/api/v1/health")
def health():
    return {"status": "ok"}

@app.get("/api/v1/info")
def info():
    return {
        "team": os.getenv("TEAM", "YOUR_TEAM_NAME"),
        "beacons_file": BEACONS_FILE,
        "path_file": PATH_OUT,
    }

# -------------------
# Beacons
# -------------------
@app.get("/api/v1/beacons")
def get_beacons():
    return load_beacons(BEACONS_FILE)

# -------------------
# Tracks
# -------------------
@app.get("/api/v1/tracks/{device_id}")
def get_track(device_id: str):
    key = f"track:{device_id}"
    arr = db.get(key, [])
    return {"device_id": device_id, "track": arr}

@app.get("/api/v1/tracks/{device_id}/latest")
def get_track_latest(device_id: str):
    key = f"track:{device_id}"
    arr = db.get(key, [])
    if not arr:
        raise HTTPException(404, "no track yet")
    return arr[-1]

@app.delete("/api/v1/tracks/{device_id}")
def clear_track(device_id: str):
    key = f"track:{device_id}"
    if key in db:
        db[key] = []
    return {"status": "cleared"}

# -------------------
# Path (etalon & export)
# -------------------
@app.get("/api/v1/path/standard")
def get_standard_path():
    path_file = "data/standart.path"
    if not os.path.exists(path_file):
        raise HTTPException(404, "standard path not found")
    coords = []
    with open(path_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("X"):
                continue
            parts = line.strip().replace(",", ".").split(";")
            if len(parts) == 2:
                coords.append({"x": float(parts[0]), "y": float(parts[1])})
    return coords

@app.post("/api/v1/path/export")
def export_path():
    if not os.path.exists(PATH_OUT):
        raise HTTPException(404, "path not found")
    with open(PATH_OUT, "r", encoding="utf-8") as f:
        content = f.read()
    return JSONResponse(content={"path": content})

# -------------------
# Metrics
# -------------------
@app.get("/api/v1/metrics/hausdorff/{device_id}")
def get_hausdorff(device_id: str):
    key = f"track:{device_id}"
    arr = db.get(key, [])
    if not arr:
        raise HTTPException(404, "no track data")

    # device track
    A = np.array([[p["x"], p["y"]] for p in arr])

    # etalon
    path_file = "data/standart.path"
    if not os.path.exists(path_file):
        raise HTTPException(404, "standard path not found")
    B = []
    with open(path_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("X"):
                continue
            parts = line.strip().replace(",", ".").split(";")
            if len(parts) == 2:
                B.append([float(parts[0]), float(parts[1])])
    B = np.array(B)

    hdist = hausdorff(A, B)
    return {"device_id": device_id, "hausdorff": hdist}