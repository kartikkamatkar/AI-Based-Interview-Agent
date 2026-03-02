import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

export async function startTechnicalSession({ durationMinutes, questionCount }) {
    const { data } = await axios.post(`${BACKEND_URL}/api/technical/session/start`, {
        durationMinutes,
        questionCount,
    });
    return data?.data;
}

export async function getTechnicalSessionState(sessionId) {
    const { data } = await axios.get(`${BACKEND_URL}/api/technical/session/${sessionId}`);
    return data?.data;
}

export async function submitTechnicalSolution(sessionId, payload) {
    const { data } = await axios.post(`${BACKEND_URL}/api/technical/session/${sessionId}/submit`, payload);
    return data?.data;
}

export async function endTechnicalSession(sessionId) {
    const { data } = await axios.post(`${BACKEND_URL}/api/technical/session/${sessionId}/end`);
    return data?.data;
}
