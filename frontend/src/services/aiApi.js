import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

export async function analyzeSolution({ question, code, language, testSummary }) {
    const { data } = await axios.post(`${BACKEND_URL}/api/ai/analyze`, {
        question,
        code,
        language,
        testSummary,
    });

    return data?.data || { hint: "", analysis: "" };
}

export async function askDsaChatbot({ question, code, language, testSummary, userMessage, action = "GENERAL" }) {
    const { data } = await axios.post(`${BACKEND_URL}/api/ai/chatbot`, {
        question,
        code,
        language,
        testSummary,
        userMessage,
        action,
    });

    return data?.data || {
        reply: "",
        verdict: "NEEDS_FIX",
        likelyCorrect: false,
        hint: "",
        errorFeedback: "",
        optimalApproach: "",
    };
}

export async function analyzeCvResume({ resumeFile, resumeText, jobDescription }) {
    const formData = new FormData();
    if (resumeFile) {
        formData.append("resumeFile", resumeFile);
    }
    if (resumeText) {
        formData.append("resumeText", resumeText);
    }
    formData.append("jobDescription", jobDescription);

    const { data } = await axios.post(`${BACKEND_URL}/api/ai/cv/analyze`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return data?.data;
}
