from io import BytesIO
import hashlib
from pathlib import Path
import shutil
import tempfile

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

router = APIRouter(
    prefix="/dataset",
    tags=["Dataset"],
)


# ============================================================
# PATHS
# ============================================================

DATA_DIR = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "raw"
)

DATA_FILE = DATA_DIR / "relationships.csv"
BACKUP_FILE = DATA_DIR / "relationships_previous.csv"


# ============================================================
# REQUIRED CSV COLUMNS
# ============================================================

REQUIRED_COLUMNS = [
    "source",
    "target",
    "relationship",
    "timestamp",
    "weight",
]


# ============================================================
# INTERNAL HELPERS
# ============================================================

def _sha256_bytes(data: bytes) -> str:
    """Return a SHA-256 hash for byte content."""
    return hashlib.sha256(data).hexdigest()


def _sha256_file(path: Path) -> str | None:
    """Return a SHA-256 hash for a file, or None when unavailable."""
    if not path.exists():
        return None

    digest = hashlib.sha256()

    try:
        with path.open("rb") as source_file:
            for chunk in iter(lambda: source_file.read(1024 * 1024), b""):
                digest.update(chunk)
    except OSError:
        return None

    return digest.hexdigest()


def _dataset_info(path: Path) -> dict:
    """Return safe metadata for a dataset file."""
    if not path.exists():
        return {
            "exists": False,
            "filename": path.name,
            "records": 0,
            "nodes": 0,
            "edges": 0,
            "date_range": {
                "start": None,
                "end": None,
            },
            "size_bytes": 0,
        }

    try:
        df = pd.read_csv(path)
    except Exception as exc:
        return {
            "exists": True,
            "filename": path.name,
            "records": 0,
            "nodes": 0,
            "edges": 0,
            "date_range": {
                "start": None,
                "end": None,
            },
            "size_bytes": path.stat().st_size,
            "read_error": str(exc),
        }

    records = int(len(df))

    if "source" in df.columns and "target" in df.columns:
        nodes = len(
            set(df["source"].astype(str))
            .union(set(df["target"].astype(str)))
        )
    else:
        nodes = 0

    start_date = None
    end_date = None

    if "timestamp" in df.columns and not df.empty:
        dates = pd.to_datetime(
            df["timestamp"],
            errors="coerce",
        ).dropna()

        if not dates.empty:
            start_date = dates.min().strftime("%Y-%m-%d")
            end_date = dates.max().strftime("%Y-%m-%d")

    return {
        "exists": True,
        "filename": path.name,
        "records": records,
        "nodes": int(nodes),
        "edges": records,
        "date_range": {
            "start": start_date,
            "end": end_date,
        },
        "size_bytes": path.stat().st_size,
    }


def _atomic_replace(source: Path, destination: Path) -> None:
    """Replace a file safely using a same-directory temporary file."""
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            suffix=".csv",
            prefix="networktrace_restore_",
            dir=destination.parent,
            delete=False,
        ) as temp_file:
            temp_path = Path(temp_file.name)

            with source.open("rb") as source_file:
                shutil.copyfileobj(source_file, temp_file)

        temp_path.replace(destination)
        temp_path = None

    except PermissionError as exc:
        raise HTTPException(
            status_code=409,
            detail=(
                "The active dataset is being used by another "
                "process. Close any program that has "
                "relationships.csv open and try again."
            ),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to replace the active dataset: {exc}",
        ) from exc

    finally:
        if temp_path is not None and temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass


# ============================================================
# ACTIVE DATASET STATUS
# ============================================================

@router.get("/status")
def dataset_status():
    """
    Return information about the active dataset and
    the available previous dataset.
    """
    active = _dataset_info(DATA_FILE)
    previous = _dataset_info(BACKUP_FILE)

    return {
        "status": "success",
        "active": active,
        "previous": previous,
        "can_restore": bool(previous["exists"]),
    }


# ============================================================
# DOWNLOAD ACTIVE DATASET
# ============================================================

@router.get("/download")
def download_dataset():
    """Download the currently active relationship dataset."""
    if not DATA_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail="No active dataset is available.",
        )

    return FileResponse(
        path=str(DATA_FILE),
        media_type="text/csv",
        filename="relationships.csv",
    )


# ============================================================
# RESTORE PREVIOUS DATASET
# ============================================================

