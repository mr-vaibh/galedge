"""Mean-variance portfolio optimizer using CVXPY.

Supports multiple objective functions and constraint types for
institutional-grade portfolio construction.
"""

from __future__ import annotations

import logging
from typing import Any

import cvxpy as cp
import numpy as np

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helper: regularise covariance matrix so it is always positive-semidefinite
# ---------------------------------------------------------------------------

def _regularise_covariance(cov: np.ndarray, eps: float = 1e-8) -> np.ndarray:
    """Add a small ridge to the diagonal if *cov* is singular / near-singular."""
    try:
        np.linalg.cholesky(cov)
        return cov
    except np.linalg.LinAlgError:
        logger.warning("Covariance matrix is not PSD; adding ridge %.1e", eps)
        return cov + eps * np.eye(cov.shape[0])


# ---------------------------------------------------------------------------
# Core optimiser
# ---------------------------------------------------------------------------

class PortfolioOptimizer:
    """Mean-variance portfolio optimizer backed by CVXPY.

    Parameters
    ----------
    expected_returns : array-like, shape (n,)
        Expected return for each stock.
    covariance_matrix : array-like, shape (n, n)
        Covariance matrix of stock returns.
    symbols : list[str]
        Ticker symbols corresponding to the columns.
    risk_free_rate : float
        Annualised risk-free rate (used for Sharpe computation).
    """

    def __init__(
        self,
        expected_returns: np.ndarray | list[float],
        covariance_matrix: np.ndarray | list[list[float]],
        symbols: list[str],
        risk_free_rate: float = 0.05,
    ) -> None:
        self.mu = np.asarray(expected_returns, dtype=float).flatten()
        self.cov = _regularise_covariance(
            np.asarray(covariance_matrix, dtype=float)
        )
        self.symbols = list(symbols)
        self.n = len(self.symbols)
        self.rf = risk_free_rate

        if self.mu.shape[0] != self.n:
            raise ValueError(
                f"expected_returns length ({self.mu.shape[0]}) != "
                f"symbols length ({self.n})"
            )
        if self.cov.shape != (self.n, self.n):
            raise ValueError(
                f"covariance_matrix shape {self.cov.shape} != "
                f"({self.n}, {self.n})"
            )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def optimize(
        self,
        objective: str = "minimize_risk",
        constraints: list[dict[str, Any]] | None = None,
        benchmark_weights: np.ndarray | list[float] | None = None,
        current_weights: np.ndarray | list[float] | None = None,
        factor_exposures: np.ndarray | None = None,
        stock_betas: np.ndarray | list[float] | None = None,
        stock_sectors: dict[str, str] | None = None,
        target_return: float | None = None,
    ) -> dict[str, Any]:
        """Run the optimisation and return results.

        Parameters
        ----------
        objective :
            One of ``minimize_risk``, ``maximize_return``,
            ``maximize_sharpe``, ``minimize_tracking_error``.
        constraints :
            List of constraint dicts.  Each dict must have a ``type`` key
            plus relevant parameters (see ``_apply_constraint``).
        benchmark_weights :
            Benchmark weight vector (needed for tracking-error objective).
        current_weights :
            Current portfolio weight vector (needed for turnover constraint).
        factor_exposures :
            (n x k) matrix of factor loadings (needed for factor_exposure
            constraint).
        stock_betas :
            Per-stock beta values (needed for beta_exposure constraint).
        stock_sectors :
            Mapping ``{symbol: sector}`` (needed for sector_constraint).
        target_return :
            Target return level (used with ``minimize_risk`` to trace the
            efficient frontier).
        """
        constraints = constraints or []

        # ── Decision variable ────────────────────────────────────────
        w = cp.Variable(self.n, name="w")

        # ── Shared expressions ───────────────────────────────────────
        portfolio_variance = cp.quad_form(w, cp.psd_wrap(self.cov))
        portfolio_return = self.mu @ w

        # ── Base constraints (weights sum to 1, long-only by default) ─
        cvx_constraints: list[cp.Constraint] = [
            cp.sum(w) == 1,
            w >= 0,
        ]

        # ── User-supplied constraints ────────────────────────────────
        for c in constraints:
            cvx_constraints.extend(
                self._apply_constraint(
                    c, w, portfolio_return,
                    current_weights=current_weights,
                    stock_betas=stock_betas,
                    stock_sectors=stock_sectors,
                    factor_exposures=factor_exposures,
                )
            )

        # Optional return target (used for efficient-frontier sweeps)
        if target_return is not None:
            cvx_constraints.append(portfolio_return >= target_return)

        # ── Objective ────────────────────────────────────────────────
        if objective == "minimize_risk":
            prob = cp.Problem(cp.Minimize(portfolio_variance), cvx_constraints)

        elif objective == "maximize_return":
            prob = cp.Problem(cp.Maximize(portfolio_return), cvx_constraints)

        elif objective == "maximize_sharpe":
            # Maximise (mu'w - rf) / sqrt(w'Sigma w).
            # Reformulate via the Cornuejols-Tutuncu trick:
            #   minimise  y'Sigma y
            #   s.t.      mu'y - rf*kappa >= 1
            #             sum(y) == kappa, y >= 0, kappa >= 0
            # Then w = y / kappa.
            y = cp.Variable(self.n, name="y")
            kappa = cp.Variable(name="kappa", nonneg=True)
            sharpe_constraints = [
                self.mu @ y - self.rf * kappa >= 1,
                cp.sum(y) == kappa,
                y >= 0,
            ]
            # Translate user constraints onto (y, kappa) space
            for c in constraints:
                sharpe_constraints.extend(
                    self._apply_constraint_sharpe(c, y, kappa, stock_betas, stock_sectors, factor_exposures)
                )
            prob = cp.Problem(
                cp.Minimize(cp.quad_form(y, cp.psd_wrap(self.cov))),
                sharpe_constraints,
            )
            prob.solve(solver=cp.SCS, warm_start=True, max_iters=10_000)
            return self._build_sharpe_result(prob, y, kappa)

        elif objective == "minimize_tracking_error":
            if benchmark_weights is None:
                raise ValueError(
                    "benchmark_weights required for minimize_tracking_error"
                )
            bw = np.asarray(benchmark_weights, dtype=float).flatten()
            diff = w - bw
            tracking_var = cp.quad_form(diff, cp.psd_wrap(self.cov))
            prob = cp.Problem(cp.Minimize(tracking_var), cvx_constraints)

        else:
            raise ValueError(f"Unknown objective: {objective!r}")

        # ── Solve ────────────────────────────────────────────────────
        prob.solve(solver=cp.SCS, warm_start=True, max_iters=10_000)

        return self._build_result(prob, w, current_weights, stock_sectors)

    # ------------------------------------------------------------------
    # Efficient frontier
    # ------------------------------------------------------------------

    def efficient_frontier(
        self,
        n_points: int = 20,
        constraints: list[dict[str, Any]] | None = None,
        **kwargs: Any,
    ) -> list[dict[str, Any]]:
        """Return *n_points* along the efficient frontier.

        The method first finds the minimum-variance portfolio and the
        maximum-return portfolio, then sweeps target returns between the
        two.
        """
        # End-points
        min_var = self.optimize(
            objective="minimize_risk", constraints=constraints, **kwargs
        )
        max_ret = self.optimize(
            objective="maximize_return", constraints=constraints, **kwargs
        )

        if min_var["status"] != "optimal" or max_ret["status"] != "optimal":
            return [min_var, max_ret]

        lo = min_var["expected_return"]
        hi = max_ret["expected_return"]

        targets = np.linspace(lo, hi, n_points)
        frontier: list[dict[str, Any]] = []

        for t in targets:
            result = self.optimize(
                objective="minimize_risk",
                constraints=constraints,
                target_return=float(t),
                **kwargs,
            )
            frontier.append(result)

        return frontier

    # ------------------------------------------------------------------
    # Constraint builders
    # ------------------------------------------------------------------

    def _apply_constraint(
        self,
        c: dict[str, Any],
        w: cp.Variable,
        portfolio_return: cp.Expression,
        *,
        current_weights: np.ndarray | list[float] | None = None,
        stock_betas: np.ndarray | list[float] | None = None,
        stock_sectors: dict[str, str] | None = None,
        factor_exposures: np.ndarray | None = None,
    ) -> list[cp.Constraint]:
        """Translate a constraint dict into CVXPY constraints."""
        ctype = c.get("type", "")
        out: list[cp.Constraint] = []

        if ctype == "maximum_capital":
            # total invested <= limit  (already sum==1, but allow <1)
            # Replace the equality with an inequality in the caller if needed;
            # here we just add the upper bound.
            limit = float(c["value"])
            out.append(cp.sum(w) <= limit)

        elif ctype == "max_positions":
            # Cardinality constraint is NP-hard; approximate with an
            # L1 penalty or big-M.  Here we use a simple heuristic:
            # enforce w_i <= binary_i, sum(binary) <= k.
            # CVXPY supports MIP via ECOS_BB / GLPK_MI.
            k = int(c["value"])
            b = cp.Variable(self.n, boolean=True)
            out.append(w <= b)
            out.append(cp.sum(b) <= k)

        elif ctype == "position_size_bound":
            lo = float(c.get("min", 0.0))
            hi = float(c.get("max", 1.0))
            out.append(w >= lo)
            out.append(w <= hi)

        elif ctype == "min_position_size":
            # Stocks are either 0 or >= floor.
            # Requires binary variables.
            floor = float(c["value"])
            b = cp.Variable(self.n, boolean=True)
            out.append(w >= floor * b)
            out.append(w <= b)  # if b_i=0 then w_i=0

        elif ctype == "beta_exposure":
            if stock_betas is None:
                raise ValueError("stock_betas required for beta_exposure constraint")
            betas = np.asarray(stock_betas, dtype=float).flatten()
            port_beta = betas @ w
            if "lower" in c:
                out.append(port_beta >= float(c["lower"]))
            if "upper" in c:
                out.append(port_beta <= float(c["upper"]))

        elif ctype == "factor_exposure":
            if factor_exposures is None:
                raise ValueError(
                    "factor_exposures required for factor_exposure constraint"
                )
            factor_name = c["factor"]
            col_idx = int(c.get("factor_index", 0))
            loadings = np.asarray(factor_exposures[:, col_idx], dtype=float).flatten()
            exposure = loadings @ w
            if "lower" in c:
                out.append(exposure >= float(c["lower"]))
            if "upper" in c:
                out.append(exposure <= float(c["upper"]))

        elif ctype == "turnover":
            if current_weights is None:
                raise ValueError(
                    "current_weights required for turnover constraint"
                )
            cw = np.asarray(current_weights, dtype=float).flatten()
            max_turnover = float(c["value"])
            out.append(cp.norm(w - cw, 1) <= max_turnover)

        elif ctype == "sector_constraint":
            if stock_sectors is None:
                raise ValueError(
                    "stock_sectors required for sector_constraint"
                )
            sector = c["sector"]
            mask = np.array(
                [1.0 if stock_sectors.get(s) == sector else 0.0 for s in self.symbols]
            )
            sector_weight = mask @ w
            if "min" in c:
                out.append(sector_weight >= float(c["min"]))
            if "max" in c:
                out.append(sector_weight <= float(c["max"]))

        else:
            logger.warning("Unknown constraint type %r — skipped", ctype)

        return out

    def _apply_constraint_sharpe(
        self,
        c: dict[str, Any],
        y: cp.Variable,
        kappa: cp.Variable,
        stock_betas: np.ndarray | list[float] | None,
        stock_sectors: dict[str, str] | None,
        factor_exposures: np.ndarray | None,
    ) -> list[cp.Constraint]:
        """Translate constraints into the (y, kappa) space used by the
        Sharpe-ratio reformulation.  w = y / kappa, so weight-based
        constraints become ``f(y) <op> bound * kappa``.
        """
        ctype = c.get("type", "")
        out: list[cp.Constraint] = []

        if ctype == "position_size_bound":
            lo = float(c.get("min", 0.0))
            hi = float(c.get("max", 1.0))
            out.append(y >= lo * kappa)
            out.append(y <= hi * kappa)

        elif ctype == "beta_exposure":
            if stock_betas is None:
                return out
            betas = np.asarray(stock_betas, dtype=float).flatten()
            if "lower" in c:
                out.append(betas @ y >= float(c["lower"]) * kappa)
            if "upper" in c:
                out.append(betas @ y <= float(c["upper"]) * kappa)

        elif ctype == "sector_constraint":
            if stock_sectors is None:
                return out
            sector = c["sector"]
            mask = np.array(
                [1.0 if stock_sectors.get(s) == sector else 0.0 for s in self.symbols]
            )
            if "min" in c:
                out.append(mask @ y >= float(c["min"]) * kappa)
            if "max" in c:
                out.append(mask @ y <= float(c["max"]) * kappa)

        # Other constraint types (cardinality, turnover) are hard to
        # reformulate in the Sharpe trick; log and skip.
        elif ctype in ("max_positions", "min_position_size", "turnover", "maximum_capital"):
            logger.warning(
                "Constraint %r is not supported with maximize_sharpe — skipped", ctype
            )

        return out

    # ------------------------------------------------------------------
    # Result builders
    # ------------------------------------------------------------------

    def _build_result(
        self,
        prob: cp.Problem,
        w: cp.Variable,
        current_weights: np.ndarray | list[float] | None = None,
        stock_sectors: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        if prob.status not in ("optimal", "optimal_inaccurate"):
            return {
                "weights": {},
                "expected_return": 0.0,
                "expected_risk": 0.0,
                "sharpe_ratio": 0.0,
                "n_positions": 0,
                "turnover": 0.0,
                "sector_weights": {},
                "status": "infeasible",
            }

        weights = np.asarray(w.value).flatten()
        # Clip tiny negatives from numerical noise
        weights = np.maximum(weights, 0.0)
        weights /= weights.sum() if weights.sum() > 0 else 1.0

        return self._format_output(weights, current_weights, stock_sectors)

    def _build_sharpe_result(
        self,
        prob: cp.Problem,
        y: cp.Variable,
        kappa: cp.Variable,
    ) -> dict[str, Any]:
        if prob.status not in ("optimal", "optimal_inaccurate"):
            return {
                "weights": {},
                "expected_return": 0.0,
                "expected_risk": 0.0,
                "sharpe_ratio": 0.0,
                "n_positions": 0,
                "turnover": 0.0,
                "sector_weights": {},
                "status": "infeasible",
            }

        kappa_val = float(kappa.value)
        if kappa_val < 1e-10:
            return {
                "weights": {},
                "expected_return": 0.0,
                "expected_risk": 0.0,
                "sharpe_ratio": 0.0,
                "n_positions": 0,
                "turnover": 0.0,
                "sector_weights": {},
                "status": "infeasible",
            }

        weights = np.asarray(y.value).flatten() / kappa_val
        weights = np.maximum(weights, 0.0)
        weights /= weights.sum() if weights.sum() > 0 else 1.0

        return self._format_output(weights, None, None)

    def _format_output(
        self,
        weights: np.ndarray,
        current_weights: np.ndarray | list[float] | None,
        stock_sectors: dict[str, str] | None,
    ) -> dict[str, Any]:
        exp_ret = float(self.mu @ weights)
        exp_var = float(weights @ self.cov @ weights)
        exp_risk = float(np.sqrt(max(exp_var, 0.0)))
        sharpe = (exp_ret - self.rf) / exp_risk if exp_risk > 1e-12 else 0.0

        weight_dict = {
            sym: round(float(wt), 6)
            for sym, wt in zip(self.symbols, weights)
            if wt > 1e-6
        }

        n_positions = len(weight_dict)

        turnover = 0.0
        if current_weights is not None:
            cw = np.asarray(current_weights, dtype=float).flatten()
            turnover = float(np.sum(np.abs(weights - cw)))

        sector_weights: dict[str, float] = {}
        if stock_sectors:
            for sym, wt in zip(self.symbols, weights):
                sec = stock_sectors.get(sym, "Other")
                sector_weights[sec] = sector_weights.get(sec, 0.0) + float(wt)
            sector_weights = {
                k: round(v, 6) for k, v in sector_weights.items() if v > 1e-6
            }

        return {
            "weights": weight_dict,
            "expected_return": round(exp_ret, 6),
            "expected_risk": round(exp_risk, 6),
            "sharpe_ratio": round(sharpe, 4),
            "n_positions": n_positions,
            "turnover": round(turnover, 6),
            "sector_weights": sector_weights,
            "status": "optimal",
        }
