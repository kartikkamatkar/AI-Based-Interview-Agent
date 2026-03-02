package com.enigma.backend.technical.dto;

import java.util.List;

public record TechnicalFinalReport(
        double overallScore,
        int solvedQuestions,
        int totalQuestions,
        List<String> strengths,
        List<String> improvements,
        String summary,
        List<TechnicalTurnItemReport> turns
) {
}
