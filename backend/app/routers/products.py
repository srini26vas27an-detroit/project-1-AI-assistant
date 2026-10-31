from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.services import product_service

router = APIRouter(tags=["products"])

@router.get("",response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return [ProductOut.from_model(p) for p in product_service.list_products(db)]

@router.get("/{product_id}",response_model=ProductOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    return ProductOut.from_model(product_service.get_product(db, product_id))

@router.post("",response_model=ProductOut,status_code=201)
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    return ProductOut.from_model(product_service.create_product(db, data))

@router.patch("/{product_id}", response_model=ProductOut)
def update_product(product_id: str, data: ProductUpdate, db: Session = Depends(get_db)):
    return ProductOut.from_model(product_service.update_product(db, product_id, data))

@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: str, db: Session = Depends(get_db)):
    product_service.delete_product(db, product_id)