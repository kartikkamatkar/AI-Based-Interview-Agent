package com.enigma.backend.interview;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

@Component
public class SessionTimer {

    public void validateDuration(int durationMinutes) {
        if (durationMinutes != 15 && durationMinutes != 30) {
            throw new IllegalArgumentException("Duration must be either 15 or 30 minutes.");
        }
    }

    public Instant calculateEndTime(Instant startedAt, int durationMinutes) {
        return startedAt.plus(Duration.ofMinutes(durationMinutes));
    }

    public int secondsRemaining(Instant endsAt) {
        long seconds = Duration.between(Instant.now(), endsAt).getSeconds();
        return (int) Math.max(0, seconds);
    }

    public boolean isExpired(Instant endsAt) {
        return Instant.now().isAfter(endsAt) || Instant.now().equals(endsAt);
    }
}
