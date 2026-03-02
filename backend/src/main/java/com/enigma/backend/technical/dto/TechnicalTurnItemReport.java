package com.enigma.backend.technical.dto;

public record TechnicalTurnItemReport(
        int questionNumber,
        String questionTitle,
        String language,
        double score,
        String feedback
) {
}
