from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.customer import CustomerCreate, CustomerOut, PaymentIn
from app.services import customer_service

router = APIRouter(tags=["customers"])

@router.get("", response_model=list[CustomerOut])
def list_customers(db: Session = Depends(get_db)):
    return customer_service.list_customers(db)

@router.post("", response_model=CustomerOut, status_code=201)
def create_customer(data: CustomerCreate, db: Session = Depends(get_db)):
    return customer_service.create_customer(db, data)

@router.post("/{customer_id}/payments", response_model=CustomerOut)
def record_payment(customer_id: str, data: PaymentIn, db: Session = Depends(get_db)):
    return customer_service.record_payment(db, customer_id, data)