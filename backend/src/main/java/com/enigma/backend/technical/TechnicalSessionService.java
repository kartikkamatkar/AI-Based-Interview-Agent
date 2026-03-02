package com.enigma.backend.technical;

import com.enigma.backend.ai.AiAnalysisService;
import com.enigma.backend.question.QuestionItem;
import com.enigma.backend.question.QuestionService;
import com.enigma.backend.technical.dto.TechnicalFinalReport;
import com.enigma.backend.technical.dto.TechnicalQuestionDto;
import com.enigma.backend.technical.dto.TechnicalSessionStartResponse;
import com.enigma.backend.technical.dto.TechnicalSessionStateResponse;
import com.enigma.backend.technical.dto.TechnicalSubmissionRequest;
import com.enigma.backend.technical.dto.TechnicalTurnItemReport;
import com.enigma.backend.technical.dto.TechnicalTurnResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TechnicalSessionService {

    private final QuestionService questionService;
    private final AiAnalysisService aiAnalysisService;
    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, TechnicalSession> sessions = new ConcurrentHashMap<>();

    public TechnicalSessionService(
            QuestionService questionService,
            AiAnalysisService aiAnalysisService,
            ObjectMapper objectMapper
    ) {
        this.questionService = questionService;
        this.aiAnalysisService = aiAnalysisService;
        this.objectMapper = objectMapper;
    }

    public TechnicalSessionStartResponse startSession(int durationMinutes, Integer questionCount) {
        validateDuration(durationMinutes);
        int finalCount = questionCount == null ? 3 : Math.min(Math.max(1, questionCount), 10);

        List<QuestionItem> questionBank = questionService.getQuestions(true, finalCount);
        if (questionBank.isEmpty()) {
            throw new IllegalArgumentException("No technical questions available.");
        }

        String sessionId = UUID.randomUUID().toString();
        Instant startedAt = Instant.now();
        Instant endsAt = startedAt.plus(Duration.ofMinutes(durationMinutes));

        TechnicalSession session = new TechnicalSession(sessionId, durationMinutes, startedAt, endsAt, questionBank);
        sessions.put(sessionId, session);

        return new TechnicalSessionStartResponse(
                sessionId,
                durationMinutes,
                secondsRemaining(endsAt),
                session.totalQuestions(),
                session.completedQuestions(),
                toDto(session.getCurrentQuestion()),
                endsAt
        );
    }

    public TechnicalSessionStateResponse getState(String sessionId) {
        TechnicalSession session = getSessionOrThrow(sessionId);
        synchronized (session) {
            if (isExpired(session.getEndsAt()) || session.getCurrentQuestion() == null) {
                session.setEnded(true);
            }
            return new TechnicalSessionStateResponse(
                    sessionId,
                    session.getDurationMinutes(),
                    secondsRemaining(session.getEndsAt()),
                    session.totalQuestions(),
                    session.completedQuestions(),
                    session.isEnded() ? null : toDto(session.getCurrentQuestion()),
                    session.isEnded()
            );
        }
    }

    public TechnicalTurnResponse submit(String sessionId, TechnicalSubmissionRequest request) {
        TechnicalSession session = getSessionOrThrow(sessionId);

        synchronized (session) {
            if (session.isEnded() || isExpired(session.getEndsAt()) || session.getCurrentQuestion() == null) {
                TechnicalFinalReport report = finalizeSession(session);
                return new TechnicalTurnResponse(
                        session.getSessionId(),
                        secondsRemaining(session.getEndsAt()),
                        session.totalQuestions(),
                        session.completedQuestions(),
                        null,
                        0.0,
                        "Session ended.",
                        true,
                        report
                );
            }

            String code = safe(request.code()).trim();
            if (code.isBlank()) {
                throw new IllegalArgumentException("Code is required for technical submission.");
            }

            QuestionItem currentQuestion = session.getCurrentQuestion();
            AiTurnEvaluation evaluation = evaluateTurn(currentQuestion, request);

            session.getEvaluations().add(new TechnicalTurnEvaluation(
                    currentQuestion.number(),
                    safe(currentQuestion.title()),
                    safe(request.language()),
                    safe(request.testSummary()),
                    evaluation.score(),
                    evaluation.feedback(),
                    Instant.now()
            ));

            session.setCurrentQuestionIndex(session.getCurrentQuestionIndex() + 1);
            if (session.getCurrentQuestion() == null || isExpired(session.getEndsAt())) {
                TechnicalFinalReport report = finalizeSession(session);
                return new TechnicalTurnResponse(
                        session.getSessionId(),
                        secondsRemaining(session.getEndsAt()),
                        session.totalQuestions(),
                        session.completedQuestions(),
                        null,
                        evaluation.score(),
                        evaluation.feedback(),
                        true,
                        report
                );
            }

            return new TechnicalTurnResponse(
                    session.getSessionId(),
                    secondsRemaining(session.getEndsAt()),
                    session.totalQuestions(),
                    session.completedQuestions(),
                    toDto(session.getCurrentQuestion()),
                    evaluation.score(),
                    evaluation.feedback(),
                    false,
                    null
            );
        }
    }

    public TechnicalFinalReport endSession(String sessionId) {
        TechnicalSession session = getSessionOrThrow(sessionId);
        synchronized (session) {
            return finalizeSession(session);
        }
    }

    private TechnicalFinalReport finalizeSession(TechnicalSession session) {
        session.setEnded(true);

        List<TechnicalTurnItemReport> turns = session.getEvaluations().stream()
                .map(turn -> new TechnicalTurnItemReport(
                        turn.questionNumber(),
                        turn.questionTitle(),
                        safe(turn.language()),
                        round1(turn.score()),
                        safe(turn.feedback())
                ))
                .toList();

        double overallScore = turns.isEmpty()
                ? 0.0
                : turns.stream().mapToDouble(TechnicalTurnItemReport::score).average().orElse(0.0);

        List<String> strengths = buildStrengths(turns, overallScore);
        List<String> improvements = buildImprovements(turns, overallScore);
        String summary = buildSummary(turns, overallScore, session.totalQuestions());

        return new TechnicalFinalReport(
                round1(overallScore),
                turns.size(),
                session.totalQuestions(),
                strengths,
                improvements,
                summary,
                turns
        );
    }

    private AiTurnEvaluation evaluateTurn(QuestionItem question, TechnicalSubmissionRequest request) {
        String testSummary = safe(request.testSummary());
        String systemPrompt = "You are a technical interviewer scoring coding submissions. Return ONLY JSON.";
        String userPrompt = "Question: " + safe(question.text()) + "\n"
                + "Language: " + safe(request.language()) + "\n"
                + "Test summary: " + testSummary + "\n"
                + "Code:\n" + safe(request.code()) + "\n"
                + "Return JSON with keys: score (0-10 number), feedback (1-3 concise lines).";

        String aiText = aiAnalysisService.generateText(systemPrompt, userPrompt);

        try {
            JsonNode node = objectMapper.readTree(aiText);
            double score = normalizeScore(node.path("score").asDouble(0.0));
            String feedback = safe(node.path("feedback").asText("Good attempt. Improve edge-case handling and complexity reasoning."));
            if (feedback.isBlank()) {
                feedback = "Good attempt. Improve edge-case handling and complexity reasoning.";
            }
            return new AiTurnEvaluation(round1(score), feedback);
        } catch (Exception ex) {
            return fallbackEvaluation(testSummary);
        }
    }

    private AiTurnEvaluation fallbackEvaluation(String testSummary) {
        String summary = safe(testSummary).toLowerCase(Locale.ROOT);
        double score;
        String feedback;

        if (summary.contains("passed") && summary.contains("/")) {
            score = extractHeuristicScore(summary);
            feedback = score >= 8
                    ? "Strong submission. Keep communicating complexity and edge-case coverage clearly."
                    : "Partial correctness detected. Focus on failing inputs and boundary conditions.";
        } else if (summary.contains("error") || summary.contains("compile")) {
            score = 3.5;
            feedback = "Execution/compile issues found. Stabilize syntax/runtime flow before optimization.";
        } else {
            score = 5.5;
            feedback = "Submission captured. Add clearer complexity and edge-case handling.";
        }

        return new AiTurnEvaluation(round1(score), feedback);
    }

    private double extractHeuristicScore(String summary) {
        try {
            String[] tokens = summary.split("\\s+");
            for (String token : tokens) {
                if (token.contains("/")) {
                    String[] parts = token.split("/");
                    if (parts.length == 2) {
                        double passed = Double.parseDouble(parts[0].replaceAll("[^0-9]", ""));
                        double total = Double.parseDouble(parts[1].replaceAll("[^0-9]", ""));
                        if (total > 0) {
                            return normalizeScore((passed / total) * 10.0);
                        }
                    }
                }
            }
        } catch (Exception ignored) {
            // fallback below
        }
        return 6.0;
    }

    private List<String> buildStrengths(List<TechnicalTurnItemReport> turns, double overallScore) {
        List<String> strengths = new ArrayList<>();
        if (overallScore >= 7.5) {
            strengths.add("Consistent problem-solving quality across the session.");
        }
        turns.stream()
                .max(Comparator.comparingDouble(TechnicalTurnItemReport::score))
                .filter(item -> item.score() >= 7)
                .ifPresent(item -> strengths.add("Best performance on: " + item.questionTitle()));
        if (strengths.isEmpty()) {
            strengths.add("Steady effort and submission completion under timed constraints.");
        }
        return strengths;
    }

    private List<String> buildImprovements(List<TechnicalTurnItemReport> turns, double overallScore) {
        List<String> improvements = new ArrayList<>();
        if (overallScore < 7) {
            improvements.add("Strengthen edge-case handling and dry-run validation before submit.");
        }
        boolean hasLowScore = turns.stream().anyMatch(item -> item.score() < 6);
        if (hasLowScore) {
            improvements.add("Improve debugging process when test summary indicates failures.");
        }
        if (improvements.isEmpty()) {
            improvements.add("Keep optimizing communication of time/space complexity in interviews.");
        }
        return improvements;
    }

    private String buildSummary(List<TechnicalTurnItemReport> turns, double overallScore, int totalQuestions) {
        if (turns.isEmpty()) {
            return "Session ended before any technical submission was evaluated.";
        }
        return "Solved " + turns.size() + " out of " + totalQuestions
                + " technical questions with an average score of " + round1(overallScore) + "/10.";
    }

    private TechnicalQuestionDto toDto(QuestionItem question) {
        if (question == null) {
            return null;
        }
        return new TechnicalQuestionDto(
                question.number(),
                safe(question.title()),
                safe(question.text()),
                question.constraints() == null ? List.of() : question.constraints()
        );
    }

    private void validateDuration(int durationMinutes) {
        if (durationMinutes < 5 || durationMinutes > 120) {
            throw new IllegalArgumentException("Duration must be between 5 and 120 minutes.");
        }
    }

    private TechnicalSession getSessionOrThrow(String sessionId) {
        TechnicalSession session = sessions.get(sessionId);
        if (session == null) {
            throw new IllegalArgumentException("Technical session not found: " + sessionId);
        }
        return session;
    }

    private int secondsRemaining(Instant endsAt) {
        long seconds = Duration.between(Instant.now(), endsAt).toSeconds();
        return (int) Math.max(0, seconds);
    }

    private boolean isExpired(Instant endsAt) {
        return Instant.now().isAfter(endsAt);
    }

    private double normalizeScore(double score) {
        return Math.max(0.0, Math.min(10.0, score));
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private record AiTurnEvaluation(double score, String feedback) {
    }
}
