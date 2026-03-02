import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

export async function startInterviewSession(durationMinutes) {
    const { data } = await axios.post(`${BACKEND_URL}/api/interview/session/start`, { durationMinutes });
    return data?.data;
}

export async function getInterviewSessionState(sessionId) {
    const { data } = await axios.get(`${BACKEND_URL}/api/interview/session/${sessionId}`);
    return data?.data;
}

export async function submitInterviewAnswer(sessionId, payload) {
    const { data } = await axios.post(`${BACKEND_URL}/api/interview/session/${sessionId}/answer`, payload);
    return data?.data;
}

export async function endInterviewSession(sessionId) {
    const { data } = await axios.post(`${BACKEND_URL}/api/interview/session/${sessionId}/end`);
    return data?.data;
}

export async function transcribeInterviewAudio(audioInput) {
    const formData = new FormData();
    const isFile = audioInput instanceof File;
    const fileName = isFile ? (audioInput.name || "interview-answer.webm") : "interview-answer.webm";
    formData.append("audioFile", audioInput, fileName);

    const { data } = await axios.post(`${BACKEND_URL}/api/interview/transcribe`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return data?.data?.transcript || "";
}
