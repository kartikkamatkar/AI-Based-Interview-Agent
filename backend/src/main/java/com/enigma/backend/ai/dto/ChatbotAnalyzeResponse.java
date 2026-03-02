package com.enigma.backend.ai.dto;

public record ChatbotAnalyzeResponse(
        String reply,
        String verdict,
        boolean likelyCorrect,
        String hint,
        String errorFeedback,
        String optimalApproach
) {
}
