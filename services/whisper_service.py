"""
Local Whisper Speech-to-Text Service
Runs on localhost with CUDA acceleration for fast, offline transcription.
"""

import os
import sys
import json
import tempfile
import wave
import io
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import threading

# Check for faster-whisper
try:
    from faster_whisper import WhisperModel
except ImportError:
    print("ERROR: faster-whisper not installed. Run: pip install faster-whisper")
    sys.exit(1)

# Configuration
HOST = "127.0.0.1"
PORT = 5678
MODEL_SIZE = "tiny"  # Options: tiny (fastest), base, small, medium, large-v2, large-v3
DEVICE = "cuda"  # Use "cpu" if no GPU
COMPUTE_TYPE = "float16"  # Use "int8" for older GPUs, "float32" for CPU

# Global model instance
model = None
model_lock = threading.Lock()


def load_model():
    """Load Whisper model with CUDA support."""
    global model
    print(f"Loading Whisper model '{MODEL_SIZE}' on {DEVICE}...")
    try:
        model = WhisperModel(
            MODEL_SIZE,
            device=DEVICE,
            compute_type=COMPUTE_TYPE,
            download_root=os.path.join(os.path.dirname(__file__), "whisper_models")
        )
        print(f"[OK] Model loaded successfully on {DEVICE.upper()}")
    except Exception as e:
        print(f"[WARN] CUDA failed, falling back to CPU: {e}")
        model = WhisperModel(
            MODEL_SIZE,
            device="cpu",
            compute_type="float32",
            download_root=os.path.join(os.path.dirname(__file__), "whisper_models")
        )
        print("[OK] Model loaded on CPU")


def transcribe_audio(audio_data: bytes, language: str = "en") -> dict:
    """Transcribe audio bytes to text."""
    global model
    
    if model is None:
        return {"error": "Model not loaded"}
    
    # Save audio to temp file (faster-whisper needs file path)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(audio_data)
        temp_path = f.name
    
    try:
        with model_lock:
            segments, info = model.transcribe(
                temp_path,
                language=language if language else None,
                beam_size=1,  # Greedy decoding for speed (was 5)
                vad_filter=True,  # Filter out silence
                vad_parameters=dict(min_silence_duration_ms=300)  # Faster silence detection
            )
            
            # Collect all segments
            full_text = ""
            segment_list = []
            for segment in segments:
                full_text += segment.text
                segment_list.append({
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text.strip()
                })
        
        raw_text = full_text.strip()
        
        return {
            "success": True,
            "text": raw_text,
            "raw_text": raw_text,
            "segments": segment_list,
            "language": info.language,
            "language_probability": info.language_probability,
            "llm_cleaned": False
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        # Clean up temp file
        try:
            os.unlink(temp_path)
        except:
            pass


class WhisperHandler(BaseHTTPRequestHandler):
    """HTTP handler for Whisper transcription requests."""
    
    def log_message(self, format, *args):
        """Suppress default logging."""
        pass
    
    def send_json(self, data: dict, status: int = 200):
        """Send JSON response."""
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_json({})
    
    def do_GET(self):
        """Health check endpoint."""
        if self.path == "/health":
            self.send_json({
                "status": "ok",
                "model": MODEL_SIZE,
                "device": DEVICE,
                "ready": model is not None
            })
        else:
            self.send_json({"error": "Not found"}, 404)
    
    def do_POST(self):
        """Handle transcription request."""
        if self.path == "/transcribe":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                audio_data = self.rfile.read(content_length)
                
                # Get language from query params
                query = parse_qs(urlparse(self.path).query)
                language = query.get("language", ["en"])[0]
                
                # Transcribe
                result = transcribe_audio(audio_data, language)
                
                if "error" in result:
                    self.send_json(result, 500)
                else:
                    self.send_json(result)
                    
            except Exception as e:
                self.send_json({"error": str(e)}, 500)
        else:
            self.send_json({"error": "Not found"}, 404)


def main():
    """Start the Whisper service."""
    print("=" * 50)
    print("  Zenith Local Whisper Service (CUDA)")
    print("=" * 50)
    
    # Load model
    load_model()
    
    # Start HTTP server
    server = HTTPServer((HOST, PORT), WhisperHandler)
    print(f"\n[READY] Whisper service running at http://{HOST}:{PORT}")
    print("   POST /transcribe - Send audio for transcription")
    print("   GET /health - Check service status")
    print("\nPress Ctrl+C to stop.\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()
