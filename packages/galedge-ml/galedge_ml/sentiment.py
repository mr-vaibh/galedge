"""Sentiment analysis for news headlines.

Uses FinBERT during training (when available), falls back to a financial
keyword lexicon for inference on low-memory servers.
"""

from __future__ import annotations

import logging
import re

import numpy as np
import yfinance as yf

logger = logging.getLogger(__name__)

# ── Financial Sentiment Lexicon ───────────────────────────────────────────────
# Curated for stock market context — weighted by signal strength

_POSITIVE = {
    "beat": 2, "beats": 2, "exceeded": 2, "surpass": 2, "outperform": 2,
    "upgrade": 2, "upgraded": 2, "bullish": 2, "breakout": 2, "record": 2,
    "profit": 1, "growth": 1, "gain": 1, "gains": 1, "rally": 2, "rallies": 2,
    "surge": 2, "surges": 2, "soar": 2, "soars": 2, "jump": 1, "jumps": 1,
    "rise": 1, "rises": 1, "rising": 1, "recover": 1, "recovery": 1,
    "strong": 1, "strength": 1, "positive": 1, "boost": 1, "boosted": 1,
    "dividend": 1, "buyback": 1, "acquisition": 1, "partnership": 1,
    "innovation": 1, "launch": 1, "expansion": 1, "revenue": 1,
    "earnings": 1, "optimistic": 1, "confident": 1, "momentum": 1,
    "upside": 1, "opportunity": 1, "buy": 1, "overweight": 1,
    "outperforming": 2, "surprise": 1, "impressive": 1,
}

_NEGATIVE = {
    "miss": 2, "missed": 2, "misses": 2, "disappoint": 2, "disappointing": 2,
    "downgrade": 2, "downgraded": 2, "bearish": 2, "crash": 3, "crashes": 3,
    "loss": 1, "losses": 1, "decline": 1, "declining": 1, "drop": 1, "drops": 1,
    "fall": 1, "falls": 1, "falling": 1, "plunge": 2, "plunges": 2,
    "sink": 2, "sinks": 2, "tumble": 2, "tumbles": 2, "slump": 2,
    "weak": 1, "weakness": 1, "negative": 1, "concern": 1, "risk": 1,
    "lawsuit": 2, "investigation": 2, "fraud": 3, "scandal": 3,
    "recession": 2, "inflation": 1, "debt": 1, "default": 2,
    "layoff": 2, "layoffs": 2, "cut": 1, "cuts": 1, "shutdown": 2,
    "warning": 2, "caution": 1, "sell": 1, "underweight": 1,
    "underperform": 2, "underperforming": 2, "overvalued": 1,
    "tariff": 1, "tariffs": 1, "ban": 2, "penalty": 2, "fine": 1,
}


def _lexicon_score(text: str) -> float:
    """Score text using financial lexicon. Returns -1 to +1."""
    words = re.findall(r'\b[a-z]+\b', text.lower())
    pos_score = sum(_POSITIVE.get(w, 0) for w in words)
    neg_score = sum(_NEGATIVE.get(w, 0) for w in words)
    total = pos_score + neg_score
    if total == 0:
        return 0.0
    return (pos_score - neg_score) / total


def _finbert_score(texts: list[str]) -> list[float]:
    """Score texts using FinBERT. Returns list of -1 to +1 scores."""
    try:
        from transformers import pipeline
        classifier = pipeline("sentiment-analysis", model="ProsusAI/finbert", device=-1)
        results = classifier(texts, truncation=True, max_length=128, batch_size=32)
        scores = []
        for r in results:
            label = r["label"].lower()
            conf = r["score"]
            if label == "positive":
                scores.append(conf)
            elif label == "negative":
                scores.append(-conf)
            else:
                scores.append(0.0)
        return scores
    except Exception as e:
        logger.warning("FinBERT unavailable, using lexicon: %s", e)
        return [_lexicon_score(t) for t in texts]


def get_news_sentiment(symbol: str, use_finbert: bool = False) -> dict[str, float]:
    """Get sentiment features from recent news.

    Returns:
        news_sentiment_avg: average sentiment (-1 to 1)
        news_sentiment_pos_ratio: fraction of positive headlines
        news_sentiment_neg_ratio: fraction of negative headlines
        news_count: number of articles analyzed
    """
    features = {
        "news_sentiment_avg": 0.0,
        "news_sentiment_pos_ratio": 0.5,
        "news_sentiment_neg_ratio": 0.5,
        "news_count": 0.0,
    }

    try:
        t = yf.Ticker(symbol)
        news = t.news or []
        if not news:
            return features

        titles = []
        for item in news[:20]:
            content = item.get("content", {})
            title = content.get("title", "")
            if title:
                titles.append(title)

        if not titles:
            return features

        if use_finbert:
            scores = _finbert_score(titles)
        else:
            scores = [_lexicon_score(t) for t in titles]

        features["news_sentiment_avg"] = float(np.mean(scores))
        features["news_sentiment_pos_ratio"] = float(np.mean([1 if s > 0.1 else 0 for s in scores]))
        features["news_sentiment_neg_ratio"] = float(np.mean([1 if s < -0.1 else 0 for s in scores]))
        features["news_count"] = float(len(titles)) / 20.0  # normalized

    except Exception:
        pass

    return features
