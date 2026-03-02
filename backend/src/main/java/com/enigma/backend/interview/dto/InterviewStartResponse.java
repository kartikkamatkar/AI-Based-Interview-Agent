package com.enigma.backend.interview.dto;

import java.time.Instant;

public record InterviewStartResponse(
        String sessionId,
        int durationMinutes,
        int secondsRemaining,
        String currentQuestion,
        int askedQuestions,
        int totalQuestions,
        Instant endsAt
) {
}
