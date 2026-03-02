package com.enigma.backend.question;

import java.util.List;

public record QuestionItem(
        int number,
                String text,
                String title,
                List<String> constraints
) {
}
