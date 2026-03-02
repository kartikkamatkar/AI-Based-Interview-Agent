package com.enigma.backend.interview.dto;

public record InterviewAnswerRequest(
        String transcript,
        String facialExpression,
        Double facialExpressionScore,
        Double confidenceLevel,
        Double eyeContact,
        Double toneOfVoice,
        Double speakingClarity,
        Integer fillerWordUsage,
        String bodyLanguage,
        Double bodyLanguageScore
) {
}
