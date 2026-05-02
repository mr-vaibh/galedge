"""Screen/Factor and Alpha Model CRUD endpoints."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db, get_prices_db
from app.models.user import User
from app.models.screen import Screen, AlphaModel, CodeFile
from app.auth import require_user, get_current_user

router = APIRouter(prefix="/api/alpha", tags=["alpha-machine"])


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
    query: str = "",
    universe: str = "all",
    weight: str = "equal",
    limit: int = 50,
    prices_db: Session = Depends(get_prices_db),
):
    """Execute a screen query directly without saving."""
    from app.services.screen_executor import run_screen
    return run_screen(db=prices_db, query=query, portfolio_weight=weight, limit=limit)


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
                         "status": m.status, "start_date": str(m.start_date) if m.start_date else None,
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
