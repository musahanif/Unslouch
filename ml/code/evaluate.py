import pandas as pd
import matplotlib.pyplot as plt          # to save the confusion matrix as an image
from sklearn.metrics import accuracy_score, confusion_matrix, ConfusionMatrixDisplay
from sklearn.model_selection import GroupKFold   # splits data so a whole group stays together
from train import load_features, make_model, OUT_DIR   # reuse train.py's functions

LABELS = ["sit_upright", "sit_slouch", "bend"]   # fixed order for the confusion matrix


def cross_validate(X, y, splits):        # trains + tests several times on different splits
    y_true, y_pred = [], []              # collect answers and predictions from every round
    for train_idx, test_idx in splits:   # each split = (rows to learn from, rows to test on)
        model = make_model()             # fresh untrained model every round
        model.fit(X.iloc[train_idx], y.iloc[train_idx])     # learn ONLY from training rows
        y_true += list(y.iloc[test_idx])                    # the real answers of the test rows
        y_pred += list(model.predict(X.iloc[test_idx]))     # what the model guessed
    return pd.Series(y_true), pd.Series(y_pred)


def report(name, y_true, y_pred):        # prints + saves the results of one evaluation
    print(f"\n=== {name} ===")
    print(f"Accuracy: {accuracy_score(y_true, y_pred):.3f}")   # % of windows guessed right
    cm = confusion_matrix(y_true, y_pred, labels=LABELS)
    # rows = real label, columns = predicted label: shows WHICH classes get mixed up
    print(pd.DataFrame(cm, index=[f"true {l}" for l in LABELS],
                       columns=[f"pred {l}" for l in LABELS]))
    not_slouch = y_true != "sit_slouch"  # windows where the person was NOT slouching
    false_alarm = (y_pred[not_slouch] == "sit_slouch").mean()
    # of those, how many would make the device buzz wrongly -> your "alarm fatigue" metric
    print(f"False-alarm rate (not slouching, but predicted slouch): {false_alarm:.3f}")
    ConfusionMatrixDisplay(cm, display_labels=LABELS).plot(cmap="Blues")   # draw it
    plt.title(name)
    plt.savefig(OUT_DIR / f"confusion_{name.split()[0].lower()}.png", bbox_inches="tight")
    # saves confusion_take.png / confusion_person.png -> put these in your report
    plt.close()


if __name__ == "__main__":
    table, X, y = load_features()

    by_take = GroupKFold(n_splits=3).split(X, y, groups=table["take_id"])
    # TEST 1: 3 rounds; each round hides 1/3 of the RECORDINGS completely.
    # Whole takes stay together, because neighbouring windows are almost identical
    # (random window splitting would be cheating).
    report("Take split (unseen recordings)", *cross_validate(X, y, by_take))

    persons = table["person"]
    by_person = [((persons != p).values.nonzero()[0], (persons == p).values.nonzero()[0])
                 for p in persons.unique()]
    # TEST 2: train on one person, test on the OTHER person (and swap).
    # The hardest and most honest test: does it work for someone it has never seen?
    report("Person split (unseen person)", *cross_validate(X, y, by_person))

    print(f"\nConfusion matrix images saved in {OUT_DIR}")