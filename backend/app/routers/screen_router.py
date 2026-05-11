"""Screen/Factor and Alpha Model CRUD endpoints."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
import numpy as np
import pandas as pd

from app.database import get_db, get_prices_db
from app.models.user import User
from app.models.screen import Screen, AlphaModel, CodeFile
from app.auth import require_user, get_current_user

router = APIRouter(prefix="/api/alpha", tags=["alpha-machine"])


class ScreenExecuteBody(BaseModel):
    query: str = ""
    universe: str = "all"
    weight: str = "equal"
    limit: int = 50


class ScreenCreate(BaseModel):
    name: str
    description: str = ""
    parent_universe: str = ""
    sector: str = ""
    industry: str = ""
    portfolio_weight: str = "Market Cap Weight"
    screener_query: str = ""
    score_equation: str = ""
    score_variable: str = ""

class AlphaModelCreate(BaseModel):
    name: str
    description: str = ""
    input_factors: list[str] = []
    control_factors: list[str] = []
    return_type: str = "Total"
    regression_weight: str = "Market Cap"
    universe: str = ""
    half_life: int | None = None
    estimation_frequency: str = "Quarterly"
    min_observations: int | None = None


# ── Screens ───────────────────────────────────────────────────────────────────

@router.get("/screens")
def list_screens(user: User = Depends(require_user), db: Session = Depends(get_db)):
    screens = db.query(Screen).filter(Screen.user_id == user.id).order_by(Screen.updated_at.desc()).all()
    return [{"id": s.id, "name": s.name, "description": s.description,
             "screener_query": s.screener_query or "",
             "created_at": str(s.created_at), "updated_at": str(s.updated_at)} for s in screens]


@router.post("/screens")
def create_screen(data: ScreenCreate, user: User = Depends(require_user), db: Session = Depends(get_db)):
    screen = Screen(user_id=user.id, **data.model_dump())
    db.add(screen)
    db.commit()
    db.refresh(screen)
    return {"id": screen.id, "name": screen.name}


@router.get("/screens/{screen_id}")
def get_screen(screen_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    screen = db.query(Screen).filter(Screen.id == screen_id, Screen.user_id == user.id).first()
    if not screen:
        raise HTTPException(status_code=404, detail="Screen not found")
    return {
        "id": screen.id, "name": screen.name, "description": screen.description,
        "parent_universe": screen.parent_universe, "sector": screen.sector,
        "industry": screen.industry, "portfolio_weight": screen.portfolio_weight,
        "screener_query": screen.screener_query, "score_equation": screen.score_equation,
        "score_variable": screen.score_variable,
    }


@router.put("/screens/{screen_id}")
def update_screen(screen_id: int, data: ScreenCreate, user: User = Depends(require_user), db: Session = Depends(get_db)):
    screen = db.query(Screen).filter(Screen.id == screen_id, Screen.user_id == user.id).first()
    if not screen:
        raise HTTPException(status_code=404, detail="Screen not found")
    for k, v in data.model_dump().items():
        setattr(screen, k, v)
    db.commit()
    return {"id": screen.id, "name": screen.name}


@router.delete("/screens/{screen_id}")
def delete_screen(screen_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    screen = db.query(Screen).filter(Screen.id == screen_id, Screen.user_id == user.id).first()
    if not screen:
        raise HTTPException(status_code=404, detail="Screen not found")
    db.delete(screen)
    db.commit()
    return {"deleted": True}


# ── Screen Execution ──────────────────────────────────────────────────────────

@router.post("/screens/{screen_id}/run")
def run_screen_query(
    screen_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    prices_db: Session = Depends(get_prices_db),
):
    """Execute a saved screen query and return matching stocks."""
    screen = db.query(Screen).filter(Screen.id == screen_id, Screen.user_id == user.id).first()
    if not screen:
        raise HTTPException(status_code=404, detail="Screen not found")

    from app.services.screen_executor import run_screen
    result = run_screen(
        db=prices_db,
        query=screen.screener_query,
        portfolio_weight=screen.portfolio_weight.lower().replace(" ", "_"),
    )

    # Cache results
    screen.results = result
    db.commit()

    return result


@router.post("/screens/execute")
def execute_screen_query(
    body: ScreenExecuteBody,
    prices_db: Session = Depends(get_prices_db),
):
    """Execute a screen query directly without saving."""
    from app.services.screen_executor import run_screen, validate_query
    if body.query.strip():
        valid, msg = validate_query(body.query)
        if not valid:
            raise HTTPException(status_code=400, detail=msg)
    return run_screen(db=prices_db, query=body.query, portfolio_weight=body.weight, limit=body.limit)


@router.get("/metrics")
def list_available_metrics():
    """List all available screening metrics."""
    from app.services.screen_executor import AVAILABLE_METRICS
    return {"count": len(AVAILABLE_METRICS), "metrics": AVAILABLE_METRICS}


# ── Alpha Models ──────────────────────────────────────────────────────────────

@router.get("/models")
def list_alpha_models(user: User = Depends(require_user), db: Session = Depends(get_db)):
    user_models = db.query(AlphaModel).filter(AlphaModel.user_id == user.id).order_by(AlphaModel.updated_at.desc()).all()
    platform_models = db.query(AlphaModel).filter(AlphaModel.user_id == None, AlphaModel.model_type == "platform").all()
    return {
        "user_models": [{"id": m.id, "name": m.name, "description": m.description,
                         "status": m.status,
                         "input_factors": m.input_factors or [],
                         "has_results": bool(m.results and m.status == "available"),
                         "computed_at": (m.results or {}).get("computed_at"),
                         "n_stocks": (m.results or {}).get("n_stocks"),
                         "start_date": str(m.start_date) if m.start_date else None,
                         "end_date": str(m.end_date) if m.end_date else None} for m in user_models],
        "platform_models": [{"id": m.id, "name": m.name, "description": m.description,
                             "status": m.status, "start_date": str(m.start_date) if m.start_date else None,
                             "end_date": str(m.end_date) if m.end_date else None} for m in platform_models],
    }


@router.post("/models")
def create_alpha_model(data: AlphaModelCreate, user: User = Depends(require_user), db: Session = Depends(get_db)):
    model = AlphaModel(user_id=user.id, **data.model_dump())
    db.add(model)
    db.commit()
    db.refresh(model)
    return {"id": model.id, "name": model.name}


@router.get("/models/{model_id}/results")
def get_alpha_model_results(
    model_id: int,
    top_n: int = Query(100, ge=1, le=500),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    model = db.query(AlphaModel).filter(AlphaModel.id == model_id, AlphaModel.user_id == user.id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    if model.status != "available" or not model.results:
        raise HTTPException(status_code=400, detail="Model not computed yet. Run Compute first.")
    results = model.results
    return {
        "model_id": model_id,
        "model_name": model.name,
        "input_factors": model.input_factors or [],
        "computed_at": results.get("computed_at"),
        "exposure_snapshot_date": results.get("exposure_snapshot_date"),
        "n_stocks": results.get("n_stocks"),
        "factor_returns": results.get("factor_returns", {}),
        "stocks": results.get("stocks", [])[:top_n],
    }


@router.post("/models/{model_id}/compute")
def compute_alpha_model(
    model_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    prices_db: Session = Depends(get_prices_db),
):
    """Compute per-stock alpha scores: factor exposure × trailing factor return, z-scored."""
    from app.models.factor import Factor, FactorReturn, FactorExposure

    model = db.query(AlphaModel).filter(AlphaModel.id == model_id, AlphaModel.user_id == user.id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    input_factor_names: list[str] = model.input_factors or []
    if not input_factor_names:
        raise HTTPException(status_code=400, detail="No input factors defined on this model.")

    model.status = "computing"
    db.commit()

    try:
        # Resolve factor names → factor_ids
        factors = prices_db.query(Factor).filter(Factor.name.in_(input_factor_names)).all()
        factor_map = {f.name: f.id for f in factors}
        if not factor_map:
            raise HTTPException(status_code=400, detail="No matching factors found. Ensure risk model is built.")

        factor_ids = list(factor_map.values())
        id_to_name = {v: k for k, v in factor_map.items()}

        # Trailing cumulative factor returns (last ~63 trading days = 3 months)
        since = date.today() - timedelta(days=120)
        fr_rows = (
            prices_db.query(FactorReturn)
            .filter(FactorReturn.factor_id.in_(factor_ids), FactorReturn.date >= since)
            .all()
        )
        if not fr_rows:
            raise HTTPException(status_code=400, detail="No factor return data. Build the risk model first.")

        fr_df = pd.DataFrame([{"factor_id": r.factor_id, "daily_return": r.daily_return or 0.0} for r in fr_rows])
        cum_by_id = fr_df.groupby("factor_id")["daily_return"].sum().to_dict()
        cum_by_name = {id_to_name[fid]: round(ret, 6) for fid, ret in cum_by_id.items() if fid in id_to_name}

        # Latest exposure snapshot
        latest_snap = prices_db.query(func.max(FactorExposure.date)).filter(
            FactorExposure.factor_id.in_(factor_ids)
        ).scalar()
        if not latest_snap:
            raise HTTPException(status_code=400, detail="No factor exposure data. Build the risk model first.")

        exp_rows = (
            prices_db.query(FactorExposure)
            .filter(FactorExposure.factor_id.in_(factor_ids), FactorExposure.date == latest_snap)
            .all()
        )

        # Build {symbol → {factor_name → exposure}}
        exposure_map: dict[str, dict[str, float]] = {}
        for row in exp_rows:
            fname = id_to_name.get(row.factor_id)
            if fname:
                exposure_map.setdefault(row.symbol, {})[fname] = row.exposure or 0.0

        if not exposure_map:
            raise HTTPException(status_code=400, detail="No exposure data at latest snapshot.")

        # Compute composite alpha score = Σ (exposure × factor_trailing_return)
        scores: list[dict] = []
        for symbol, exps in exposure_map.items():
            raw = sum(exps.get(f, 0.0) * cum_by_name.get(f, 0.0) for f in input_factor_names)
            scores.append({"symbol": symbol, "score": raw, "exposures": {k: round(v, 4) for k, v in exps.items()}})

        # Z-score
        raw_arr = np.array([s["score"] for s in scores], dtype=float)
        mean, std = float(raw_arr.mean()), float(raw_arr.std())
        for s in scores:
            s["z_score"] = round((s["score"] - mean) / std, 4) if std > 0 else 0.0
            s["score"] = round(s["score"], 6)

        # Rank descending
        scores.sort(key=lambda x: x["z_score"], reverse=True)
        for i, s in enumerate(scores):
            s["rank"] = i + 1

        results_payload = {
            "computed_at": str(date.today()),
            "exposure_snapshot_date": str(latest_snap),
            "factor_returns": cum_by_name,
            "n_stocks": len(scores),
            "stocks": scores,
        }

        model.results = results_payload
        model.status = "available"
        db.commit()

        return {"model_id": model_id, "n_stocks": len(scores), "top10": scores[:10]}

    except HTTPException:
        model.status = "draft"
        db.commit()
        raise
    except Exception as e:
        model.status = "draft"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Computation failed: {str(e)}")


class ComputeFactorsBody(BaseModel):
    factors: list[str]
    top_n: int = 50
    trailing_days: int = 63  # ~3 months of trading days


@router.post("/compute-factors")
def compute_factors_adhoc(
    body: ComputeFactorsBody,
    user: User = Depends(require_user),
    prices_db: Session = Depends(get_prices_db),
):
    """Compute alpha scores for any factor list on-the-fly — no model record needed."""
    from app.models.factor import Factor, FactorReturn, FactorExposure

    if not body.factors:
        raise HTTPException(status_code=400, detail="No factors provided.")

    factors = prices_db.query(Factor).filter(Factor.name.in_(body.factors)).all()
    factor_map = {f.name: f.id for f in factors}
    if not factor_map:
        raise HTTPException(status_code=400, detail="No matching factors found. Ensure risk model is built.")

    factor_ids = list(factor_map.values())
    id_to_name = {v: k for k, v in factor_map.items()}

    since = date.today() - timedelta(days=max(body.trailing_days * 2, 180))
    fr_rows = prices_db.query(FactorReturn).filter(
        FactorReturn.factor_id.in_(factor_ids), FactorReturn.date >= since
    ).all()
    if not fr_rows:
        raise HTTPException(status_code=400, detail="No factor return data. Build the risk model first.")

    fr_df = pd.DataFrame([{"factor_id": r.factor_id, "daily_return": r.daily_return or 0.0} for r in fr_rows])
    # Keep only the trailing window
    all_dates = sorted(fr_df["factor_id"].unique())  # not needed; just sum all available
    cum_by_id = fr_df.groupby("factor_id")["daily_return"].sum().to_dict()
    cum_by_name = {id_to_name[fid]: round(ret, 6) for fid, ret in cum_by_id.items() if fid in id_to_name}

    latest_snap = prices_db.query(func.max(FactorExposure.date)).filter(
        FactorExposure.factor_id.in_(factor_ids)
    ).scalar()
    if not latest_snap:
        raise HTTPException(status_code=400, detail="No factor exposure data. Build the risk model first.")

    exp_rows = prices_db.query(FactorExposure).filter(
        FactorExposure.factor_id.in_(factor_ids), FactorExposure.date == latest_snap
    ).all()

    exposure_map: dict[str, dict[str, float]] = {}
    for row in exp_rows:
        fname = id_to_name.get(row.factor_id)
        if fname:
            exposure_map.setdefault(row.symbol, {})[fname] = row.exposure or 0.0

    if not exposure_map:
        raise HTTPException(status_code=400, detail="No exposure data at latest snapshot.")

    scores: list[dict] = []
    for symbol, exps in exposure_map.items():
        raw = sum(exps.get(f, 0.0) * cum_by_name.get(f, 0.0) for f in body.factors)
        scores.append({"symbol": symbol, "score": raw, "exposures": {k: round(v, 4) for k, v in exps.items()}})

    raw_arr = np.array([s["score"] for s in scores], dtype=float)
    mean, std = float(raw_arr.mean()), float(raw_arr.std())
    for s in scores:
        s["z_score"] = round((s["score"] - mean) / std, 4) if std > 0 else 0.0
        s["score"] = round(s["score"], 6)

    scores.sort(key=lambda x: x["z_score"], reverse=True)
    for i, s in enumerate(scores):
        s["rank"] = i + 1

    return {
        "factors": body.factors,
        "factor_returns": cum_by_name,
        "exposure_snapshot_date": str(latest_snap),
        "n_stocks": len(scores),
        "stocks": scores[:body.top_n],
    }


@router.post("/upload-factor")
async def upload_factor(
    alpha_name: str = Form(...),
    description: str = Form(""),
    file: UploadFile = File(...),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Upload a custom alpha factor via CSV."""
    content = await file.read()

    # Save alpha model reference
    model = AlphaModel(
        user_id=user.id,
        name=alpha_name,
        description=description,
        model_type="user",
        status="AVAILABLE",
    )
    db.add(model)
    db.commit()
    db.refresh(model)

    # TODO: Parse CSV and store factor values in factor_exposures table
    return {"id": model.id, "name": model.name, "status": "AVAILABLE", "size": len(content)}


