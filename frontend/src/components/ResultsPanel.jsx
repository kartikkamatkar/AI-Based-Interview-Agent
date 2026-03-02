import { useState } from "react";

export default function ResultsPanel({
    results,
    isSubmit,
    isLoading,
    hint,
    analysisFeedback,
    isFeedbackLoading,
}) {
    const [activeTab, setActiveTab] = useState(0);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-[#181825] border-t border-[#313244]">
                <div className="flex flex-col items-center gap-3 text-[#6c7086]">
                    <svg className="w-6 h-6 animate-spin text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="text-xs font-mono">Executing test cases...</span>
                </div>
            </div>
        );
    }

    if (!results || results.length === 0) {
        return (
            <div className="h-full flex items-center justify-center bg-[#181825] border-t border-[#313244]">
                <div className="text-center text-[#6c7086] text-xs font-mono">
                    <div className="text-3xl mb-2">⚡</div>
                    <p>Click <span className="text-emerald-400">Run</span> to test your code against sample cases.</p>
                    <p className="mt-1">Click <span className="text-emerald-400 font-semibold">Submit</span> to run all test cases.</p>
                    {hint && (
                        <p className="mt-3 text-yellow-300 max-w-xl whitespace-pre-wrap">💡 Hint: {hint}</p>
                    )}
                </div>
            </div>
        );
    }

    const passedCount = results.filter((r) => r.passed).length;
    const allPassed = passedCount === results.length;

    return (
        <div className="h-full flex flex-col bg-[#181825] border-t border-[#313244]">
            {/* Header + verdict */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#313244] flex-shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#6c7086] uppercase tracking-wider">
                        {isSubmit ? "Submission Result" : "Test Results"}
                    </span>
                    {isSubmit && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${allPassed
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}>
                            {allPassed ? "✓ Accepted" : "✗ Wrong Answer"}
                        </span>
                    )}
                </div>
                <span className={`text-xs font-mono font-semibold ${allPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {passedCount} / {results.length} passed
                </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-2 flex-shrink-0">
                {results.map((r, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveTab(i)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-mono transition-all
              ${activeTab === i
                                ? "bg-[#1e1e2e] text-[#cdd6f4] border border-b-0 border-[#313244]"
                                : "text-[#6c7086] hover:text-[#cdd6f4]"
                            }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${r.passed ? "bg-emerald-400" : "bg-red-400"}`} />
                        Case {i + 1}
                    </button>
                ))}
            </div>

            {/* Active test case detail */}
            {results[activeTab] && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#1e1e2e] rounded-b-lg rounded-tr-lg mx-4 mb-4 border border-[#313244]">
                    <ResultRow label="Input" value={results[activeTab].input} color="text-[#89b4fa]" />
                    <ResultRow label="Expected Output" value={results[activeTab].expected} color="text-[#a6e3a1]" />
                    <ResultRow label="Your Output" value={results[activeTab].actual || "(empty)"} color={results[activeTab].passed ? "text-[#a6e3a1]" : "text-[#f38ba8]"} />

                    {results[activeTab].stderr && (
                        <ResultRow label="Stderr" value={results[activeTab].stderr} color="text-[#fab387]" />
                    )}
                    {results[activeTab].compile_output && (
                        <ResultRow label="Compile Error" value={results[activeTab].compile_output} color="text-[#f38ba8]" />
                    )}

                    <div className="flex items-center gap-4 pt-1 border-t border-[#313244]">
                        <VerdictBadge passed={results[activeTab].passed} />
                        {results[activeTab].time && (
                            <span className="text-[#6c7086] text-xs font-mono">⏱ {results[activeTab].time}s</span>
                        )}
                        {results[activeTab].memory && (
                            <span className="text-[#6c7086] text-xs font-mono">
                                💾 {(results[activeTab].memory / 1024).toFixed(1)} MB
                            </span>
                        )}
                        {results[activeTab].mocked && (
                            <span className="text-[#6c7086] text-xs font-mono italic">(demo mode)</span>
                        )}
                    </div>

                    {hint && (
                        <div className="pt-3 border-t border-[#313244]">
                            <div className="text-yellow-300 text-xs font-semibold uppercase tracking-wider mb-1">Hint</div>
                            <pre className="text-yellow-200 bg-[#11111b] rounded-lg px-3 py-2 text-xs font-mono whitespace-pre-wrap break-words">{hint}</pre>
                        </div>
                    )}

                    {(isFeedbackLoading || analysisFeedback) && (
                        <div className="pt-3 border-t border-[#313244]">
                            <div className="text-[#89b4fa] text-xs font-semibold uppercase tracking-wider mb-1">Logic & Optimization Feedback</div>
                            <pre className="text-[#cdd6f4] bg-[#11111b] rounded-lg px-3 py-2 text-xs font-mono whitespace-pre-wrap break-words">
                                {isFeedbackLoading ? "Generating AI feedback..." : analysisFeedback}
                            </pre>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}

function ResultRow({ label, value, color }) {
    return (
        <div>
            <div className="text-[#6c7086] text-xs mb-1 font-semibold uppercase tracking-wider">{label}</div>
            <pre className={`${color} bg-[#11111b] rounded-lg px-3 py-2 text-xs font-mono whitespace-pre-wrap break-all`}>
                {value}
            </pre>
        </div>
    );
}

function VerdictBadge({ passed }) {
    return passed ? (
        <span className="flex items-center gap-1 text-emerald-400 font-semibold text-xs">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Accepted
        </span>
    ) : (
        <span className="flex items-center gap-1 text-red-400 font-semibold text-xs">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Wrong Answer
        </span>
    );
}
