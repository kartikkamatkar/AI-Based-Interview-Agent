package com.enigma.backend.technical;

import com.enigma.backend.common.ApiResponse;
import com.enigma.backend.technical.dto.TechnicalFinalReport;
import com.enigma.backend.technical.dto.TechnicalSessionStartRequest;
import com.enigma.backend.technical.dto.TechnicalSessionStartResponse;
import com.enigma.backend.technical.dto.TechnicalSessionStateResponse;
import com.enigma.backend.technical.dto.TechnicalSubmissionRequest;
import com.enigma.backend.technical.dto.TechnicalTurnResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/technical/session")
public class TechnicalSessionController {

    private final TechnicalSessionService technicalSessionService;

    public TechnicalSessionController(TechnicalSessionService technicalSessionService) {
        this.technicalSessionService = technicalSessionService;
    }

    @PostMapping("/start")
    public ApiResponse<TechnicalSessionStartResponse> start(@RequestBody TechnicalSessionStartRequest request) {
        TechnicalSessionStartResponse response = technicalSessionService.startSession(
                request.durationMinutes(),
                request.questionCount()
        );
        return ApiResponse.ok(response, "Technical session started");
    }

    @GetMapping("/{sessionId}")
    public ApiResponse<TechnicalSessionStateResponse> getState(@PathVariable String sessionId) {
        TechnicalSessionStateResponse response = technicalSessionService.getState(sessionId);
        return ApiResponse.ok(response, "Technical session state fetched");
    }

    @PostMapping("/{sessionId}/submit")
    public ApiResponse<TechnicalTurnResponse> submit(
            @PathVariable String sessionId,
            @RequestBody TechnicalSubmissionRequest request
    ) {
        TechnicalTurnResponse response = technicalSessionService.submit(sessionId, request);
        return ApiResponse.ok(response, "Technical submission evaluated");
    }

    @PostMapping("/{sessionId}/end")
    public ApiResponse<TechnicalFinalReport> end(@PathVariable String sessionId) {
        TechnicalFinalReport report = technicalSessionService.endSession(sessionId);
        return ApiResponse.ok(report, "Technical session ended");
    }
}
