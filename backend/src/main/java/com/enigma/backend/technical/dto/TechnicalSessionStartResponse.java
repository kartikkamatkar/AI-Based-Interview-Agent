package com.enigma.backend.technical.dto;

import java.time.Instant;

public record TechnicalSessionStartResponse(
        String sessionId,
        int durationMinutes,
        int secondsRemaining,
        int totalQuestions,
        int completedQuestions,
        TechnicalQuestionDto currentQuestion,
        Instant endsAt
) {
}
