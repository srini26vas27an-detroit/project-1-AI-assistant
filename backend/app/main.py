from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.errors import register_error_handlers
from app.core.logging import setup_logging
from app.routers import health, products, customers,sales,analytics,assistant

setup_logging()

app = FastAPI(title = "Kirana AI — Ungal Kadai Thunai")

app.add_middleware(
       CORSMiddleware,
       allow_origins=settings.cors_origins_list,
       allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?",
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
register_error_handlers(app)

app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(products.router, prefix="/products", tags=["Products"])
app.include_router(customers.router, prefix="/customers", tags=["Customers"])
app.include_router(sales.router, prefix="/sales", tags=["Sales"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(assistant.router, prefix="/assistant", tags=["Assistant"])