@router.post("/restore")
def restore_previous_dataset():
    """
    Restore relationships_previous.csv as the active dataset.

    The current active dataset is first copied back to the
    previous-dataset file only after the replacement succeeds,
    so the operation can be used repeatedly.
    """
    if not BACKUP_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail="No previous dataset is available to restore.",
        )

    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # Preserve the currently active dataset in memory by copying
    # it to a temporary file before replacing relationships.csv.
    current_temp = None

    try:
        if DATA_FILE.exists():
            with tempfile.NamedTemporaryFile(
                suffix=".csv",
                prefix="networktrace_current_",
                dir=DATA_DIR,
                delete=False,
            ) as temp_file:
                current_temp = Path(temp_file.name)

            shutil.copy2(DATA_FILE, current_temp)

        _atomic_replace(
            BACKUP_FILE,
            DATA_FILE,
        )

        # Keep the former active dataset as the new previous dataset.
        if current_temp is not None and current_temp.exists():
            shutil.copy2(
                current_temp,
                BACKUP_FILE,
            )

    except HTTPException:
        raise

    except PermissionError as exc:
        raise HTTPException(
            status_code=409,
            detail=(
                "The dataset is being used by another process. "
                "Close any program that has relationships.csv "
                "open and try again."
            ),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to restore the previous dataset: {exc}",
        ) from exc

    finally:
        if current_temp is not None and current_temp.exists():
            try:
                current_temp.unlink()
            except OSError:
                pass

    return {
        "status": "success",
        "message": "Previous dataset restored successfully.",
        "active": _dataset_info(DATA_FILE),
        "previous": _dataset_info(BACKUP_FILE),
        "can_restore": BACKUP_FILE.exists(),
    }


# ============================================================
# UPLOAD DATASET
# ============================================================

