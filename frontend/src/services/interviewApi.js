import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

function extractApiError(error, fallbackMessage) {
    const message = error?.response?.data?.message;
    if (typeof message === "string" && message.trim()) {
        return new Error(message.trim());
    }
    return new Error(fallbackMessage);
}

export async function startInterviewSession(durationMinutes) {
    try {
        const { data } = await axios.post(`${BACKEND_URL}/api/interview/session/start`, { durationMinutes });
        return data?.data;
    } catch (error) {
        throw extractApiError(error, "Unable to start interview session.");
    }
}

export async function getInterviewSessionState(sessionId) {
    try {
        const { data } = await axios.get(`${BACKEND_URL}/api/interview/session/${sessionId}`);
        return data?.data;
    } catch (error) {
        throw extractApiError(error, "Unable to fetch interview state.");
    }
}

export async function submitInterviewAnswer(sessionId, payload) {
    try {
        const { data } = await axios.post(`${BACKEND_URL}/api/interview/session/${sessionId}/answer`, payload);
        return data?.data;
    } catch (error) {
        throw extractApiError(error, "Unable to evaluate answer.");
    }
}

export async function endInterviewSession(sessionId) {
    try {
        const { data } = await axios.post(`${BACKEND_URL}/api/interview/session/${sessionId}/end`);
        return data?.data;
    } catch (error) {
        throw extractApiError(error, "Unable to end interview session.");
    }
}

export async function transcribeInterviewAudio(audioInput) {
    const formData = new FormData();
    const isFile = audioInput instanceof File;
    const fileName = isFile ? (audioInput.name || "interview-answer.webm") : "interview-answer.webm";
    formData.append("audioFile", audioInput, fileName);

    try {
        const { data } = await axios.post(`${BACKEND_URL}/api/interview/transcribe`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        return data?.data?.transcript || "";
    } catch (error) {
        throw extractApiError(error, "Unable to transcribe audio.");
    }
}
