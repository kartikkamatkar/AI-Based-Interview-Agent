package com.enigma.backend.technical.dto;

public record TechnicalSubmissionRequest(
        String code,
        String language,
        String testSummary
) {
}
