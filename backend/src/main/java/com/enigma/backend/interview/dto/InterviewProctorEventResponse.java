package com.enigma.backend.interview.dto;

public record InterviewProctorEventResponse(
        String sessionId,
        int violationCount,
        boolean sessionEnded,
        String terminationReason,
        InterviewFinalReport finalReport
) {
}
