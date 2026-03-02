package com.enigma.backend.technical.dto;

public record TechnicalSessionStateResponse(
        String sessionId,
        int durationMinutes,
        int secondsRemaining,
        int totalQuestions,
        int completedQuestions,
        TechnicalQuestionDto currentQuestion,
        boolean sessionEnded
) {
}
