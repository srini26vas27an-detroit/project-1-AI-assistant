from fastapi import APIRouter, Depends,Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.sale import SaleCreate, SaleOut
from app.services import sale_service

router = APIRouter(tags=["sales"])

@router.get("", response_model=list[SaleOut])
def list_sales(limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db)):
    return [SaleOut.from_model(s) for s in sale_service.list_sales(db, limit)]

@router.get("/{sale_id}", response_model=SaleOut)
def get_sale(sale_id: str, db: Session = Depends(get_db)):
    return SaleOut.from_model(sale_service.get_sale(db, sale_id))

@router.post("", response_model=SaleOut, status_code=201)
def create_sale(data: SaleCreate, db: Session = Depends(get_db)):
    return SaleOut.from_model(sale_service.create_sale(db, data))