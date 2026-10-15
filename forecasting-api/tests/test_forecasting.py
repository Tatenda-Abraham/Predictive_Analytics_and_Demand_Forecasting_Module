from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import _make_forecast, app


def test_forecast_has_requested_horizon_and_ordered_ranges() -> None:
    history = [
        {"date": date(2026, 1, 1) + timedelta(days=index), "demand": 10 + index % 4}
        for index in range(90)
    ]

    forecast, score = _make_forecast(history, 14)

    assert len(forecast) == 14
    assert forecast[0]["date"] == history[-1]["date"] + timedelta(days=1)
    assert forecast[-1]["date"] == history[-1]["date"] + timedelta(days=14)
    assert all(point["lower"] <= point["demand"] <= point["upper"] for point in forecast)
    assert all(point["lower"] >= 0 for point in forecast)
    assert 0 <= score <= 1


@pytest.fixture(scope="module")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_demo_endpoints_return_catalog_and_bounded_forecast(client: TestClient) -> None:
    health = client.get("/health")
    products = client.get("/api/products")
    forecast_response = client.get("/api/forecasts?product_id=1&days=7")

    assert health.status_code == 200
    assert health.json()["data_source"] == "demo"
    assert products.status_code == 200
    assert len(products.json()) == 5
    assert forecast_response.status_code == 200
    forecast = forecast_response.json()
    assert len(forecast["history"]) == 60
    assert len(forecast["forecast"]) == 7
    assert forecast["forecast"][0]["date"] == (date.today() + timedelta(days=1)).isoformat()
    assert forecast["summary"]["projected_demand"] > 0


def test_forecast_rejects_unknown_products_and_out_of_range_horizons(client: TestClient) -> None:
    assert client.get("/api/forecasts?product_id=999").status_code == 404
    assert client.get("/api/forecasts?days=91").status_code == 422
