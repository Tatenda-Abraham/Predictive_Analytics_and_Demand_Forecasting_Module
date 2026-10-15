package com.zimsale.transactions;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record TransactionRequest(
        @NotBlank @Size(max = 160) String customerName,
        LocalDate transactionDate,
        @NotNull List<@Valid TransactionItemRequest> items) {

    public record TransactionItemRequest(
            @Positive long productId,
            @Positive int quantity) {
    }
}
