import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401  (registers all tables)
from app.core.database import Base, get_db
from app.main import app


@pytest.fixture()
def db():
    """A fresh in-memory SQLite database for every test."""
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False)()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture()
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def add_product(client):
    """add_product(name="Sugar", price=44, qty=10) -> product JSON"""

    def _add(name="Sugar", price=44, qty=10, unit="kg", **extra):
        body = {
            "name": name,
            "category": "Sugar & Salt",
            "quantity": qty,
            "unit": unit,
            "sellingPrice": price,
            "costPrice": price * 0.9,
            "minStock": 5,
            **extra,
        }
        r = client.post("/products", json=body)
        assert r.status_code == 201, r.text
        return r.json()

    return _add