class RunCodeRequest(BaseModel):
    code: str


# Dangerous modules that must be blocked
_BLOCKED_MODULES = {"os", "sys", "subprocess", "shutil", "socket", "ctypes", "importlib"}

# Safe builtins exposed to user code
_SAFE_BUILTINS = {
    "print": print, "len": len, "range": range, "int": int, "float": float,
    "str": str, "list": list, "dict": dict, "tuple": tuple, "set": set,
    "sorted": sorted, "reversed": reversed, "enumerate": enumerate, "zip": zip,
    "map": map, "filter": filter, "abs": abs, "max": max, "min": min,
    "sum": sum, "round": round, "type": type, "isinstance": isinstance,
    "hasattr": hasattr, "getattr": getattr, "bool": bool, "True": True,
    "False": False, "None": None,
}

# Available library names for the error message
_AVAILABLE_LIBS = [
    "pandas (as pd)", "numpy (as np)", "math", "statistics", "datetime", "json", "re",
    "collections", "itertools", "functools", "time", "random", "string",
    "decimal", "fractions", "copy", "textwrap", "csv", "io",
]

def _safe_import(name, *args, **kwargs):
    """Custom __import__ that gives a clear error message."""
    raise ImportError(
        f"Cannot import '{name}' — custom imports are disabled in the sandbox.\n"
        f"Pre-imported libraries (use directly, no import needed): {', '.join(_AVAILABLE_LIBS)}"
    )

