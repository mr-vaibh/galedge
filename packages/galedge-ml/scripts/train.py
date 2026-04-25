"""Train ML models for stock prediction."""

import logging
import sys
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)

def main():
    from galedge_ml.trainer import train_models
    from galedge_ml.config import TRAINING_SYMBOLS, MODELS_DIR

    symbols = sys.argv[1:] if len(sys.argv) > 1 else TRAINING_SYMBOLS
    print(f"Training on {len(symbols)} symbols...")
    print(f"Output: {MODELS_DIR}")

    metrics = train_models(symbols=symbols, output_dir=MODELS_DIR)

    print("\n=== Training Results ===")
    for tf, m in metrics.items():
        cls = m["classifier"]
        reg = m["regressor"]
        print(f"\n{tf}:")
        print(f"  Classifier — Acc: {cls['accuracy']:.1%}, F1: {cls['f1']:.3f}, Precision: {cls['precision']:.3f}")
        print(f"  Regressor  — RMSE: {reg['rmse']:.6f}, Dir Acc: {reg['directional_accuracy']:.1%}")

    print("\nDone! Models saved to", MODELS_DIR)


if __name__ == "__main__":
    main()
