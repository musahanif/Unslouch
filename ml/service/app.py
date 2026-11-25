import os                                # read settings from environment variables
import sys                               # to tell Python where your code\ folder is
from pathlib import Path
from typing import Literal               # "only these exact values are allowed"

import joblib                            # load model.joblib
import pandas as pd
from fastapi import FastAPI, HTTPException   # the web framework + a way to return errors
from pydantic import BaseModel, Field    # describes + validates the JSON that comes in

ROOT = Path(__file__).resolve().parent.parent   # SENPRO\ (service\ -> up one level)
sys.path.append(str(ROOT / "code"))      # lets us import your training files
from features import window_features     # SAME feature code as training: guaranteed match
from windowing import WINDOW_MS, STEP_MS, MIN_SAMPLES, SIGNAL_COLS   # same window settings

MODEL_PATH = Path(os.getenv("MODEL_PATH", ROOT / "output" / "model.joblib"))
# where the model is; can be changed by a setting on the server without editing code
MODEL_VERSION = os.getenv("MODEL_VERSION", "et-v1")
# version label returned with every answer (Josh's plan: store model version with results)
G = 9.80665                              # 1 g in m/s², to convert if the backend sends g

LABEL_INFO = {                           # translate your labels into Josh's database values
    "sit_upright": {"activity": "SITTING", "is_unfavorable": False},
    "sit_slouch": {"activity": "SITTING", "is_unfavorable": True},
    "bend": {"activity": "BENDING", "is_unfavorable": False},
}

R2_BUCKET = os.getenv("R2_BUCKET")       # set -> download the model from Cloudflare R2 at startup
if R2_BUCKET:                            # not set -> use the local file (as before)
    import boto3                         # S3 client; R2 speaks the same language as AWS S3
    s3 = boto3.client(
        "s3",
        endpoint_url=os.environ["R2_ENDPOINT"],             # https://<account-id>.r2.cloudflarestorage.com
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],   # keys come from environment variables,
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],   # never written in the code
        region_name="auto",              # R2 always uses "auto"
    )
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    s3.download_file(R2_BUCKET, os.getenv("R2_MODEL_KEY", "model.joblib"), str(MODEL_PATH))
    print(f"Downloaded model from R2 bucket '{R2_BUCKET}'", flush=True)

bundle = joblib.load(MODEL_PATH)         # load ONCE when the server starts (not per request)
model = bundle["model"]                  # the trained model (Extra Trees)
FEATURES = bundle["features"]            # the feature order the model expects

app = FastAPI(title="Unslouch ML service", version=MODEL_VERSION)   # create the web app


class Sample(BaseModel):                 # what ONE sensor reading must look like
    offsetMs: int = Field(ge=0)          # ms since start; must be ≥ 0
    ax: float                            # accelerometer (m/s² by default)
    ay: float
    az: float
    gx: float                            # gyroscope, deg/s
    gy: float
    gz: float


class WindowRequest(BaseModel):          # body for /predict: one ~2 s window
    accelUnit: Literal["m/s2", "g"] = "g"   # Josh's backend uses g 
    samples: list[Sample] = Field(min_length=MIN_SAMPLES, max_length=200)
    # 30..200 readings; anything else is rejected automatically with an error


class SessionRequest(BaseModel):         # body for /analyze-session: a whole session
    accelUnit: Literal["m/s2", "g"] = "g"
    samples: list[Sample] = Field(min_length=MIN_SAMPLES, max_length=200_000)
    # up to ~2.9 hours at 19.2 Hz


def to_frame(samples, unit):             # JSON list -> pandas table, in m/s²
    df = pd.DataFrame([s.model_dump() for s in samples]).sort_values("offsetMs").reset_index(drop=True)
    if unit == "g":                      # backend sent g? convert to m/s², like training data
        df[["ax", "ay", "az"]] *= G
    return df


def classify(window):                    # ONE window -> prediction
    feats = pd.DataFrame([window_features(window[SIGNAL_COLS])])[FEATURES]
    # same 36 features as training, in the same column order
    probs = model.predict_proba(feats)[0]   # probability for each class, e.g. [0.1, 0.7, 0.2]
    best = probs.argmax()                # position of the highest probability
    label = model.classes_[best]         # the winning label
    return {"label": label, **LABEL_INFO[label], "confidence": round(float(probs[best]), 3)}
    # ** copies "activity" and "is_unfavorable" into the answer


@app.get("/health")                      # GET http://.../health
def health():                            # lets Josh's backend/cloud check "is it alive?"
    return {"status": "ok", "modelVersion": MODEL_VERSION, "classes": list(model.classes_)}


@app.post("/predict")                    # POST http://.../predict  with one window
def predict(req: WindowRequest):         # FastAPI already validated the JSON into req
    df = to_frame(req.samples, req.accelUnit)
    span = df["offsetMs"].iloc[-1] - df["offsetMs"].iloc[0]   # how long the data covers
    if span > WINDOW_MS * 1.5:           # much longer than 2 s? wrong endpoint
        raise HTTPException(422, "Send one ~2 s window here; use /analyze-session for longer data")
    return {"modelVersion": MODEL_VERSION, **classify(df)}


@app.post("/analyze-session")            # POST with a whole session: the main use case
def analyze_session(req: SessionRequest):   # (Josh's plan: worker calls this after a session)
    df = to_frame(req.samples, req.accelUnit)
    t = df["offsetMs"].values            # all timestamps
    windows = []
    start = t[0]
    while start + WINDOW_MS <= t[-1]:    # same sliding-window logic as windowing.py
        w = df[(t >= start) & (t < start + WINDOW_MS)]   # readings in [start, start+2 s)
        if len(w) >= MIN_SAMPLES:        # skip windows with lost data
            windows.append({"startMs": int(start), **classify(w)})
        start += STEP_MS                 # slide 1 s
    if not windows:                      # session shorter than 2 s
        raise HTTPException(422, "Not enough data for a single 2 s window")
    share = pd.Series([w["label"] for w in windows]).value_counts(normalize=True) * 100
    # % of windows per label, e.g. sit_upright 70, sit_slouch 25, bend 5
    return {
        "modelVersion": MODEL_VERSION,
        "windowCount": len(windows),
        "percentByLabel": share.round(1).to_dict(),
        "slouchPercent": round(float(share.get("sit_slouch", 0.0)), 1),   # the headline number
        "windows": windows,              # every window's result, for a timeline chart
    }