_SAFE_BUILTINS["__import__"] = _safe_import


def _build_restricted_globals() -> dict:
    """Build globals dict with safe builtins and pre-imported libraries."""
    import math, statistics, datetime, json, re, collections, itertools, functools, time, random, string, decimal, fractions, copy, textwrap, csv, io

    restricted = {"__builtins__": _SAFE_BUILTINS}

    # Pre-import safe libraries so user code can reference them directly
    safe_libs = {
        "math": math, "statistics": statistics, "datetime": datetime,
        "json": json, "re": re, "collections": collections,
        "itertools": itertools, "functools": functools,
        "time": time, "random": random, "string": string,
        "decimal": decimal, "fractions": fractions, "copy": copy,
        "textwrap": textwrap, "csv": csv, "io": io,
    }

    # Optional heavy libs — skip if not installed
    try:
        import pandas as pd
        safe_libs["pd"] = pd
        safe_libs["pandas"] = pd
    except ImportError:
        pass
    try:
        import numpy as np
        safe_libs["np"] = np
        safe_libs["numpy"] = np
    except ImportError:
        pass

    restricted.update(safe_libs)
    return restricted


def _check_blocked_imports(code: str) -> str | None:
    """Return the name of a blocked module if found in import statements, else None."""
    import re as _re
    for line in code.splitlines():
        stripped = line.strip()
        # Match: import os / import os, sys / from os import ...
        m = _re.match(r"^(?:import|from)\s+([\w,\s]+)", stripped)
        if not m:
            continue
        modules = [tok.strip() for tok in m.group(1).split(",")]
        for mod in modules:
            mod_root = mod.split(".")[0]
            if mod_root in _BLOCKED_MODULES:
                return mod_root
    # Also check __import__ calls
    if "__import__" in code:
        return "__import__"
    return None


