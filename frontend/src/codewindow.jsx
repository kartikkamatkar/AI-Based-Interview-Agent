import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProblemPanel from "./components/ProblemPanel";
import EditorPanel from "./components/EditorPanel";
import ResultsPanel from "./components/ResultsPanel";
import DsaChatbotPanel from "./components/DsaChatbotPanel";
import { problems } from "./data/problems";
import { runAllCases } from "./services/judge0";
import { LANGUAGE_IDS } from "./data/problems";
import { fetchNextQuestion } from "./services/questionsApi";
import { analyzeSolution, askDsaChatbot } from "./services/aiApi";

const PANEL_MIN = 25; // % minimum width for resizable panels

const MINIMAL_STARTER = {
    javascript: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim();\n\nfunction solve(input) {\n    return '';\n}\n\nconsole.log(solve(input));",
    python: "import sys\n\ninput_data = sys.stdin.read().strip()\n\ndef solve(input_data):\n    return ''\n\nprint(solve(input_data))",
    cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nstring solve(const string& input_data) {\n    return \"\";\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    string input_data((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());\n    cout << solve(input_data);\n    return 0;\n}",
    java: "import java.io.*;\n\npublic class Main {\n    static String solve(String input) {\n        return \"\";\n    }\n\n    public static void main(String[] args) throws Exception {\n        String input = new String(System.in.readAllBytes()).trim();\n        System.out.print(solve(input));\n    }\n}",
    go: "package main\n\nimport (\n    \"fmt\"\n    \"io\"\n    \"os\"\n)\n\nfunc solve(input string) string {\n    return \"\"\n}\n\nfunc main() {\n    data, _ := io.ReadAll(os.Stdin)\n    fmt.Print(solve(string(data)))\n}",
};

export default function CodeWindow() {
    const { id } = useParams();
    const navigate = useNavigate();

    const problem = problems.find((p) => p.id === Number(id)) || problems[0];
    const [pdfQuestion, setPdfQuestion] = useState(null);

    const [language, setLanguage] = useState("javascript");
    // Per-language code stores
    const [codeMap, setCodeMap] = useState({ ...MINIMAL_STARTER });

    const [results, setResults] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmit, setIsSubmit] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isHintLoading, setIsHintLoading] = useState(false);
    const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
    const [aiHint, setAiHint] = useState("");
    const [aiFeedback, setAiFeedback] = useState("");
    const [chatMessages, setChatMessages] = useState([
        { role: "assistant", text: "Hi! I am your DSA chatbot. Ask about approach, edge cases, bugs, or optimization. Use Hint / Find Error / Optimal for focused AI feedback." },
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isRoundLocked, setIsRoundLocked] = useState(false);

    const speakAiMessage = (text) => {
        if (!text || !("speechSynthesis" in window)) {
            return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 1;
        utterance.pitch = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    };

    // Resizable panel state (percentage)
    const [leftWidth, setLeftWidth] = useState(40);
    const [editorHeight, setEditorHeight] = useState(62); // % of right panel

    const loadNextPdfQuestion = async () => {
        const lastQuestionNumber = Number(localStorage.getItem("lastPdfQuestionNumber") || 0);
        const data = await fetchNextQuestion(lastQuestionNumber || undefined);
        if (data) {
            setPdfQuestion(data);
            localStorage.setItem("lastPdfQuestionNumber", String(data.number));
        }
    };

    useEffect(() => {
        let isMounted = true;

        setCodeMap({ ...MINIMAL_STARTER });
        setResults([]);
        setAiHint("");
        setAiFeedback("");
        setChatMessages([
            { role: "assistant", text: "New question loaded. Ask me for hints, dry run, complexity, or bug-fix guidance. You can also use Hint / Find Error / Optimal actions." },
        ]);

        const loadPdfQuestion = async () => {
            try {
                const lastQuestionNumber = Number(localStorage.getItem("lastPdfQuestionNumber") || 0);
                const data = await fetchNextQuestion(lastQuestionNumber || undefined);
                if (isMounted && data) {
                    setPdfQuestion(data);
                    localStorage.setItem("lastPdfQuestionNumber", String(data.number));
                }
            } catch {
                if (isMounted) {
                    setPdfQuestion(null);
                }
            }
        };

        loadPdfQuestion();

        return () => {
            isMounted = false;
        };
    }, [id]);

    useEffect(() => {
        const blockEvent = (event) => {
            event.preventDefault();
        };

        const onKeyDown = (event) => {
            const key = event.key.toLowerCase();
            const isClipboardShortcut =
                (event.ctrlKey || event.metaKey) && ["c", "v", "x", "a", "insert"].includes(key);
            const isShiftInsert = event.shiftKey && key === "insert";

            if (isClipboardShortcut || isShiftInsert) {
                event.preventDefault();
            }
        };

        const lockRound = () => {
            setIsRoundLocked(true);
        };

        document.addEventListener("copy", blockEvent);
        document.addEventListener("paste", blockEvent);
        document.addEventListener("cut", blockEvent);
        document.addEventListener("contextmenu", blockEvent);
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("blur", lockRound);

        const onVisibilityChange = () => {
            if (document.visibilityState !== "visible") {
                setIsRoundLocked(true);
            }
        };
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            document.removeEventListener("copy", blockEvent);
            document.removeEventListener("paste", blockEvent);
            document.removeEventListener("cut", blockEvent);
            document.removeEventListener("contextmenu", blockEvent);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("blur", lockRound);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, []);

    const displayedProblem = pdfQuestion
        ? {
            ...problem,
              title: pdfQuestion.title || `PDF Question #${pdfQuestion.number}`,
            difficulty: "Mock",
            tags: ["PDF", "Shuffled"],
            description: pdfQuestion.text,
            examples: [],
              constraints: pdfQuestion.constraints || [],
        }
        : problem;

    const buildTestSummary = (items) => {
        if (!items || items.length === 0) return "No test execution yet";
        const passed = items.filter((r) => r.passed).length;
        const failedCase = items.find((r) => !r.passed);
        if (!failedCase) {
            return `${passed}/${items.length} test cases passed`;
        }

        const stderr = failedCase.stderr ? ` | Error: ${failedCase.stderr}` : "";
        return `${passed}/${items.length} test cases passed | First failing input: ${failedCase.input} | Expected: ${failedCase.expected} | Actual: ${failedCase.actual}${stderr}`;
    };

    const code = codeMap[language] || "";

    const handleCodeChange = useCallback(
        (val) => setCodeMap((prev) => ({ ...prev, [language]: val })),
        [language]
    );

    const handleLanguageChange = (lang) => {
        setLanguage(lang);
        setCodeMap((prev) => ({
            ...prev,
            [lang]: prev[lang] !== undefined ? prev[lang] : (MINIMAL_STARTER[lang] || ""),
        }));
    };

    const executeRun = async (submitMode = false) => {
        if (isRoundLocked) {
            return;
        }
        const cases = submitMode ? problem.testCases : problem.testCases.slice(0, 2);
        setIsLoading(true);
        setResults([]);
        setIsSubmit(submitMode);
        if (submitMode) setIsSubmitting(true);
        else setIsRunning(true);

        try {
            const res = await runAllCases(code, LANGUAGE_IDS[language], cases);
            setResults(res);

            if (submitMode) {
                setIsFeedbackLoading(true);
                const ai = await analyzeSolution({
                    question: displayedProblem.description,
                    code,
                    language,
                    testSummary: buildTestSummary(res),
                });
                setAiHint(ai.hint || "");
                setAiFeedback(ai.analysis || "");
            }
        } catch (err) {
            setResults([
                {
                    input: "",
                    expected: "",
                    actual: "",
                    passed: false,
                    stderr: err.message,
                    status: { id: 0, description: "Error" },
                },
            ]);
        } finally {
            setIsFeedbackLoading(false);
            setIsLoading(false);
            setIsRunning(false);
            setIsSubmitting(false);
        }
    };

    const handleHintRequest = async () => {
        if (isRoundLocked) {
            return;
        }
        setIsHintLoading(true);
        try {
            const ai = await analyzeSolution({
                question: displayedProblem.description,
                code,
                language,
                testSummary: buildTestSummary(results),
            });

            let optimalApproachText = "";
            try {
                const optimal = await askDsaChatbot({
                    question: displayedProblem.description,
                    code,
                    language,
                    testSummary: buildTestSummary(results),
                    userMessage: "Give optimized solution approach, complexity, and key implementation steps.",
                    action: "OPTIMAL",
                });
                optimalApproachText = optimal.optimalApproach?.trim() || "";
            } catch {
                optimalApproachText = "";
            }

            const finalHint = ai.hint || "Try breaking the problem into smaller checks.";
            const combinedFeedback = [ai.analysis, optimalApproachText].filter(Boolean).join("\n\n");

            setAiHint(finalHint);
            if (combinedFeedback) {
                setAiFeedback(combinedFeedback);
            }

            const voiceText = [
                `Hint: ${finalHint}`,
                optimalApproachText ? `Optimized solution: ${optimalApproachText}` : "",
            ].filter(Boolean).join(" ");
            speakAiMessage(voiceText);
        } finally {
            setIsHintLoading(false);
        }
    };

    const handleChatSend = async (userText, action = "GENERAL") => {
        if (isRoundLocked) {
            return "Round is locked. Please restart to continue using the chatbot.";
        }
        const trimmed = (userText || "").trim();
        const normalizedAction = (action || "GENERAL").toUpperCase();
        const fallbackMessageByAction = {
            HINT: "Give me a focused hint for this problem.",
            DEBUG: "Find the likely error in my current code.",
            OPTIMAL: "Give me the optimal approach and complexity.",
            GENERAL: "",
        };
        const effectiveMessage = trimmed || fallbackMessageByAction[normalizedAction] || "";

        if (!effectiveMessage) {
            return "Please type your question.";
        }

        setChatMessages((prev) => [...prev, { role: "user", text: effectiveMessage }]);
        setIsChatLoading(true);

        try {
            const ai = await askDsaChatbot({
                question: displayedProblem.description,
                code,
                language,
                testSummary: buildTestSummary(results),
                userMessage: effectiveMessage,
                action: normalizedAction,
            });

            const reply = ai.reply?.trim() || "Try a small dry-run first, then identify the algorithm pattern and failing step.";
            const richReplyParts = [reply];

            if (ai.hint?.trim()) {
                richReplyParts.push(`Hint: ${ai.hint.trim()}`);
                setAiHint(ai.hint.trim());
            }

            if (ai.errorFeedback?.trim()) {
                richReplyParts.push(`Error Focus: ${ai.errorFeedback.trim()}`);
            }

            if (ai.optimalApproach?.trim()) {
                richReplyParts.push(`Optimal Approach: ${ai.optimalApproach.trim()}`);
            }

            const mergedFeedback = [ai.errorFeedback, ai.optimalApproach].filter(Boolean).join("\n\n");
            if (mergedFeedback.trim()) {
                setAiFeedback(mergedFeedback);
            }

            setChatMessages((prev) => [...prev, { role: "assistant", text: richReplyParts.join("\n\n") }]);
            return reply;
        } catch {
            const fallback = "AI chatbot is temporarily unavailable. Please check backend health and API key configuration.";
            setChatMessages((prev) => [...prev, { role: "assistant", text: fallback }]);
            return fallback;
        } finally {
            setIsChatLoading(false);
        }
    };

    // Horizontal resizer drag
    const startHorizontalResize = (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startLeft = leftWidth;
        const onMove = (ev) => {
            const dx = ((ev.clientX - startX) / window.innerWidth) * 100;
            setLeftWidth(Math.min(65, Math.max(PANEL_MIN, startLeft + dx)));
        };
        const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    // Vertical resizer drag (right panel)
    const startVerticalResize = (e) => {
        e.preventDefault();
        const startY = e.clientY;
        const startH = editorHeight;
        const onMove = (ev) => {
            const dy = ((ev.clientY - startY) / window.innerHeight) * 100;
            setEditorHeight(Math.min(80, Math.max(30, startH + dy)));
        };
        const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    return (
        <div className="h-screen flex flex-col bg-[#11111b] overflow-hidden" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
            {/* Top navbar */}
            <TopBar problem={problem} problems={problems} navigate={navigate} onNextQuestion={loadNextPdfQuestion} />

            {/* Main split layout */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* LEFT — Problem Panel */}
                <div style={{ width: `${leftWidth}%` }} className="min-h-0 overflow-hidden flex-shrink-0">
                    <ProblemPanel problem={displayedProblem} />
                </div>

                {/* Horizontal drag handle */}
                <div
                    onMouseDown={startHorizontalResize}
                    className="w-1 bg-[#313244] hover:bg-[#89b4fa] cursor-col-resize flex-shrink-0 transition-colors"
                />

                {/* RIGHT — Editor + Results */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0">
                    {/* Editor */}
                    <div style={{ height: `${editorHeight}%` }} className="min-h-0 overflow-hidden flex-shrink-0">
                        <EditorPanel
                            language={language}
                            onLanguageChange={handleLanguageChange}
                            code={code}
                            onCodeChange={handleCodeChange}
                            onRun={() => executeRun(false)}
                            onSubmit={() => executeRun(true)}
                            onHint={handleHintRequest}
                            isRunning={isRunning}
                            isSubmitting={isSubmitting}
                            isHintLoading={isHintLoading}
                            isRoundLocked={isRoundLocked}
                        />
                    </div>

                    {/* Vertical drag handle */}
                    <div
                        onMouseDown={startVerticalResize}
                        className="h-1 bg-[#313244] hover:bg-[#89b4fa] cursor-row-resize flex-shrink-0 transition-colors"
                    />

                    {/* Results + Right-side Chatbot */}
                    <div className="flex-1 min-h-0 overflow-hidden flex">
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <ResultsPanel
                                results={results}
                                isSubmit={isSubmit}
                                isLoading={isLoading}
                                hint={aiHint}
                                analysisFeedback={aiFeedback}
                                isFeedbackLoading={isFeedbackLoading}
                            />
                        </div>

                        <div className="w-[34%] min-w-[290px] max-w-[420px] overflow-hidden">
                            <DsaChatbotPanel
                                chatMessages={chatMessages}
                                isChatLoading={isChatLoading}
                                onChatSend={handleChatSend}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {isRoundLocked && (
                <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center">
                    <div className="bg-[#1e1e2e] border border-red-500/50 rounded-xl p-6 text-center max-w-xl mx-4">
                        <h2 className="text-red-400 text-lg font-bold mb-2">Round Locked</h2>
                        <p className="text-[#cdd6f4] text-sm leading-6">
                            Tab/App switch detected. Copy, paste, cut, right click, and tab switching are blocked in DSA/Interview round.
                        </p>
                        <p className="text-[#f38ba8] text-xs mt-3">Please restart the round to continue.</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function TopBar({ problem, problems, navigate, onNextQuestion }) {
    return (
        <nav className="flex items-center justify-between px-4 py-2 bg-[#181825] border-b border-[#313244] flex-shrink-0">
            {/* Logo + problem selector */}
            <div className="flex items-center gap-4">
                <span
                    className="text-emerald-400 font-extrabold text-sm tracking-widest cursor-pointer hover:text-emerald-300 transition-colors"
                    onClick={() => navigate("/")}
                >
                    ENIGMA<span className="text-[#cdd6f4]">AI</span>
                </span>
                <div className="h-4 w-px bg-[#313244]" />
                {/* Problem navigator */}
                <div className="flex items-center gap-1">
                    {problems.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => navigate(`/problem/${p.id}`)}
                            className={`px-3 py-1 rounded-md text-xs font-mono transition-all
                ${p.id === problem.id
                                    ? "bg-[#313244] text-[#cdd6f4]"
                                    : "text-[#6c7086] hover:text-[#cdd6f4] hover:bg-[#313244]/50"
                                }`}
                        >
                            Question {p.id}
                        </button>
                    ))}
                </div>
            </div>

            {/* Status area */}
            <div className="flex items-center gap-3 text-xs text-[#6c7086] font-mono">
                <button
                    onClick={onNextQuestion}
                    className="px-2 py-1 rounded border border-[#313244] text-[#cdd6f4] hover:bg-[#313244]"
                >
                    Next PDF Question
                </button>
                <span>Interview Mode</span>
                <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                </span>
            </div>
        </nav>
    );
}