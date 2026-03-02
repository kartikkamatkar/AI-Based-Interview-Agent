package com.enigma.backend.submission.dto;

import com.enigma.backend.submission.SubmissionStatus;

import java.time.OffsetDateTime;

public record SubmissionResponse(
        Long id,
        String problemId,
        String language,
        String sourceCode,
        String input,
        SubmissionStatus status,
        OffsetDateTime submittedAt
) {
}
