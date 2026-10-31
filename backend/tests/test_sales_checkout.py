def sell(client, items, method="Cash", customer=None):
    body = {"items": items, "paymentMethod": method}
    if customer:
        body["customerName"] = customer
    return client.post("/sales", json=body)


def stock(client, product_id):
    return client.get(f"/products/{product_id}").json()["quantity"]


def test_cash_sale_reduces_stock_and_totals(client, add_product):
    p = add_product(price=44, qty=10)
    r = sell(client, [{"productId": p["id"], "quantity": 2.5}])
    assert r.status_code == 201
    body = r.json()
    assert body["total"] == 110
    assert body["itemCount"] == 1
    assert body["items"][0]["productName"] == "Sugar"
    assert stock(client, p["id"]) == 7.5


def test_not_enough_stock_is_rejected(client, add_product):
    p = add_product(qty=2)
    r = sell(client, [{"productId": p["id"], "quantity": 5}])
    assert r.status_code == 400
    assert "Not enough stock" in r.json()["detail"]
    assert stock(client, p["id"]) == 2


def test_checkout_is_atomic(client, add_product):
    """If the 2nd item fails, the 1st item's stock must NOT change."""
    a = add_product(name="Rice", qty=10)
    b = add_product(name="Oil", qty=1)
    r = sell(
        client,
        [{"productId": a["id"], "quantity": 3}, {"productId": b["id"], "quantity": 5}],
    )
    assert r.status_code == 400
    assert stock(client, a["id"]) == 10
    assert client.get("/sales").json() == []


def test_duplicate_lines_are_merged_for_stock_check(client, add_product):
    p = add_product(qty=5)
    r = sell(
        client,
        [{"productId": p["id"], "quantity": 3}, {"productId": p["id"], "quantity": 4}],
    )
    assert r.status_code == 400  # 3 + 4 = 7 > 5


def test_unknown_product_returns_404(client):
    r = sell(client, [{"productId": "9999", "quantity": 1}])
    assert r.status_code == 404


def test_invalid_payment_method(client, add_product):
    p = add_product()
    r = sell(client, [{"productId": p["id"], "quantity": 1}], method="Bitcoin")
    assert r.status_code == 400


def test_zero_quantity_is_invalid(client, add_product):
    p = add_product()
    r = sell(client, [{"productId": p["id"], "quantity": 0}])
    assert r.status_code == 422


def test_bill_keeps_price_after_product_edit(client, add_product):
    p = add_product(price=44)
    sale = sell(client, [{"productId": p["id"], "quantity": 1}]).json()
    client.patch(f"/products/{p['id']}", json={"sellingPrice": 99})
    old = client.get(f"/sales/{sale['id']}").json()
    assert old["items"][0]["unitPrice"] == 44