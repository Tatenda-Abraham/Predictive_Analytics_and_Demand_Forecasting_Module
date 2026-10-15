export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit_price: number;
  stock_quantity: number;
  reorder_point: number;
}

export interface DemandPoint {
  date: string;
  demand: number;
  lower?: number;
  upper?: number;
}

export interface ForecastResponse {
  product: Product;
  history: DemandPoint[];
  forecast: DemandPoint[];
  summary: {
    projected_demand: number;
    average_daily_demand: number;
    stock_cover_days: number | null;
    stockout_risk: boolean;
    model_accuracy: number;
  };
  data_source: "postgresql" | "demo";
  range_method: string;
}
