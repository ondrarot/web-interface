import io
import torch
import librosa
import numpy as np
import threading
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor

router = APIRouter()

# Get absolute path to the local model folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL_MODEL_PATH = os.path.join(BASE_DIR, "models", "speech_detection")

# Global state for the model
model_state = {
    "model": None,
    "feature_extractor": None,
    "is_loading": False,
    "ready": False,
    "error": None,
    "model_id": "Gustking/wav2vec2-large-xlsr-deepfake-audio-classification" 
}

def load_detection_model():
    """Background task to load the detection model from local disk if available."""
    global model_state
    if model_state["ready"] or model_state["is_loading"]:
        return
    
    model_state["is_loading"] = True
    
    # Decide where to load from
    load_path = LOCAL_MODEL_PATH if os.path.exists(LOCAL_MODEL_PATH) else model_state["model_id"]
    location_str = "local disk" if os.path.exists(LOCAL_MODEL_PATH) else "Hugging Face (online)"
    
    print(f"[SpeechDetection] Initializing model from {location_str}...")
    
    try:
        model_state["feature_extractor"] = Wav2Vec2FeatureExtractor.from_pretrained(load_path)
        model_state["model"] = Wav2Vec2ForSequenceClassification.from_pretrained(load_path)
        model_state["model"].eval()
        
        model_state["ready"] = True
        print(f"[SpeechDetection] Model loaded and ready from {location_str}.")
    except Exception as e:
        model_state["error"] = str(e)
        print(f"[SpeechDetection] Failed to load model: {e}")
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

@router.post("/detect")
async def detect_synthetic(file: UploadFile = File(...)):
    """
    Receives a .wav file and returns spoofing detection results.
    """
    if not model_state["ready"]:
        raise HTTPException(status_code=503, detail="AI model is still loading.")

    try:
        contents = await file.read()
        audio_stream = io.BytesIO(contents)
        
        # Audio must be 16kHz
        audio_data, sr = librosa.load(audio_stream, sr=16000)
        
        inputs = model_state["feature_extractor"](audio_data, sampling_rate=16000, return_tensors="pt", padding=True)
        
        with torch.no_grad():
            logits = model_state["model"](**inputs).logits
            
        probs = torch.nn.functional.softmax(logits, dim=-1)
        probs_list = probs[0].tolist()
        
        # 0: real, 1: fake
        real_prob = probs_list[0]
        synth_prob = probs_list[1]
        
        prediction = "Real" if real_prob > synth_prob else "Synthetic"
        confidence = max(real_prob, synth_prob)
        
        return {
            "filename": file.filename,
            "prediction": prediction,
            "confidence": round(float(confidence) * 100, 2),
            "real_probability": round(float(real_prob) * 100, 2),
            "synthetic_probability": round(float(synth_prob) * 100, 2)
        }
    except Exception as e:
        print(f"Error during detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def start_background_load():
    """Start the model loading thread."""
    thread = threading.Thread(target=load_detection_model)
    thread.daemon = True
    thread.start()
