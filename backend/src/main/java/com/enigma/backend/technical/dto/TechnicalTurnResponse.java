package com.enigma.backend.technical.dto;

public record TechnicalTurnResponse(
        String sessionId,
        int secondsRemaining,
        int totalQuestions,
        int completedQuestions,
        TechnicalQuestionDto currentQuestion,
        double lastScore,
        String feedback,
        boolean sessionEnded,
        TechnicalFinalReport finalReport
) {
}
