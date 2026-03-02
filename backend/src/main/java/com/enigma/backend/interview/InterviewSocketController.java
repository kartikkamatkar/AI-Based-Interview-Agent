package com.enigma.backend.interview;

import com.enigma.backend.ai.AiAnalysisService;
import com.enigma.backend.ai.dto.AnalyzeRequest;
import com.enigma.backend.ai.dto.AnalyzeResponse;
import com.enigma.backend.common.ApiResponse;
import com.enigma.backend.interview.dto.InterviewAnalyzeMessage;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class InterviewSocketController {

    private final AiAnalysisService aiAnalysisService;
    private final SimpMessagingTemplate messagingTemplate;

    public InterviewSocketController(AiAnalysisService aiAnalysisService, SimpMessagingTemplate messagingTemplate) {
        this.aiAnalysisService = aiAnalysisService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/interview/{sessionId}/analyze")
    public void analyze(
            @DestinationVariable String sessionId,
            InterviewAnalyzeMessage message
    ) {
        AnalyzeRequest request = new AnalyzeRequest(
                message.question(),
                message.code(),
                message.language(),
                message.testSummary()
        );

        AnalyzeResponse response = aiAnalysisService.analyze(request);
        messagingTemplate.convertAndSend(
                "/topic/interview/" + sessionId + "/feedback",
                ApiResponse.ok(response, "Interview feedback generated")
        );
    }
}
