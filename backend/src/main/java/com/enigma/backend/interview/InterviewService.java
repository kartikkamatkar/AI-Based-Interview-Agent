package com.enigma.backend.interview;

import com.enigma.backend.ai.AiAnalysisService;
import com.enigma.backend.interview.dto.InterviewAnswerRequest;
import com.enigma.backend.interview.dto.InterviewFinalReport;
import com.enigma.backend.interview.dto.InterviewProctorEventRequest;
import com.enigma.backend.interview.dto.InterviewProctorEventResponse;
import com.enigma.backend.interview.dto.InterviewSessionStateResponse;
import com.enigma.backend.interview.dto.InterviewStartResponse;
import com.enigma.backend.interview.dto.InterviewTurnResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class InterviewService {

    private final QuestionManager questionManager;
    private final SessionTimer sessionTimer;
    private final FeedbackGenerator feedbackGenerator;
    private final AiAnalysisService aiAnalysisService;
    private final ObjectMapper objectMapper;

    private final ConcurrentHashMap<String, InterviewSession> sessions = new ConcurrentHashMap<>();

    public InterviewService(
            QuestionManager questionManager,
            SessionTimer sessionTimer,
            FeedbackGenerator feedbackGenerator,
            AiAnalysisService aiAnalysisService,
            ObjectMapper objectMapper
    ) {
        this.questionManager = questionManager;
        this.sessionTimer = sessionTimer;
        this.feedbackGenerator = feedbackGenerator;
        this.aiAnalysisService = aiAnalysisService;
        this.objectMapper = objectMapper;
    }

    public InterviewStartResponse startSession(int durationMinutes) {
        sessionTimer.validateDuration(durationMinutes);

        Instant startedAt = Instant.now();
        Instant endsAt = sessionTimer.calculateEndTime(startedAt, durationMinutes);
        String sessionId = UUID.randomUUID().toString();
        List<String> questionBank = questionManager.getRandomizedQuestionBank();

        InterviewSession session = new InterviewSession(sessionId, durationMinutes, startedAt, endsAt, questionBank);
        sessions.put(sessionId, session);

        return new InterviewStartResponse(
                sessionId,
                durationMinutes,
                sessionTimer.secondsRemaining(endsAt),
                session.getCurrentQuestion(),
                session.askedQuestionsCount(),
                questionManager.totalQuestions(),
                endsAt
        );
    }

    public InterviewSessionStateResponse getSessionState(String sessionId) {
        InterviewSession session = getSessionOrThrow(sessionId);
        return new InterviewSessionStateResponse(
                sessionId,
                session.getDurationMinutes(),
                sessionTimer.secondsRemaining(session.getEndsAt()),
                session.isEnded() ? "" : session.getCurrentQuestion(),
                session.askedQuestionsCount(),
                questionManager.totalQuestions(),
                session.isEnded()
        );
    }

    public InterviewTurnResponse submitAnswer(String sessionId, InterviewAnswerRequest request) {
        InterviewSession session = getSessionOrThrow(sessionId);

        synchronized (session) {
            if (session.isEnded() || sessionTimer.isExpired(session.getEndsAt())) {
                InterviewFinalReport report = finalizeSession(session);
                String endedReason = safe(session.getTerminationReason());
                String endedMessage = endedReason.isBlank()
                        ? "Time completed or all questions covered."
                        : endedReason;
                return new InterviewTurnResponse(
                        sessionId,
                        sessionTimer.secondsRemaining(session.getEndsAt()),
                        "",
                        session.askedQuestionsCount(),
                        questionManager.totalQuestions(),
                        "Session ended.",
                        endedMessage,
                        true,
                        report
                );
            }

            String transcript = safe(request.transcript());
            if (transcript.isBlank()) {
                transcript = "No verbal answer captured.";
            }

            TurnAiEvaluation aiEvaluation = evaluateTurnWithAi(session.getCurrentQuestion(), transcript);
            InterviewTurnEvaluation turnEvaluation = mergeEvaluation(session.getCurrentQuestion(), transcript, request, aiEvaluation);
            session.getEvaluations().add(turnEvaluation);

            String interviewerResponse = safe(aiEvaluation.interviewerResponse());
            String evaluationSummary = safe(aiEvaluation.evaluationSummary());
            String followUpQuestion = safe(aiEvaluation.followUpQuestion()).trim();

            if (sessionTimer.isExpired(session.getEndsAt())) {
                InterviewFinalReport report = finalizeSession(session);
                return new InterviewTurnResponse(
                        sessionId,
                        0,
                        "",
                        session.askedQuestionsCount(),
                        questionManager.totalQuestions(),
                        interviewerResponse,
                        evaluationSummary,
                        true,
                        report
                );
            }

            if (session.isFollowUpQuestionActive()) {
                session.setFollowUpQuestionActive(false);
                session.setQuestionIndex(session.getQuestionIndex() + 1);
                moveToNextBaseQuestion(session);
            } else if (shouldUseFollowUp(session, followUpQuestion)) {
                session.setCurrentQuestion(followUpQuestion);
                session.setFollowUpQuestionActive(true);
            } else {
                session.setQuestionIndex(session.getQuestionIndex() + 1);
                moveToNextBaseQuestion(session);
            }

            if (session.isEnded()) {
                InterviewFinalReport report = finalizeSession(session);
                return new InterviewTurnResponse(
                        sessionId,
                        sessionTimer.secondsRemaining(session.getEndsAt()),
                        "",
                        session.askedQuestionsCount(),
                        questionManager.totalQuestions(),
                        interviewerResponse,
                        evaluationSummary,
                        true,
                        report
                );
            }

            return new InterviewTurnResponse(
                    sessionId,
                    sessionTimer.secondsRemaining(session.getEndsAt()),
                    session.getCurrentQuestion(),
                    session.askedQuestionsCount(),
                    questionManager.totalQuestions(),
                    interviewerResponse,
                    evaluationSummary,
                    false,
                    null
            );
        }
    }

    public InterviewFinalReport endSession(String sessionId) {
        InterviewSession session = getSessionOrThrow(sessionId);
        synchronized (session) {
            return finalizeSession(session);
        }
    }

    public InterviewProctorEventResponse reportProctorEvent(String sessionId, InterviewProctorEventRequest request) {
        InterviewSession session = getSessionOrThrow(sessionId);

        synchronized (session) {
            String eventType = safe(request == null ? "" : request.eventType()).trim().toUpperCase(Locale.ROOT);
            if (eventType.isBlank()) {
                throw new IllegalArgumentException("eventType is required.");
            }

            String details = safe(request == null ? "" : request.details()).trim();
            boolean forceTerminate = request != null && Boolean.TRUE.equals(request.terminateSession());

            session.incrementProctorViolationCount();
            String auditLine = Instant.now() + " | " + eventType + (details.isBlank() ? "" : " | " + details);
            session.getProctorEvents().add(auditLine);

            boolean terminate = forceTerminate || isCriticalProctorEvent(eventType) || session.getProctorViolationCount() >= 3;
            if (!terminate) {
                return new InterviewProctorEventResponse(
                        sessionId,
                        session.getProctorViolationCount(),
                        session.isEnded(),
                        safe(session.getTerminationReason()),
                        null
                );
            }

            String reason = details.isBlank()
                    ? ("Session terminated due to proctoring violation: " + eventType)
                    : details;
            session.setTerminationReason(reason);
            InterviewFinalReport report = finalizeSession(session);
            return new InterviewProctorEventResponse(
                    sessionId,
                    session.getProctorViolationCount(),
                    true,
                    reason,
                    report
            );
        }
    }

    private void moveToNextBaseQuestion(InterviewSession session) {
        while (session.getQuestionIndex() < session.getQuestionBank().size()) {
            String candidate = safe(session.getQuestionBank().get(session.getQuestionIndex())).trim();
            if (!hasQuestionAppeared(session, candidate)) {
                session.setCurrentQuestion(candidate);
                return;
            }
            session.setQuestionIndex(session.getQuestionIndex() + 1);
        }

        if (session.getQuestionIndex() >= session.getQuestionBank().size()) {
            session.setEnded(true);
            session.setCurrentQuestion("");
            return;
        }
    }

    private boolean shouldUseFollowUp(InterviewSession session, String followUpQuestion) {
        String normalized = normalizeQuestion(followUpQuestion);
        if (normalized.isBlank()) {
            return false;
        }
        return !hasQuestionAppeared(session, normalized);
    }

    private boolean hasQuestionAppeared(InterviewSession session, String question) {
        String normalized = normalizeQuestion(question);
        if (normalized.isBlank()) {
            return true;
        }

        String current = normalizeQuestion(session.getCurrentQuestion());
        if (normalized.equals(current)) {
            return true;
        }

        return session.getEvaluations().stream()
                .map(InterviewTurnEvaluation::askedQuestion)
                .map(this::normalizeQuestion)
                .anyMatch(normalized::equals);
    }

    private String normalizeQuestion(String question) {
        return safe(question)
                .trim()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }

    private InterviewFinalReport finalizeSession(InterviewSession session) {
        if (session.getFinalReport() != null) {
            return session.getFinalReport();
        }

        session.setEnded(true);
        session.setCurrentQuestion("");
        InterviewFinalReport baseReport;
        try {
            baseReport = feedbackGenerator.generate(session.getEvaluations());
        } catch (Exception ex) {
            baseReport = new InterviewFinalReport(
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    "Interview ended, but report generation failed.",
                    "Unable to compute detailed scoring due to a server issue.",
                    "Retry another mock interview after backend AI configuration is stable.",
                    "Practice concise STAR-based responses and record mock answers daily."
            );
        }

        InterviewFinalReport finalReport = safe(session.getTerminationReason()).isBlank()
                ? baseReport
                : applyProctorPenalty(baseReport, session.getProctorViolationCount(), session.getTerminationReason());

        session.setFinalReport(finalReport);
        return finalReport;
    }

    private boolean isCriticalProctorEvent(String eventType) {
        return "TAB_SWITCH".equals(eventType)
                || "WINDOW_BLUR".equals(eventType)
                || "FULLSCREEN_EXIT".equals(eventType)
                || "MULTI_FACE_EXCEEDED".equals(eventType)
                || "CAMERA_OFF".equals(eventType)
                || "CAMERA_PERMISSION_DENIED".equals(eventType);
    }

    private InterviewFinalReport applyProctorPenalty(InterviewFinalReport report, int violationCount, String reason) {
        double penalty = Math.min(2.0, 0.4 * Math.max(1, violationCount));
        double adjustedFinalScore = Math.max(0.0, round1(report.finalScore() - penalty));

        String violationNote = "\n\nProctoring Outcome: " + reason + " (violations: " + violationCount + ")";

        return new InterviewFinalReport(
                adjustedFinalScore,
                report.communicationSkills(),
                report.confidenceLevel(),
                report.facialExpression(),
                report.eyeContact(),
                report.toneAndClarity(),
                report.bodyLanguage(),
                report.professionalism(),
                report.strengths(),
                report.areasOfImprovement() + violationNote,
                report.howToImprove() + "\n- Maintain strict interview integrity (no tab switch/fullscreen exit).",
                report.suggestedPracticePlan()
        );
    }

    private TurnAiEvaluation evaluateTurnWithAi(String askedQuestion, String transcript) {
        String systemPrompt = "You are a strict HR interviewer. Evaluate spoken interview answers only. Return ONLY JSON. No markdown.";
        String userPrompt = "Question: " + askedQuestion + "\n"
                + "Candidate answer transcript: " + transcript + "\n"
                + "Return JSON with keys:\n"
                + "interviewerResponse: short HR reply in 1-2 lines\n"
                + "evaluationSummary: concise assessment\n"
                + "followUpQuestion: relevant follow-up question or empty\n"
                + "communicationSkills: score 0-10\n"
                + "confidenceLevel: score 0-10\n"
                + "toneAndClarity: score 0-10\n"
                + "professionalism: score 0-10";

        String aiText = aiAnalysisService.generateText(systemPrompt, userPrompt);

        try {
            JsonNode node = objectMapper.readTree(aiText);
            return new TurnAiEvaluation(
                    safe(node.path("interviewerResponse").asText("Understood. Let's continue.")),
                    safe(node.path("evaluationSummary").asText("Answer captured. Keep responses concise and structured.")),
                    safe(node.path("followUpQuestion").asText("")),
                    normalizeScore(node.path("communicationSkills").asDouble(6.5)),
                    normalizeScore(node.path("confidenceLevel").asDouble(6.5)),
                    normalizeScore(node.path("toneAndClarity").asDouble(6.5)),
                    normalizeScore(node.path("professionalism").asDouble(6.5))
            );
        } catch (Exception ex) {
            return new TurnAiEvaluation(
                    "Thanks for your answer. Please keep your next response structured and concise.",
                    "The answer is noted. Improve clarity by using specific examples and measurable outcomes.",
                    "Can you share one concrete example with measurable impact?",
                    6.5,
                    6.2,
                    6.0,
                    6.4
            );
        }
    }

    private InterviewTurnEvaluation mergeEvaluation(
            String askedQuestion,
            String transcript,
            InterviewAnswerRequest request,
            TurnAiEvaluation ai
    ) {
        int fillerWords = request.fillerWordUsage() == null ? estimateFillerWords(transcript) : Math.max(0, request.fillerWordUsage());
        double fillerPenalty = Math.min(2.0, fillerWords * 0.1);

        double cameraFacialScore = normalizeScore(request.facialExpressionScore(), normalizeScore(request.confidenceLevel(), 6.0));
        double cameraBodyScore = normalizeScore(request.bodyLanguageScore(), normalizeScore(request.speakingClarity(), 6.0));
        double speechConfidence = normalizeScore(request.confidenceLevel(), ai.confidenceLevel());
        double blendedConfidenceInput = (speechConfidence + cameraFacialScore + cameraBodyScore) / 3.0;

        double communication = clamp((ai.communicationSkills() + normalizeScore(request.speakingClarity(), ai.communicationSkills())) / 2.0 - fillerPenalty);
        double confidence = clamp((ai.confidenceLevel() + blendedConfidenceInput) / 2.0 - fillerPenalty * 0.5);
        double facial = clamp((cameraFacialScore + speechConfidence) / 2.0);
        double eyeContact = clamp(normalizeScore(request.eyeContact(), 6.0));
        double tone = clamp((ai.toneAndClarity() + normalizeScore(request.toneOfVoice(), ai.toneAndClarity())) / 2.0 - fillerPenalty * 0.4);
        double bodyLanguage = clamp((cameraBodyScore + normalizeScore(request.speakingClarity(), 6.0)) / 2.0);
        double professionalism = clamp(ai.professionalism());

        return new InterviewTurnEvaluation(
                askedQuestion,
                transcript,
                round1(communication),
                round1(confidence),
                round1(facial),
                round1(eyeContact),
                round1(tone),
                round1(bodyLanguage),
                round1(professionalism),
                ai.evaluationSummary()
        );
    }

    private int estimateFillerWords(String transcript) {
        if (transcript == null || transcript.isBlank()) {
            return 0;
        }
        String lower = transcript.toLowerCase();
        String[] fillerWords = {"um", "uh", "like", "you know", "basically", "actually"};
        int count = 0;
        for (String filler : fillerWords) {
            if (filler.contains(" ")) {
                count += countSubstring(lower, filler);
            } else {
                count += lower.split("\\b" + filler + "\\b", -1).length - 1;
            }
        }
        return Math.max(0, count);
    }

    private int countSubstring(String text, String token) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(token, index)) != -1) {
            count++;
            index += token.length();
        }
        return count;
    }

    private double normalizeScore(Double rawValue, double fallback) {
        if (rawValue == null) {
            return clamp(fallback);
        }
        return normalizeScore(rawValue.doubleValue());
    }

    private double normalizeScore(double rawValue) {
        if (rawValue <= 1.0) {
            return clamp(rawValue * 10.0);
        }
        return clamp(rawValue);
    }

    private double clamp(double value) {
        return Math.max(0.0, Math.min(10.0, value));
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private InterviewSession getSessionOrThrow(String sessionId) {
        InterviewSession session = sessions.get(sessionId);
        if (session == null) {
            throw new IllegalArgumentException("Interview session not found: " + sessionId);
        }
        return session;
    }

    private record TurnAiEvaluation(
            String interviewerResponse,
            String evaluationSummary,
            String followUpQuestion,
            double communicationSkills,
            double confidenceLevel,
            double toneAndClarity,
            double professionalism
    ) {
    }
}
