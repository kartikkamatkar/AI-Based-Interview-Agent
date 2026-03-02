package com.enigma.backend.interview.dto;

public record InterviewProctorEventRequest(
        String eventType,
        String details,
        Boolean terminateSession
) {
}
