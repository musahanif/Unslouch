import pandas as pd                      # table library
from preprocess import load_all          # reuse YOUR preprocess.py: loads + cleans all CSVs

WINDOW_MS = 2000                         # window length: 2 seconds (≈ 38 readings at 19.2 Hz)
STEP_MS = 1000                           # a new window starts every 1 s -> 50% overlap
MIN_SAMPLES = 30                         # skip a window with too few readings (e.g. data lost)
SIGNAL_COLS = ["ax", "ay", "az", "gx", "gy", "gz"]   # raw sensor channels we keep
                                                     # (pitch/roll dropped: features.py makes
                                                     #  better angles, roll is unusable)


def make_windows(df):                    # cuts every take into 2-second pieces
    windows = []                         # empty list that will collect all windows
    for take_id, take in df.groupby("take_id"):      # handle one recording at a time,
                                                     # so a window never mixes two takes
        t = take["t_rel"].values         # time (ms since take started) of every reading
        start = t[0]                     # first window starts at the first reading
        while start + WINDOW_MS <= t[-1]:            # stop when a full 2 s no longer fits
            in_window = (t >= start) & (t < start + WINDOW_MS)   # True for readings inside
                                                                 # [start, start + 2000 ms)
            w = take[in_window]          # keep only those readings
            if len(w) >= MIN_SAMPLES:    # enough readings? then save this window
                windows.append({
                    "take_id": take_id,               # which recording it came from
                    "person": w["person"].iloc[0],    # who (needed for the train/test split)
                    "label": w["label"].iloc[0],      # the answer the model must learn
                    "start_ms": start,                # where in the take it starts
                    "data": w[SIGNAL_COLS].reset_index(drop=True),  # the ≈38 readings
                })
            start += STEP_MS             # slide forward 1 s for the next window
    return windows                       # list of all windows


if __name__ == "__main__":               # only runs with `python windowing.py`
    windows = make_windows(load_all())   # load data, then cut it into windows
    print(f"Total windows: {len(windows)}")
    counts = pd.DataFrame([{"person": w["person"], "label": w["label"]} for w in windows])
    print(counts.value_counts().sort_index())         # windows per person + label
    print(f"Samples in first window: {len(windows[0]['data'])}")   # should be ≈38-39