from __future__ import annotations

import logging
import os
from typing import Dict

from fastapi import HTTPException, Request, status

logger = logging.getLogger(__name__)

PASSWORD_TO_TOKEN: Dict[str, str] = {}

if passwords_env := os.getenv("PASSWORDS", ""):
    for pair in passwords_env.split(","):
        if ":" in pair:
            password, token = pair.strip().split(":", 1)
            PASSWORD_TO_TOKEN[password.strip()] = token.strip()


def log_auth_config() -> None:
    if not PASSWORD_TO_TOKEN:
        logger.warning("PASSWORDS env var is empty or not set")


async def verify_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )

    try:
        scheme, token = auth_header.split(" ", 1)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format",
        )

    if scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authentication scheme",
        )

    if token not in PASSWORD_TO_TOKEN.values():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    return token
