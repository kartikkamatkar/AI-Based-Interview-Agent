import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Home";
import CodeWindow from "./codewindow";
import InterviewSection from "./InterviewSection";
import TechnicalSession from "./TechnicalSession";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/problem/:id" element={<CodeWindow />} />
        <Route path="/interview" element={<InterviewSection />} />
        <Route path="/technical-session" element={<TechnicalSession />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
