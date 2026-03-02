package com.enigma.backend.interview;

import com.enigma.backend.ai.AiAnalysisService;
import com.enigma.backend.interview.dto.InterviewFinalReport;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class FeedbackGenerator {

    private final AiAnalysisService aiAnalysisService;
    private final ObjectMapper objectMapper;

    public FeedbackGenerator(AiAnalysisService aiAnalysisService, ObjectMapper objectMapper) {
        this.aiAnalysisService = aiAnalysisService;
        this.objectMapper = objectMapper;
    }

    public InterviewFinalReport generate(List<InterviewTurnEvaluation> evaluations) {
        if (evaluations == null || evaluations.isEmpty()) {
            return new InterviewFinalReport(
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    "No interview response captured.",
                    "Please answer questions with more detail.",
                    "Practice introducing yourself and answering common HR questions aloud.",
                    "Daily 20-minute mock interview, 10-minute recording review, and filler-word correction."
            );
        }

        double communication = avg(evaluations, InterviewTurnEvaluation::communicationSkills);
        double confidence = avg(evaluations, InterviewTurnEvaluation::confidenceLevel);
        double facial = avg(evaluations, InterviewTurnEvaluation::facialExpression);
        double eye = avg(evaluations, InterviewTurnEvaluation::eyeContact);
        double tone = avg(evaluations, InterviewTurnEvaluation::toneAndClarity);
        double body = avg(evaluations, InterviewTurnEvaluation::bodyLanguage);
        double professional = avg(evaluations, InterviewTurnEvaluation::professionalism);
        double finalScore = round1((communication + confidence + facial + eye + tone + body + professional) / 7.0);

        String transcriptSummary = evaluations.stream()
                .map(item -> "Q: " + item.askedQuestion() + " | A: " + item.answer() + " | Notes: " + item.summary())
                .collect(Collectors.joining("\n"));

        String systemPrompt = "You are a strict HR interviewer evaluator. Return ONLY JSON with keys strengths, areasOfImprovement, howToImprove, suggestedPracticePlan. Keep concise and practical.";
        String userPrompt = "Interview aggregate scores (out of 10):\n"
                + "communication=" + communication + ", confidence=" + confidence + ", facial=" + facial + ", eye=" + eye
                + ", tone=" + tone + ", body=" + body + ", professionalism=" + professional + "\n"
                + "Interview history:\n" + transcriptSummary;

        String aiText = aiAnalysisService.generateText(systemPrompt, userPrompt);
        try {
            JsonNode node = objectMapper.readTree(aiText);
            return new InterviewFinalReport(
                    finalScore,
                    round1(communication),
                    round1(confidence),
                    round1(facial),
                    round1(eye),
                    round1(tone),
                    round1(body),
                    round1(professional),
                    safe(node.path("strengths").asText("Consistent communication and professional intent were visible.")),
                    safe(node.path("areasOfImprovement").asText("Improve structure, confidence, and concise delivery.")),
                    safe(node.path("howToImprove").asText("Use STAR framework, reduce filler words, and maintain steady pace.")),
                    safe(node.path("suggestedPracticePlan").asText("Practice 3 HR answers daily, record and review eye contact, tone, and filler words."))
            );
        } catch (Exception ex) {
            return new InterviewFinalReport(
                    finalScore,
                    round1(communication),
                    round1(confidence),
                    round1(facial),
                    round1(eye),
                    round1(tone),
                    round1(body),
                    round1(professional),
                    "Communication clarity and consistent intent were strong points.",
                    "Some responses lacked concise structure and confidence consistency.",
                    "Answer with STAR format, reduce filler words, and keep 60-90 second focused responses.",
                    "Week 1: self-introduction and strengths/weaknesses; Week 2: challenge and conflict scenarios; Week 3: mock interviews with timer."
            );
        }
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private double avg(List<InterviewTurnEvaluation> evaluations, java.util.function.ToDoubleFunction<InterviewTurnEvaluation> mapper) {
        return evaluations.stream().mapToDouble(mapper).average().orElse(0.0);
    }
}
