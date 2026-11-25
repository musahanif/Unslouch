import pandas as pd 
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

TRIM_MS = 1000

EXPECTED_COLS = ["t_ms","ax","ay","az","gx","gy","gz","pitch","roll","label","person"]

VALID_LABELS = {"sit_upright", "sit_slouch", "stand_upright", "stand_slouch", "bend"}

def load_take(path):
    df = pd.read_csv(path)
    missing = set(EXPECTED_COLS) - set(df.columns)
    if missing:
        raise ValueError(f"{path.name} is missing columns: {missing}")
    
    df = df.dropna() # remove rows with empty values
    df = df.sort_values("t_ms").reset_index(drop=True)
    df["take_id"] = path.stem 
    df["t_rel"] = df["t_ms"] - df["t_ms"].iloc[0]
    df = df[df["t_rel"] >= TRIM_MS]      # keep only rows after the first second
    return df.reset_index(drop=True)     # renumber rows again after filtering


def load_all():                          # loads EVERY csv in data/ into one big table
    files = sorted(DATA_DIR.glob("*.csv"))              # list all .csv files, alphabetical
    if not files:                                       # nothing recorded yet
        raise FileNotFoundError(f"No CSV files in {DATA_DIR}")

    df = pd.concat([load_take(f) for f in files], ignore_index=True)
    # load_take on each file, then stack all the tables on top of each other

    bad = set(df["label"].unique()) - VALID_LABELS      # labels that are not in our 6 allowed ones
    if bad:
        raise ValueError(f"Unknown labels found: {bad}")
    return df


def sample_rate_report(df):              # checks the real sampling rate per take
    rows = []
    for take_id, g in df.groupby("take_id"):            # loop over takes one by one
        dt = g["t_ms"].diff().dropna()                  # ms between consecutive samples
        rows.append({
            "take_id": take_id,
            "samples": len(g),                          # how many rows survived
            "hz": round(1000 / dt.median(), 2),         # typical rate (median ignores rare hiccups)
            "max_gap_ms": dt.max(),                     # largest hole: big value = lost data
        })
    return pd.DataFrame(rows)


if __name__ == "__main__":               # runs only when you do `python preprocess.py`,
                                         # not when another file imports this one
    data = load_all()
    print(data.groupby(["person", "label"]).size())     # how many samples per person+label
    print(sample_rate_report(data))                     # real Hz and gaps per take
