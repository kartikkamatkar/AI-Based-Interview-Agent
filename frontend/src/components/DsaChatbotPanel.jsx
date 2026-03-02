import { useState } from "react";

export default function DsaChatbotPanel({ chatMessages = [], isChatLoading = false, onChatSend }) {
    const [chatInput, setChatInput] = useState("");

    const defaultPromptByAction = {
        HINT: "Give me a focused hint for this problem.",
        DEBUG: "Find the likely error in my current code.",
        OPTIMAL: "Give me the optimal approach and complexity.",
        GENERAL: "",
    };

    const handleSend = async (action = "GENERAL") => {
        if (!onChatSend) return;
        const typed = chatInput.trim();
        const message = typed || defaultPromptByAction[action] || defaultPromptByAction.GENERAL;
        if (!message) return;
        if (typed) {
            setChatInput("");
        }
        await onChatSend(message, action);
    };

    return (
        <div className="h-full flex flex-col border-l border-[#313244] bg-[#11111b]">
            <div className="px-3 py-2 border-b border-[#313244] flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[#89b4fa] uppercase tracking-wider">AI Chatbot</h4>
                {isChatLoading && <span className="text-[11px] text-[#f9e2af]">thinking...</span>}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {(chatMessages || []).slice(-14).map((item, index) => (
                    <div
                        key={`${item.role}-${index}`}
                        className={`text-xs font-mono whitespace-pre-wrap break-words rounded-lg p-2 border ${
                            item.role === "user"
                                ? "text-[#a6e3a1] bg-[#1e1e2e] border-[#3a4a3a]"
                                : "text-[#cdd6f4] bg-[#1e1e2e] border-[#313244]"
                        }`}
                    >
                        <span className="font-semibold mr-1">{item.role === "user" ? "You:" : "AI:"}</span>
                        {item.text}
                    </div>
                ))}
                {(!chatMessages || chatMessages.length === 0) && (
                    <p className="text-xs text-[#6c7086]">Ask about approach, complexity, dry run, edge cases...</p>
                )}
            </div>

            <div className="p-3 border-t border-[#313244]">
                <div className="flex gap-2 mb-2">
                    <button
                        onClick={() => handleSend("HINT")}
                        disabled={isChatLoading}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#313244] text-[#f9e2af] hover:bg-[#45475a] disabled:opacity-50"
                    >
                        Hint
                    </button>
                    <button
                        onClick={() => handleSend("DEBUG")}
                        disabled={isChatLoading}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#313244] text-[#fab387] hover:bg-[#45475a] disabled:opacity-50"
                    >
                        Find Error
                    </button>
                    <button
                        onClick={() => handleSend("OPTIMAL")}
                        disabled={isChatLoading}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#313244] text-[#89b4fa] hover:bg-[#45475a] disabled:opacity-50"
                    >
                        Optimal
                    </button>
                </div>
                <div className="flex gap-2">
                    <input
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                handleSend("GENERAL");
                            }
                        }}
                        placeholder="Ask AI about this DSA question..."
                        className="flex-1 rounded-lg border border-[#313244] bg-[#1e1e2e] text-[#cdd6f4] px-3 py-2 text-xs outline-none focus:border-[#89b4fa]"
                    />
                    <button
                        onClick={() => handleSend("GENERAL")}
                        disabled={!chatInput.trim() || isChatLoading}
                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#313244] text-[#cdd6f4] hover:bg-[#45475a] disabled:opacity-50"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}
