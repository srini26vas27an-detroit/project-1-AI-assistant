from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.analytics import ChartPoint, SummaryOut, TopSellingItem
from app.services import analytics_service

router = APIRouter(tags=["analytics"])

Period = Literal["today", "7days", "30days"]


@router.get("/summary", response_model=SummaryOut)
def summary(db: Session = Depends(get_db)):
    return analytics_service.get_summary(db)


@router.get("/chart", response_model=list[ChartPoint])
def chart(period: Period = "7days", db: Session = Depends(get_db)):
    return analytics_service.get_chart(db, period)


@router.get("/top-products", response_model=list[TopSellingItem])
def top_products(
    limit: int = Query(5, ge=1, le=50),
    period: Period | None = None,
    db: Session = Depends(get_db),
):
    return analytics_service.get_top_products(db, limit, period)