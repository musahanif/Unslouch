import warnings                          # to hide noisy library warnings
import pandas as pd
import matplotlib.pyplot as plt          # for the comparison chart
from sklearn.preprocessing import LabelEncoder, StandardScaler
# LabelEncoder: turns "bend"/"sit_slouch"/... into 0/1/2 (XGBoost only accepts numbers)
# StandardScaler: rescales features to similar ranges (needed by LogReg, KNN, SVM)
from sklearn.pipeline import make_pipeline   # chains "scale, then model" into one object
from sklearn.model_selection import GroupKFold, LeaveOneGroupOut
# GroupKFold: hide whole recordings; LeaveOneGroupOut: hide one whole person at a time
from sklearn.metrics import accuracy_score, f1_score
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, HistGradientBoostingClassifier
from xgboost import XGBClassifier        # needs: pip install xgboost
from train import load_features, make_model, OUT_DIR   # reuse YOUR train.py

warnings.filterwarnings("ignore")        # keep the output readable


class ThresholdBaseline:                 # the "old-fashioned" approach, to compare against
    COLS = ["fwd_lean_mean", "fwd_lean_std"]   # only uses: how far you lean + how much it moves

    def fit(self, X, y):                 # learns the best 2-3 threshold values from training data
        self.tree = DecisionTreeClassifier(max_depth=2, random_state=42)
        # a tree only 2 questions deep = "if lean > A ... if movement > B ..." = thresholds
        self.tree.fit(X[self.COLS], y)
        return self

    def predict(self, X):                # applies those thresholds
        return self.tree.predict(X[self.COLS])


MODELS = {                               # name -> function that creates a fresh untrained model
    "Threshold baseline": lambda: ThresholdBaseline(),
    "Logistic Regression": lambda: make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000, class_weight="balanced")),
    # simplest ML model: draws straight lines between classes
    "KNN": lambda: make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=5)),
    # looks at the 5 most similar training windows and copies their majority label
    "SVM": lambda: make_pipeline(StandardScaler(), SVC(class_weight="balanced")),
    # finds curved boundaries between classes
    "Decision Tree": lambda: DecisionTreeClassifier(max_depth=6, class_weight="balanced", random_state=42),
    # one tree of yes/no questions
    "Random Forest": make_model,         # YOUR model, exact settings from train.py
    "Extra Trees": lambda: ExtraTreesClassifier(n_estimators=100, max_depth=8, min_samples_leaf=3, class_weight="balanced", random_state=42),
    # like Random Forest but with more randomness in the splits
    "Gradient Boosting": lambda: HistGradientBoostingClassifier(max_depth=4, random_state=42),
    # trees built one after another, each fixing the previous one's mistakes
    "XGBoost": lambda: XGBClassifier(n_estimators=200, max_depth=4, learning_rate=0.1, random_state=42),
    # the popular optimised version of gradient boosting
}


def score(make, X, y, splits):           # trains + tests one model type on all splits
    y_true, y_pred = [], []
    for train_idx, test_idx in splits:   # each round: learn on some rows, test on hidden ones
        model = make()                   # fresh model every round (no memory of earlier rounds)
        model.fit(X.iloc[train_idx], y[train_idx])
        y_true += list(y[test_idx])                     # real answers
        y_pred += list(model.predict(X.iloc[test_idx])) # model's guesses
    return accuracy_score(y_true, y_pred), f1_score(y_true, y_pred, average="macro")
    # macro F1 = average F1 of each class, so a badly-handled class can't hide


if __name__ == "__main__":
    table, X, labels = load_features()   # same data as train.py (incl. dropping bend pauses)
    y = LabelEncoder().fit_transform(labels)   # labels -> numbers 0/1/2

    take_splits = list(GroupKFold(n_splits=3).split(X, y, groups=table["take_id"]))
    # test 1: unseen recordings (3 rounds)
    person_splits = list(LeaveOneGroupOut().split(X, y, groups=table["person"]))
    # test 2: unseen person (one round per person -> 4 rounds with 4 people)
    # list(...) so EVERY model is tested on exactly the same splits = fair comparison

    rows = []
    for name, make in MODELS.items():    # test every model the same way
        take_acc, take_f1 = score(make, X, y, take_splits)
        person_acc, person_f1 = score(make, X, y, person_splits)
        rows.append({"model": name,
                     "take_acc": round(take_acc, 3), "take_F1": round(take_f1, 3),
                     "person_acc": round(person_acc, 3), "person_F1": round(person_f1, 3)})
        print(f"done: {name}")           # progress, since this takes a little while

    results = pd.DataFrame(rows).sort_values("person_F1", ascending=False)
    # best model on the HARDEST test (unseen person) at the top
    print("\n" + results.to_string(index=False))
    results.to_csv(OUT_DIR / "model_comparison.csv", index=False)   # table for the report

    ax = results.plot.barh(x="model", y=["take_F1", "person_F1"], figsize=(8, 5))
    # horizontal bar chart: two bars per model
    ax.set_xlabel("Macro F1 (higher is better)")
    ax.set_xlim(0, 1)
    ax.invert_yaxis()                    # best model on top
    plt.title("Model comparison: unseen recordings vs unseen person")
    plt.savefig(OUT_DIR / "model_comparison.png", bbox_inches="tight")   # chart for the report
    print(f"\nSaved model_comparison.csv and model_comparison.png in {OUT_DIR}")
