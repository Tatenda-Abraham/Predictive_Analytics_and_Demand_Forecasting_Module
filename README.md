# ZImSale

An integrated starter for ZImSale demand planning: a React operations dashboard,
a Python forecasting API, PostgreSQL storage, a Java transaction service, and a
Flutter buyer client.

## Architecture

- `forecasting-api/` — FastAPI service; trains a scikit-learn Random Forest on
  daily sales with calendar, lag, and rolling-average features. Per-tree
  prediction percentiles provide an uncertainty range, not a calibrated
  statistical confidence interval.
- `database/` — PostgreSQL schema and demo catalog/sales seed data.
- `transaction-service/` — Spring Boot service for recording and reading sales
  transactions.
- `dashboard/` — React/Vite demand planning dashboard.
- `buyer-app/` — Flutter catalog and demand forecast client.

## Run locally

1. Start PostgreSQL (optional for the API demo mode):

   ```sh
   docker compose up -d postgres
   ```

   The database initializes with a demo catalog and 180 days of sales.

2. Start the forecasting API:

   ```sh
   cd forecasting-api
   python -m venv .venv
   # Activate .venv for your shell, then:
   pip install -r requirements.txt
   # Set DATABASE_URL if PostgreSQL is running (see .env.example).
   uvicorn app.main:app --reload --port 8000
   ```

   Without `DATABASE_URL`, the API uses deterministic sample sales and reports
   that it is in demo mode. With `DATABASE_URL` set, database errors are
   surfaced rather than silently switching data sources.

   Run the forecasting and API contract tests from `forecasting-api/` with
   `pip install -r requirements-dev.txt` followed by `python -m pytest -q`.

3. Start the dashboard:

   ```sh
   cd dashboard
   npm install
   npm run dev
   ```

   Set `VITE_FORECAST_API_URL` to change the API origin; it defaults to
   `http://localhost:8000`. If the API is unavailable, the dashboard clearly
   labels its sample preview data. Configure `CORS_ORIGINS` on the API when
   serving the dashboard from a different origin.

4. Start the transaction service from `transaction-service/` with Java 17+ and
   Maven installed:

   ```sh
   mvn spring-boot:run
   ```

   It listens on port `8081`; set `JDBC_DATABASE_URL` to override the default
   local database connection. `DATABASE_USERNAME` and `DATABASE_PASSWORD`
   configure its database credentials.

5. Run the buyer app from `buyer-app/`:

   ```sh
   flutter pub get
   flutter run --dart-define=FORECAST_API_URL=http://10.0.2.2:8000
   ```

   `10.0.2.2` reaches the host machine from the Android emulator. For a browser
   or physical device, pass a reachable host URL instead.
   Android debug builds allow cleartext HTTP for local development; production
   deployments should use HTTPS.

## API

- `GET /health` — readiness and data-source mode.
- `GET /api/products` — catalog with available stock and recent sales.
- `GET /api/forecasts?product_id=1&days=30` — daily historical and forecast
  demand, inventory coverage, and stockout risk.
- `POST /api/sales` — record an individual sale.
- `POST /api/transactions` — Java service transaction ingestion endpoint.
- `GET /docs` — interactive API documentation.

`days` is bounded from 1 to 90. Forecast inputs must have positive quantities;
stock must be zero or greater.
