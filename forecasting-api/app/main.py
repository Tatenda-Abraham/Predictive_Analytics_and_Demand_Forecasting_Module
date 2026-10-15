import os
from datetime import date, timedelta
from typing import Any

import numpy as np
import psycopg
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from psycopg.rows import dict_row
from sklearn.ensemble import RandomForestRegressor

DATABASE_URL = os.getenv("DATABASE_URL")
DEMO_PRODUCTS = [
    {"id": 1, "sku": "ZS-1042", "name": "Single-Origin Olive Oil", "category": "Pantry", "unit_price": 18.5, "stock_quantity": 124, "reorder_point": 80, "base_demand": 16},
    {"id": 2, "sku": "ZS-2088", "name": "Artisan Sourdough Crackers", "category": "Bakery", "unit_price": 6.25, "stock_quantity": 86, "reorder_point": 90, "base_demand": 10},
    {"id": 3, "sku": "ZS-3310", "name": "Wildflower Honey, 12 oz", "category": "Pantry", "unit_price": 12.0, "stock_quantity": 240, "reorder_point": 100, "base_demand": 13},
    {"id": 4, "sku": "ZS-4156", "name": "Ceramic Pour-Over Set", "category": "Coffee & Tea", "unit_price": 32.0, "stock_quantity": 38, "reorder_point": 45, "base_demand": 5},
    {"id": 5, "sku": "ZS-5072", "name": "Smoked Sea Salt", "category": "Pantry", "unit_price": 9.75, "stock_quantity": 196, "reorder_point": 70, "base_demand": 8},
]

