import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

export async function fetchShuffledQuestions(limit = 20) {
    const { data } = await axios.get(`${BACKEND_URL}/api/questions`, {
        params: { shuffle: true, limit },
    });

    return data?.data || [];
}

export async function fetchRandomQuestion(excludeNumber) {
    const { data } = await axios.get(`${BACKEND_URL}/api/questions/random`, {
        params: excludeNumber ? { excludeNumber } : {},
    });
    return data?.data || null;
}

export async function fetchNextQuestion(excludeNumber) {
    const { data } = await axios.get(`${BACKEND_URL}/api/questions/next`, {
        params: excludeNumber ? { excludeNumber } : {},
    });
    return data?.data || null;
}

export async function fetchStartQuestions(count = 3, excludeNumber) {
    const params = { count };
    if (excludeNumber) {
        params.excludeNumber = excludeNumber;
    }

    const { data } = await axios.get(`${BACKEND_URL}/api/questions/start`, {
        params,
    });
    return data?.data || [];
}
