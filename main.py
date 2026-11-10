import os
import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from AutomaticSpeechEvaluation.api import router as speech_router, start_background_load
from SyntheticSpeechDetection.api import router as detection_router

# --- 1. FastAPI Setup ---
app = FastAPI(title="WebHub Central Server")

# Get the root directory
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

# --- 2. Startup Events ---
@app.on_event("startup")
async def on_startup():
    # We no longer load the model automatically.
    # It will start loading only when someone clicks the button.
    print("[Server] Server is ready. Waiting for user interaction.")

# --- 3. API Routers ---
# Note: We mount the speech evaluation API under /api/evaluate
app.include_router(speech_router, prefix="/api/evaluate", tags=["Speech Evaluation"])
app.include_router(detection_router, prefix="/api/detect", tags=["Synthetic Speech Detection"])

# --- 4. Static Files Mounting ---

# RocketGame (must be mounted BEFORE the root mount)
app.mount("/RocketGame", StaticFiles(directory=os.path.join(ROOT_DIR, "RocketGame")), name="rocketgame")

# AutomaticSpeechEvaluation
app.mount("/AutomaticSpeechEvaluation", StaticFiles(directory=os.path.join(ROOT_DIR, "AutomaticSpeechEvaluation")), name="speechevaluation")

# SyntheticSpeechDetection
app.mount("/SyntheticSpeechDetection", StaticFiles(directory=os.path.join(ROOT_DIR, "SyntheticSpeechDetection")), name="speechdetection")

# Specific route for the main page
@app.get("/")
@app.get("/index.html")
async def get_root_index():
    return FileResponse(os.path.join(ROOT_DIR, "index.html"))

# Specific route for the main script and style to ensure they load correctly
@app.get("/script.js")
async def get_root_js():
    return FileResponse(os.path.join(ROOT_DIR, "script.js"))

@app.get("/style.css")
async def get_root_css():
    return FileResponse(os.path.join(ROOT_DIR, "style.css"), media_type="text/css")

# Mount everything else from root as a fallback
app.mount("/", StaticFiles(directory=ROOT_DIR), name="root")

if __name__ == "__main__":
    # Start the server
    uvicorn.run(app, host="0.0.0.0", port=8000)
