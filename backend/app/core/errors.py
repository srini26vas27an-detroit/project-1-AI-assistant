from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class NotFound(Exception):
    def __init__(self, message: str = "Not found"):
        self.message = message


class InsufficientStock(Exception):
    def __init__(self, product_name: str, available: float):
        self.message = f"Not enough stock for {product_name} (available: {available})"


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFound)
    async def not_found_handler(request: Request, exc: NotFound):
        return JSONResponse(status_code=404, content={"detail": exc.message})

    @app.exception_handler(InsufficientStock)
    async def insufficient_stock_handler(request: Request, exc: InsufficientStock):
        return JSONResponse(status_code=400, content={"detail": exc.message})
    
    @app.exception_handler(BadRequest)
    async def bad_request_handler(request: Request, exc: BadRequest):
        return JSONResponse(status_code=400, content={"detail": exc.message})

class BadRequest(Exception):
    def __init__(self, message: str):
        self.message = message

