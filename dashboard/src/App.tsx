import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Boxes,
  CalendarDays,
  Check,
  ChevronDown,
  HelpCircle,
  Clock3,
  Download,
  LayoutDashboard,
  Leaf,
  LineChart,
  Menu,
  PackageCheck,
  Search,
  Settings2,
  ShoppingBasket,
  Sparkles,
  TrendingUp,
  Warehouse,
  X,
} from "lucide-react";
import { sampleForecast, sampleProducts } from "./sample";
import type { DemandPoint, ForecastResponse, Product } from "./types";

const API_URL = (import.meta.env.VITE_FORECAST_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const ranges = [7, 30, 60, 90];
const dateLabel = (value: string, compact = false) =>
  new Intl.DateTimeFormat("en-US", compact ? { month: "short", day: "numeric" } : { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
const numberLabel = new Intl.NumberFormat("en-US");

function App() {
  const [products, setProducts] = useState<Product[]>(sampleProducts);
  const [productId, setProductId] = useState(1);
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<ForecastResponse>(() => sampleForecast(1, 30));
  const [connection, setConnection] = useState<"connecting" | "online" | "offline">("connecting");
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const loadData = useCallback(async (selectedId: number, selectedDays: number, signal?: AbortSignal) => {
    try {
      const [productsResponse, forecastResponse] = await Promise.all([
        fetch(`${API_URL}/api/products`, { signal }),
        fetch(`${API_URL}/api/forecasts?product_id=${selectedId}&days=${selectedDays}`, { signal }),
      ]);
      if (!productsResponse.ok || !forecastResponse.ok) {
        const failed = !productsResponse.ok ? productsResponse : forecastResponse;
        throw new Error(`Forecast service returned ${failed.status}.`);
      }
      const [nextProducts, nextReport] = await Promise.all([
        productsResponse.json() as Promise<Product[]>,
        forecastResponse.json() as Promise<ForecastResponse>,
      ]);
      setProducts(nextProducts);
      setReport(nextReport);
      setConnection("online");
      setError("");
    } catch (reason) {
      if (signal?.aborted) return;
      setReport(sampleForecast(selectedId, selectedDays));
      setConnection("offline");
      setError(reason instanceof Error ? reason.message : "Could not reach the forecast service.");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadData(productId, days, controller.signal);
    return () => controller.abort();
  }, [productId, days, loadData]);

  const product = report.product;
  const lowStockProducts = products.filter((item) => item.stock_quantity <= item.reorder_point);
  const filteredProducts = products.filter((item) =>
    `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  const recentHistory = report.history.slice(-30);
  const recentDailyDemand =
    recentHistory.reduce((total, point) => total + point.demand, 0) /
    Math.max(recentHistory.length, 1);
  const projectedChange = recentDailyDemand
    ? ((report.summary.average_daily_demand - recentDailyDemand) / recentDailyDemand) * 100
    : 0;

  function exportReport() {
    const header = "date,actual_demand,projected_demand,low_estimate,high_estimate";
    const points = [
      ...report.history.map((point) => ({ ...point, type: "actual" })),
      ...report.forecast.map((point) => ({ ...point, type: "forecast" })),
    ];
    const rows = points.map((point) =>
      [
        point.date,
        point.type === "actual" ? point.demand : "",
        point.type === "forecast" ? point.demand : "",
        point.lower ?? "",
        point.upper ?? "",
      ].join(","),
    );
    const file = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = `${product.sku.toLowerCase()}-demand-forecast.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Boxes size={18} strokeWidth={2} /></div>
          <span>ZImSale</span>
          <button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={19} /></button>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-monogram">M</div>
          <div className="workspace-copy"><strong>ZImSale Store</strong><span>Wholesale account</span></div>
          <ChevronDown size={16} className="muted-icon" />
        </div>
        <div className="nav-section">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          <a className="nav-link" href="#overview"><LayoutDashboard size={18} /><span>Overview</span></a>
          <a className="nav-link active" href="#demand"><LineChart size={18} /><span>Demand planning</span><span className="nav-dot" /></a>
          <a className="nav-link" href="#inventory"><Warehouse size={18} /><span>Inventory</span></a>
          <a className="nav-link" href="#orders"><ShoppingBasket size={18} /><span>Purchase orders</span><span className="nav-count">3</span></a>
          <a className="nav-link" href="#products"><Boxes size={18} /><span>Products</span></a>
        </nav>
        <div className="sidebar-bottom">
          <div className="nav-section">PREFERENCES</div>
          <a className="nav-link" href="#settings"><Settings2 size={18} /><span>Settings</span></a>
          <a className="nav-link" href="#help"><HelpCircle size={18} /><span>Help center</span></a>
          <div className="sidebar-divider" />
          <button className="profile-switch">
            <div className="avatar">JM</div>
            <div className="workspace-copy"><strong>Jordan Miller</strong><span>Store manager</span></div>
            <ChevronDown size={16} className="muted-icon" />
          </button>
          <div className="sidebar-footer">Thoughtful goods, moving forward.</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button><span>Planning</span><span className="breadcrumb-separator">/</span><strong>Demand forecast</strong></div>
          <div className="topbar-actions">
            <span className={`connection-pill ${connection}`}><span className="connection-dot" />{connection === "online" ? "Live data" : connection === "offline" ? "Preview mode" : "Connecting"}</span>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><i /></button>
            <div className="topbar-divider" />
            <div className="avatar header-avatar">JM</div>
          </div>
        </header>

        <div className="content-wrap">
          {connection === "offline" && <div className="preview-notice"><Sparkles size={16} /><span>Showing sample preview data.</span><span className="preview-detail">{error} Start the forecasting API to see your live inventory outlook.</span><button onClick={() => void loadData(productId, days)}>Reconnect</button></div>}
          <section className="page-heading" id="overview">
            <div className="page-heading-copy">
              <div className="eyebrow"><span className="eyebrow-line" /> INVENTORY INTELLIGENCE</div>
              <h1>Demand, <span>ahead of time.</span></h1>
              <p>Know what your shelves need before they do.</p>
            </div>
            <div className="page-actions">
              <div className="updated-note"><Clock3 size={14} /><span>Updated just now</span></div>
              <button className="button-secondary" onClick={exportReport}><Download size={16} /> Export report</button>
            </div>
          </section>

          <section className="metric-grid" aria-label="Inventory overview">
            <MetricCard icon={<TrendingUp size={18} />} label={`Projected ${days}-day demand`} value={numberLabel.format(report.summary.projected_demand)} suffix="units" trend="+8.6%" trendUp />
            <MetricCard icon={<PackageCheck size={18} />} label="Stock on hand" value={numberLabel.format(product.stock_quantity)} suffix="units" trend={product.stock_quantity <= product.reorder_point ? "Reorder soon" : "In good shape"} trendUp={product.stock_quantity > product.reorder_point} context="inventory status" />
            <MetricCard icon={<Activity size={18} />} label="Average daily demand" value={report.summary.average_daily_demand.toFixed(1)} suffix="units / day" trend={`${projectedChange > 0 ? "+" : ""}${projectedChange.toFixed(1)}%`} trendUp={projectedChange >= 0} />
            <MetricCard icon={<CalendarDays size={18} />} label="Days of stock cover" value={report.summary.stock_cover_days?.toFixed(0) ?? "—"} suffix="days remaining" trend={report.summary.stock_cover_days !== null && report.summary.stock_cover_days < 30 ? "Below target" : "On target"} trendUp={report.summary.stock_cover_days === null || report.summary.stock_cover_days >= 30} context="30-day target" />
          </section>

          <section className="chart-card" id="demand">
            <div className="section-heading chart-heading">
              <div>
                <div className="section-kicker"><span className="pulse-dot" /> FORECAST OVERVIEW</div>
                <h2>Demand over time</h2>
                <p>Historical sales alongside your projected needs.</p>
              </div>
              <div className="chart-controls">
                <label className="select-wrap product-select-wrap">
                  <Search size={15} />
                  <select aria-label="Select product" value={productId} onChange={(event) => setProductId(Number(event.target.value))}>
                    {products.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                  </select>
                  <ChevronDown size={14} />
                </label>
                <div className="range-control" aria-label="Forecast range">
                  {ranges.map((range) => <button key={range} className={days === range ? "selected" : ""} onClick={() => setDays(range)}>{range}d</button>)}
                </div>
              </div>
            </div>
            <div className="chart-legend">
              <span><i className="legend-dot actual" /> Actual demand</span>
              <span><i className="legend-dot forecast" /> Forecast</span>
              <span><i className="legend-band" /> Expected range</span>
              <span className="chart-sku"><span className="sku-dot" /> {product.sku} · {product.category}</span>
            </div>
            <div className="chart-canvas">
              <DemandChart history={report.history} forecast={report.forecast} />
            </div>
            <div className="chart-footer">
              <span><Sparkles size={14} /> Predicted by a Random Forest model trained on sales history and seasonal patterns.</span>
              <button className="text-button" onClick={() => document.getElementById("model-details")?.scrollIntoView({ behavior: "smooth" })}>How forecasts work <ArrowRight size={14} /></button>
            </div>
          </section>

          <section className="lower-grid" id="inventory">
            <div className="inventory-card">
              <div className="section-heading compact-heading">
                <div><div className="section-kicker">STOCK HEALTH</div><h2>Products to watch</h2></div>
                <div className="inventory-actions">
                  {searchOpen && <input className="inventory-search" aria-label="Search inventory" placeholder="Search products" value={search} onChange={(event) => setSearch(event.target.value)} />}
                  <button className="text-button" onClick={() => { setSearchOpen(!searchOpen); setSearch(""); }}>{searchOpen ? "Close search" : "Search inventory"} <Search size={13} /></button>
                </div>
              </div>
              <div className="inventory-list">
                {(search ? filteredProducts : products).map((item) => {
                  const low = item.stock_quantity <= item.reorder_point;
                  const cover = Math.round(item.stock_quantity / (item.id === 1 ? 16 : item.id === 2 ? 10 : item.id === 3 ? 13 : item.id === 4 ? 5 : 8));
                  return (
                    <button className={`inventory-row ${item.id === productId ? "row-active" : ""}`} key={item.id} onClick={() => setProductId(item.id)}>
                      <div className={`product-avatar product-color-${item.id}`}><span>{item.name.split(" ").map((word) => word[0]).slice(0, 2).join("")}</span></div>
                      <div className="inventory-product"><strong>{item.name}</strong><span>{item.sku} <i /> {item.category}</span></div>
                      <div className="stock-level"><strong>{item.stock_quantity} <span>units</span></strong><div className="stock-track"><i className={low ? "stock-low" : ""} style={{ width: `${Math.min(100, (item.stock_quantity / Math.max(item.reorder_point * 2, 1)) * 100)}%` }} /></div></div>
                      <div className={`stock-status ${low ? "status-low" : "status-healthy"}`}>{low ? <><ArrowDownRight size={14} /> Low stock</> : <><Check size={13} /> Healthy</>}</div>
                      <div className="inventory-cover">{cover}d cover</div>
                    </button>
                  );
                })}
              </div>
              <div className="inventory-footer"><span><span className="stock-warning-dot" /> {lowStockProducts.length} items need a closer look</span><span>Synced just now</span></div>
            </div>

            <div className="insight-card">
              <div className="insight-topline"><span className="insight-icon"><Sparkles size={17} /></span><span>SMART REORDER INSIGHT</span><span className="insight-new">NEW</span></div>
              <h3>A little early goes a long way.</h3>
              <p>{report.summary.stockout_risk ? `${product.name} is on track to run low in about ${Math.max(1, Math.floor(report.summary.stock_cover_days ?? 12))} days. Place a replenishment order now to stay ahead.` : `${product.name} looks healthy. Based on its projected pace, your current stock should carry you through the next ${Math.round(report.summary.stock_cover_days ?? 30)} days.`}</p>
              <div className="insight-recommendation">
                <div><span className="recommendation-label">SUGGESTED ORDER</span><strong>{report.summary.stockout_risk ? Math.max(product.reorder_point * 2 - product.stock_quantity, 40) : 0} units</strong></div>
                <div className="recommendation-divider" />
                <div><span className="recommendation-label">RECOMMENDED BY</span><strong>{dateLabel(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))}</strong></div>
              </div>
              <button className="insight-button" onClick={() => setProductId(lowStockProducts[0]?.id ?? product.id)}>Review reorder <ArrowRight size={15} /></button>
              <div className="insight-footnote"><Sparkles size={13} /> Thoughtfully planned, not overstocked.</div>
            </div>
          </section>

          <section className="model-strip" id="model-details">
            <div className="model-icon"><Activity size={17} /></div>
            <div className="model-copy"><strong>Forecast model</strong><span>Random Forest · 120 estimators · 180 days of history</span></div>
            <div className="model-divider" />
            <div className="model-stat"><span>RECENT MODEL FIT</span><strong>{Math.round(report.summary.model_accuracy * 100)}%</strong></div>
            <div className="model-divider model-divider-mobile" />
            <div className="model-note">Range shows the 10th–90th percentile across model trees; it is an estimate, not a calibrated confidence interval.</div>
            <button className="icon-button model-info" aria-label="Model details"><HelpCircle size={17} /></button>
          </section>
          <footer className="page-footer"><span>© {new Date().getFullYear()} ZImSale</span><span><span className="footer-status" /> All systems operational</span><span>Made for thoughtful commerce <Leaf size={13} /></span></footer>
        </div>
      </main>
      {menuOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    </div>
  );
}

function MetricCard({ icon, label, value, suffix, trend, trendUp, context = "vs. last month" }: { icon: React.ReactNode; label: string; value: string; suffix: string; trend: string; trendUp: boolean; context?: string }) {
  return (
    <article className="metric-card">
      <div className="metric-top"><span className="metric-icon">{icon}</span><span className="metric-label">{label}</span>      <button className="metric-more" aria-label={`${label} information`}><HelpCircle size={15} /></button></div>
      <div className="metric-value">{value}<span>{suffix}</span></div>
      <div className={`metric-trend ${trendUp ? "trend-up" : "trend-down"}`}>{trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}<span>{trend}</span><i>{context}</i></div>
    </article>
  );
}

function DemandChart({ history, forecast }: { history: DemandPoint[]; forecast: DemandPoint[] }) {
  const [hovered, setHovered] = useState<{
    point: DemandPoint;
    kind: "actual" | "forecast";
    x: number;
    y: number;
  } | null>(null);
  const width = 1000;
  const height = 230;
  const plot = { left: 44, right: 990, top: 13, bottom: 197 };
  const points = [...history, ...forecast];
  const maximum = Math.max(5, ...points.map((point) => point.upper ?? point.demand));
  const axisMaximum = Math.ceil(maximum / 5) * 5;
  const x = (index: number) => plot.left + (index / Math.max(points.length - 1, 1)) * (plot.right - plot.left);
  const y = (value: number) => plot.bottom - (value / axisMaximum) * (plot.bottom - plot.top);
  const coordinates = (values: DemandPoint[], offset: number, select: (point: DemandPoint) => number) =>
    values.map((point, index) => `${x(offset + index)},${y(select(point))}`);
  const actualLine = coordinates(history, 0, (point) => point.demand).join(" ");
  const actualArea = history.length
    ? `M ${coordinates(history, 0, (point) => point.demand).join(" L ")} L ${x(history.length - 1)},${plot.bottom} L ${x(0)},${plot.bottom} Z`
    : "";
  const upperLine = coordinates(forecast, history.length, (point) => point.upper ?? point.demand * 1.2);
  const lowerLine = coordinates(forecast, history.length, (point) => point.lower ?? point.demand * 0.8).reverse();
  const forecastRange = forecast.length ? `M ${upperLine.join(" L ")} L ${lowerLine.join(" L ")} Z` : "";
  const forecastLine = coordinates(forecast, history.length, (point) => point.demand).join(" ");
  const forecastStart = x(history.length);
  const ticks = Array.from({ length: 5 }, (_, index) => (axisMaximum / 4) * index);
  const dateTicks = Array.from({ length: 6 }, (_, index) =>
    Math.round(((points.length - 1) * index) / 5),
  );
  const tooltipStyle = hovered
    ? {
        left: `${(hovered.x / width) * 100}%`,
        top: `${(hovered.y / height) * 100}%`,
      }
    : undefined;

  return (
    <>
      <svg className="demand-svg" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Daily sales history and demand forecast">
        <defs>
          <linearGradient id="rangeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#82a8c8" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#82a8c8" stopOpacity={0.035} />
          </linearGradient>
          <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#587fa5" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#587fa5" stopOpacity={0} />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={plot.left} x2={plot.right} y1={y(tick)} y2={y(tick)} stroke="#edf0eb" strokeDasharray="3 5" />
            <text x={plot.left - 10} y={y(tick) + 4} textAnchor="end" fill="#989f97" fontSize="11">{Math.round(tick)}</text>
          </g>
        ))}
        <line x1={forecastStart} x2={forecastStart} y1={plot.top} y2={plot.bottom} stroke="#c6cec5" strokeDasharray="4 4" />
        <path d={actualArea} fill="url(#actualFill)" />
        <path d={forecastRange} fill="url(#rangeFill)" />
        <polyline points={actualLine} fill="none" stroke="#527b9f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={forecastLine} fill="none" stroke="#8294a8" strokeWidth="2.4" strokeDasharray="5 5" strokeLinecap="round" strokeLinejoin="round" />
        {history.map((point, index) => (
          <circle
            key={`actual-${point.date}`}
            cx={x(index)}
            cy={y(point.demand)}
            r="2.5"
            fill="#527b9f"
            stroke="#fff"
            strokeWidth="1.25"
            tabIndex={0}
            aria-label={`Actual demand on ${dateLabel(point.date)}: ${Math.round(point.demand)} units`}
            onFocus={() => setHovered({ point, kind: "actual", x: x(index), y: y(point.demand) })}
            onBlur={() => setHovered(null)}
            onPointerEnter={() => setHovered({ point, kind: "actual", x: x(index), y: y(point.demand) })}
            onPointerLeave={() => setHovered(null)}
          />
        ))}
        {forecast.map((point, index) => (
          <circle
            key={`forecast-${point.date}`}
            cx={x(history.length + index)}
            cy={y(point.demand)}
            r="3"
            fill="#8294a8"
            stroke="#fff"
            strokeWidth="1.25"
            tabIndex={0}
            aria-label={`Forecast demand on ${dateLabel(point.date)}: ${Math.round(point.demand)} units`}
            onFocus={() => setHovered({ point, kind: "forecast", x: x(history.length + index), y: y(point.demand) })}
            onBlur={() => setHovered(null)}
            onPointerEnter={() => setHovered({ point, kind: "forecast", x: x(history.length + index), y: y(point.demand) })}
            onPointerLeave={() => setHovered(null)}
          />
        ))}
        {dateTicks.map((index) => (
          <text key={`date-${index}`} x={x(index)} y={height - 5} textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"} fill="#989f97" fontSize="11">
            {dateLabel(points[index].date)}
          </text>
        ))}
      </svg>
      {hovered && (
        <div className="chart-tooltip chart-tooltip-floating" style={tooltipStyle}>
          <span>{dateLabel(hovered.point.date)}</span>
          <strong>{Math.round(hovered.point.demand)} <small>units</small></strong>
          <span>{hovered.kind === "actual" ? "Actual demand" : "Projected demand"}</span>
          {hovered.kind === "forecast" && hovered.point.lower !== undefined && hovered.point.upper !== undefined && (
            <span className="tooltip-range">Expected range: {Math.round(hovered.point.lower)}–{Math.round(hovered.point.upper)}</span>
          )}
        </div>
      )}
    </>
  );
}

export default App;
