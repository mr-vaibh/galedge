"""Per-user workspace provisioning for the code editor."""

import os
import logging
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.auth import require_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/alpha/workspace", tags=["workspace"])

# Configurable paths — override via environment variables
USERS_BASE = Path(os.environ.get("WORKSPACE_USERS_DIR", "/home/galedge-coder/users"))
SHARED_DIR = Path(os.environ.get("WORKSPACE_SHARED_DIR", "/home/galedge-coder/shared"))
PYTHON_PATH = os.environ.get("WORKSPACE_PYTHON", "/home/galedge-coder/bin/python")


def _provision_workspace(user_id: int) -> Path:
    """Create per-user workspace with symlinked shared files. Idempotent."""
    user_dir = USERS_BASE / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)

    # Symlink shared read-only files
    for item in ["galedge.py", "README.md", "examples"]:
        target = SHARED_DIR / item
        link = user_dir / item
        if not link.exists() and target.exists():
            try:
                os.symlink(str(target), str(link))
            except FileExistsError:
                pass

    # Create user's writable directories
    (user_dir / "my_scripts").mkdir(exist_ok=True)

    # Create .vscode/settings.json for Python interpreter
    vscode_dir = user_dir / ".vscode"
    vscode_dir.mkdir(exist_ok=True)
    settings_file = vscode_dir / "settings.json"
    if not settings_file.exists():
        settings_file.write_text(
            '{\n'
            f'  "python.defaultInterpreterPath": "{PYTHON_PATH}",\n'
            '  "python.terminal.activateEnvironment": false,\n'
            '  "files.readonlyInclude": {\n'
            '    "galedge.py": true,\n'
            '    "README.md": true,\n'
            '    "examples/**": true\n'
            '  }\n'
            '}\n'
        )

    return user_dir


@router.post("/provision")
def provision_workspace(user: User = Depends(require_user)):
    """Create or return the user's isolated workspace."""
    try:
        workspace_path = _provision_workspace(user.id)
        return {
            "workspace_path": str(workspace_path),
            "status": "ready",
            "user_id": user.id,
        }
    except Exception as e:
        logger.error("Workspace provisioning failed for user %s: %s", user.id, e)
        return {
            "workspace_path": str(USERS_BASE / str(user.id)),
            "status": "error",
            "error": str(e),
        }


@router.get("/status")
def workspace_status(user: User = Depends(require_user)):
    """Check if user's workspace exists and is ready."""
    user_dir = USERS_BASE / str(user.id)
    exists = user_dir.exists()
    has_symlinks = (user_dir / "galedge.py").exists() if exists else False

    return {
        "workspace_path": str(user_dir),
        "provisioned": exists and has_symlinks,
        "user_id": user.id,
    }
