import io
import librosa
import numpy as np
import utmosv2
import threading
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter()

# Global state for the model
model_state = {
    "model": None,
    "is_loading": False,
    "ready": False,
    "error": None
}

def load_utmos_model():
    """Background task to load the model."""
    global model_state
    if model_state["ready"] or model_state["is_loading"]:
        return
    
    model_state["is_loading"] = True
    print("[UTMOSv2] Loading model in background...")
    try:
        model_state["model"] = utmosv2.create_model(pretrained=True)
        model_state["ready"] = True
        print("[UTMOSv2] Model loaded and ready.")
    except Exception as e:
        model_state["error"] = str(e)
        print(f"[UTMOSv2] Failed to load model: {e}")
    finally:
        model_state["is_loading"] = False

@router.get("/status")
async def get_status():
    """Check if the AI model is loaded and ready."""
    return {
        "ready": model_state["ready"],
        "is_loading": model_state["is_loading"],
        "error": model_state["error"]
    }

@router.post("/start_load")
async def trigger_load():
    """Manually trigger the model loading."""
    if not model_state["ready"] and not model_state["is_loading"]:
        start_background_load()
    return {"message": "Load triggered"}

@router.post("/evaluate")
async def evaluate_audio(file: UploadFile = File(...)):
    """
    Receives a .wav file, runs the UTMOSv2 model, and returns the MOS score.
    """
    if not model_state["ready"]:
        raise HTTPException(status_code=503, detail="AI model is still loading. Please try again in a few seconds.")

    if not file.filename.lower().endswith(".wav"):
        raise HTTPException(status_code=400, detail="Only .wav files are supported.")

    try:
        # Read the uploaded file into memory
        contents = await file.read()
        audio_stream = io.BytesIO(contents)
        
        # Load audio using librosa (UTMOSv2 expects 16000 Hz)
        audio_data, sr = librosa.load(audio_stream, sr=16000)
        
        # Run AI Prediction
        model = model_state["model"]
            
        # Inference
        prediction = model.predict(data=audio_data, sr=sr, device="cpu", num_workers=0)
        
        # Extract the score
        mos_score = float(np.squeeze(prediction))
        
        return {
            "filename": file.filename,
            "mos_score": round(mos_score, 2)
        }
    except Exception as e:
        print(f"Error during evaluation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def start_background_load():
    """Start the model loading thread."""
    thread = threading.Thread(target=load_utmos_model)
    thread.daemon = True # Exit when main process exits
    thread.start()
