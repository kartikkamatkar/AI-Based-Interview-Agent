package com.enigma.backend.technical.dto;

import java.util.List;

public record TechnicalQuestionDto(
        int number,
        String title,
        String text,
        List<String> constraints
) {
}