app = FastAPI(title="ZImSale Forecasting API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


class SaleInput(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0, le=1_000_000)
    unit_price: float = Field(ge=0)
    customer_name: str = Field(min_length=1, max_length=160)
    transaction_date: date | None = None


def _connection() -> psycopg.Connection[dict[str, Any]]:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def _products() -> list[dict[str, Any]]:
    if not DATABASE_URL:
        return DEMO_PRODUCTS
    with _connection() as conn:
        rows = conn.execute(
            """
            SELECT id, sku, name, category, unit_price::float AS unit_price,
                   stock_quantity, reorder_point
            FROM products ORDER BY id
            """
        ).fetchall()
    return rows


def _sales_history(product_id: int, product: dict[str, Any]) -> list[dict[str, Any]]:
    if DATABASE_URL:
        with _connection() as conn:
            rows = conn.execute(
                """
                SELECT series.day::date AS date, COALESCE(SUM(item.quantity), 0)::int AS demand
                FROM generate_series(CURRENT_DATE - 179, CURRENT_DATE, INTERVAL '1 day') AS series(day)
                LEFT JOIN sales_transactions transaction_row
                    ON transaction_row.transaction_date::date = series.day::date
                LEFT JOIN sales_transaction_items item
                    ON item.transaction_id = transaction_row.id AND item.product_id = %s
                GROUP BY series.day ORDER BY series.day
                """,
                (product_id,),
            ).fetchall()
        return [{"date": row["date"], "demand": row["demand"]} for row in rows]

    start = date.today() - timedelta(days=179)
    history = []
    for offset in range(180):
        day = start + timedelta(days=offset)
        seasonal = 2.5 * np.sin(day.timetuple().tm_yday * 2 * np.pi / 365)
        weekday = 2 * np.sin(day.isoweekday() * 2 * np.pi / 7)
        noise = ((offset * product_id) % 5) - 2
        demand = max(1, round(product["base_demand"] + seasonal + weekday + noise))
        history.append({"date": day, "demand": demand})
    return history


def _features(day: date, index: int, values: list[float]) -> list[float]:
    return [
        index,
        day.weekday(),
        day.timetuple().tm_yday,
        values[-1],
        values[-7],
        float(np.mean(values[-7:])),
        float(np.mean(values[-28:])),
    ]


def _make_forecast(history: list[dict[str, Any]], days: int) -> tuple[list[dict[str, Any]], float]:
    values = [float(row["demand"]) for row in history]
    dates = [row["date"] for row in history]
    features, targets = [], []
    for index in range(28, len(values)):
        features.append(_features(dates[index], index, values[:index]))
        targets.append(values[index])

    model = RandomForestRegressor(
        n_estimators=120,
        min_samples_leaf=2,
        max_features=0.9,
        random_state=42,
        n_jobs=1,
    )
    split = max(28, len(targets) - 28)
    evaluation_model = RandomForestRegressor(
        n_estimators=80, min_samples_leaf=2, max_features=0.9, random_state=42, n_jobs=1
    )
    evaluation_model.fit(features[:split], targets[:split])
    accuracy = float(evaluation_model.score(features[split:], targets[split:])) if split < len(targets) else 0.0
    model.fit(features, targets)
    predictions: list[dict[str, Any]] = []
    for step in range(days):
        day = dates[-1] + timedelta(days=1)
        feature = _features(day, len(values), values)
        trees = np.array([tree.predict([feature])[0] for tree in model.estimators_])
        demand = max(0.0, float(np.mean(trees)))
        lower = max(0.0, float(np.percentile(trees, 10)))
        upper = max(demand, float(np.percentile(trees, 90)))
        predictions.append(
            {
                "date": day,
                "demand": round(demand, 1),
                "lower": round(lower, 1),
                "upper": round(upper, 1),
            }
        )
        values.append(demand)
        dates.append(day)
    return predictions, max(0.0, min(1.0, accuracy))


@app.get("/health")
def health() -> dict[str, str]:
    if DATABASE_URL:
        try:
            with _connection() as conn:
                conn.execute("SELECT 1")
        except psycopg.Error as error:
            raise HTTPException(status_code=503, detail=f"PostgreSQL unavailable: {error}") from error
    return {"status": "ok", "data_source": "postgresql" if DATABASE_URL else "demo"}


@app.get("/api/products")
def list_products() -> list[dict[str, Any]]:
    try:
        return _products()
    except psycopg.Error as error:
        raise HTTPException(status_code=503, detail=f"Could not load products: {error}") from error


@app.get("/api/forecasts")
def get_forecast(
    product_id: int = Query(default=1, gt=0),
    days: int = Query(default=30, ge=1, le=90),
) -> dict[str, Any]:
    try:
        product = next((item for item in _products() if item["id"] == product_id), None)
        if product is None:
            raise HTTPException(status_code=404, detail=f"Product {product_id} was not found")
        history = _sales_history(product_id, product)
    except psycopg.Error as error:
        raise HTTPException(status_code=503, detail=f"Could not load sales history: {error}") from error

    forecast, accuracy = _make_forecast(history, days)
    total_demand = sum(point["demand"] for point in forecast)
    daily_demand = total_demand / days
    stock_cover = product["stock_quantity"] / daily_demand if daily_demand else None
    risk_days = min(days, 30)
    stockout_risk = (
        sum(point["demand"] for point in forecast[:risk_days]) >= product["stock_quantity"]
        or (stock_cover is not None and stock_cover < risk_days)
    )
    return {
        "product": product,
        "history": history[-60:],
        "forecast": forecast,
        "summary": {
            "projected_demand": round(total_demand),
            "average_daily_demand": round(daily_demand, 1),
            "stock_cover_days": round(stock_cover, 1) if stock_cover is not None else None,
            "stockout_risk": stockout_risk,
            "model_accuracy": round(accuracy, 3),
        },
        "data_source": "postgresql" if DATABASE_URL else "demo",
        "range_method": "10th–90th percentile across 140 decision trees; not a calibrated confidence interval",
    }


@app.post("/api/sales", status_code=201)
def create_sale(sale: SaleInput) -> dict[str, Any]:
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Sales ingestion requires DATABASE_URL")
    try:
        with _connection() as conn:
            with conn.transaction():
                product = conn.execute(
                    "SELECT id, stock_quantity FROM products WHERE id = %s FOR UPDATE",
                    (sale.product_id,),
                ).fetchone()
                if product is None:
                    raise HTTPException(status_code=404, detail="Product was not found")
                if product["stock_quantity"] < sale.quantity:
                    raise HTTPException(status_code=409, detail="Insufficient stock")
                transaction = conn.execute(
                    """
                    INSERT INTO sales_transactions (customer_name, transaction_date)
                    VALUES (%s, COALESCE(%s::date, CURRENT_DATE))
                    RETURNING id, transaction_date
                    """,
                    (sale.customer_name, sale.transaction_date),
                ).fetchone()
                conn.execute(
                    """
                    INSERT INTO sales_transaction_items (transaction_id, product_id, quantity, unit_price)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (transaction["id"], sale.product_id, sale.quantity, sale.unit_price),
                )
                conn.execute(
                    "UPDATE products SET stock_quantity = stock_quantity - %s WHERE id = %s",
                    (sale.quantity, sale.product_id),
                )
        return {"transaction_id": transaction["id"], "transaction_date": transaction["transaction_date"]}
    except psycopg.Error as error:
        raise HTTPException(status_code=503, detail=f"Could not record sale: {error}") from error
