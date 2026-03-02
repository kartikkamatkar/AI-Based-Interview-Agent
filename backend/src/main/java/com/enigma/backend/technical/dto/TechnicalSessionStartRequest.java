package com.enigma.backend.technical.dto;

public record TechnicalSessionStartRequest(
        int durationMinutes,
        Integer questionCount
) {
}
