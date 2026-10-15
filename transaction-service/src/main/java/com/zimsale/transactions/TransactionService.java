package com.zimsale.transactions;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;

@Service
public class TransactionService {
    private final JdbcTemplate jdbcTemplate;

    public TransactionService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public TransactionResponse create(TransactionRequest request) {
        KeyHolder transactionKey = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                    """
                    INSERT INTO sales_transactions (customer_name, transaction_date)
                    VALUES (?, COALESCE(?::date, CURRENT_DATE))
                    """,
                    Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, request.customerName());
            statement.setObject(2, request.transactionDate());
            return statement;
        }, transactionKey);
        Number generatedId = transactionKey.getKey();
        if (generatedId == null) {
            throw new IllegalStateException("The database did not return a transaction ID.");
        }

        BigDecimal total = BigDecimal.ZERO;
        for (TransactionRequest.TransactionItemRequest item : request.items()) {
            List<ProductRow> products = jdbcTemplate.query(
                    "SELECT unit_price FROM products WHERE id = ? FOR UPDATE",
                    (result, row) -> new ProductRow(result.getBigDecimal("unit_price")),
                    item.productId());
            if (products.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product " + item.productId() + " was not found.");
            }
            BigDecimal unitPrice = products.get(0).unitPrice();
            int updated = jdbcTemplate.update(
                    """
                    UPDATE products SET stock_quantity = stock_quantity - ?
                    WHERE id = ? AND stock_quantity >= ?
                    """,
                    item.quantity(), item.productId(), item.quantity());
            if (updated != 1) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "Insufficient stock for product " + item.productId() + ".");
            }
            jdbcTemplate.update(
                    """
                    INSERT INTO sales_transaction_items (transaction_id, product_id, quantity, unit_price)
                    VALUES (?, ?, ?, ?)
                    """,
                    generatedId.longValue(), item.productId(), item.quantity(), unitPrice);
            total = total.add(unitPrice.multiply(BigDecimal.valueOf(item.quantity())));
        }

        Timestamp transactionDate = jdbcTemplate.queryForObject(
                "SELECT transaction_date FROM sales_transactions WHERE id = ?",
                Timestamp.class,
                generatedId.longValue());
        if (transactionDate == null) {
            throw new IllegalStateException("The saved transaction did not have a transaction date.");
        }
        return new TransactionResponse(generatedId.longValue(), transactionDate.toLocalDateTime(), total);
    }

    public List<Map<String, Object>> listRecent() {
        return jdbcTemplate.queryForList(
                """
                SELECT transaction_row.id AS transaction_id, transaction_row.customer_name,
                       transaction_row.transaction_date,
                       COALESCE(SUM(item.quantity * item.unit_price), 0)::numeric(12, 2) AS total
                FROM sales_transactions transaction_row
                LEFT JOIN sales_transaction_items item ON item.transaction_id = transaction_row.id
                GROUP BY transaction_row.id
                ORDER BY transaction_row.transaction_date DESC, transaction_row.id DESC
                LIMIT 100
                """);
    }

    private record ProductRow(BigDecimal unitPrice) {
    }

    public record TransactionResponse(long transactionId, java.time.LocalDateTime transactionDate, BigDecimal total) {
    }
}
