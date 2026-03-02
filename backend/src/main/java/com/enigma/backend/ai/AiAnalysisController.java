package com.enigma.backend.ai;

import com.enigma.backend.ai.dto.AnalyzeRequest;
import com.enigma.backend.ai.dto.AnalyzeResponse;
import com.enigma.backend.ai.dto.ChatbotAnalyzeRequest;
import com.enigma.backend.ai.dto.ChatbotAnalyzeResponse;
import com.enigma.backend.ai.dto.CvAnalyzeResponse;
import com.enigma.backend.common.ApiResponse;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "http://localhost:5173")
public class AiAnalysisController {

    private final AiAnalysisService aiAnalysisService;
    private final CvAnalysisService cvAnalysisService;

    public AiAnalysisController(AiAnalysisService aiAnalysisService, CvAnalysisService cvAnalysisService) {
        this.aiAnalysisService = aiAnalysisService;
        this.cvAnalysisService = cvAnalysisService;
    }

    @PostMapping("/analyze")
    public ApiResponse<AnalyzeResponse> analyze(@RequestBody AnalyzeRequest request) {
        return ApiResponse.ok(aiAnalysisService.analyze(request), "AI analysis generated");
    }

    @PostMapping("/chatbot")
    public ApiResponse<ChatbotAnalyzeResponse> chatbot(@RequestBody ChatbotAnalyzeRequest request) {
        return ApiResponse.ok(aiAnalysisService.analyzeChatbot(request), "Chatbot feedback generated");
    }

    @PostMapping("/cv/analyze")
    public ApiResponse<CvAnalyzeResponse> analyzeCv(
            @RequestParam(value = "resumeFile", required = false) MultipartFile resumeFile,
            @RequestParam(value = "resumeText", required = false) String resumeText,
            @RequestParam("jobDescription") String jobDescription
    ) {
        CvAnalyzeResponse response = cvAnalysisService.analyze(resumeFile, resumeText, jobDescription);
        return ApiResponse.ok(response, "CV ATS analysis generated");
    }
}
