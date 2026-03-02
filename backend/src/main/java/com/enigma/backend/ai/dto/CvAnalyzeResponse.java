package com.enigma.backend.ai.dto;

import java.util.List;

public record CvAnalyzeResponse(
        String resumePreview,
        List<String> skills,
        List<String> projects,
        List<String> tools,
        List<String> education,
        int atsScore,
        int keywordMatchScore,
        String resumeLevel,
        String projectLevel,
        List<String> missingKeywords,
        List<String> recommendations,
        String aiSummary
) {
}
