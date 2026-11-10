import os
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor

# Define the local path where weights will be stored
LOCAL_MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "speech_detection")

def download_and_save():
    model_id = "Gustking/wav2vec2-large-xlsr-deepfake-audio-classification"
    
    print(f"--- Starting Permanent Download ---")
    print(f"Target Folder: {LOCAL_MODEL_PATH}")
    print(f"Model: {model_id} (approx. 1.2GB)")
    print("Please wait...")

    if not os.path.exists(LOCAL_MODEL_PATH):
        os.makedirs(LOCAL_MODEL_PATH)

    # Download from Hugging Face
    feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(model_id)
    model = Wav2Vec2ForSequenceClassification.from_pretrained(model_id)

    # Save to the local folder
    print("Saving to local disk...")
    feature_extractor.save_pretrained(LOCAL_MODEL_PATH)
    model.save_pretrained(LOCAL_MODEL_PATH)

    print(f"\n--- SUCCESS ---")
    print(f"Weights are now stored in: {LOCAL_MODEL_PATH}")
    print("You can now use the app offline.")

if __name__ == "__main__":
    download_and_save()
