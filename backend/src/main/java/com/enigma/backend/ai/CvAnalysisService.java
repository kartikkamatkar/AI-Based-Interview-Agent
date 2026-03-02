package com.enigma.backend.ai;

import com.enigma.backend.ai.dto.CvAnalyzeResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class CvAnalysisService {

    private static final Pattern TOKEN_SPLITTER = Pattern.compile("[^a-zA-Z0-9+#.]+");

    private static final Set<String> STOP_WORDS = Set.of(
            "the", "and", "for", "with", "from", "that", "this", "have", "has", "had",
            "your", "you", "our", "are", "was", "were", "will", "shall", "can", "could",
            "to", "in", "on", "at", "of", "as", "an", "a", "or", "by", "be", "is", "it",
            "job", "role", "candidate", "experience", "years", "year", "required", "preferred"
    );

    private static final LinkedHashSet<String> KNOWN_SKILLS = new LinkedHashSet<>(List.of(
            "java", "spring", "spring boot", "python", "javascript", "typescript", "react", "node.js",
            "node", "sql", "postgresql", "mysql", "mongodb", "redis", "kafka", "docker", "kubernetes",
            "aws", "gcp", "azure", "microservices", "rest", "graphql", "git", "github", "ci/cd",
            "jenkins", "terraform", "linux", "data structures", "algorithms", "oop", "system design",
            "html", "css", "tailwind", "express", "django", "flask", "fastapi", "machine learning",
            "deep learning", "nlp", "pandas", "numpy", "scikit-learn"
    ));

    private static final LinkedHashSet<String> KNOWN_TOOLS = new LinkedHashSet<>(List.of(
            "git", "github", "jira", "postman", "docker", "kubernetes", "jenkins", "figma", "linux",
            "vscode", "intellij", "maven", "gradle", "npm", "yarn", "slack", "notion"
    ));

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String grokApiKey;
    private final String grokModel;
    private final String grokBaseUrl;

    public CvAnalysisService(
            ObjectMapper objectMapper,
            @Value("${grok.api-key:${GROK_API_KEY:${groq.api-key:${GROQ_API_KEY:}}}}") String grokApiKey,
            @Value("${grok.model:${groq.model:grok-3-mini}}") String grokModel,
            @Value("${grok.base-url:${groq.base-url:https://api.x.ai/v1}}") String grokBaseUrl
    ) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();
        this.grokApiKey = grokApiKey;
        this.grokModel = grokModel;
        this.grokBaseUrl = grokBaseUrl;
    }

    public CvAnalyzeResponse analyze(MultipartFile resumeFile, String resumeText, String jdText) {
        String extractedResume = normalize(extractResumeText(resumeFile, resumeText));
        String normalizedJd = normalize(jdText);

        if (extractedResume.isBlank()) {
            throw new IllegalArgumentException("Resume content is empty. Upload resume or provide resume text.");
        }
        if (normalizedJd.isBlank()) {
            throw new IllegalArgumentException("Job description (JD) is required.");
        }

        List<String> skills = extractSkills(extractedResume);
        List<String> tools = extractTools(extractedResume, skills);
        List<String> projects = extractProjects(extractedResume);
        List<String> education = extractEducation(extractedResume);

        Set<String> jdKeywords = extractTopKeywords(normalizedJd, 20);
        Set<String> resumeTokens = extractTopKeywords(extractedResume, 200);
        List<String> missingKeywords = jdKeywords.stream()
                .filter(keyword -> !resumeTokens.contains(keyword))
                .limit(8)
                .toList();

        int keywordMatchScore = scoreKeywordMatch(jdKeywords, resumeTokens);
        int atsScore = scoreAts(extractedResume, skills, projects, tools, education, keywordMatchScore);

        String resumeLevel = resolveResumeLevel(atsScore);
        String projectLevel = resolveProjectLevel(projects, extractedResume);

        List<String> recommendations = buildRecommendations(missingKeywords, projects, extractedResume);
        String aiSummary = "Structured ATS analysis generated using deterministic scoring.";

        Map<String, Object> aiData = callGrokEnhancement(extractedResume, normalizedJd, missingKeywords, recommendations);
        if (!aiData.isEmpty()) {
            aiSummary = getString(aiData.get("summary"), aiSummary);
            recommendations = mergeRecommendations(recommendations, asStringList(aiData.get("recommendations"), 4));
            resumeLevel = getString(aiData.get("resumeLevel"), resumeLevel);
            projectLevel = getString(aiData.get("projectLevel"), projectLevel);
        }

        String preview = extractedResume.length() > 1200
                ? extractedResume.substring(0, 1200) + "..."
                : extractedResume;

        return new CvAnalyzeResponse(
                preview,
                skills,
                projects,
                tools,
                education,
                atsScore,
                keywordMatchScore,
                resumeLevel,
                projectLevel,
                missingKeywords,
                recommendations,
                aiSummary
        );
    }

    private String extractResumeText(MultipartFile resumeFile, String resumeText) {
        if (resumeText != null && !resumeText.isBlank()) {
            return resumeText;
        }
        if (resumeFile == null || resumeFile.isEmpty()) {
            return "";
        }

        String filename = resumeFile.getOriginalFilename() == null
                ? ""
                : resumeFile.getOriginalFilename().toLowerCase(Locale.ROOT);

        try {
            if (filename.endsWith(".pdf")) {
                return extractFromPdf(resumeFile.getBytes());
            }
            if (filename.endsWith(".docx")) {
                return extractFromDocx(resumeFile.getBytes());
            }
            return new String(resumeFile.getBytes(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new IllegalArgumentException("Failed to read resume file.");
        }
    }

    private String extractFromPdf(byte[] bytes) throws IOException {
        try (PDDocument document = Loader.loadPDF(bytes)) {
            return new PDFTextStripper().getText(document);
        }
    }

    private String extractFromDocx(byte[] bytes) throws IOException {
        try {
            Class<?> documentClass = Class.forName("org.apache.poi.xwpf.usermodel.XWPFDocument");
            Class<?> paragraphClass = Class.forName("org.apache.poi.xwpf.usermodel.XWPFParagraph");

            try (java.io.ByteArrayInputStream input = new java.io.ByteArrayInputStream(bytes);
                 AutoCloseable document = (AutoCloseable) documentClass
                         .getConstructor(java.io.InputStream.class)
                         .newInstance(input)) {

                @SuppressWarnings("unchecked")
                List<Object> paragraphs = (List<Object>) documentClass
                        .getMethod("getParagraphs")
                        .invoke(document);

                java.lang.reflect.Method getText = paragraphClass.getMethod("getText");

                return paragraphs.stream()
                        .map(paragraph -> {
                            try {
                                Object text = getText.invoke(paragraph);
                                return text == null ? "" : String.valueOf(text);
                            } catch (Exception ex) {
                                return "";
                            }
                        })
                        .filter(value -> !value.isBlank())
                        .collect(Collectors.joining("\n"));
            }
        } catch (ClassNotFoundException ex) {
            throw new IllegalArgumentException("DOCX support not available. Add Apache POI dependency.");
        } catch (Exception ex) {
            throw new IOException("Failed to parse DOCX content.", ex);
        }
    }

    private List<String> extractSkills(String resumeText) {
        LinkedHashSet<String> found = new LinkedHashSet<>();
        String lowered = resumeText.toLowerCase(Locale.ROOT);
        for (String skill : KNOWN_SKILLS) {
            if (lowered.contains(skill)) {
                found.add(titleCase(skill));
            }
        }

        if (found.isEmpty()) {
            found.addAll(scanLineKeywords(resumeText, List.of("skill", "technology", "tech stack")));
        }
        return limit(found, 14);
    }

    private List<String> extractTools(String resumeText, List<String> skills) {
        LinkedHashSet<String> found = new LinkedHashSet<>();
        String lowered = resumeText.toLowerCase(Locale.ROOT);

        for (String tool : KNOWN_TOOLS) {
            if (lowered.contains(tool)) {
                found.add(titleCase(tool));
            }
        }

        for (String skill : skills) {
            String normalized = skill.toLowerCase(Locale.ROOT);
            if (KNOWN_TOOLS.contains(normalized)) {
                found.add(skill);
            }
        }

        return limit(found, 10);
    }

    private List<String> extractProjects(String resumeText) {
        List<String> lines = Arrays.stream(resumeText.split("\\R"))
                .map(String::trim)
                .filter(line -> line.length() > 18)
                .toList();

        LinkedHashSet<String> projects = new LinkedHashSet<>();
        for (String line : lines) {
            String low = line.toLowerCase(Locale.ROOT);
            if (low.contains("project") || low.contains("built") || low.contains("developed") || low.contains("implemented") || low.contains("designed")) {
                projects.add(trimSentence(line));
            }
        }

        if (projects.isEmpty()) {
            projects.addAll(scanLineKeywords(resumeText, List.of("project", "internship", "experience")));
        }
        return limit(projects, 8);
    }

    private List<String> extractEducation(String resumeText) {
        LinkedHashSet<String> education = new LinkedHashSet<>();
        for (String line : resumeText.split("\\R")) {
            String value = line.trim();
            if (value.length() < 6) {
                continue;
            }
            String low = value.toLowerCase(Locale.ROOT);
            if (low.contains("b.tech") || low.contains("bachelor") || low.contains("master") || low.contains("university") || low.contains("college") || low.contains("cgpa") || low.contains("gpa")) {
                education.add(trimSentence(value));
            }
        }
        return limit(education, 6);
    }

    private Set<String> extractTopKeywords(String text, int limit) {
        Map<String, Integer> freq = new HashMap<>();
        for (String token : TOKEN_SPLITTER.split(text.toLowerCase(Locale.ROOT))) {
            if (token.length() < 3 || STOP_WORDS.contains(token)) {
                continue;
            }
            freq.put(token, freq.getOrDefault(token, 0) + 1);
        }

        return freq.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue(Comparator.reverseOrder()))
                .limit(limit)
                .map(Map.Entry::getKey)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private int scoreKeywordMatch(Set<String> jdKeywords, Set<String> resumeTokens) {
        if (jdKeywords.isEmpty()) {
            return 0;
        }
        long matched = jdKeywords.stream().filter(resumeTokens::contains).count();
        return (int) Math.round((matched * 100.0) / jdKeywords.size());
    }

    private int scoreAts(
            String resume,
            List<String> skills,
            List<String> projects,
            List<String> tools,
            List<String> education,
            int keywordMatch
    ) {
        int sectionScore = 0;
        if (!skills.isEmpty()) {
            sectionScore += 25;
        }
        if (!projects.isEmpty()) {
            sectionScore += 25;
        }
        if (!tools.isEmpty()) {
            sectionScore += 25;
        }
        if (!education.isEmpty()) {
            sectionScore += 25;
        }

        int quantifiedLines = 0;
        for (String line : resume.split("\\R")) {
            String trimmed = line.trim();
            if (trimmed.matches(".*\\d+.*") && (trimmed.contains("%") || trimmed.toLowerCase(Locale.ROOT).contains("reduced") || trimmed.toLowerCase(Locale.ROOT).contains("improved"))) {
                quantifiedLines++;
            }
        }
        int quantifiedScore = Math.min(100, quantifiedLines * 25);

        int finalScore = (int) Math.round(keywordMatch * 0.60 + sectionScore * 0.25 + quantifiedScore * 0.15);
        return Math.max(0, Math.min(100, finalScore));
    }

    private String resolveResumeLevel(int atsScore) {
        if (atsScore >= 85) {
            return "Expert";
        }
        if (atsScore >= 70) {
            return "Advanced";
        }
        if (atsScore >= 55) {
            return "Intermediate";
        }
        return "Beginner";
    }

    private String resolveProjectLevel(List<String> projects, String resumeText) {
        int projectCount = projects.size();
        int impactMentions = 0;
        for (String line : resumeText.split("\\R")) {
            String low = line.toLowerCase(Locale.ROOT);
            if ((low.contains("project") || low.contains("built") || low.contains("developed")) && line.matches(".*\\d+.*")) {
                impactMentions++;
            }
        }
        if (projectCount >= 3 && impactMentions >= 2) {
            return "Advanced";
        }
        if (projectCount >= 2) {
            return "Intermediate";
        }
        return "Beginner";
    }

    private List<String> buildRecommendations(List<String> missingKeywords, List<String> projects, String resumeText) {
        List<String> out = new ArrayList<>();
        if (!missingKeywords.isEmpty()) {
            out.add("Add missing JD keywords naturally in skills/projects: " + String.join(", ", missingKeywords.subList(0, Math.min(5, missingKeywords.size()))));
        }
        boolean hasMetrics = Arrays.stream(resumeText.split("\\R")).anyMatch(line -> line.matches(".*\\d+.*") && line.contains("%"));
        if (!hasMetrics) {
            out.add("Add quantified impact in experience bullets (e.g., performance improved by 30%, reduced latency by 40%).");
        }
        if (projects.size() < 2) {
            out.add("Add at least 2 solid projects with problem statement, stack used, and measurable outcomes.");
        }
        out.add("Place tools and tech stack in a dedicated section for ATS readability.");
        out.add("Keep resume to one page with action verbs and concise bullets.");
        return out.stream().distinct().limit(6).toList();
    }

    private Map<String, Object> callGrokEnhancement(
            String resumeText,
            String jdText,
            List<String> missingKeywords,
            List<String> recommendations
    ) {
        if (grokApiKey == null || grokApiKey.isBlank()) {
            return Map.of();
        }

        String prompt = "You are an ATS and resume optimization expert. Return STRICT JSON only with keys: "
                + "summary (string), recommendations (array of max 4 strings), resumeLevel (Beginner|Intermediate|Advanced|Expert), "
                + "projectLevel (Beginner|Intermediate|Advanced).\\n"
                + "Resume:\\n" + resumeText + "\\n"
                + "JD:\\n" + jdText + "\\n"
                + "Missing Keywords: " + String.join(", ", missingKeywords) + "\\n"
                + "Existing Recommendations: " + String.join(" | ", recommendations);

        try {
            Map<String, Object> payload = Map.of(
                    "model", grokModel,
                    "temperature", 0.2,
                    "messages", List.of(
                            Map.of("role", "system", "content", "You return valid JSON only."),
                            Map.of("role", "user", "content", prompt)
                    )
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(grokBaseUrl + "/chat/completions"))
                    .timeout(Duration.ofSeconds(45))
                    .header("Authorization", "Bearer " + grokApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                return Map.of();
            }

            String content = objectMapper.readTree(response.body())
                    .path("choices")
                    .path(0)
                    .path("message")
                    .path("content")
                    .asText("");

            if (content.isBlank()) {
                return Map.of();
            }

            return objectMapper.readValue(content, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception ex) {
            return Map.of();
        }
    }

    private String normalize(String input) {
        if (input == null) {
            return "";
        }
        return input.replace("\r", "\n").replaceAll("\\n{3,}", "\n\n").trim();
    }

    private List<String> scanLineKeywords(String text, List<String> containsAny) {
        LinkedHashSet<String> result = new LinkedHashSet<>();
        for (String rawLine : text.split("\\R")) {
            String line = rawLine.trim();
            if (line.length() < 6) {
                continue;
            }
            String low = line.toLowerCase(Locale.ROOT);
            boolean match = containsAny.stream().anyMatch(low::contains);
            if (match) {
                result.add(trimSentence(line));
            }
        }
        return limit(result, 8);
    }

    private List<String> limit(LinkedHashSet<String> values, int max) {
        return values.stream().limit(max).collect(Collectors.toList());
    }

    private List<String> mergeRecommendations(List<String> base, List<String> aiRecommendations) {
        LinkedHashSet<String> merged = new LinkedHashSet<>(base);
        merged.addAll(aiRecommendations);
        return merged.stream().limit(6).toList();
    }

    private String trimSentence(String value) {
        String output = value.replaceAll("\\s+", " ").trim();
        if (output.length() > 140) {
            return output.substring(0, 140) + "...";
        }
        return output;
    }

    private String titleCase(String value) {
        String[] parts = value.split(" ");
        return Arrays.stream(parts)
                .filter(part -> !part.isBlank())
                .map(part -> part.length() == 1
                        ? part.toUpperCase(Locale.ROOT)
                        : Character.toUpperCase(part.charAt(0)) + part.substring(1))
                .collect(Collectors.joining(" "));
    }

    private String getString(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String text = String.valueOf(value).trim();
        return text.isBlank() ? fallback : text;
    }

    private List<String> asStringList(Object value, int max) {
        if (!(value instanceof List<?> raw)) {
            return List.of();
        }
        return raw.stream()
                .map(String::valueOf)
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .limit(max)
                .toList();
    }
}
