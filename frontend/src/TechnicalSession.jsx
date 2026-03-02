import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    endTechnicalSession,
    getTechnicalSessionState,
    startTechnicalSession,
    submitTechnicalSolution,
} from "./services/technicalSessionApi";

const LANGUAGE_OPTIONS = ["javascript", "python", "java", "cpp", "go"];

export default function TechnicalSession() {
    const navigate = useNavigate();

    const [durationMinutes, setDurationMinutes] = useState(30);
    const [questionCount, setQuestionCount] = useState(3);

    const [sessionId, setSessionId] = useState("");
    const [secondsRemaining, setSecondsRemaining] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [completedQuestions, setCompletedQuestions] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState(null);

    const [language, setLanguage] = useState("javascript");
    const [code, setCode] = useState("");
    const [testSummary, setTestSummary] = useState("");

    const [turnFeedback, setTurnFeedback] = useState([]);
    const [finalReport, setFinalReport] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const hasActiveSession = !!sessionId && !finalReport;

    useEffect(() => {
        if (!hasActiveSession) {
            return undefined;
        }

        const timer = setInterval(() => {
            setSecondsRemaining((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [hasActiveSession]);

    useEffect(() => {
        if (!hasActiveSession) {
            return undefined;
        }

        const sync = setInterval(async () => {
            try {
                const state = await getTechnicalSessionState(sessionId);
                if (!state) return;
                setSecondsRemaining(state.secondsRemaining || 0);
                setTotalQuestions(state.totalQuestions || 0);
                setCompletedQuestions(state.completedQuestions || 0);
                setCurrentQuestion(state.currentQuestion || null);
                if (state.sessionEnded) {
                    const report = await endTechnicalSession(sessionId);
                    setFinalReport(report);
                }
            } catch {
                // best effort sync
            }
        }, 10000);

        return () => clearInterval(sync);
    }, [hasActiveSession, sessionId]);

    const formattedTime = useMemo(() => {
        const mins = String(Math.floor(secondsRemaining / 60)).padStart(2, "0");
        const secs = String(secondsRemaining % 60).padStart(2, "0");
        return `${mins}:${secs}`;
    }, [secondsRemaining]);

    const startSession = async () => {
        setLoading(true);
        setError("");
        setFinalReport(null);
        setTurnFeedback([]);

        try {
            const session = await startTechnicalSession({ durationMinutes, questionCount });
            setSessionId(session.sessionId);
            setSecondsRemaining(session.secondsRemaining || 0);
            setTotalQuestions(session.totalQuestions || 0);
            setCompletedQuestions(session.completedQuestions || 0);
            setCurrentQuestion(session.currentQuestion || null);
            setCode("");
            setTestSummary("");
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to start technical session.");
        } finally {
            setLoading(false);
        }
    };

    const submitCurrent = async () => {
        if (!hasActiveSession || !currentQuestion) {
            return;
        }
        if (!code.trim()) {
            setError("Please enter your code before submitting.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const turn = await submitTechnicalSolution(sessionId, {
                code,
                language,
                testSummary,
            });

            setSecondsRemaining(turn.secondsRemaining || 0);
            setCompletedQuestions(turn.completedQuestions || 0);
            setTotalQuestions(turn.totalQuestions || 0);
            setCurrentQuestion(turn.currentQuestion || null);
            setTurnFeedback((prev) => [
                ...prev,
                {
                    score: turn.lastScore,
                    feedback: turn.feedback,
                    questionTitle: currentQuestion.title,
                },
            ]);

            setCode("");
            setTestSummary("");

            if (turn.sessionEnded) {
                setFinalReport(turn.finalReport);
            }
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to submit technical solution.");
        } finally {
            setLoading(false);
        }
    };

    const closeSession = async () => {
        if (!sessionId) return;
        setLoading(true);
        setError("");
        try {
            const report = await endTechnicalSession(sessionId);
            setFinalReport(report);
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to end technical session.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-8">
            <div className="mx-auto max-w-6xl space-y-5">
                <header className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">Technical Session</h1>
                        <p className="text-sm text-slate-400">Timed coding interview flow with per-question feedback.</p>
                    </div>
                    <button
                        onClick={() => navigate("/")}
                        className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-sm"
                    >
                        Back to Home
                    </button>
                </header>

                {!sessionId && (
                    <section className="glass-card p-5 space-y-4">
                        <h2 className="section-title">Start New Session</h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            <label className="flex flex-col gap-1 text-sm">
                                Duration (minutes)
                                <input
                                    type="number"
                                    min={5}
                                    max={120}
                                    value={durationMinutes}
                                    onChange={(e) => setDurationMinutes(Number(e.target.value || 0))}
                                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                                Questions
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={questionCount}
                                    onChange={(e) => setQuestionCount(Number(e.target.value || 0))}
                                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                                />
                            </label>
                            <div className="flex items-end">
                                <button
                                    onClick={startSession}
                                    disabled={loading}
                                    className="btn-primary px-5 py-2.5 text-sm disabled:opacity-60"
                                >
                                    {loading ? "Starting..." : "Start Technical Session"}
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {sessionId && (
                    <>
                        <section className="grid md:grid-cols-4 gap-3">
                            <div className="stat-card"><span>Session ID</span><strong className="truncate">{sessionId}</strong></div>
                            <div className="stat-card"><span>Time Left</span><strong>{formattedTime}</strong></div>
                            <div className="stat-card"><span>Progress</span><strong>{completedQuestions}/{totalQuestions}</strong></div>
                            <div className="stat-card"><span>Status</span><strong>{finalReport ? "Completed" : "Active"}</strong></div>
                        </section>

                        {!finalReport && currentQuestion && (
                            <section className="glass-card p-5 space-y-4">
                                <div>
                                    <p className="text-sm text-indigo-300 mb-1">Question #{currentQuestion.number}</p>
                                    <h2 className="text-xl font-semibold">{currentQuestion.title}</h2>
                                </div>
                                <p className="text-sm text-slate-200 whitespace-pre-wrap leading-6">{currentQuestion.text}</p>

                                {currentQuestion.constraints?.length > 0 && (
                                    <ul className="text-sm text-slate-300 list-disc pl-5 space-y-1">
                                        {currentQuestion.constraints.map((constraint) => (
                                            <li key={constraint}>{constraint}</li>
                                        ))}
                                    </ul>
                                )}

                                <div className="grid md:grid-cols-2 gap-4">
                                    <label className="flex flex-col gap-1 text-sm">
                                        Language
                                        <select
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                                        >
                                            {LANGUAGE_OPTIONS.map((option) => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm">
                                        Test Summary (optional)
                                        <input
                                            value={testSummary}
                                            onChange={(e) => setTestSummary(e.target.value)}
                                            placeholder="e.g. 4/6 test cases passed | edge case fails"
                                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                                        />
                                    </label>
                                </div>

                                <label className="flex flex-col gap-1 text-sm">
                                    Your Code
                                    <textarea
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        rows={14}
                                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-xs"
                                        placeholder="Paste or write your solution here"
                                    />
                                </label>

                                <div className="flex gap-3">
                                    <button
                                        onClick={submitCurrent}
                                        disabled={loading}
                                        className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
                                    >
                                        {loading ? "Submitting..." : "Submit Solution"}
                                    </button>
                                    <button
                                        onClick={closeSession}
                                        disabled={loading}
                                        className="btn-ghost px-4 py-2 text-sm disabled:opacity-60"
                                    >
                                        End Session
                                    </button>
                                </div>
                            </section>
                        )}

                        {turnFeedback.length > 0 && (
                            <section className="glass-card p-5">
                                <h2 className="section-title mb-3">Turn Feedback</h2>
                                <div className="space-y-3">
                                    {turnFeedback.map((item, idx) => (
                                        <div key={`${item.questionTitle}-${idx}`} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                                            <p className="text-sm font-semibold">{item.questionTitle}</p>
                                            <p className="text-xs text-emerald-300 mt-1">Score: {item.score}/10</p>
                                            <p className="text-sm text-slate-300 mt-2 whitespace-pre-wrap">{item.feedback}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {finalReport && (
                            <section className="glass-card p-5 space-y-3">
                                <h2 className="section-title">Final Technical Report</h2>
                                <p className="text-sm text-slate-200">{finalReport.summary}</p>
                                <div className="grid md:grid-cols-3 gap-3">
                                    <div className="stat-card"><span>Overall Score</span><strong>{finalReport.overallScore}/10</strong></div>
                                    <div className="stat-card"><span>Solved</span><strong>{finalReport.solvedQuestions}</strong></div>
                                    <div className="stat-card"><span>Total</span><strong>{finalReport.totalQuestions}</strong></div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-3">
                                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                                        <p className="text-sm font-semibold mb-2">Strengths</p>
                                        <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
                                            {(finalReport.strengths || []).map((item) => <li key={item}>{item}</li>)}
                                        </ul>
                                    </div>
                                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                                        <p className="text-sm font-semibold mb-2">Improvements</p>
                                        <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
                                            {(finalReport.improvements || []).map((item) => <li key={item}>{item}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            </section>
                        )}
                    </>
                )}

                {error && <p className="text-sm text-red-300">{error}</p>}
            </div>
        </div>
    );
}
