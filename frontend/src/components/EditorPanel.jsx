import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import LanguageDropdown from "./DropDown";
import { MONACO_LANGUAGE_MAP } from "../data/problems";

const LANGUAGE_SYNTAX_HINT = {
    javascript: "Syntax: function solve(input) { ... } | const arr = []; | for (let i = 0; i < n; i++)",
    python: "Syntax: def solve(input): ... | arr = [] | for i in range(n):",
    cpp: "Syntax: int main() { ... } | vector<int> arr; | for (int i = 0; i < n; i++)",
    java: "Syntax: public class Main { public static void main(String[] args) { ... } }",
    go: "Syntax: func main() { ... } | arr := []int{} | for i := 0; i < n; i++ { }",
};

export default function EditorPanel({
    language,
    onLanguageChange,
    code,
    onCodeChange,
    onRun,
    onSubmit,
    onHint,
    isRunning,
    isSubmitting,
    isHintLoading,
    isRoundLocked,
}) {
    const [showHintBulb, setShowHintBulb] = useState(false);
    const timerRef = useRef(null);
    const syntaxHint = LANGUAGE_SYNTAX_HINT[language] || "Syntax: Write your own full solution from scratch";

    const resetIdleTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        setShowHintBulb(false);
        timerRef.current = setTimeout(() => {
            setShowHintBulb(true);
        }, 60000);
    };

    useEffect(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            setShowHintBulb(true);
        }, 60000);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return (
        <div className="h-full flex flex-col bg-[#1e1e2e]">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#313244] flex-shrink-0">
                <LanguageDropdown value={language} onChange={onLanguageChange} />

                <div className="flex items-center gap-2">
                    {/* Run button */}
                    <button
                        onClick={onRun}
                        disabled={isRunning || isSubmitting || isRoundLocked}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold
              bg-[#313244] text-[#cdd6f4] hover:bg-[#45475a] border border-[#45475a]
              disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        {isRunning ? (
                            <>
                                <Spinner /> Running...
                            </>
                        ) : (
                            <>
                                <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
                                </svg>
                                Run
                            </>
                        )}
                    </button>

                    {/* Submit button */}
                    <button
                        onClick={onSubmit}
                        disabled={isRunning || isSubmitting || isRoundLocked}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold
              bg-emerald-500 text-white hover:bg-emerald-400
              disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        {isSubmitting ? (
                            <>
                                <Spinner white /> Submitting...
                            </>
                        ) : (
                            "Submit"
                        )}
                    </button>
                </div>
            </div>

            <div className="px-4 py-1.5 text-[11px] text-[#a6adc8] border-b border-[#313244] bg-[#181825] font-mono truncate" title={syntaxHint}>
                {syntaxHint}
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 min-h-0 relative">
                {showHintBulb && (
                    <button
                        onClick={() => {
                            onHint?.();
                            setShowHintBulb(false);
                            resetIdleTimer();
                        }}
                        disabled={isHintLoading}
                        className="absolute right-4 top-4 z-10 w-9 h-9 rounded-full bg-yellow-400/90 hover:bg-yellow-300 text-[#1e1e2e] shadow-lg flex items-center justify-center disabled:opacity-50"
                        title="Need a hint?"
                    >
                        💡
                    </button>
                )}
                <Editor
                    height="100%"
                    language={MONACO_LANGUAGE_MAP[language]}
                    value={code}
                    onChange={(val) => onCodeChange(val || "")}
                    onMount={(editor) => {
                        resetIdleTimer();
                        editor.onDidChangeCursorPosition(() => {
                            resetIdleTimer();
                        });
                    }}
                    theme="vs-dark"
                    options={{
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                        fontLigatures: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: "on",
                        renderLineHighlight: "line",
                        cursorBlinking: "smooth",
                        smoothScrolling: true,
                        tabSize: 4,
                        wordWrap: "on",
                        readOnly: !!isRoundLocked,
                        contextmenu: false,
                        padding: { top: 16, bottom: 16 },
                        scrollbar: {
                            vertical: "auto",
                            horizontal: "auto",
                            verticalScrollbarSize: 6,
                            horizontalScrollbarSize: 6,
                        },
                    }}
                />
            </div>
        </div>
    );
}

function Spinner({ white }) {
    return (
        <svg
            className={`w-3 h-3 animate-spin ${white ? "text-white" : "text-emerald-400"}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
    );
}
