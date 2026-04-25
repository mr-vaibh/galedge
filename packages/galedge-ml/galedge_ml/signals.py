"""Signal scoring — converts raw features into human-readable scores 0-100."""

from __future__ import annotations

import numpy as np
import pandas as pd

from galedge_ml.config import FEATURE_GROUPS


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


def _score_rsi(rsi: float) -> tuple[float, str]:
    """RSI → bullish score. Oversold = bullish, overbought = bearish."""
    if rsi < 30:
        return 90.0, "bullish"
    if rsi < 40:
        return 70.0, "bullish"
    if rsi < 60:
        return 50.0, "neutral"
    if rsi < 70:
        return 30.0, "bearish"
    return 10.0, "bearish"


def compute_signals(
    features: pd.Series,
    feature_importances: dict[str, float] | None = None,
) -> dict:
    """Compute signal scores from a feature row.

    Returns:
        {
            "technical": {"score": float, "details": [...]},
            "momentum": {"score": float, "details": [...]},
            "fundamental": {"score": float, "details": [...]},
            "sentiment": {"score": float, "details": [...]},
            "composite": float (0-100),
        }
    """

    # ── Technical Score ───────────────────────────────────────────────────
    tech_details = []
    tech_scores = []

    # RSI
    rsi = features.get("rsi_14", 50)
    rsi_score, rsi_signal = _score_rsi(rsi)
    tech_details.append({"name": "RSI-14", "value": round(rsi, 1), "signal": rsi_signal})
    tech_scores.append(rsi_score)

    # MACD histogram
    macd_hist = features.get("macd_histogram", 0)
    macd_score = _clamp(50 + macd_hist * 5000, 0, 100)
    macd_signal = "bullish" if macd_hist > 0 else "bearish" if macd_hist < 0 else "neutral"
    tech_details.append({"name": "MACD Histogram", "value": round(macd_hist * 100, 2), "signal": macd_signal})
    tech_scores.append(macd_score)

    # Bollinger position
    bb_pos = features.get("bb_position", 0.5)
    bb_score = _clamp(bb_pos * 100, 0, 100)
    bb_signal = "bearish" if bb_pos > 0.8 else "bullish" if bb_pos < 0.2 else "neutral"
    tech_details.append({"name": "Bollinger Position", "value": round(bb_pos, 2), "signal": bb_signal})
    tech_scores.append(bb_score if bb_pos < 0.5 else 100 - bb_score)  # Low is bullish

    # ADX (trend strength — higher = stronger trend)
    adx = features.get("adx_14", 20)
    adx_score = _clamp(adx * 2, 0, 100)
    adx_signal = "strong trend" if adx > 25 else "weak trend"
    tech_details.append({"name": "ADX Trend", "value": round(adx, 1), "signal": adx_signal})
    tech_scores.append(adx_score)

    # SMA crossover
    sma_above = features.get("sma20_above_sma50", 0)
    sma_score = 80.0 if sma_above > 0.5 else 20.0
    tech_details.append({"name": "SMA 20/50", "value": "Golden Cross" if sma_above > 0.5 else "Death Cross", "signal": "bullish" if sma_above > 0.5 else "bearish"})
    tech_scores.append(sma_score)

    tech_final = np.mean(tech_scores)

    # ── Momentum Score ────────────────────────────────────────────────────
    mom_details = []
    mom_scores = []

    for period in [5, 10, 20]:
        ret = features.get(f"return_{period}d", 0)
        score = _clamp(50 + ret * 500, 0, 100)
        signal = "bullish" if ret > 0.01 else "bearish" if ret < -0.01 else "neutral"
        mom_details.append({"name": f"{period}D Return", "value": f"{ret*100:.2f}%", "signal": signal})
        mom_scores.append(score)

    # Volume trend
    vol_ratio = features.get("volume_ratio_20d", 1.0)
    vol_score = _clamp(vol_ratio * 50, 0, 100)
    mom_details.append({"name": "Volume vs 20D Avg", "value": f"{vol_ratio:.2f}x", "signal": "high" if vol_ratio > 1.5 else "normal"})
    mom_scores.append(vol_score)

    # ROC
    roc = features.get("roc_10", 0)
    roc_score = _clamp(50 + roc * 500, 0, 100)
    mom_details.append({"name": "ROC-10", "value": f"{roc*100:.2f}%", "signal": "bullish" if roc > 0 else "bearish"})
    mom_scores.append(roc_score)

    mom_final = np.mean(mom_scores)

    # ── Fundamental Score ─────────────────────────────────────────────────
    fund_details = []
    fund_scores = []

    pe = features.get("trailing_pe", 0)
    if pe > 0:
        pe_score = _clamp(100 - pe * 2, 0, 100)  # lower P/E = better value
        fund_details.append({"name": "P/E Ratio", "value": round(pe, 1), "signal": "undervalued" if pe < 20 else "fair" if pe < 30 else "expensive"})
        fund_scores.append(pe_score)

    margin = features.get("profit_margin", 0)
    margin_score = _clamp(margin * 300, 0, 100)
    fund_details.append({"name": "Profit Margin", "value": f"{margin*100:.1f}%", "signal": "strong" if margin > 0.15 else "weak"})
    fund_scores.append(margin_score)

    roe = features.get("roe", 0)
    roe_score = _clamp(roe * 300, 0, 100)
    fund_details.append({"name": "ROE", "value": f"{roe*100:.1f}%", "signal": "strong" if roe > 0.15 else "weak"})
    fund_scores.append(roe_score)

    growth = features.get("revenue_growth", 0)
    growth_score = _clamp(50 + growth * 200, 0, 100)
    fund_details.append({"name": "Revenue Growth", "value": f"{growth*100:.1f}%", "signal": "growing" if growth > 0.05 else "flat" if growth > -0.05 else "declining"})
    fund_scores.append(growth_score)

    de = features.get("debt_to_equity", 0)
    de_score = _clamp(100 - de * 50, 0, 100)  # lower = better
    fund_details.append({"name": "Debt/Equity", "value": round(de, 2), "signal": "low" if de < 0.5 else "moderate" if de < 1.5 else "high"})
    fund_scores.append(de_score)

    fund_final = np.mean(fund_scores) if fund_scores else 50.0

    # ── Sentiment Score ───────────────────────────────────────────────────
    sent_details = []
    sent_scores = []

    analyst = features.get("analyst_score", 0.5)
    analyst_pct = analyst * 100
    sent_details.append({"name": "Analyst Rating", "value": f"{analyst_pct:.0f}/100", "signal": "buy" if analyst > 0.7 else "hold" if analyst > 0.5 else "sell"})
    sent_scores.append(analyst_pct)

    insider = features.get("insider_buy_ratio", 0.5)
    insider_score = insider * 100
    sent_details.append({"name": "Insider Buy Ratio", "value": f"{insider*100:.0f}%", "signal": "buying" if insider > 0.6 else "selling" if insider < 0.4 else "mixed"})
    sent_scores.append(insider_score)

    pcr = features.get("put_call_ratio", 1.0)
    pcr_score = _clamp(100 - pcr * 50, 0, 100)  # low PCR = bullish
    sent_details.append({"name": "Put/Call Ratio", "value": round(pcr, 2), "signal": "bullish" if pcr < 0.7 else "bearish" if pcr > 1.3 else "neutral"})
    sent_scores.append(pcr_score)

    sent_final = np.mean(sent_scores) if sent_scores else 50.0

    # ── Composite Score ───────────────────────────────────────────────────
    # Weight by feature importance if available
    if feature_importances:
        group_weights = {}
        for group_name, group_features in FEATURE_GROUPS.items():
            weight = sum(feature_importances.get(f, 0) for f in group_features)
            group_weights[group_name] = weight
        total_weight = sum(group_weights.values()) or 1.0

        composite = (
            (group_weights.get("technical", 0.3) / total_weight) * tech_final +
            (group_weights.get("price_volume", 0.25) / total_weight) * mom_final +
            (group_weights.get("fundamental", 0.2) / total_weight) * fund_final +
            (group_weights.get("sentiment", 0.15) / total_weight) * sent_final +
            (group_weights.get("calendar", 0.1) / total_weight) * 50  # calendar is neutral
        )
    else:
        composite = 0.35 * tech_final + 0.25 * mom_final + 0.25 * fund_final + 0.15 * sent_final

    return {
        "technical": {"score": round(tech_final, 1), "details": tech_details},
        "momentum": {"score": round(mom_final, 1), "details": mom_details},
        "fundamental": {"score": round(fund_final, 1), "details": fund_details},
        "sentiment": {"score": round(sent_final, 1), "details": sent_details},
        "composite": round(_clamp(composite), 1),
    }