@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...)
):
    """
    Upload and validate a NetworkTrace relationship CSV.

    Required columns:
    source,target,relationship,timestamp,weight
    """

    # --------------------------------------------------------
    # Validate filename
    # --------------------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file was provided.",
        )

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported.",
        )

    # --------------------------------------------------------
    # Read uploaded file
    # --------------------------------------------------------

    try:
        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="The uploaded CSV file is empty.",
            )

        if len(contents) > 20 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="CSV file is too large. Maximum size is 20 MB.",
            )

        df = pd.read_csv(
            BytesIO(contents)
        )

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to read CSV file: {exc}",
        )

    # --------------------------------------------------------
    # Normalize column names
    # --------------------------------------------------------

    df.columns = [
        str(column).strip().lower()
        for column in df.columns
    ]

    # --------------------------------------------------------
    # Validate required columns
    # --------------------------------------------------------

    missing_columns = [
        column
        for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing_columns:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "CSV is missing required columns.",
                "missing_columns": missing_columns,
                "required_columns": REQUIRED_COLUMNS,
            },
        )

    df = df[REQUIRED_COLUMNS].copy()

    # --------------------------------------------------------
    # Validate records
    # --------------------------------------------------------

    if df.empty:
        raise HTTPException(
            status_code=422,
            detail="CSV contains no relationship records.",
        )

    # --------------------------------------------------------
    # Clean string columns
    # --------------------------------------------------------

    for column in [
        "source",
        "target",
        "relationship",
    ]:
        df[column] = (
            df[column]
            .astype(str)
            .str.strip()
        )

    # --------------------------------------------------------
    # Validate source
    # --------------------------------------------------------

    invalid_source = (
        df["source"].eq("")
        | df["source"].eq("nan")
        | df["source"].isna()
    )

    if invalid_source.any():
        raise HTTPException(
            status_code=422,
            detail=(
                "CSV contains missing or empty "
                "source values."
            ),
        )

    # --------------------------------------------------------
    # Validate target
    # --------------------------------------------------------

    invalid_target = (
        df["target"].eq("")
        | df["target"].eq("nan")
        | df["target"].isna()
    )

    if invalid_target.any():
        raise HTTPException(
            status_code=422,
            detail=(
                "CSV contains missing or empty "
                "target values."
            ),
        )

    # --------------------------------------------------------
    # Prevent self-loops
    # --------------------------------------------------------

    self_loops = (
        df["source"] == df["target"]
    )

    if self_loops.any():
        count = int(self_loops.sum())

        raise HTTPException(
            status_code=422,
            detail=(
                f"CSV contains {count} self-loop "
                "relationship(s). Source and target "
                "must be different."
            ),
        )

    # --------------------------------------------------------
    # Validate relationship
    # --------------------------------------------------------

    invalid_relationship = (
        df["relationship"].eq("")
        | df["relationship"].eq("nan")
        | df["relationship"].isna()
    )

    if invalid_relationship.any():
        raise HTTPException(
            status_code=422,
            detail=(
                "CSV contains missing relationship "
                "types."
            ),
        )

    # --------------------------------------------------------
    # Validate timestamps
    # --------------------------------------------------------

    parsed_dates = pd.to_datetime(
        df["timestamp"],
        errors="coerce",
    )

    invalid_dates = parsed_dates.isna()

    if invalid_dates.any():
        count = int(invalid_dates.sum())

        raise HTTPException(
            status_code=422,
            detail=(
                f"CSV contains {count} invalid "
                "timestamp value(s)."
            ),
        )

    df["timestamp"] = (
        parsed_dates
        .dt.strftime("%Y-%m-%d")
    )

    # --------------------------------------------------------
    # Validate weights
    # --------------------------------------------------------

    df["weight"] = pd.to_numeric(
        df["weight"],
        errors="coerce",
    )

    invalid_weights = df["weight"].isna()

    if invalid_weights.any():
        count = int(invalid_weights.sum())

        raise HTTPException(
            status_code=422,
            detail=(
                f"CSV contains {count} invalid "
                "weight value(s)."
            ),
        )

    if (df["weight"] <= 0).any():
        raise HTTPException(
            status_code=422,
            detail=(
                "Relationship weights must be "
                "greater than 0."
            ),
        )

    # --------------------------------------------------------
    # Remove duplicate relationships
    # --------------------------------------------------------

    original_count = len(df)

    df = df.drop_duplicates(
        subset=[
            "source",
            "target",
            "relationship",
            "timestamp",
        ]
    )

    duplicate_count = (
        original_count - len(df)
    )

    # --------------------------------------------------------
    # Calculate statistics BEFORE writing
    # --------------------------------------------------------

    nodes = set(
        df["source"]
    ).union(
        set(df["target"])
    )

    record_count = int(len(df))
    node_count = int(len(nodes))

    start_date = str(
        df["timestamp"].min()
    )

    end_date = str(
        df["timestamp"].max()
    )

    # --------------------------------------------------------
    # Prepare data directory
    # --------------------------------------------------------

    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # --------------------------------------------------------
    # Detect re-upload of the currently active dataset
    # --------------------------------------------------------
    #
    # If the uploaded bytes are identical to the active CSV,
    # there is nothing to replace. Skipping the backup/replace
    # operation avoids an unnecessary Windows file-lock conflict.
    #

    active_hash = _sha256_file(DATA_FILE)
    uploaded_hash = _sha256_bytes(contents)

    if active_hash is not None and uploaded_hash == active_hash:
        return {
            "status": "success",
            "message": (
                "Dataset is already the active NetworkTrace "
                "dataset. No replacement was necessary."
            ),
            "filename": file.filename,
            "records": record_count,
            "nodes": node_count,
            "edges": record_count,
            "duplicates_removed": int(duplicate_count),
            "columns": REQUIRED_COLUMNS,
            "date_range": {
                "start": start_date,
                "end": end_date,
            },
            "already_active": True,
        }

    # --------------------------------------------------------
    # Create backup COPY
    # --------------------------------------------------------

    if DATA_FILE.exists():
        try:
            shutil.copy2(
                DATA_FILE,
                BACKUP_FILE,
            )

        except PermissionError as exc:
            raise HTTPException(
                status_code=409,
                detail=(
                    "The current dataset is being used "
                    "by another process. Close any program "
                    "that has relationships.csv open and "
                    "try again."
                ),
            ) from exc

        except OSError as exc:
            raise HTTPException(
                status_code=500,
                detail=(
                    f"Unable to create dataset backup: "
                    f"{exc}"
                ),
            ) from exc

    # --------------------------------------------------------
    # Write new dataset to a temporary file
    # --------------------------------------------------------

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".csv",
            prefix="networktrace_",
            dir=DATA_DIR,
            delete=False,
            encoding="utf-8",
            newline="",
        ) as temp_file:

            temp_path = Path(
                temp_file.name
            )

            df.to_csv(
                temp_file,
                index=False,
            )

        try:
            temp_path.replace(
                DATA_FILE
            )

            temp_path = None

        except PermissionError as exc:
            raise HTTPException(
                status_code=409,
                detail=(
                    "The current dataset is being "
                    "used by another process. "
                    "Close any program that has "
                    "relationships.csv open and "
                    "try again."
                ),
            ) from exc

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Unable to save uploaded dataset: "
                f"{exc}"
            ),
        ) from exc

    finally:
        if (
            temp_path is not None
            and temp_path.exists()
        ):
            try:
                temp_path.unlink()
            except OSError:
                pass

    # --------------------------------------------------------
    # Successful response
    # --------------------------------------------------------

    return {
        "status": "success",
        "message": (
            "Dataset uploaded and validated "
            "successfully."
        ),
        "filename": file.filename,
        "records": record_count,
        "nodes": node_count,
        "edges": record_count,
        "duplicates_removed": int(
            duplicate_count
        ),
        "columns": REQUIRED_COLUMNS,
        "date_range": {
            "start": start_date,
            "end": end_date,
        },
    }
