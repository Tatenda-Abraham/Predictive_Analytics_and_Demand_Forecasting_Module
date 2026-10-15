import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

const apiUrl = String.fromEnvironment(
  'FORECAST_API_URL',
  defaultValue: 'http://localhost:8000',
);
const primaryBlue = Color(0xFF5C83A5);
const ink = Color(0xFF2F3D4D);
const canvas = Color(0xFFF3F6FA);

void main() => runApp(const ZImSaleBuyerApp());

class ZImSaleBuyerApp extends StatelessWidget {
  const ZImSaleBuyerApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'ZImSale',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          scaffoldBackgroundColor: canvas,
          colorScheme: ColorScheme.fromSeed(seedColor: primaryBlue),
          fontFamily: 'Roboto',
          appBarTheme: const AppBarTheme(
            backgroundColor: canvas,
            foregroundColor: ink,
            elevation: 0,
          ),
        ),
        home: const BuyerHomePage(),
      );
}

class BuyerHomePage extends StatefulWidget {
  const BuyerHomePage({super.key});

  @override
  State<BuyerHomePage> createState() => _BuyerHomePageState();
}

class _BuyerHomePageState extends State<BuyerHomePage> {
  late Future<List<Product>> _products = _fetchProducts();

  Future<List<Product>> _fetchProducts() async {
    final response = await http.get(Uri.parse('$apiUrl/api/products'));
    if (response.statusCode != 200) {
      throw Exception('Product service returned ${response.statusCode}.');
    }
    return (jsonDecode(response.body) as List<dynamic>)
        .map((item) => Product.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> _refresh() async {
    final refresh = _fetchProducts();
    setState(() => _products = refresh);
    await refresh;
  }

  void _retryProducts() {
    setState(() => _products = _fetchProducts());
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          titleSpacing: 20,
          title: const Row(
            children: [
              Icon(Icons.eco_rounded, color: primaryBlue, size: 21),
              SizedBox(width: 8),
              Text(
                'ZImSale',
                style: TextStyle(
                  color: primaryBlue,
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -.5,
                ),
              ),
            ],
          ),
          actions: [
            IconButton(
              tooltip: 'Refresh inventory',
              onPressed: _retryProducts,
              icon: const Icon(Icons.refresh_rounded),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: FutureBuilder<List<Product>>(
          future: _products,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return _ErrorPanel(
                message: snapshot.error.toString(),
                onRetry: _retryProducts,
              );
            }
            if (!snapshot.hasData) {
              return const Center(
                child: CircularProgressIndicator(color: primaryBlue),
              );
            }
            final products = snapshot.data!;
            return RefreshIndicator(
              color: primaryBlue,
              onRefresh: _refresh,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
                children: [
                  const _AccountBanner(),
                  const SizedBox(height: 27),
                  Text(
                    'Your wholesale shelf',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: ink,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -.8,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${products.length} curated products · demand-led stock insights',
                    style: const TextStyle(color: Color(0xFF78899A), fontSize: 13),
                  ),
                  const SizedBox(height: 19),
                  ...products.map(
                    (product) => Padding(
                      padding: const EdgeInsets.only(bottom: 11),
                      child: ProductTile(product: product),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Center(
                    child: Text(
                      'Thoughtfully planned, not overstocked.',
                      style: TextStyle(color: Color(0xFF8795A4), fontSize: 11),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      );
}

class _AccountBanner extends StatelessWidget {
  const _AccountBanner();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: const LinearGradient(
            colors: [Color(0xFF53799A), Color(0xFF89A2B8)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: const Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'ZImSale',
                    style: TextStyle(
                      color: Color(0xFFE5EEF5),
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.3,
                    ),
                  ),
                  SizedBox(height: 10),
                  Text(
                    'Good morning, Jordan.',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 19,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  SizedBox(height: 5),
                  Text(
                    'Your next order, a little more certain.',
                    style: TextStyle(color: Color(0xFFE5EDF4), fontSize: 12),
                  ),
                ],
              ),
            ),
            Icon(Icons.inventory_2_outlined, color: Color(0xFFDCE8F1), size: 34),
          ],
        ),
      );
}

class ProductTile extends StatelessWidget {
  const ProductTile({required this.product, super.key});

  final Product product;

  @override
  Widget build(BuildContext context) {
    final low = product.stock <= product.reorderPoint;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => ProductForecastPage(product: product),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(13),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: const Color(0xFFEAF1F7),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.spa_outlined, color: primaryBlue, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: ink,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      '${product.sku} · ${product.category}',
                      style: const TextStyle(
                        color: Color(0xFF8795A4),
                        fontSize: 10,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          low ? Icons.warning_amber_rounded : Icons.check_circle_outline_rounded,
                          color: low ? const Color(0xFFB78853) : const Color(0xFF6487A6),
                          size: 13,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${product.stock} units · ${low ? 'reorder soon' : 'in stock'}',
                          style: TextStyle(
                            color: low ? const Color(0xFFB78853) : const Color(0xFF6487A6),
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '\$${product.unitPrice.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: ink,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Icon(Icons.chevron_right_rounded, color: Color(0xFF8997A5), size: 18),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ProductForecastPage extends StatefulWidget {
  const ProductForecastPage({required this.product, super.key});

  final Product product;

  @override
  State<ProductForecastPage> createState() => _ProductForecastPageState();
}

class _ProductForecastPageState extends State<ProductForecastPage> {
  late Future<Map<String, dynamic>> _forecast = _fetchForecast();

  Future<Map<String, dynamic>> _fetchForecast() async {
    final uri = Uri.parse('$apiUrl/api/forecasts').replace(
      queryParameters: {'product_id': '${widget.product.id}', 'days': '30'},
    );
    final response = await http.get(uri);
    if (response.statusCode != 200) {
      throw Exception('Forecast service returned ${response.statusCode}.');
    }
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Demand outlook')),
        body: FutureBuilder<Map<String, dynamic>>(
          future: _forecast,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return _ErrorPanel(
                message: snapshot.error.toString(),
                onRetry: () => setState(() => _forecast = _fetchForecast()),
              );
            }
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator(color: primaryBlue));
            }
            final data = snapshot.data!;
            final summary = data['summary'] as Map<String, dynamic>;
            final forecast = data['forecast'] as List<dynamic>;
            final total = summary['projected_demand'] as num;
            final risk = summary['stockout_risk'] as bool;
            return ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  widget.product.name,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: ink,
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${widget.product.sku} · ${widget.product.category}',
                  style: const TextStyle(color: Color(0xFF78899A), fontSize: 13),
                ),
                const SizedBox(height: 22),
                _ForecastSummary(
                  title: 'Projected 30-day demand',
                  value: '$total units',
                  subtitle: '${summary['average_daily_demand']} units per day on average',
                  icon: Icons.insights_rounded,
                ),
                const SizedBox(height: 12),
                _ForecastSummary(
                  title: 'Current stock cover',
                  value: '${summary['stock_cover_days'] ?? '—'} days',
                  subtitle: risk ? 'Replenishment may be needed soon.' : 'Stock is on track for projected demand.',
                  icon: risk ? Icons.warning_amber_rounded : Icons.check_circle_outline_rounded,
                ),
                const SizedBox(height: 20),
                const Text(
                  'Next 7 days',
                  style: TextStyle(color: ink, fontSize: 16, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 11),
                ...forecast.take(7).map((point) {
                  final row = point as Map<String, dynamic>;
                  final demand = (row['demand'] as num).toDouble();
                  final max = (forecast
                          .take(7)
                          .map((item) => (item as Map<String, dynamic>)['upper'] as num)
                          .reduce((a, b) => a > b ? a : b))
                      .toDouble();
                  return _DailyDemandRow(point: row, demand: demand, max: max);
                }),
                const SizedBox(height: 14),
                const Text(
                  'Forecast estimates are generated from sales history using a Random Forest model. The expected range is an estimate, not a calibrated confidence interval.',
                  style: TextStyle(color: Color(0xFF8190A0), fontSize: 11, height: 1.55),
                ),
              ],
            );
          },
        ),
      );
}

class _ForecastSummary extends StatelessWidget {
  const _ForecastSummary({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
  });

  final String title;
  final String value;
  final String subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(13),
          color: Colors.white,
        ),
        child: Row(
          children: [
            Container(
              width: 39,
              height: 39,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(11),
                color: const Color(0xFFEAF1F7),
              ),
              child: Icon(icon, color: primaryBlue, size: 19),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(color: Color(0xFF78899A), fontSize: 11)),
                  const SizedBox(height: 4),
                  Text(value, style: const TextStyle(color: ink, fontSize: 18, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 3),
                  Text(subtitle, style: const TextStyle(color: Color(0xFF8391A0), fontSize: 10)),
                ],
              ),
            ),
          ],
        ),
      );
}

