package com.enigma.backend.interview.dto;

public record InterviewTurnResponse(
        String sessionId,
        int secondsRemaining,
        String currentQuestion,
        int askedQuestions,
        int totalQuestions,
        String interviewerResponse,
        String evaluationSummary,
        boolean sessionEnded,
        InterviewFinalReport finalReport
) {
}
