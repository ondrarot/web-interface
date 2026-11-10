# Multi-Purpose Web Interface & Speech Analysis Suite 🚀🎙️

An interactive, web-based platform hosting three distinct web applications built on a high-performance **FastAPI** backend and responsive **HTML/CSS/JS** frontends. 

The suite combines real-time browser physics simulations with state-of-the-art speech evaluation and deepfake audio classification models optimized for local execution.

---

## 📌 Architecture & Tech Stack

This project uses a unified local client-server architecture designed for high speed and seamless application switching.

* **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (Python) — Handles routing, API endpoints, and direct interaction with ML model pipelines.
* **Frontend:** Standard HTML5, CSS3, and modern JavaScript (Vanilla JS & SVG graphics).
* **Local Inference:** Speech models are loaded and executed locally via PyTorch, ensuring minimal latency, full privacy, and offline processing.

---

## 💻 Integrated Applications

### 1. 🚀 Rocket Landing Game
An interactive 2D physics simulation of space vehicle descent and landing.

* **Graphics & Rendering:** Clean, hardware-accelerated vector graphics rendered using browser SVG and CSS.
* **Core Features:**
  * Custom physics engine with adjustable background gravitational parameters and thrust dynamics.
  * Real-time timer and performance tracking for precision landings.
  * Level loading system with increasing difficulty.
  * In-game pause menu and real-time flight controls.

---

### 2. 📊 Automatic Speech Quality Evaluation (UTMOSv2)
An automated objective metric tool for evaluating the acoustic quality and naturalness of voice recordings and synthetic speech.

* **Model Architecture:** **UTMOSv2** (*Urgent Text-to-Speech Metric for Opinion Score*), fine-tuned for high accuracy on Czech speech audio.
* **Input:** Waveform audio files (`.wav` format).
* **Output:** Predicted **Mean Opinion Score (MOS)** ranging from `0.00` (Poor/Unnatural) to `5.00` (Excellent/Natural).
* **Use Case:** Quality assurance for voice synthesis (TTS), voice conversion systems, and audio restoration pipelines.

---

### 3. 🛡️ Synthetic Speech & Deepfake Detection
A binary classifier that distinguishes authentic human speech from AI-generated or spoofed voice clones.

* **Model Architecture:** Fine-tuned **Wav2Vec 2.0** (`Wav2vec2-large-xlsr-deepfake-audio-classification`), leveraging multilingual feature representations adapted for Czech language evaluation.
* **Input:** Waveform audio files (`.wav` format).
* **Output:** Clear classification verdict (**Bonafide Real** vs. **Synthetic Deepfake**) alongside a percentage confidence score.
* **Use Case:** Verification of voice messages, anti-spoofing security checks, and media authenticity analysis.

---

## 🛠️ Requirements & Quickstart

### Prerequisites
* Python 3.9 or higher
* [PyTorch](https://pytorch.org/) (with CUDA support recommended if running models on GPU)

### 1. Install Dependencies
```bash
pip install fastapi uvicorn torch transformers librosa jinja2 python-multipart
```

### 2. Launch the Web Interface
Start the local FastAPI server:
```bash
uvicorn main:app --reload
```

### 3. Open in Browser
Navigate to `http://127.0.0.1:8000` in your web browser to access the application dashboard.
