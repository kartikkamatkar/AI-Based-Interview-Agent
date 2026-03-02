package com.enigma.backend.interview;

import com.enigma.backend.ai.AiAnalysisService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;

@Component
public class QuestionManager {

    private static final List<String> FIXED_QUESTIONS = List.of(
            "Tell me about yourself.",
            "Why did you choose software engineering as a career?",
            "Why do you want to work at our company?",
            "What are your greatest strengths as a software engineer?",
            "What is your biggest weakness?",
            "Describe a challenging technical problem you faced and how you solved it.",
            "How do you handle tight deadlines and pressure?",
            "Describe a situation where you worked in a team. What was your role?",
            "Have you ever had a conflict with a teammate? How did you resolve it?",
            "What motivates you in your professional life?",
            "How do you keep yourself updated with new technologies?",
            "Tell me about a project you are most proud of.",
            "What would you do if you disagreed with your manager’s decision?",
            "How do you prioritize tasks when working on multiple projects?",
            "Describe a time when you failed. What did you learn from it?",
            "Where do you see yourself in the next 5 years?",
            "Why should we hire you over other candidates?",
            "How do you handle constructive criticism?",
            "What kind of work environment helps you perform your best?",
            "Do you have any questions for us?"
    );

    private final SecureRandom random = new SecureRandom();
    private final AiAnalysisService aiAnalysisService;
    private final ObjectMapper objectMapper;
    private final boolean aiAutoQuestionEnabled;

    public QuestionManager(
            AiAnalysisService aiAnalysisService,
            ObjectMapper objectMapper,
            @Value("${interview.questions.ai-auto-enabled:true}") boolean aiAutoQuestionEnabled
    ) {
        this.aiAnalysisService = aiAnalysisService;
        this.objectMapper = objectMapper;
        this.aiAutoQuestionEnabled = aiAutoQuestionEnabled;
    }

    public List<String> getRandomizedQuestionBank() {
        List<String> copy = aiAutoQuestionEnabled ? generateAiQuestionBank() : new ArrayList<>(FIXED_QUESTIONS);
        if (copy == null || copy.size() < 20) {
            copy = new ArrayList<>(FIXED_QUESTIONS);
        }
        Collections.shuffle(copy, random);
        return copy;
    }

    public int totalQuestions() {
        return FIXED_QUESTIONS.size();
    }

    private List<String> generateAiQuestionBank() {
        String systemPrompt = "You are an expert HR interviewer. Generate only interview questions in English.";
        String userPrompt = "Generate exactly 20 professional HR interview questions for software engineering candidates."
                + " Keep questions concise, realistic, and non-repetitive."
                + " Return ONLY valid JSON array of strings, nothing else.";

        String aiText = aiAnalysisService.generateText(systemPrompt, userPrompt);
        if (aiText == null || aiText.isBlank()) {
            return new ArrayList<>(FIXED_QUESTIONS);
        }

        try {
            JsonNode root = objectMapper.readTree(aiText);
            if (!root.isArray()) {
                return new ArrayList<>(FIXED_QUESTIONS);
            }

            List<String> parsed = new ArrayList<>();
            root.forEach(node -> {
                if (node.isTextual()) {
                    String question = sanitizeQuestion(node.asText());
                    if (!question.isBlank()) {
                        parsed.add(question);
                    }
                }
            });

            LinkedHashMap<String, String> normalizedToQuestion = new LinkedHashMap<>();
            for (String item : parsed) {
                String key = normalizeQuestion(item);
                if (!key.isBlank()) {
                    normalizedToQuestion.putIfAbsent(key, item);
                }
            }

            List<String> deduped = new ArrayList<>(normalizedToQuestion.values());
            if (deduped.size() > 20) {
                deduped = new ArrayList<>(deduped.subList(0, 20));
            }

            if (deduped.size() < 20) {
                for (String fallbackQuestion : FIXED_QUESTIONS) {
                    if (deduped.size() >= 20) {
                        break;
                    }
                    if (deduped.stream().noneMatch(item -> normalizeQuestion(item).equals(normalizeQuestion(fallbackQuestion)))) {
                        deduped.add(fallbackQuestion);
                    }
                }
            }

            return deduped;
        } catch (Exception ex) {
            return new ArrayList<>(FIXED_QUESTIONS);
        }
    }

    private String sanitizeQuestion(String question) {
        if (question == null) {
            return "";
        }
        String trimmed = question.trim();
        if (trimmed.isBlank()) {
            return "";
        }
        String cleaned = trimmed.replaceAll("^[0-9]+[\\.)\\-\\s]+", "");
        if (!cleaned.endsWith("?")) {
            cleaned = cleaned + "?";
        }
        cleaned = cleaned.substring(0, 1).toUpperCase(Locale.ROOT) + cleaned.substring(1);
        return cleaned;
    }

    private String normalizeQuestion(String question) {
        return question == null ? "" : question.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }
}
