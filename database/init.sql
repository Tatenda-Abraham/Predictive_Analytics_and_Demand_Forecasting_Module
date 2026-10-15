CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    sku VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    reorder_point INTEGER NOT NULL DEFAULT 0 CHECK (reorder_point >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_transactions (
    id BIGSERIAL PRIMARY KEY,
    customer_name VARCHAR(160) NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_transaction_items (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES sales_transactions(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON sales_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transaction_items_product ON sales_transaction_items(product_id);

INSERT INTO products (sku, name, category, unit_price, stock_quantity, reorder_point)
VALUES
    ('ZS-1042', 'Single-Origin Olive Oil', 'Pantry', 18.50, 124, 80),
    ('ZS-2088', 'Artisan Sourdough Crackers', 'Bakery', 6.25, 86, 90),
    ('ZS-3310', 'Wildflower Honey, 12 oz', 'Pantry', 12.00, 240, 100),
    ('ZS-4156', 'Ceramic Pour-Over Set', 'Coffee & Tea', 32.00, 38, 45),
    ('ZS-5072', 'Smoked Sea Salt', 'Pantry', 9.75, 196, 70)
ON CONFLICT (sku) DO NOTHING;

INSERT INTO sales_transactions (customer_name, transaction_date)
SELECT 'ZImSale Demo Account', series.day::date + TIME '12:00'
FROM generate_series(CURRENT_DATE - 179, CURRENT_DATE, INTERVAL '1 day') AS series(day);

INSERT INTO sales_transaction_items (transaction_id, product_id, quantity, unit_price)
SELECT
    transaction_row.id,
    catalog.id,
    GREATEST(1, ROUND(
        CASE catalog.sku
            WHEN 'ZS-1042' THEN 16
            WHEN 'ZS-2088' THEN 10
            WHEN 'ZS-3310' THEN 13
            WHEN 'ZS-4156' THEN 5
            ELSE 8
        END
        + 2.5 * SIN(EXTRACT(DOY FROM transaction_row.transaction_date) * 2 * PI() / 365)
        + 2 * SIN(EXTRACT(ISODOW FROM transaction_row.transaction_date) * 2 * PI() / 7)
        + ((transaction_row.id * catalog.id) % 5) - 2
    )::INTEGER),
    catalog.unit_price
FROM sales_transactions AS transaction_row
CROSS JOIN products AS catalog
WHERE transaction_row.transaction_date::date BETWEEN CURRENT_DATE - 179 AND CURRENT_DATE;
