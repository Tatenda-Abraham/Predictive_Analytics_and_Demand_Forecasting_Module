# Business Forecast — Demand Planning & Inventory Analytics Platform

An integrated enterprise starter for ZImSale demand planning and inventory forecasting, combining a React operations dashboard, a Python forecasting API, PostgreSQL storage, a Java transaction service, and a Flutter buyer client.

## Architecture & Services

- **`forecasting-api/`** — FastAPI service; trains a scikit-learn Random Forest on daily sales with calendar, lag, and rolling-average features. Per-tree prediction percentiles provide an uncertainty range.
- **`database/`** — PostgreSQL schema and demo catalog/sales seed data.
- **`transaction-service/`** — Spring Boot service for recording and reading sales transactions.
- **`dashboard/`** — React/Vite demand planning dashboard.
- **`buyer-app/`** — Flutter catalog and demand forecast client.

## Tech Stack

- **Frontend & UI:** React, Vite (`dashboard/`), Flutter / Dart (`buyer-app/`)
- **Backend Services:** Python / FastAPI (`forecasting-api/`), Java / Spring Boot (`transaction-service/`)
- **Database & Storage:** PostgreSQL (`database/`), Docker Compose

## Project Structure

```text
BusinessForecast/
├── forecasting-api/
├── database/
├── transaction-service/
├── dashboard/
└── buyer-app/
