# Trained Models

This directory contains serialized XGBoost models (`.joblib` files).

To train models:
```bash
cd packages/galedge-ml
python scripts/train.py
```

Files:
- `classifier_5d.joblib` — 5-day direction classifier
- `regressor_5d.joblib` — 5-day return regressor
- `classifier_10d.joblib` — 10-day direction classifier
- `regressor_10d.joblib` — 10-day return regressor
- `classifier_20d.joblib` — 20-day direction classifier
- `regressor_20d.joblib` — 20-day return regressor
- `metadata_*d.json` — Training metrics and feature importances
