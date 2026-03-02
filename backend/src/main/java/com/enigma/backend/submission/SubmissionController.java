package com.enigma.backend.submission;

import com.enigma.backend.common.ApiResponse;
import com.enigma.backend.submission.dto.CreateSubmissionRequest;
import com.enigma.backend.submission.dto.SubmissionResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/submissions")
@CrossOrigin(origins = "http://localhost:5173")
public class SubmissionController {

    private final SubmissionService submissionService;

    public SubmissionController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SubmissionResponse> create(@Valid @RequestBody CreateSubmissionRequest request) {
        return ApiResponse.ok(submissionService.create(request), "Submission created");
    }

    @GetMapping
    public ApiResponse<List<SubmissionResponse>> getAll() {
        return ApiResponse.ok(submissionService.getAll(), "Submissions fetched");
    }

    @GetMapping("/{id}")
    public ApiResponse<SubmissionResponse> getById(@PathVariable Long id) {
        return ApiResponse.ok(submissionService.getById(id), "Submission fetched");
    }
}
