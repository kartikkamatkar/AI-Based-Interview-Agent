package com.enigma.backend.technical;

import java.time.Instant;

public record TechnicalTurnEvaluation(
        int questionNumber,
        String questionTitle,
        String language,
        String testSummary,
        double score,
        String feedback,
        Instant submittedAt
) {
}
