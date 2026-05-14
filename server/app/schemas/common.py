from typing import Any, Optional
from pydantic import BaseModel


class Response(BaseModel):
    success: bool
    data: Any = None
    error: Optional[str] = None
    meta: Optional[dict] = None


def ok(data: Any = None, meta: Optional[dict] = None) -> Response:
    return Response(success=True, data=data, meta=meta)


def err(error: str) -> Response:
    return Response(success=False, error=error)


class PaginationParams(BaseModel):
    page: int = 1
    limit: int = 20

    def offset(self) -> int:
        return (self.page - 1) * self.limit

    def clamp(self) -> "PaginationParams":
        self.limit = min(self.limit, 100)
        return self