class _DailyDemandRow extends StatelessWidget {
  const _DailyDemandRow({
    required this.point,
    required this.demand,
    required this.max,
  });

  final Map<String, dynamic> point;
  final double demand;
  final double max;

  @override
  Widget build(BuildContext context) {
    final date = DateTime.parse(point['date'] as String);
    final label = MaterialLocalizations.of(context).formatShortDate(date);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        children: [
          SizedBox(
            width: 52,
            child: Text(label, style: const TextStyle(color: Color(0xFF8291A0), fontSize: 10)),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(5),
              child: LinearProgressIndicator(
                minHeight: 8,
                value: max > 0 ? demand / max : 0,
                backgroundColor: const Color(0xFFE8EEF3),
                color: primaryBlue,
              ),
            ),
          ),
          SizedBox(
            width: 45,
            child: Text(
              '${demand.round()} u',
              textAlign: TextAlign.end,
              style: const TextStyle(color: ink, fontSize: 11, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorPanel extends StatelessWidget {
  const _ErrorPanel({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_outlined, color: Color(0xFF70869A), size: 35),
              const SizedBox(height: 13),
              const Text(
                'Could not reach ZImSale',
                textAlign: TextAlign.center,
                style: TextStyle(color: ink, fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFF78899A), fontSize: 11),
              ),
              const SizedBox(height: 15),
              FilledButton(onPressed: onRetry, child: const Text('Try again')),
            ],
          ),
        ),
      );
}

class Product {
  const Product({
    required this.id,
    required this.sku,
    required this.name,
    required this.category,
    required this.unitPrice,
    required this.stock,
    required this.reorderPoint,
  });

  final int id;
  final String sku;
  final String name;
  final String category;
  final double unitPrice;
  final int stock;
  final int reorderPoint;

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as int,
        sku: json['sku'] as String,
        name: json['name'] as String,
        category: json['category'] as String,
        unitPrice: (json['unit_price'] as num).toDouble(),
        stock: json['stock_quantity'] as int,
        reorderPoint: json['reorder_point'] as int,
      );
}
