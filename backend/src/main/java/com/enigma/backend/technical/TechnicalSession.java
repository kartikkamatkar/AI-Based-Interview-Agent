package com.enigma.backend.technical;

import com.enigma.backend.question.QuestionItem;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class TechnicalSession {

    private final String sessionId;
    private final int durationMinutes;
    private final Instant startedAt;
    private final Instant endsAt;
    private final List<QuestionItem> questionBank;
    private final List<TechnicalTurnEvaluation> evaluations = new ArrayList<>();

    private int currentQuestionIndex;
    private boolean ended;

    public TechnicalSession(
            String sessionId,
            int durationMinutes,
            Instant startedAt,
            Instant endsAt,
            List<QuestionItem> questionBank
    ) {
        this.sessionId = sessionId;
        this.durationMinutes = durationMinutes;
        this.startedAt = startedAt;
        this.endsAt = endsAt;
        this.questionBank = questionBank;
        this.currentQuestionIndex = 0;
        this.ended = questionBank == null || questionBank.isEmpty();
    }

    public String getSessionId() {
        return sessionId;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public List<QuestionItem> getQuestionBank() {
        return questionBank;
    }

    public List<TechnicalTurnEvaluation> getEvaluations() {
        return evaluations;
    }

    public int getCurrentQuestionIndex() {
        return currentQuestionIndex;
    }

    public void setCurrentQuestionIndex(int currentQuestionIndex) {
        this.currentQuestionIndex = currentQuestionIndex;
    }

    public boolean isEnded() {
        return ended;
    }

    public void setEnded(boolean ended) {
        this.ended = ended;
    }

    public QuestionItem getCurrentQuestion() {
        if (ended || currentQuestionIndex < 0 || currentQuestionIndex >= questionBank.size()) {
            return null;
        }
        return questionBank.get(currentQuestionIndex);
    }

    public int totalQuestions() {
        return questionBank.size();
    }

    public int completedQuestions() {
        return evaluations.size();
    }
}
