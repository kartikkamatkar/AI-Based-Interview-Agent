package com.enigma.backend.submission.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateSubmissionRequest(
        @NotBlank(message = "problemId is required") String problemId,
        @NotBlank(message = "language is required") String language,
        @NotBlank(message = "sourceCode is required") String sourceCode,
        String input
) {
}
