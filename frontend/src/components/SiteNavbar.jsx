import { useNavigate } from "react-router-dom";

export default function SiteNavbar({ active = "home" }) {
  const navigate = useNavigate();
  const openCvChecker = () => window.location.assign("https://cv-reader-6m3ucrqgl6amka54uxqmnz.streamlit.app/");

  const navClass = (name) =>
    `px-3 py-2 rounded-lg text-sm transition-all ${
      active === name
        ? "bg-slate-800 text-white"
        : "text-slate-300 hover:text-white hover:bg-slate-800/70"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <button onClick={() => navigate("/")} className="text-lg font-bold text-white tracking-wide">
          ENIGMA 2.0
        </button>

        <nav className="hidden md:flex items-center gap-1">
          <button onClick={() => navigate("/")} className={navClass("home")}>Home</button>
          <button onClick={() => navigate("/interview")} className={navClass("interview")}>Interview</button>
          <button onClick={() => navigate("/technical-session")} className={navClass("technical")}>Technical</button>
          <button onClick={openCvChecker} className={navClass("cv")}>CV Checker</button>
        </nav>

        <button onClick={() => navigate("/problem/1")} className="btn-primary text-sm px-4 py-2">
          Start Session
        </button>
      </div>
    </header>
  );
}
