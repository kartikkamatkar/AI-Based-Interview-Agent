package com.enigma.backend.question;

import com.enigma.backend.common.ApiResponse;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/questions")
@CrossOrigin(origins = "*")
public class QuestionController {

    private final QuestionService questionService;

    public QuestionController(QuestionService questionService) {
        this.questionService = questionService;
    }

    @GetMapping
    public ApiResponse<List<QuestionItem>> getQuestions(
            @RequestParam(defaultValue = "false") boolean shuffle,
            @RequestParam(required = false) Integer limit
    ) {
        return ApiResponse.ok(questionService.getQuestions(shuffle, limit), "Questions fetched from PDF");
    }

    @GetMapping("/random")
    public ApiResponse<QuestionItem> getRandomQuestion(
            @RequestParam(required = false) Integer excludeNumber
    ) {
        return ApiResponse.ok(questionService.getRandomQuestion(excludeNumber), "Random question fetched from PDF");
    }

    @GetMapping("/next")
    public ApiResponse<QuestionItem> getNextQuestion(
            @RequestParam(required = false) Integer excludeNumber
    ) {
        return ApiResponse.ok(questionService.getNextQuestion(excludeNumber), "Next shuffled question fetched from PDF");
    }

    @GetMapping("/start")
    public ApiResponse<List<QuestionItem>> getStartQuestions(
            @RequestParam(defaultValue = "3") Integer count,
            @RequestParam(required = false) Integer excludeNumber
    ) {
        return ApiResponse.ok(questionService.getStartQuestions(count, excludeNumber), "Starter questions fetched");
    }
}
