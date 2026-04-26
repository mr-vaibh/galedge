"""Screen/Factor and Alpha Model CRUD endpoints."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.screen import Screen, AlphaModel
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
):
    """Execute a saved screen query and return matching stocks."""
    screen = db.query(Screen).filter(Screen.id == screen_id, Screen.user_id == user.id).first()
    if not screen:
        raise HTTPException(status_code=404, detail="Screen not found")

    from app.services.screen_executor import run_screen
    result = run_screen(
        db=db,
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
    db: Session = Depends(get_db),
):
    """Execute a screen query directly without saving."""
    from app.services.screen_executor import run_screen
    return run_screen(db=db, query=query, portfolio_weight=weight, limit=limit)


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


@router.delete("/models/{model_id}")
def delete_alpha_model(model_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    model = db.query(AlphaModel).filter(AlphaModel.id == model_id, AlphaModel.user_id == user.id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Alpha model not found")
    db.delete(model)
    db.commit()
    return {"deleted": True}
