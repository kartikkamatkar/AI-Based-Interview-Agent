package com.enigma.backend.interview.dto;

public record InterviewAnalyzeMessage(
        String question,
        String code,
        String language,
        String testSummary
) {
}
