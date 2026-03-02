package com.enigma.backend.interview.dto;

public record InterviewFinalReport(
        double finalScore,
        double communicationSkills,
        double confidenceLevel,
        double facialExpression,
        double eyeContact,
        double toneAndClarity,
        double bodyLanguage,
        double professionalism,
        String strengths,
        String areasOfImprovement,
        String howToImprove,
        String suggestedPracticePlan
) {
}