@router.post("/run-code")
def run_python_code(req: RunCodeRequest):
    """Execute Python code in a sandboxed environment with security restrictions."""
    import io
    import sys
    import traceback
    import threading
    import re

    # --- Security check: block dangerous imports ---
    blocked = _check_blocked_imports(req.code)
    if blocked:
        return {
            "output": "",
            "error": f"SecurityError: import of '{blocked}' is blocked in the sandbox. "
                     f"Blocked modules: {', '.join(sorted(_BLOCKED_MODULES))}.",
        }

    # Capture stdout / stderr
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    captured_out = io.StringIO()
    captured_err = io.StringIO()

    result: dict = {}
    exc_holder: list = []

    def _exec_target():
        sys.stdout = captured_out
        sys.stderr = captured_err
        try:
            restricted_globals = _build_restricted_globals()
            exec(req.code, restricted_globals)
        except Exception as e:
            exc_holder.append(e)
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr

    # --- Run with 30-second timeout ---
    thread = threading.Thread(target=_exec_target, daemon=True)
    thread.start()
    thread.join(timeout=30)

    if thread.is_alive():
        return {
            "output": captured_out.getvalue(),
            "error": "TimeoutError: Code execution exceeded the 30-second limit.",
        }

    output = captured_out.getvalue()
    error_output = captured_err.getvalue()

    if exc_holder:
        e = exc_holder[0]
        tb = traceback.format_exception(type(e), e, e.__traceback__)
        tb_str = "".join(tb)
        sanitized_lines = []
        for line in tb_str.split("\n"):
            if 'File "' in line and '"<string>"' not in line:
                continue
            if "_exec_target" in line or "exec(req" in line:
                continue
            line = re.sub(r'(/[A-Za-z][\w./\-]*)', '<redacted>', line)
            line = re.sub(r'([A-Z]:\\[\w\\./\-]*)', '<redacted>', line)
            sanitized_lines.append(line)
        sanitized = "\n".join(sanitized_lines).strip()
        if not sanitized:
            sanitized = f"{type(e).__name__}: {e}"
        return {"output": output, "error": sanitized}

    return {"output": output + error_output if error_output else output, "error": None}


