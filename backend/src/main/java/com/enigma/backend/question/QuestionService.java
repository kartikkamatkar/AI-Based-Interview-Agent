package com.enigma.backend.question;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class QuestionService {

    private static final Pattern QUESTION_START = Pattern.compile("^(?:Q\\s*\\d+|Q\\.?\\s*\\d+|\\d+[.)])\\s+.+", Pattern.CASE_INSENSITIVE);
    private static final Pattern QUESTION_ANCHOR_MULTILINE = Pattern.compile("(?im)^(?:question\\s*\\d+|q\\.?\\s*\\d+|\\d+[.)])\\s+.+$");

    private final String pdfPath;
    private final int defaultLimit;
    private final Random random = new Random();
    private volatile List<QuestionItem> shuffledDeck = new ArrayList<>();
    private volatile int deckIndex = 0;
    private volatile String deckSignature = "";

    public QuestionService(
            @Value("${app.questions.pdf-path}") String pdfPath,
            @Value("${app.questions.default-limit:20}") int defaultLimit
    ) {
        this.pdfPath = pdfPath;
        this.defaultLimit = defaultLimit;
    }

    public List<QuestionItem> getQuestions(boolean shuffle, Integer limit) {
        List<QuestionItem> questions = getQuestionPool();
        if (shuffle) {
            Collections.shuffle(questions);
        }

        int finalLimit = (limit == null || limit <= 0) ? defaultLimit : limit;
        if (questions.size() > finalLimit) {
            return questions.subList(0, finalLimit);
        }
        return questions;
    }

    public QuestionItem getRandomQuestion(Integer excludeNumber) {
        List<QuestionItem> questions = getQuestionPool();
        if (questions.isEmpty()) {
            throw new IllegalStateException("No questions available");
        }

        List<QuestionItem> pool = questions;
        if (excludeNumber != null) {
            List<QuestionItem> filtered = questions.stream()
                    .filter(q -> q.number() != excludeNumber)
                    .toList();
            if (!filtered.isEmpty()) {
                pool = filtered;
            }
        }

        return pool.get(random.nextInt(pool.size()));
    }

    public synchronized QuestionItem getNextQuestion(Integer excludeNumber) {
        List<QuestionItem> questions = getQuestionPool();
        if (questions.isEmpty()) {
            throw new IllegalStateException("No questions available");
        }

        ensureDeck(questions);

        QuestionItem candidate = shuffledDeck.get(deckIndex);
        deckIndex++;

        if (excludeNumber != null && shuffledDeck.size() > 1 && candidate.number() == excludeNumber) {
            candidate = shuffledDeck.get(deckIndex % shuffledDeck.size());
            deckIndex++;
        }

        return candidate;
    }

    public synchronized List<QuestionItem> getStartQuestions(int count, Integer excludeNumber) {
        int size = Math.max(1, count);
        List<QuestionItem> batch = new ArrayList<>();
        Integer last = excludeNumber;
        for (int i = 0; i < size; i++) {
            QuestionItem item = getNextQuestion(last);
            batch.add(item);
            last = item.number();
        }
        return batch;
    }

    private void ensureDeck(List<QuestionItem> questions) {
        String signature = questions.size() + ":" + questions.hashCode();
        if (shuffledDeck.isEmpty() || !signature.equals(deckSignature) || deckIndex >= shuffledDeck.size()) {
            shuffledDeck = new ArrayList<>(questions);
            Collections.shuffle(shuffledDeck);
            deckSignature = signature;
            deckIndex = 0;
        }
    }

    private List<QuestionItem> getQuestionPool() {
        List<QuestionItem> parsed = parseQuestionsFromPdf();
        if (parsed.size() >= 20) {
            return parsed;
        }
        return generateLeetStyleFallbackQuestions(150);
    }

    private List<QuestionItem> parseQuestionsFromPdf() {
        Path path = Path.of(pdfPath);
        if (!Files.exists(path)) {
            return List.of();
        }

        try (PDDocument document = Loader.loadPDF(path.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            return extractQuestions(text);
        } catch (IOException ex) {
            return List.of();
        }
    }

    private List<QuestionItem> extractQuestions(String text) {
        String normalizedText = text.replace("\r", "");

        List<QuestionItem> anchored = extractByAnchors(normalizedText);
        if (anchored.size() >= 3) {
            return anchored;
        }

        String[] lines = normalizedText.split("\n");
        List<QuestionItem> result = new ArrayList<>();

        StringBuilder current = new StringBuilder();
        int counter = 1;

        for (String rawLine : lines) {
            String line = rawLine == null ? "" : rawLine.trim();
            if (line.isBlank()) {
                continue;
            }

            if (QUESTION_START.matcher(line).matches()) {
                if (current.length() > 0) {
                    String question = current.toString().trim();
                    if (question.length() > 20) {
                            result.add(new QuestionItem(counter++, question, extractTitle(question, counter), generateConstraints()));
                    }
                    current.setLength(0);
                }
            }

            if (current.length() > 0) {
                current.append(' ');
            }
            current.append(line);
        }

        if (current.length() > 0) {
            String question = current.toString().trim();
            if (question.length() > 20) {
                 result.add(new QuestionItem(counter, question, extractTitle(question, counter), generateConstraints()));
            }
        }

        if (result.isEmpty()) {
            return fallbackSentenceSplit(text);
        }

        return result;
    }

    private List<QuestionItem> extractByAnchors(String text) {
        Matcher matcher = QUESTION_ANCHOR_MULTILINE.matcher(text);
        List<Integer> starts = new ArrayList<>();
        while (matcher.find()) {
            starts.add(matcher.start());
        }

        if (starts.isEmpty()) {
            return List.of();
        }

        List<QuestionItem> out = new ArrayList<>();
        for (int i = 0; i < starts.size(); i++) {
            int start = starts.get(i);
            int end = i + 1 < starts.size() ? starts.get(i + 1) : text.length();
            String chunk = text.substring(start, end).replaceAll("\\s+", " ").trim();
            if (chunk.length() >= 40) {
                 int num = out.size() + 1;
                 out.add(new QuestionItem(num, chunk, extractTitle(chunk, num), generateConstraints()));
            }
        }
        return out;
    }

    private List<QuestionItem> fallbackSentenceSplit(String text) {
        String[] blocks = text.split("\\n\\s*\\n");
        List<QuestionItem> items = new ArrayList<>();
        int count = 1;

        for (String block : blocks) {
            String normalized = block.replaceAll("\\s+", " ").trim();
            if (normalized.length() >= 30) {
                 items.add(new QuestionItem(count, normalized, extractTitle(normalized, count), generateConstraints()));
                 count++;
            }
        }

        return items;
    }

    private List<QuestionItem> generateLeetStyleFallbackQuestions(int total) {
        String[] topics = {
                "Arrays", "Strings", "Hashing", "Two Pointers", "Sliding Window",
                "Stack", "Queue", "Linked List", "Binary Search", "Recursion",
                "Dynamic Programming", "Greedy", "Trees", "Graphs", "Heaps"
        };

        String[] prompts = {
                "Find the minimum operations needed to transform input under given constraints",
                "Return the lexicographically smallest valid result with proof of correctness",
                "Count all valid subarrays/substrings satisfying a condition",
                "Design an O(n) or O(n log n) approach and compare with brute force",
                "Detect edge cases and prevent overflow/invalid indexing",
                "Support updates and queries efficiently",
                "Optimize time and space while preserving correctness",
                "Build a robust parser for mixed numeric/string input",
                "Compute maximum score after at most k operations",
                "Track frequency/state transitions and return final metric"
        };

        List<QuestionItem> out = new ArrayList<>();
        int number = 1;
        for (String topic : topics) {
            for (String prompt : prompts) {
                if (number > total) {
                    return out;
                }
                String text = number + ". [LeetCode-style] " + topic + " problem: " + prompt
                        + ". Provide optimal approach, expected complexity, and clean implementation.";
                      String title = topic + " - " + prompt.substring(0, Math.min(50, prompt.length()));
                      out.add(new QuestionItem(number, text, title, generateLeetConstraints(topic)));
                number++;
            }
        }
        return out;
    }

        private String extractTitle(String text, int number) {
            // Extract first sentence or first 60 characters as title
            String cleaned = text.replaceAll("^\\d+[.)\\s]+", "").trim();
            int dotIndex = cleaned.indexOf('.');
            int questionIndex = cleaned.indexOf('?');
        
            int endIndex = -1;
            if (dotIndex > 0 && questionIndex > 0) {
                endIndex = Math.min(dotIndex, questionIndex);
            } else if (dotIndex > 0) {
                endIndex = dotIndex;
            } else if (questionIndex > 0) {
                endIndex = questionIndex;
            }
        
            String title;
            if (endIndex > 10 && endIndex < 100) {
                title = cleaned.substring(0, endIndex).trim();
            } else {
                title = cleaned.substring(0, Math.min(60, cleaned.length())).trim();
                if (title.length() == 60 && !title.endsWith(" ")) {
                    int lastSpace = title.lastIndexOf(' ');
                    if (lastSpace > 30) {
                        title = title.substring(0, lastSpace);
                    }
                }
            }
        
            return title.isEmpty() ? "Problem #" + number : title;
        }

        private List<String> generateConstraints() {
            return List.of(
                "1 <= input size <= 10^5",
                "Expected time complexity: O(n) or O(n log n)",
                "Expected space complexity: O(n) or O(1)"
            );
        }

        private List<String> generateLeetConstraints(String topic) {
            return switch (topic) {
                case "Arrays", "Strings" -> List.of("1 <= n <= 10^5", "Time: O(n)", "Space: O(1) or O(n)");
                case "Hashing" -> List.of("1 <= n <= 10^5", "Time: O(n)", "Space: O(n)");
                case "Two Pointers", "Sliding Window" -> List.of("1 <= n <= 10^5", "Time: O(n)", "Space: O(1)");
                case "Stack", "Queue" -> List.of("1 <= n <= 10^4", "Time: O(n)", "Space: O(n)");
                case "Linked List" -> List.of("1 <= n <= 5000", "Time: O(n)", "Space: O(1)");
                case "Binary Search" -> List.of("1 <= n <= 10^6", "Time: O(log n)", "Space: O(1)");
                case "Recursion" -> List.of("1 <= n <= 1000", "Time: O(2^n) or better", "Space: O(n)");
                case "Dynamic Programming" -> List.of("1 <= n <= 5000", "Time: O(n^2) or O(n)", "Space: O(n)");
                case "Greedy" -> List.of("1 <= n <= 10^5", "Time: O(n log n)", "Space: O(1)");
                case "Trees" -> List.of("1 <= nodes <= 10^4", "Time: O(n)", "Space: O(h) where h is height");
                case "Graphs" -> List.of("1 <= nodes, edges <= 10^4", "Time: O(V + E)", "Space: O(V)");
                case "Heaps" -> List.of("1 <= n <= 10^4", "Time: O(n log k)", "Space: O(k)");
                default -> List.of("1 <= n <= 10^4", "Time: O(n log n)", "Space: O(n)");
            };
        }
}
