# uvicorn main:app --reload ----  to run this project


from fastapi import FastAPI, Request, File, UploadFile
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from tensorflow.keras.models import load_model
from PIL import Image
import numpy as np
import io

import sqlite3
from datetime import datetime


app = FastAPI()

# Mount static files (CSS, JS)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Load HTML templates
templates = Jinja2Templates(directory="templates")

# Load trained ML model
model = load_model("model/digit_model.h5")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def init_db():
    conn = sqlite3.connect("analytics.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            digit INTEGER,
            confidence REAL,
            timestamp TEXT
        )
    """)
    conn.commit()
    conn.close()


init_db()


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


def preprocess_image(image: Image.Image):
    # Convert to grayscale
    image = image.convert("L")

    # Resize to MNIST size
    image = image.resize((28, 28))

    # Convert to numpy array
    image = np.array(image)

    # Invert colors
    image = 255 - image

    # 🔥 Binary threshold (CRITICAL)
    image = np.where(image > 128, 255, 0)

    # Normalize
    image = image / 255.0

    # Reshape (NO channel)
    image = image.reshape(1, 28, 28)

    return image


def is_blank_image(image: Image.Image):
    """
    Returns True if image is almost completely white
    """
    image = image.convert("L")  # grayscale
    image_array = np.array(image)

    # If average pixel value is very high → blank canvas
    return np.mean(image_array) > 250


@app.post("/predict")
async def predict_digit(file: UploadFile = File(...)):
    # Read uploaded image
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes))

    # Preprocess
    processed_image = preprocess_image(image)

    if is_blank_image(image):
        return {
            "error": "Blank image",
            "message": "Please draw or upload a digit before predicting",
        }

    # Predict
    prediction = model.predict(processed_image)
    digit = int(np.argmax(prediction))
    confidence = float(np.max(prediction))

    # Save prediction to database
    conn = sqlite3.connect("analytics.db")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO predictions (digit, confidence, timestamp) VALUES (?, ?, ?)",
        (digit, confidence, datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()

    return {"digit": digit, "confidence": confidence}


@app.get("/analytics/total")
def total_predictions():
    conn = sqlite3.connect("analytics.db")
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM predictions")
    total = cursor.fetchone()[0]
    conn.close()
    return {"total_predictions": total}


@app.get("/analytics/digit-distribution")
def digit_distribution():
    conn = sqlite3.connect("analytics.db")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT digit, COUNT(*)
        FROM predictions
        GROUP BY digit
        ORDER BY digit
    """)
    data = cursor.fetchall()
    conn.close()
    return {"distribution": data}


@app.get("/analytics/avg-confidence")
def avg_confidence():
    conn = sqlite3.connect("analytics.db")
    cursor = conn.cursor()
    cursor.execute("SELECT AVG(confidence) FROM predictions")
    avg = cursor.fetchone()[0]
    conn.close()
    return {"average_confidence": avg}


@app.get("/history")
def get_history():
    conn = sqlite3.connect("analytics.db")
    cursor = conn.cursor()

    cursor.execute("""
        SELECT digit, confidence
        FROM predictions
        ORDER BY id DESC
    """)
    data = cursor.fetchall()
    conn.close()

    return {"history": data}


# Clear all predictions
@app.delete("/clear_history")
def clear_history():
    conn = sqlite3.connect("analytics.db")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM predictions")
    conn.commit()
    conn.close()
    return {"message": "History cleared successfully"}
