package com.enigma.backend.interview;

import com.enigma.backend.ai.AiAnalysisService;
import com.enigma.backend.common.ApiResponse;
import com.enigma.backend.interview.dto.InterviewAnswerRequest;
import com.enigma.backend.interview.dto.InterviewFinalReport;
import com.enigma.backend.interview.dto.InterviewSessionStateResponse;
import com.enigma.backend.interview.dto.InterviewStartRequest;
import com.enigma.backend.interview.dto.InterviewStartResponse;
import com.enigma.backend.interview.dto.InterviewTurnResponse;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/interview")
public class InterviewController {

    private final InterviewService interviewService;
    private final AiAnalysisService aiAnalysisService;

    public InterviewController(InterviewService interviewService, AiAnalysisService aiAnalysisService) {
        this.interviewService = interviewService;
        this.aiAnalysisService = aiAnalysisService;
    }

    @PostMapping("/session/start")
    public ApiResponse<InterviewStartResponse> startSession(@RequestBody InterviewStartRequest request) {
        InterviewStartResponse response = interviewService.startSession(request.durationMinutes());
        return ApiResponse.ok(response, "Interview session started");
    }

    @GetMapping("/session/{sessionId}")
    public ApiResponse<InterviewSessionStateResponse> getSessionState(@PathVariable String sessionId) {
        InterviewSessionStateResponse response = interviewService.getSessionState(sessionId);
        return ApiResponse.ok(response, "Interview session state fetched");
    }

    @PostMapping("/session/{sessionId}/answer")
    public ApiResponse<InterviewTurnResponse> submitAnswer(
            @PathVariable String sessionId,
            @RequestBody InterviewAnswerRequest request
    ) {
        InterviewTurnResponse response = interviewService.submitAnswer(sessionId, request);
        return ApiResponse.ok(response, "Interview answer evaluated");
    }

    @PostMapping("/session/{sessionId}/end")
    public ApiResponse<InterviewFinalReport> endSession(@PathVariable String sessionId) {
        InterviewFinalReport report = interviewService.endSession(sessionId);
        return ApiResponse.ok(report, "Interview session ended");
    }

    @PostMapping(value = "/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<Map<String, String>> transcribeAudio(@RequestParam("audioFile") MultipartFile audioFile) {
        if (audioFile == null || audioFile.isEmpty()) {
            throw new IllegalArgumentException("Audio file is required for transcription.");
        }

        try {
            String transcript = aiAnalysisService.transcribeAudio(
                    audioFile.getBytes(),
                    audioFile.getOriginalFilename(),
                    audioFile.getContentType()
            );
            if (transcript == null || transcript.isBlank()) {
                throw new IllegalArgumentException("Transcription failed. Please verify GROQ_API_KEY / transcription model and retry with clearer audio.");
            }
            return ApiResponse.ok(Map.of("transcript", transcript), "Audio transcribed");
        } catch (IOException ex) {
            throw new IllegalArgumentException("Failed to read uploaded audio.");
        }
    }
}
