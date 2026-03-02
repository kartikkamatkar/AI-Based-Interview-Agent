package com.enigma.backend.ai.dto;

public record ChatbotAnalyzeRequest(
        String question,
        String code,
        String language,
        String testSummary,
        String userMessage,
        String action
) {
}
