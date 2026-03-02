package com.enigma.backend.interview.dto;

public record InterviewSessionStateResponse(
        String sessionId,
        int durationMinutes,
        int secondsRemaining,
        String currentQuestion,
        int askedQuestions,
        int totalQuestions,
        boolean sessionEnded
) {
}
