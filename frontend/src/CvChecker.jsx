import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeCvResume } from "./services/aiApi";

const ROLE_PRESETS = {
  "Auto-detect": "General software engineer role with backend and problem-solving focus.",
  "Frontend Developer": "React/JavaScript frontend developer role with UI performance and accessibility focus.",
  "Backend Developer": "Java/Spring Boot backend developer role with API design and database optimization focus.",
  "Full Stack Developer": "Full stack developer role covering React frontend and Java/Spring backend ownership.",
  "Data Analyst": "Data analyst role with SQL, reporting, dashboards, and business insight communication.",
};

export default function CvChecker() {
  const navigate = useNavigate();

  const [resumeFile, setResumeFile] = useState(null);
  const [rolePreset, setRolePreset] = useState("Auto-detect");
  const [customJd, setCustomJd] = useState("");

  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("breakdown");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const effectiveJd = useMemo(() => {
    if (customJd.trim()) return customJd.trim();
    return ROLE_PRESETS[rolePreset] || ROLE_PRESETS["Auto-detect"];
  }, [customJd, rolePreset]);

  const runAnalyze = async () => {
    if (!resumeFile) {
      setError("Please upload a resume file first.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await analyzeCvResume({
        resumeFile,
        jobDescription: effectiveJd,
      });
      setResult(data || null);
      setActiveTab("breakdown");
    } catch (err) {
      setError(err?.response?.data?.message || "CV analysis failed. Please check backend and key setup.");
    } finally {
      setLoading(false);
    }
  };

  const score = Number(result?.atsScore || 0);
  const scoreDeg = Math.max(0, Math.min(360, (score / 100) * 360));

  return (
    <div className="min-h-screen bg-[#040816] text-[#cdd6f4] flex">
      <aside className="w-[250px] border-r border-[#1f2a44] p-5 hidden lg:block">
        <p className="text-[11px] tracking-[0.18em] text-[#7aa2ff] uppercase mb-3">Upload Resume</p>
        <div className="rounded-xl border border-[#243153] bg-[#0a1225] p-3">
          <p className="text-xs text-[#b7c5f7] mb-2">PDF or DOCX</p>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
            className="text-xs w-full"
          />
          {resumeFile && <p className="text-[11px] mt-2 text-[#7fe3ce] truncate">{resumeFile.name}</p>}
        </div>

        <div className="h-px bg-[#253152] my-6" />

        <p className="text-sm mb-2">Score against role</p>
        <select
          value={rolePreset}
          onChange={(event) => setRolePreset(event.target.value)}
          className="w-full rounded-lg border border-[#243153] bg-[#0a1225] px-3 py-2 text-sm"
        >
          {Object.keys(ROLE_PRESETS).map((label) => (
            <option key={label} value={label}>{label}</option>
          ))}
        </select>

        <textarea
          value={customJd}
          onChange={(event) => setCustomJd(event.target.value)}
          rows={6}
          placeholder="Optional custom job description"
          className="w-full mt-3 rounded-lg border border-[#243153] bg-[#0a1225] px-3 py-2 text-xs"
        />

        <button
          onClick={runAnalyze}
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-[#2a8cff] text-white py-2 text-sm font-semibold disabled:opacity-60"
        >
          {loading ? "Analyzing..." : "Analyze Resume"}
        </button>
      </aside>

      <main className="flex-1 p-6 md:p-10 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-sm border border-[#243153] rounded-lg px-3 py-1.5 hover:bg-[#0a1225]">
            Back
          </button>
        </div>

        <section className="rounded-2xl border border-[#1d2950] bg-gradient-to-r from-[#111f45] to-[#13203a] p-8">
          <h1 className="text-5xl font-semibold text-[#79e7cf]">Resume Analyzer</h1>
          <p className="mt-4 text-[#98aacd]">AI-powered resume parsing · Skill extraction · Role fit prediction</p>
        </section>

        {!result && (
          <section className="grid md:grid-cols-3 gap-3">
            <StepCard title="01 — Upload" text="Drop your PDF or DOCX resume to get started." />
            <StepCard title="02 — Analyze" text="NLP extracts skills, projects, level and role fit automatically." />
            <StepCard title="03 — Improve" text="Get score, structured output, and actionable suggestions." />
          </section>
        )}

        {result && (
          <>
            <section className="grid lg:grid-cols-[280px_1fr] gap-5">
              <div className="rounded-xl border border-[#243153] bg-[#0a1225] p-5 flex flex-col items-center justify-center">
                <div
                  className="w-28 h-28 rounded-full grid place-items-center"
                  style={{ background: `conic-gradient(#ff6a72 ${scoreDeg}deg, #1d2945 ${scoreDeg}deg 360deg)` }}
                >
                  <div className="w-20 h-20 rounded-full bg-[#0a1225] grid place-items-center">
                    <span className="text-4xl font-semibold text-[#ff7a80]">{score}</span>
                  </div>
                </div>
                <p className="text-xs tracking-widest mt-4 text-[#8397c1] uppercase">Resume Score</p>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <StatCard label="Experience Level" value={result.resumeLevel || "-"} />
                <StatCard label="Role Fit" value={result.projectLevel || "-"} />
                <StatCard label="Skills Found" value={String(result.skills?.length || 0)} />
                <StatCard label="Missing Keywords" value={String(result.missingKeywords?.length || 0)} />
              </div>
            </section>

            <section>
              <div className="flex flex-wrap gap-5 border-b border-[#243153] pb-2 text-sm">
                <TabBtn id="breakdown" activeTab={activeTab} onClick={setActiveTab} label="📊 Score Breakdown" />
                <TabBtn id="skills" activeTab={activeTab} onClick={setActiveTab} label="🛠 Skills & Projects" />
                <TabBtn id="json" activeTab={activeTab} onClick={setActiveTab} label="📄 JSON Output" />
                <TabBtn id="suggestions" activeTab={activeTab} onClick={setActiveTab} label="💡 Suggestions" />
              </div>

              {activeTab === "breakdown" && (
                <div className="mt-4 rounded-xl border border-[#243153] bg-[#0a1225] p-4 space-y-4">
                  <Bar label="ATS Score" value={score} />
                  <Bar label="Keyword Match" value={Number(result.keywordMatchScore || 0)} />
                  <Bar label="Skills Coverage" value={Math.min(100, (result.skills?.length || 0) * 8)} />
                  <Bar label="Projects Coverage" value={Math.min(100, (result.projects?.length || 0) * 20)} />
                </div>
              )}

              {activeTab === "skills" && (
                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <ListCard title="Skills" items={result.skills} empty="No skills extracted" />
                  <ListCard title="Projects" items={result.projects} empty="No projects detected" />
                  <ListCard title="Tools" items={result.tools} empty="No tools extracted" />
                  <ListCard title="Missing Keywords" items={result.missingKeywords} empty="No missing keywords" />
                </div>
              )}

              {activeTab === "json" && (
                <pre className="mt-4 rounded-xl border border-[#243153] bg-[#0a1225] p-4 text-xs overflow-auto max-h-[420px]">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}

              {activeTab === "suggestions" && (
                <div className="mt-4 rounded-xl border border-[#243153] bg-[#0a1225] p-4">
                  <p className="text-[#7fe3ce] mb-3">{result.aiSummary || "AI summary unavailable"}</p>
                  <ul className="space-y-2 list-disc pl-5 text-sm text-[#c6d2ef]">
                    {(result.recommendations || []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}
            </section>
          </>
        )}

        {error && <p className="text-sm text-red-300">{error}</p>}
      </main>
    </div>
  );
}

function StepCard({ title, text }) {
  return (
    <div className="rounded-xl border border-[#243153] bg-[#0a1225] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-[#7fe3ce]">{title}</p>
      <p className="mt-3 text-sm text-[#b7c5e8]">{text}</p>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-[#243153] bg-[#0a1225] p-4">
      <p className="text-xs text-[#7f90b8]">{label}</p>
      <p className="mt-2 text-4 font-semibold text-[#d8e3ff]">{value}</p>
    </div>
  );
}

function TabBtn({ id, activeTab, onClick, label }) {
  const active = activeTab === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`pb-2 border-b-2 ${active ? "border-[#ff5f69] text-[#ff747c]" : "border-transparent text-[#9cb0d8]"}`}
    >
      {label}
    </button>
  );
}

function Bar({ label, value }) {
  const bounded = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-[#7fe3ce]">{bounded}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#1d2945] overflow-hidden">
        <div className="h-full bg-[#2a8cff]" style={{ width: `${bounded}%` }} />
      </div>
    </div>
  );
}

function ListCard({ title, items = [], empty }) {
  return (
    <div className="rounded-xl border border-[#243153] bg-[#0a1225] p-4">
      <p className="text-sm font-semibold mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-[#8da1c9]">{empty}</p>
      ) : (
        <ul className="list-disc pl-5 space-y-1 text-sm text-[#c7d3f2]">
          {items.map((item) => <li key={`${title}-${item}`}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}
