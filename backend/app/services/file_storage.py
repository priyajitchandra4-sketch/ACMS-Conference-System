import hashlib
import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

# The backend folder (this file is backend/app/services/file_storage.py).
# An absolute path means files land in the same place whichever folder uvicorn was started from.
BASE_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BASE_DIR / "uploads"
STORED_PREFIX = "uploads"  # what is saved in the database: uploads/<random name>

# A file must have the right extension AND start with the right bytes.
# Browsers often send the wrong content-type for .doc/.docx, so the content-type is not trusted.
ALLOWED_SIGNATURES = {
    ".pdf": (b"%PDF-",),
    ".docx": (b"PK\x03\x04",),
    ".doc": (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",),
}
MAX_FILE_SIZE_MB = 20
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


def save_uploaded_file(file: UploadFile) -> tuple[str, str, int]:
    """Validates and stores the file. Returns (stored_path, sha256, size_in_bytes)."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_SIGNATURES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{ext or 'none'}'. Allowed: .pdf, .doc, .docx",
        )

    # Read at most one byte over the limit, so a huge upload is not loaded into memory.
    content = file.file.read(MAX_FILE_SIZE_BYTES + 1)
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File is larger than the {MAX_FILE_SIZE_MB} MB limit.",
        )
    if len(content) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is empty.")
    if not any(content.startswith(sig) for sig in ALLOWED_SIGNATURES[ext]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The file content does not look like a real {ext} file.",
        )

    digest = hashlib.sha256(content).hexdigest()
    name = f"{secrets.token_hex(16)}{ext}"
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        (UPLOAD_DIR / name).write_bytes(content)
    except OSError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The server could not save the uploaded file.",
        )
    return f"{STORED_PREFIX}/{name}", digest, len(content)


def delete_file(stored_path: str) -> None:
    """Removes a stored file (used when the database save fails after the file was written)."""
    try:
        (UPLOAD_DIR / Path(stored_path).name).unlink(missing_ok=True)
    except OSError:
        pass