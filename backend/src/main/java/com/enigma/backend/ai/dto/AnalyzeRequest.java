package com.enigma.backend.ai.dto;

public record AnalyzeRequest(
        String question,
        String code,
        String language,
        String testSummary
) {
}
