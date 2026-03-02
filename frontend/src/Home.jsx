import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const openCvChecker = () => navigate("/cv-checker");
  const circleButtonClass = "w-36 h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full bg-white/95 shadow-lg flex items-center justify-center text-emerald-700 font-semibold hover:scale-[1.03] transition-all duration-200 text-center p-4";

  return (
    <div className="h-screen w-screen overflow-x-hidden bg-gradient-to-br from-lime-100 via-green-100 to-emerald-200 text-emerald-950">
      <header className="max-w-7xl mx-auto flex items-center justify-between px-8 py-6">
        <h1 className="text-xl md:text-2xl font-bold text-emerald-900">EnigmaAI</h1>
      </header>

      <main className="relative mx-auto pt-8 pb-24 gap-12 items-center">
        <div className="flex px-10 flex-col lg:flex-row gap-10 lg:gap-0">
          <div className="z-10">
            <p className="text-sm font-semibold text-emerald-600 mb-4">AI POWERED INTERVIEW PREP</p>
            <h2 className="text-4xl md:text-6xl font-extrabold text-emerald-950 leading-tight">
              Practice Smarter Interviews,
              <br />
              Crack Them Faster
            </h2>
            <p className="mt-6 text-emerald-900/80 max-w-xl text-base md:text-xl leading-relaxed">
              Simulate real interviews with AI feedback — validate your code against test cases, get voice analysis, and improve your reasoning.
            </p>
            <div className="mt-8 flex">
              <button
                onClick={openCvChecker}
                className="px-6 py-3 rounded-full bg-white/70 backdrop-blur border border-emerald-200 hover:bg-white transition"
              >
                CV Checker
              </button>
            </div>
          </div>

          <div className="relative lg:ml-16 mt-6 lg:mt-0 w-full max-w-[32rem] mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-300 to-lime-300 rounded-full blur-3xl opacity-60" />
            <div className="relative z-20 grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 place-items-center p-2 sm:p-3">
              <button
                onClick={() => navigate("/interview")}
                className={`${circleButtonClass} translate-y-2`}
              >
                HR Interview Session
              </button>
              <button
                onClick={() => navigate("/technical-session")}
                className={`${circleButtonClass} -translate-y-1`}
              >
                Tech Interview Session
              </button>
              <button
                onClick={openCvChecker}
                className={`${circleButtonClass} translate-y-1`}
              >
                CV Checker
              </button>
              <button
                onClick={() => navigate("/problem/1")}
                className={`${circleButtonClass} -translate-y-2`}
              >
                DSA Solver
              </button>
            </div>
          </div>
        </div>

        <div className="text-4xl font-bold text-center mt-64">
          Elevate your interview practice with our smart AI interviewers
        </div>
        <div className="w-full flex justify-center">
          <svg
            viewBox="0 0 1440 100"
            className="w-full max-w-6xl h-14"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M0 50 C 180 -10, 1080 -10, 1900 30, 1440 50"
              className="stroke-emerald-400"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-2 gap-16 items-center">

          <div>
            <p className="text-sm font-semibold tracking-widest text-indigo-500 uppercase mb-4">
              Skills Validation
            </p>

            <h2 className="text-4xl font-bold text-slate-900 leading-tight">
              Validate your Soft-skill and programming skills.
            </h2>

            <p className="mt-6 text-lg text-slate-600 max-w-xl">
              you can check your cv, communication/soft skills required for your upcoming interview along with your programming/debugging skills
            </p>
          </div>

          <div className="relative flex justify-center">

            <div className="absolute -right-8 top-10 w-64 h-80 bg-white rounded-2xl shadow-lg border border-slate-200"></div>

            <div className="absolute right-6 top-4 w-72 h-96 bg-white rounded-2xl shadow-xl border border-slate-200"></div>

            <div className="relative w-80 h-105 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4">
              <div className="h-4 w-24 bg-slate-200 rounded mb-4"></div>
              <div className="h-32 bg-slate-100 rounded mb-4"></div>
              <div className="space-y-3">
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <footer className="text-center text-sm text-emerald-800/70 pb-6">
        © 2026 EnigmaAI · Built to help you win interviews
      </footer>
    </div>
  );
}
