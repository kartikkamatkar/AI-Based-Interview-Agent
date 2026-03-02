package com.enigma.backend.interview;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class InterviewSession {

    private final String sessionId;
    private final int durationMinutes;
    private final Instant startedAt;
    private final Instant endsAt;
    private final List<String> questionBank;
    private final List<InterviewTurnEvaluation> evaluations = new ArrayList<>();

    private int questionIndex;
    private String currentQuestion;
    private boolean followUpQuestionActive;
    private boolean ended;

    public InterviewSession(String sessionId, int durationMinutes, Instant startedAt, Instant endsAt, List<String> questionBank) {
        this.sessionId = sessionId;
        this.durationMinutes = durationMinutes;
        this.startedAt = startedAt;
        this.endsAt = endsAt;
        this.questionBank = questionBank;
        this.questionIndex = 0;
        this.currentQuestion = questionBank.getFirst();
        this.followUpQuestionActive = false;
        this.ended = false;
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

    public List<String> getQuestionBank() {
        return questionBank;
    }

    public List<InterviewTurnEvaluation> getEvaluations() {
        return evaluations;
    }

    public int getQuestionIndex() {
        return questionIndex;
    }

    public void setQuestionIndex(int questionIndex) {
        this.questionIndex = questionIndex;
    }

    public String getCurrentQuestion() {
        return currentQuestion;
    }

    public void setCurrentQuestion(String currentQuestion) {
        this.currentQuestion = currentQuestion;
    }

    public boolean isFollowUpQuestionActive() {
        return followUpQuestionActive;
    }

    public void setFollowUpQuestionActive(boolean followUpQuestionActive) {
        this.followUpQuestionActive = followUpQuestionActive;
    }

    public boolean isEnded() {
        return ended;
    }

    public void setEnded(boolean ended) {
        this.ended = ended;
    }

    public int askedQuestionsCount() {
        return evaluations.size();
    }
}
