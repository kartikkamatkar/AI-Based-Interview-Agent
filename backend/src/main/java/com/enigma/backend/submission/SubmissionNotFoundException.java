package com.enigma.backend.submission;

public class SubmissionNotFoundException extends RuntimeException {

    public SubmissionNotFoundException(Long id) {
        super("Submission not found with id: " + id);
    }
}
