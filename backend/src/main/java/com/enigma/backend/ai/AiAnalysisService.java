package com.enigma.backend.ai;

import com.enigma.backend.ai.dto.AnalyzeRequest;
import com.enigma.backend.ai.dto.AnalyzeResponse;
import com.enigma.backend.ai.dto.ChatbotAnalyzeRequest;
import com.enigma.backend.ai.dto.ChatbotAnalyzeResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AiAnalysisService {

    private final String apiKey;
    private final String model;
    private final String baseUrl;
    private final String anthropicApiKey;
    private final String anthropicModel;
    private final String anthropicBaseUrl;
    private final String openRouterApiKey;
    private final String openRouterModel;
    private final String openRouterBaseUrl;
    private final String groqApiKey;
    private final String groqBaseUrl;
    private final String transcriptionModel;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public AiAnalysisService(
            @Value("${grok.api-key:${GROK_API_KEY:${groq.api-key:${app.ai.groq-api-key:}}}}") String apiKey,
            @Value("${grok.model:${groq.model:${app.ai.model:grok-3-mini}}}") String model,
            @Value("${grok.base-url:${groq.base-url:https://api.x.ai/v1}}") String baseUrl,
            @Value("${anthropic.api-key:${ANTHROPIC_API_KEY:}}") String anthropicApiKey,
            @Value("${anthropic.model:${ANTHROPIC_MODEL:claude-3-5-sonnet-latest}}") String anthropicModel,
            @Value("${anthropic.base-url:${ANTHROPIC_BASE_URL:https://api.anthropic.com/v1}}") String anthropicBaseUrl,
            @Value("${openrouter.api-key:${OPENROUTER_API_KEY:}}") String openRouterApiKey,
            @Value("${openrouter.model:${OPENROUTER_MODEL:openai/gpt-4o-mini}}") String openRouterModel,
            @Value("${openrouter.base-url:${OPENROUTER_BASE_URL:https://openrouter.ai/api/v1}}") String openRouterBaseUrl,
                @Value("${groq.api-key:${GROQ_API_KEY:}}") String groqApiKey,
                @Value("${groq.base-url:${GROQ_BASE_URL:https://api.groq.com/openai/v1}}") String groqBaseUrl,
                @Value("${app.ai.transcription-model:${GROQ_TRANSCRIPTION_MODEL:whisper-large-v3-turbo}}") String transcriptionModel,
            ObjectMapper objectMapper
    ) {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl;
        this.anthropicApiKey = anthropicApiKey;
        this.anthropicModel = anthropicModel;
        this.anthropicBaseUrl = anthropicBaseUrl;
        this.openRouterApiKey = openRouterApiKey;
        this.openRouterModel = openRouterModel;
        this.openRouterBaseUrl = openRouterBaseUrl;
        this.groqApiKey = groqApiKey;
        this.groqBaseUrl = groqBaseUrl;
        this.transcriptionModel = transcriptionModel;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();
    }

    public AnalyzeResponse analyze(AnalyzeRequest request) {
        ProviderConfig provider = resolveProvider();
        if (provider == null) {
            return new AnalyzeResponse(
                    "Start by handling one simple test case end-to-end, then generalize with edge cases.",
                    "AI analysis is unavailable because API key is not configured. Set OPENROUTER_API_KEY (or GROK_API_KEY/GROQ_API_KEY/ANTHROPIC_API_KEY)."
            );
        }

        PassStatus passStatus = extractPassStatus(request.testSummary());
        boolean likelyCorrect = passStatus.total() > 0 && passStatus.passed() == passStatus.total();

        String hintPrompt = "Analyze this coding problem and provide a helpful hint in the following format:\n"
                + "1. **Approach Pattern**: Identify the pattern/technique (e.g., Two Pointer, Sliding Window, Dynamic Programming, Greedy, Binary Search, etc.) based on the question.\n"
                + "2. **Constraints**: List constraints in LeetCode style (e.g., '1 <= n <= 10^5', 'Time: O(n)', 'Space: O(1)').\n"
                + "3. **Hint**: One small hint to guide the solution without giving away the full answer.\n"
                + "Question: " + safe(request.question())
                + " Language: " + safe(request.language())
                + " Current Code: " + safe(request.code());

        String language = safe(request.language());
        boolean javaMode = "java".equalsIgnoreCase(language);
        String improvedCodeInstruction = javaMode
            ? "Provide improved clean Java code (without comments)."
            : "Provide improved clean " + (language.isBlank() ? "code" : language + " code") + " (without comments).";

        String analysisPrompt = "You are a senior Java DSA expert and coding judge.\n"
            + "Evaluate the user-submitted solution using question + code + test summary.\n"
            + "Respond strictly in this format and do not add extra sections:\n"
            + "Evaluation Result: (Correct / Incorrect)\n"
            + "\n"
            + "Error Explanation:\n"
            + "...\n"
            + "\n"
            + "Optimization Feedback:\n"
            + "...\n"
            + "\n"
            + "Time Complexity:\n"
            + "...\n"
            + "\n"
            + "Space Complexity:\n"
            + "...\n"
            + "\n"
            + "Improved Solution:\n"
            + "...\n"
            + "Rules:\n"
            + "- Decide correctness from logic + test summary.\n"
            + "- If incorrect, clearly mention logical error and correction.\n"
            + "- Include optimal approach when possible.\n"
            + "- " + improvedCodeInstruction + "\n"
                + "Question: " + safe(request.question())
            + " Language: " + language
                + " Test Summary: " + safe(request.testSummary())
                + " Code: " + safe(request.code());

        String hint = callAi(hintPrompt, provider);
        String analysis = callAi(analysisPrompt, provider);

        if (isAiFailure(hint) || isAiFailure(analysis)) {
            return new AnalyzeResponse(
                    buildOfflineHint(request, passStatus),
                    buildOfflineAnalysis(request, passStatus, likelyCorrect)
            );
        }

        return new AnalyzeResponse(hint, analysis);
    }

    public ChatbotAnalyzeResponse analyzeChatbot(ChatbotAnalyzeRequest request) {
        PassStatus passStatus = extractPassStatus(request.testSummary());
        boolean likelyCorrect = passStatus.total() > 0 && passStatus.passed() == passStatus.total();
        String verdict = likelyCorrect ? "CORRECT" : "NEEDS_FIX";
        String action = safe(request.action()).toUpperCase();

        ProviderConfig provider = resolveProvider();
        if (provider == null) {
            String fallbackReply = buildOfflineChatbotReply(request, passStatus, likelyCorrect);
            return new ChatbotAnalyzeResponse(
                    fallbackReply,
                    verdict,
                    likelyCorrect,
                    buildOfflineHintFromStatus(passStatus),
                    buildOfflineErrorFeedback(passStatus, likelyCorrect),
                    buildOfflineOptimalApproach(request)
            );
        }

        String statusLine;
        if (passStatus.total() == 0) {
            statusLine = "No reliable test execution data is available yet.";
        } else if (likelyCorrect) {
            statusLine = "All tests are passing.";
        } else {
            statusLine = "Some tests are failing. Prioritize bug fixing before optimization.";
        }

        String prompt = "You are a DSA interview chatbot. Reply strictly in English, concise, practical, and candidate-friendly.\n"
                + "Primary user intent/action: " + (action.isBlank() ? "GENERAL" : action) + "\n"
                + "Return STRICT JSON with these keys only:\n"
                + "{\n"
                + "  \"verdict\": \"CORRECT\" or \"NEEDS_FIX\",\n"
                + "  \"reply\": \"short explanation for user\",\n"
                + "  \"hint\": \"one actionable AI hint\",\n"
                + "  \"errorFeedback\": \"if code is wrong, explain likely bug using failing test and stderr/compile error\",\n"
                + "  \"optimalApproach\": \"optimal idea + target complexity + short pseudocode style steps\"\n"
                + "}\n"
                + "Rules:\n"
                + "- Read the problem statement and user's code before answering.\n"
                + "- If tests fail, prioritize debugging over optimization.\n"
                + "- If compile/runtime error is visible in test summary, explicitly mention likely root cause.\n"
                + "- Keep fields concise and practical for interview prep.\n"
                + "- Do not use markdown code fences.\n"
                + "Question: " + safe(request.question()) + "\n"
                + "Language: " + safe(request.language()) + "\n"
                + "User Chat Question: " + safe(request.userMessage()) + "\n"
                + "Test Summary: " + safe(request.testSummary()) + "\n"
                + "Status Hint: " + statusLine + "\n"
                + "Code:\n" + safe(request.code());

        String rawReply = callAi(prompt, provider);
        if (isAiFailure(rawReply)) {
            return new ChatbotAnalyzeResponse(
                    buildOfflineChatbotReply(request, passStatus, likelyCorrect),
                    verdict,
                    likelyCorrect,
                    buildOfflineHintFromStatus(passStatus),
                    buildOfflineErrorFeedback(passStatus, likelyCorrect),
                    buildOfflineOptimalApproach(request)
            );
        }

        StructuredChatbotReply structured = parseStructuredChatbotReply(rawReply, verdict);
        return new ChatbotAnalyzeResponse(
                structured.reply(),
                structured.verdict(),
                "CORRECT".equalsIgnoreCase(structured.verdict()),
                structured.hint(),
                structured.errorFeedback(),
                structured.optimalApproach()
        );
    }

    public String generateText(String systemPrompt, String userPrompt) {
        ProviderConfig provider = resolveProvider();
        if (provider == null) {
            return "AI response unavailable right now.";
        }

        String mergedPrompt = "System Instructions:\n" + safe(systemPrompt) + "\n\nUser Prompt:\n" + safe(userPrompt);
        return callAi(mergedPrompt, provider);
    }

    public String transcribeAudio(byte[] audioBytes, String originalFilename, String contentType) {
        if (audioBytes == null || audioBytes.length == 0) {
            return "";
        }

        ProviderConfig transcriptionProvider = resolveTranscriptionProvider();
        if (transcriptionProvider == null || transcriptionProvider.anthropic()) {
            return "";
        }

        String primary = transcribeWithProvider(audioBytes, originalFilename, contentType, transcriptionProvider);
        if (!primary.isBlank()) {
            return primary;
        }

        if (openRouterApiKey != null && !openRouterApiKey.isBlank() && !transcriptionProvider.openRouter()) {
            ProviderConfig fallbackOpenRouter = new ProviderConfig(openRouterApiKey, openRouterBaseUrl, openRouterModel, false, true);
            String viaOpenRouter = transcribeWithProvider(audioBytes, originalFilename, contentType, fallbackOpenRouter);
            if (!viaOpenRouter.isBlank()) {
                return viaOpenRouter;
            }
        }

        if (apiKey != null && !apiKey.isBlank() && !apiKey.equals(transcriptionProvider.apiKey())) {
            ProviderConfig fallback = new ProviderConfig(apiKey, baseUrl, transcriptionModel, false, false);
            String secondary = transcribeWithProvider(audioBytes, originalFilename, contentType, fallback);
            if (!secondary.isBlank()) {
                return secondary;
            }
        }

        return "";
    }

    private String transcribeWithProvider(byte[] audioBytes, String originalFilename, String contentType, ProviderConfig provider) {
        if (provider == null || provider.apiKey() == null || provider.apiKey().isBlank()) {
            return "";
        }

        try {
            String boundary = "----EnigmaBoundary" + UUID.randomUUID();
            String filename = (originalFilename == null || originalFilename.isBlank()) ? "interview-audio.webm" : originalFilename;
            String mimeType = (contentType == null || contentType.isBlank()) ? "audio/webm" : contentType;

            byte[] body = buildMultipartBody(boundary, filename, mimeType, audioBytes);

            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(provider.baseUrl() + "/audio/transcriptions"))
                    .timeout(Duration.ofSeconds(60))
                    .header("Authorization", "Bearer " + provider.apiKey())
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary);

            if (provider.openRouter()) {
                requestBuilder.header("HTTP-Referer", "http://localhost:5173");
                requestBuilder.header("X-Title", "ENIGMA Interview Voice");
            }

            HttpRequest request = requestBuilder
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                return "";
            }

            JsonNode root = objectMapper.readTree(response.body());
            String text = safe(root.path("text").asText(""));
            if (!text.isBlank()) {
                return text;
            }
            return safe(root.path("transcript").asText(""));
        } catch (Exception ex) {
            return "";
        }
    }

    private byte[] buildMultipartBody(String boundary, String filename, String mimeType, byte[] audioBytes) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        String lineBreak = "\r\n";

        output.write(("--" + boundary + lineBreak).getBytes(StandardCharsets.UTF_8));
        output.write(("Content-Disposition: form-data; name=\"model\"" + lineBreak + lineBreak).getBytes(StandardCharsets.UTF_8));
        output.write(transcriptionModel.getBytes(StandardCharsets.UTF_8));
        output.write(lineBreak.getBytes(StandardCharsets.UTF_8));

        output.write(("--" + boundary + lineBreak).getBytes(StandardCharsets.UTF_8));
        output.write(("Content-Disposition: form-data; name=\"response_format\"" + lineBreak + lineBreak).getBytes(StandardCharsets.UTF_8));
        output.write("json".getBytes(StandardCharsets.UTF_8));
        output.write(lineBreak.getBytes(StandardCharsets.UTF_8));

        output.write(("--" + boundary + lineBreak).getBytes(StandardCharsets.UTF_8));
        output.write(("Content-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"" + lineBreak).getBytes(StandardCharsets.UTF_8));
        output.write(("Content-Type: " + mimeType + lineBreak + lineBreak).getBytes(StandardCharsets.UTF_8));
        output.write(audioBytes);
        output.write(lineBreak.getBytes(StandardCharsets.UTF_8));

        output.write(("--" + boundary + "--" + lineBreak).getBytes(StandardCharsets.UTF_8));
        return output.toByteArray();
    }

    private StructuredChatbotReply parseStructuredChatbotReply(String rawReply, String fallbackVerdict) {
        String fallbackHint = "Dry-run the smallest failing case and verify index movement/state transitions step by step.";
        String fallbackError = "Check base conditions, off-by-one boundaries, and output formatting against the failing test.";
        String fallbackOptimal = "Identify the canonical pattern for this problem (hashing/two-pointers/sliding window/DP) and target its best-known complexity.";

        try {
            JsonNode root = objectMapper.readTree(rawReply);
            String verdict = safe(root.path("verdict").asText(fallbackVerdict)).toUpperCase();
            if (!"CORRECT".equals(verdict) && !"NEEDS_FIX".equals(verdict)) {
                verdict = fallbackVerdict;
            }
            String reply = safe(root.path("reply").asText(rawReply)).trim();
            String hint = safe(root.path("hint").asText(fallbackHint)).trim();
            String errorFeedback = safe(root.path("errorFeedback").asText(fallbackError)).trim();
            String optimalApproach = safe(root.path("optimalApproach").asText(fallbackOptimal)).trim();

            return new StructuredChatbotReply(reply, verdict, hint, errorFeedback, optimalApproach);
        } catch (Exception ex) {
            return new StructuredChatbotReply(rawReply, fallbackVerdict, fallbackHint, fallbackError, fallbackOptimal);
        }
    }

    private String callAi(String userPrompt, ProviderConfig provider) {
        if (provider == null || provider.apiKey() == null || provider.apiKey().isBlank()) {
            return "AI response unavailable right now.";
        }

        if (provider.anthropic()) {
            return callAnthropic(userPrompt, provider.apiKey(), provider.baseUrl(), provider.model());
        }

        return callOpenAiCompatible(userPrompt, provider.apiKey(), provider.baseUrl(), provider.model(), provider.openRouter());
    }

    private String callOpenAiCompatible(String userPrompt, String activeKey, String activeBaseUrl, String activeModel, boolean openRouter) {
        try {
            Map<String, Object> payload = Map.of(
                    "model", activeModel,
                    "temperature", 0.3,
                    "messages", List.of(
                        Map.of("role", "system", "content", "You are an expert coding interview assistant specializing in algorithm optimization and complexity analysis. Always answer in English with clear, structured, and practical guidance."),
                            Map.of("role", "user", "content", userPrompt)
                    )
            );

            String body = objectMapper.writeValueAsString(payload);

                HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(activeBaseUrl + "/chat/completions"))
                    .timeout(Duration.ofSeconds(45))
                    .header("Authorization", "Bearer " + activeKey)
                    .header("Content-Type", "application/json");

                if (openRouter) {
                requestBuilder.header("HTTP-Referer", "http://localhost:5173");
                requestBuilder.header("X-Title", "ENIGMA DSA Judge");
                }

                HttpRequest request = requestBuilder
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                return formatProviderError(response.statusCode(), response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
            if (contentNode.isMissingNode() || contentNode.isNull()) {
                return "AI response unavailable right now.";
            }
            return contentNode.asText();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return "AI response unavailable right now.";
        } catch (IOException ex) {
            return "AI response unavailable right now.";
        }
    }

    private String callAnthropic(String userPrompt, String activeKey, String activeBaseUrl, String activeModel) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("model", activeModel);
            payload.put("max_tokens", 700);
            payload.put("temperature", 0.3);
            payload.put("system", "You are an expert coding interview assistant specializing in algorithm optimization and complexity analysis. Always answer in English with clear, structured, and practical guidance.");
            payload.put("messages", List.of(Map.of("role", "user", "content", userPrompt)));

            String body = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(activeBaseUrl + "/messages"))
                    .timeout(Duration.ofSeconds(45))
                    .header("x-api-key", activeKey)
                    .header("anthropic-version", "2023-06-01")
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                return formatProviderError(response.statusCode(), response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode textNode = root.path("content").path(0).path("text");
            if (textNode.isMissingNode() || textNode.isNull()) {
                return "AI response unavailable right now.";
            }
            return textNode.asText();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return "AI response unavailable right now.";
        } catch (IOException ex) {
            return "AI response unavailable right now.";
        }
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private ProviderConfig resolveProvider() {
        if (openRouterApiKey != null && !openRouterApiKey.isBlank()) {
            return new ProviderConfig(openRouterApiKey, openRouterBaseUrl, openRouterModel, false, true);
        }
        if (apiKey != null && !apiKey.isBlank()) {
            return new ProviderConfig(apiKey, baseUrl, model, false, false);
        }
        if (anthropicApiKey != null && !anthropicApiKey.isBlank()) {
            return new ProviderConfig(anthropicApiKey, anthropicBaseUrl, anthropicModel, true, false);
        }
        return null;
    }

    private ProviderConfig resolveTranscriptionProvider() {
        if (groqApiKey != null && !groqApiKey.isBlank()) {
            return new ProviderConfig(groqApiKey, groqBaseUrl, transcriptionModel, false, false);
        }
        if (openRouterApiKey != null && !openRouterApiKey.isBlank()) {
            return new ProviderConfig(openRouterApiKey, openRouterBaseUrl, openRouterModel, false, true);
        }
        if (apiKey != null && !apiKey.isBlank()) {
            return new ProviderConfig(apiKey, baseUrl, transcriptionModel, false, false);
        }
        return null;
    }

    private boolean isAiFailure(String responseText) {
        if (responseText == null || responseText.isBlank()) {
            return true;
        }
        String normalized = responseText.toLowerCase();
        return normalized.startsWith("ai service error")
                || normalized.contains("response unavailable")
                || normalized.contains("unauthorized")
                || normalized.contains("invalid api key")
                || normalized.contains("credit balance is too low")
                || normalized.contains("billing");
    }

    private String formatProviderError(int statusCode, String responseBody) {
        String lower = responseBody == null ? "" : responseBody.toLowerCase();
        if (lower.contains("credit balance is too low") || lower.contains("billing")) {
            return "AI service error: insufficient provider credits. Please add billing credits and retry.";
        }
        if (lower.contains("invalid api key") || lower.contains("authentication") || statusCode == 401) {
            return "AI service error: invalid or unauthorized API key.";
        }
        return "AI service error: " + statusCode;
    }

    private PassStatus extractPassStatus(String testSummary) {
        if (testSummary == null || testSummary.isBlank()) {
            return new PassStatus(0, 0);
        }

        Matcher matcher = Pattern.compile("(\\d+)\\s*/\\s*(\\d+)").matcher(testSummary);
        if (!matcher.find()) {
            return new PassStatus(0, 0);
        }

        int passed = Integer.parseInt(matcher.group(1));
        int total = Integer.parseInt(matcher.group(2));
        return new PassStatus(passed, total);
    }

    private String buildOfflineChatbotReply(ChatbotAnalyzeRequest request, PassStatus passStatus, boolean likelyCorrect) {
        String approachSummary = "Approach Summary: Your code appears to be a direct implementation of your current idea. Validate edge-case handling and index transitions carefully.";

        if (likelyCorrect) {
            return "Verdict: CORRECT\n"
                    + approachSummary + "\n"
                    + "Complexity: Please estimate your current time and space complexity and compare against the optimal known pattern for this problem.\n"
                    + "Optimization Feedback: Since tests are passing (" + passStatus.passed() + "/" + passStatus.total() + "), now focus on reducing extra loops/data structures if possible.\n"
                    + "Final Feedback: Good progress—now refine for optimal complexity and cleaner edge-case guarantees.";
        }

        String testInfo = passStatus.total() > 0
                ? ("Test result indicates failures (" + passStatus.passed() + "/" + passStatus.total() + ").")
                : "Test result is not clear yet, but your implementation still needs verification.";

        return "Verdict: NEEDS_FIX\n"
                + approachSummary + "\n"
                + "Error Diagnosis: " + testInfo + " Most common causes are off-by-one conditions, wrong base case, or missing edge-case branch.\n"
                + "Suggestions:\n"
                + "- Dry-run the smallest and boundary inputs step by step.\n"
                + "- Track invariant/state changes after each iteration or recursion step.\n"
                + "- Re-check output format and return statements.\n"
                + "Complexity: Confirm whether your current approach matches expected constraints.\n"
                + "Final Feedback: Fix correctness first, then move to optimization.";
    }

    private String buildOfflineHintFromStatus(PassStatus passStatus) {
        if (passStatus.total() == 0) {
            return "Identify the algorithm pattern first, then validate with 1-2 tiny dry runs before full implementation.";
        }
        if (passStatus.passed() < passStatus.total()) {
            return "Focus on the first failing test case; track each variable update and boundary check.";
        }
        return "All visible tests pass—now simplify your logic and verify whether complexity is optimal.";
    }

    private String buildOfflineErrorFeedback(PassStatus passStatus, boolean likelyCorrect) {
        if (likelyCorrect) {
            return "No visible correctness error from current tests. Re-validate hidden edge cases and constraints.";
        }
        if (passStatus.total() == 0) {
            return "Execution feedback is missing. Re-run tests and check for compile/runtime errors first.";
        }
        return "Likely issue: boundary condition, base case, or index transition mismatch in failing tests.";
    }

    private String buildOfflineOptimalApproach(ChatbotAnalyzeRequest request) {
        return "Use the best-known pattern for this problem type, then target optimal time/space complexity with minimal extra structures.";
    }

    private String buildOfflineHint(AnalyzeRequest request, PassStatus passStatus) {
        if (passStatus.total() == 0) {
            return "Approach Pattern: First identify whether this problem needs a two-pointer, hash map, sliding window, binary search, or DP strategy. Start with a tiny dry run and define the invariant before coding.";
        }

        if (passStatus.passed() < passStatus.total()) {
            return "Approach Hint: Your current idea is partially working. Focus on the first failing test, then verify boundary cases (empty input, single element, duplicates, max/min limits).";
        }

        return "Approach Hint: Your solution appears correct on current tests. Now validate whether each loop/data structure is necessary and can be simplified for optimal complexity.";
    }

    private String buildOfflineAnalysis(AnalyzeRequest request, PassStatus passStatus, boolean likelyCorrect) {
        ProviderConfig provider = resolveProvider();
        String compatibilityNote = provider != null && provider.anthropic()
                ? "Provider Note: Anthropic key detected. If live analysis still fails, verify ANTHROPIC_API_KEY/endpoint access and billing limits.\n"
                : "";

        if (!likelyCorrect) {
            String score = passStatus.total() > 0
                    ? (passStatus.passed() + "/" + passStatus.total() + " tests passed")
                    : "test status is unclear";

            return compatibilityNote
                    + "Correctness Status: NEEDS_FIX (" + score + ").\n"
                    + "Error Diagnosis: Most likely causes are edge-case gaps, wrong condition ordering, or off-by-one index movement.\n"
                    + "Current Complexity: Estimate your existing time/space complexity and compare it against constraints.\n"
                    + "Expected Optimal Complexity: Prefer linear or n log n approaches unless brute force is explicitly acceptable.\n"
                    + "Optimization Feedback: Fix correctness first on the first failing test, then remove redundant passes/data structures.\n"
                    + "Approach Understanding: Your implementation follows a direct simulation-style approach; make invariants explicit to stabilize logic.";
        }

        return compatibilityNote
                + "Correctness Status: LIKELY_CORRECT (all visible tests passed).\n"
                + "Current Complexity: Review whether your code is O(n), O(n log n), or O(n^2) and verify memory footprint.\n"
                + "Expected Optimal Complexity: For interview-grade solutions, target the best-known pattern for this problem class.\n"
                + "Optimization Feedback: If complexity is above optimal, reduce nested loops, avoid repeated scans, and prune unnecessary containers.\n"
                + "Approach Understanding: Your approach is valid; now refine for clarity, stronger edge-case proofs, and optimal complexity.";
    }

    private record PassStatus(int passed, int total) {
    }

    private record StructuredChatbotReply(
            String reply,
            String verdict,
            String hint,
            String errorFeedback,
            String optimalApproach
    ) {
    }

        private record ProviderConfig(
            String apiKey,
            String baseUrl,
            String model,
            boolean anthropic,
            boolean openRouter
        ) {
        }
}
