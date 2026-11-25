import numpy as np                       # math on arrays (angles, square roots)
import pandas as pd                      # table library
from pathlib import Path                 # file paths
from preprocess import load_all          # step 1: load the CSVs
from windowing import make_windows       # step 2: cut into windows

OUT_DIR = Path(__file__).resolve().parent.parent / "output"
# SENPRO/output/ -> where features.csv is saved.
# NOT in data/, or load_all() would try to read it as a recording!

CHANNELS = ["ax", "ay", "az", "gx", "gy", "gz", "fwd_lean", "side_lean", "gyro_mag"]
# the 9 signals we summarise: 6 raw + 3 we calculate below


def add_derived(w):                      # adds 3 more useful signals to a window
    w = w.copy()                         # work on a copy, don't change the original
    w["fwd_lean"] = np.degrees(np.arctan2(-w["az"], w["ax"]))
    # forward lean in degrees. Your sensor's X axis points UP the spine, so
    # upright = gravity on X = 0°, leaning forward moves gravity to -Z = positive angle.
    # (Replaces pitch, which sat near -90° and broke roll.)
    w["side_lean"] = np.degrees(np.arctan2(w["ay"], w["ax"]))
    # sideways lean (left/right): important for scoliosis
    w["gyro_mag"] = np.sqrt(w["gx"]**2 + w["gy"]**2 + w["gz"]**2)
    # total rotation speed, any direction: high = moving (bend), low = still (sit)
    return w


def window_features(w):                  # turns ONE window (≈38 rows) into ONE row of numbers
    w = add_derived(w)                   # add the 3 extra signals first
    feats = {}                           # dictionary: feature name -> value
    for c in CHANNELS:                   # for each of the 9 signals...
        x = w[c].values                  # its ≈38 values in this window
        feats[f"{c}_mean"] = x.mean()    # average level  (e.g. how far you lean)
        feats[f"{c}_std"] = x.std()      # how much it varies (still vs moving)
        feats[f"{c}_min"] = x.min()      # lowest value
        feats[f"{c}_max"] = x.max()      # highest value
    return feats                         # 9 signals x 4 = 36 features


def build_feature_table(windows):        # does window_features for ALL windows
    rows = []
    for win in windows:                  # loop over every window
        f = window_features(win["data"]) # its 36 numbers
        f["take_id"] = win["take_id"]    # keep the bookkeeping columns:
        f["person"] = win["person"]      #   for splitting train/test by person/take
        f["label"] = win["label"]        #   the answer
        rows.append(f)
    return pd.DataFrame(rows)            # one row per window -> the model's input table


if __name__ == "__main__":               # only runs with `python features.py`
    table = build_feature_table(make_windows(load_all()))   # load -> window -> features
    print(f"Feature table: {table.shape[0]} windows x {table.shape[1] - 3} features")
    print(table.groupby("label")[["fwd_lean_mean", "fwd_lean_std",
                                  "side_lean_mean", "gyro_mag_mean"]].mean().round(1))
    # quick sanity check: average of key features per label
    OUT_DIR.mkdir(exist_ok=True)         # create output/ if it doesn't exist
    table.to_csv(OUT_DIR / "features.csv", index=False)     # save for train.py
    print(f"Saved to {OUT_DIR / 'features.csv'}")