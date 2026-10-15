# ZImSale Buyer

Flutter client for the ZImSale wholesale catalog and product demand outlook.
The app loads products from the forecasting API and shows stock status, pricing,
30-day demand, stock cover, and a daily demand preview.

See the [monorepo README](../README.md) for shared API and database setup.

Set the API origin with `--dart-define=FORECAST_API_URL=...`. Android emulator
development uses `http://10.0.2.2:8000`; browsers and physical devices need an
API host reachable from that device. Production deployments should use HTTPS.

```sh
flutter pub get
flutter test
flutter analyze
flutter run --dart-define=FORECAST_API_URL=http://10.0.2.2:8000
```
