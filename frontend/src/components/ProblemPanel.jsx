export default function ProblemPanel({ problem }) {
    if (!problem) return null;

    const difficultyColor = {
        Easy: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
        Medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
        Hard: "text-red-400 bg-red-400/10 border-red-400/30",
    }[problem.difficulty];

    return (
        <div className="h-full flex flex-col bg-[#1e1e2e] overflow-hidden">
            {/* Problem header */}
            <div className="px-6 py-4 border-b border-[#313244] flex-shrink-0">
                <div className="flex items-center gap-3 mb-3">
                    <span className="text-[#6c7086] text-sm font-mono">#{problem.id}</span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${difficultyColor}`}>
                        {problem.difficulty}
                    </span>
                </div>
                <h1 className="text-[#cdd6f4] text-xl font-bold tracking-tight">{problem.title}</h1>
                <div className="flex flex-wrap gap-2 mt-3">
                    {problem.tags.map((tag) => (
                        <span
                            key={tag}
                            className="text-xs px-2.5 py-0.5 rounded-md bg-[#313244] text-[#89b4fa] font-medium"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-thin">
                {/* Description */}
                <div className="text-[#cdd6f4] text-sm leading-7 whitespace-pre-wrap">
                    {problem.description.split(/`([^`]+)`/g).map((part, i) =>
                        i % 2 === 1 ? (
                            <code key={i} className="bg-[#313244] text-[#f38ba8] px-1.5 py-0.5 rounded text-xs font-mono">
                                {part}
                            </code>
                        ) : (
                            <span key={i} dangerouslySetInnerHTML={{ __html: part.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                        )
                    )}
                </div>

                {/* Examples */}
                {problem.examples.map((ex, idx) => (
                    <div key={idx} className="rounded-xl overflow-hidden border border-[#313244]">
                        <div className="bg-[#181825] px-4 py-2 text-xs font-semibold text-[#6c7086] uppercase tracking-wider">
                            Example {idx + 1}
                        </div>
                        <div className="p-4 space-y-2 font-mono text-xs bg-[#11111b]">
                            <div>
                                <span className="text-[#6c7086]">Input: </span>
                                <span className="text-[#a6e3a1]">{ex.input}</span>
                            </div>
                            <div>
                                <span className="text-[#6c7086]">Output: </span>
                                <span className="text-[#89dceb]">{ex.output}</span>
                            </div>
                            {ex.explanation && (
                                <div className="pt-1 text-[#6c7086] italic">{ex.explanation}</div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Constraints */}
                <div>
                    <h3 className="text-[#cdd6f4] text-sm font-semibold mb-3">Constraints</h3>
                    <ul className="space-y-1.5">
                        {problem.constraints.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-[#a6adc8]">
                                <span className="text-[#89b4fa] mt-1 flex-shrink-0">▸</span>
                                <code className="font-mono text-xs">{c}</code>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
