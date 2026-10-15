import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zimsale_buyer/main.dart';

void main() {
  const product = Product(
    id: 1,
    sku: 'ZS-1042',
    name: 'Single-Origin Olive Oil',
    category: 'Pantry',
    unitPrice: 18.5,
    stock: 124,
    reorderPoint: 80,
  );

  testWidgets('product tile shows its stock status and price', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: ProductTile(product: product)),
      ),
    );

    expect(find.text('Single-Origin Olive Oil'), findsOneWidget);
    expect(find.text('124 units · in stock'), findsOneWidget);
    expect(find.text('\$18.50'), findsOneWidget);
  });

  testWidgets('product tile flags stock at its reorder point', (tester) async {
    const lowStockProduct = Product(
      id: 2,
      sku: 'ZS-2088',
      name: 'Artisan Sourdough Crackers',
      category: 'Bakery',
      unitPrice: 6.25,
      stock: 90,
      reorderPoint: 90,
    );
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: ProductTile(product: lowStockProduct)),
      ),
    );

    expect(find.text('90 units · reorder soon'), findsOneWidget);
  });
}
