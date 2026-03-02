package com.enigma.backend.interview;

public record InterviewTurnEvaluation(
        String askedQuestion,
        String answer,
        double communicationSkills,
        double confidenceLevel,
        double facialExpression,
        double eyeContact,
        double toneAndClarity,
        double bodyLanguage,
        double professionalism,
        String summary
) {
}
