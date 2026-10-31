CREDIT = "Credit (Kadai Khata)"


def credit_sale(client, product_id, qty, name="Murugan"):
    return client.post(
        "/sales",
        json={
            "items": [{"productId": product_id, "quantity": qty}],
            "paymentMethod": CREDIT,
            "customerName": name,
        },
    )


def balance_of(client, customer_id):
    customers = client.get("/customers").json()
    return next(c["balance"] for c in customers if c["id"] == customer_id)


def test_credit_sale_requires_customer_name(client, add_product):
    p = add_product()
    r = client.post(
        "/sales",
        json={"items": [{"productId": p["id"], "quantity": 1}], "paymentMethod": CREDIT},
    )
    assert r.status_code == 400


def test_credit_sale_creates_customer_with_balance(client, add_product):
    p = add_product(price=100, qty=10)
    assert credit_sale(client, p["id"], 3).status_code == 201
    customers = client.get("/customers").json()
    assert len(customers) == 1
    assert customers[0]["name"] == "Murugan"
    assert customers[0]["balance"] == 300
    assert customers[0]["lastPurchased"] != ""


def test_same_customer_name_is_reused(client, add_product):
    p = add_product(price=100, qty=10)
    credit_sale(client, p["id"], 1, name="Murugan")
    credit_sale(client, p["id"], 2, name="murugan")   # different case
    customers = client.get("/customers").json()
    assert len(customers) == 1
    assert customers[0]["balance"] == 300


def test_payment_reduces_balance(client, add_product):
    p = add_product(price=100, qty=10)
    credit_sale(client, p["id"], 3)
    cid = client.get("/customers").json()[0]["id"]
    r = client.post(f"/customers/{cid}/payments", json={"amount": 100})
    assert r.status_code == 200
    assert r.json()["balance"] == 200


def test_overpayment_is_rejected(client, add_product):
    p = add_product(price=100, qty=10)
    credit_sale(client, p["id"], 1)
    cid = client.get("/customers").json()[0]["id"]
    r = client.post(f"/customers/{cid}/payments", json={"amount": 500})
    assert r.status_code == 400
    assert balance_of(client, cid) == 100


def test_payment_for_unknown_customer(client):
    r = client.post("/customers/9999/payments", json={"amount": 10})
    assert r.status_code == 404


def test_cash_sale_does_not_create_khata(client, add_product):
    p = add_product()
    client.post(
        "/sales",
        json={
            "items": [{"productId": p["id"], "quantity": 1}],
            "paymentMethod": "Cash",
            "customerName": "Walk-in",
        },
    )
    assert client.get("/customers").json() == []