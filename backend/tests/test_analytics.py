def sell(client, product_id, qty, method="Cash"):
    r = client.post(
        "/sales",
        json={"items": [{"productId": product_id, "quantity": qty}], "paymentMethod": method},
    )
    assert r.status_code == 201, r.text


def test_summary_stock_counts(client, add_product):
    add_product(name="Rice", qty=20)       # in stock (min 5)
    add_product(name="Oil", qty=3)         # low
    add_product(name="Ghee", qty=0)        # out
    s = client.get("/analytics/summary").json()
    assert s["totalProductsCount"] == 3
    assert s["inStockCount"] == 1
    assert s["lowStockCount"] == 1
    assert s["outOfStockCount"] == 1


def test_summary_sales_numbers(client, add_product):
    p = add_product(price=100, qty=50)
    sell(client, p["id"], 2)
    sell(client, p["id"], 4)
    s = client.get("/analytics/summary").json()
    assert s["todaySales"] == 600
    assert s["todayTransactionsCount"] == 2
    assert s["totalSales"] == 600
    assert s["averageBill"] == 300


def test_summary_with_no_sales(client):
    s = client.get("/analytics/summary").json()
    assert s["totalSales"] == 0
    assert s["averageBill"] == 0


def test_chart_shapes_and_totals(client, add_product):
    p = add_product(price=100, qty=50)
    sell(client, p["id"], 3)
    for period, size in [("today", 8), ("7days", 7), ("30days", 5)]:
        points = client.get(f"/analytics/chart?period={period}").json()
        assert len(points) == size
        assert sum(pt["sales"] for pt in points) == 300
        assert sum(pt["transactions"] for pt in points) == 1


def test_seven_day_chart_puts_today_last(client, add_product):
    p = add_product(price=100, qty=50)
    sell(client, p["id"], 1)
    points = client.get("/analytics/chart?period=7days").json()
    assert points[-1]["sales"] == 100


def test_invalid_period_is_rejected(client):
    assert client.get("/analytics/chart?period=yearly").status_code == 422


def test_top_products_ordered_by_quantity(client, add_product):
    a = add_product(name="Rice", price=50, qty=100)
    b = add_product(name="Oil", price=150, qty=100)
    sell(client, a["id"], 5)
    sell(client, b["id"], 2)
    top = client.get("/analytics/top-products").json()
    assert [t["name"] for t in top] == ["Rice", "Oil"]
    assert top[0]["quantitySold"] == 5
    assert top[0]["totalRevenue"] == 250