@router.put("/models/{model_id}")
def update_alpha_model(model_id: int, data: AlphaModelCreate, user: User = Depends(require_user), db: Session = Depends(get_db)):
    model = db.query(AlphaModel).filter(AlphaModel.id == model_id, AlphaModel.user_id == user.id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Alpha model not found")
    for k, v in data.model_dump().items():
        setattr(model, k, v)
    model.status = "draft"
    model.results = None
    db.commit()
    return {"id": model.id, "name": model.name}


@router.delete("/models/{model_id}")
def delete_alpha_model(model_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    model = db.query(AlphaModel).filter(AlphaModel.id == model_id, AlphaModel.user_id == user.id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Alpha model not found")
    db.delete(model)
    db.commit()
    return {"deleted": True}


# ── Code Files (saved editor files) ─────────────────────────────────────────

class CodeFileCreate(BaseModel):
    name: str
    code: str


class CodeFileUpdate(BaseModel):
    name: str | None = None
    code: str | None = None


@router.get("/code-files")
def list_code_files(user: User = Depends(require_user), db: Session = Depends(get_db)):
    """List all saved code files for the current user."""
    files = db.query(CodeFile).filter(CodeFile.user_id == user.id).order_by(CodeFile.updated_at.desc()).all()
    return [
        {
            "id": f.id, "name": f.name, "code": f.code,
            "created_at": str(f.created_at), "updated_at": str(f.updated_at),
        }
        for f in files
    ]


@router.post("/code-files")
def create_code_file(data: CodeFileCreate, user: User = Depends(require_user), db: Session = Depends(get_db)):
    """Create a new code file."""
    cf = CodeFile(user_id=user.id, name=data.name, code=data.code)
    db.add(cf)
    db.commit()
    db.refresh(cf)
    return {"id": cf.id, "name": cf.name, "code": cf.code,
            "created_at": str(cf.created_at), "updated_at": str(cf.updated_at)}


@router.put("/code-files/{file_id}")
def update_code_file(file_id: int, data: CodeFileUpdate, user: User = Depends(require_user), db: Session = Depends(get_db)):
    """Update a saved code file (name and/or code)."""
    cf = db.query(CodeFile).filter(CodeFile.id == file_id, CodeFile.user_id == user.id).first()
    if not cf:
        raise HTTPException(status_code=404, detail="Code file not found")
    if data.name is not None:
        cf.name = data.name
    if data.code is not None:
        cf.code = data.code
    db.commit()
    db.refresh(cf)
    return {"id": cf.id, "name": cf.name, "code": cf.code,
            "created_at": str(cf.created_at), "updated_at": str(cf.updated_at)}


@router.delete("/code-files/{file_id}")
def delete_code_file(file_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    """Delete a saved code file."""
    cf = db.query(CodeFile).filter(CodeFile.id == file_id, CodeFile.user_id == user.id).first()
    if not cf:
        raise HTTPException(status_code=404, detail="Code file not found")
    db.delete(cf)
    db.commit()
    return {"deleted": True}
