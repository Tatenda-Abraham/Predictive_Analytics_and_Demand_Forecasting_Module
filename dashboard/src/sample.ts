import type { ForecastResponse, Product } from "./types";

const today = new Date();
const products: Product[] = [
  { id: 1, sku: "ZS-1042", name: "Single-Origin Olive Oil", category: "Pantry", unit_price: 18.5, stock_quantity: 124, reorder_point: 80 },
  { id: 2, sku: "ZS-2088", name: "Artisan Sourdough Crackers", category: "Bakery", unit_price: 6.25, stock_quantity: 86, reorder_point: 90 },
  { id: 3, sku: "ZS-3310", name: "Wildflower Honey, 12 oz", category: "Pantry", unit_price: 12, stock_quantity: 240, reorder_point: 100 },
  { id: 4, sku: "ZS-4156", name: "Ceramic Pour-Over Set", category: "Coffee & Tea", unit_price: 32, stock_quantity: 38, reorder_point: 45 },
  { id: 5, sku: "ZS-5072", name: "Smoked Sea Salt", category: "Pantry", unit_price: 9.75, stock_quantity: 196, reorder_point: 70 },
];

export function sampleForecast(productId: number, days: number): ForecastResponse {
  const product = products.find((item) => item.id === productId) ?? products[0];
  const base = [16, 10, 13, 5, 8][product.id - 1];
  const history = Array.from({ length: 60 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - 59 + index);
    const demand = Math.max(1, Math.round(base + 2.4 * Math.sin(index / 8) + 1.8 * Math.cos(index / 3)));
    return { date: date.toISOString().slice(0, 10), demand };
  });
  const forecast = Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index + 1);
    const demand = Math.max(1, base + 1.5 * Math.sin((index + 60) / 8) + 0.8 * Math.cos((index + 60) / 4));
    return { date: date.toISOString().slice(0, 10), demand: Number(demand.toFixed(1)), lower: Math.max(0, Number((demand * 0.77).toFixed(1))), upper: Number((demand * 1.25).toFixed(1)) };
  });
  const projectedDemand = Math.round(forecast.reduce((sum, point) => sum + point.demand, 0));
  const average = projectedDemand / days;
  return {
    product,
    history,
    forecast,
    summary: {
      projected_demand: projectedDemand,
      average_daily_demand: Number(average.toFixed(1)),
      stock_cover_days: Number((product.stock_quantity / average).toFixed(1)),
      stockout_risk: product.stock_quantity < projectedDemand,
      model_accuracy: 0.84,
    },
    data_source: "demo",
    range_method: "Sample preview range",
  };
}

export { products as sampleProducts };
