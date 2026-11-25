import joblib                            # saves/loads the trained model to a file
import pandas as pd                      # table library
from pathlib import Path                 # file paths
from sklearn.ensemble import ExtraTreesClassifier   # the model: many decision trees that vote

OUT_DIR = Path(__file__).resolve().parent.parent / "output"   # SENPRO/output/ (features.csv is here)
META_COLS = ["take_id", "person", "label"]   # bookkeeping columns, NOT inputs for the model
BEND_MIN_LEAN = 20                       # a "bend" window must lean at least 20° at some point


def load_features():                     # reads features.csv and splits it into inputs + answers
    table = pd.read_csv(OUT_DIR / "features.csv")      # the table made by features.py
    pause = (table["label"] == "bend") & (table["fwd_lean_max"] < BEND_MIN_LEAN)
    # True for windows from a bend recording where you never leaned past 20°
    # = the standing pauses between bends. They're labelled "bend" but aren't bends.
    print(f"Dropped {pause.sum()} 'bend' windows with no real bend (standing pauses)")
    table = table[~pause].reset_index(drop=True)       # remove them (~ means NOT)
    X = table.drop(columns=META_COLS)    # X = the 36 feature numbers (model input)
    y = table["label"]                   # y = the correct label (what the model must learn)
    return table, X, y


def make_model():
    return ExtraTreesClassifier(
        n_estimators=100,
        max_depth=8,
        min_samples_leaf=3,
        class_weight="balanced",
        random_state=42,
    )


if __name__ == "__main__":               # only runs with `python train.py`
    table, X, y = load_features()        # load the data
    model = make_model()                 # create an untrained model
    model.fit(X, y)                      # TRAIN: learn from ALL windows
    joblib.dump({"model": model, "features": list(X.columns)}, OUT_DIR / "model.joblib")
    # save the model + the feature order (the backend must use the same order)
    print(f"Trained on {len(X)} windows, {X.shape[1]} features, classes: {list(model.classes_)}")
    top = pd.Series(model.feature_importances_, index=X.columns).sort_values(ascending=False)
    # how much each feature helped the trees decide
    print("Top 10 most useful features:")
    print(top.head(10).round(3).to_string())
    print(f"Saved model to {OUT_DIR / 'model.joblib'}")