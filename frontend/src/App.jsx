import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Home";
import CodeWindow from "./codewindow";
import InterviewSection from "./InterviewSection";
import TechnicalSession from "./TechnicalSession";
import CvChecker from "./CvChecker";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/problem/:id" element={<CodeWindow />} />
        <Route path="/interview" element={<InterviewSection />} />
        <Route path="/technical-session" element={<TechnicalSession />} />
        <Route path="/cv-checker" element={<CvChecker />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
