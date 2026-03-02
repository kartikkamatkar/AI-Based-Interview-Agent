import re

import pdfplumber
import streamlit as st
from docx import Document


COMMON_SKILLS = {
	"python", "java", "c++", "javascript", "typescript", "sql", "mysql", "postgresql",
	"spring", "spring boot", "react", "node", "flask", "django", "fastapi", "git",
	"docker", "kubernetes", "aws", "azure", "gcp", "redis", "mongodb", "html", "css",
	"pandas", "numpy", "machine learning", "deep learning", "nlp", "rest api", "microservices",
	"data structures", "algorithms", "oop", "system design"
}


def normalize_text(text: str) -> str:
	text = text.lower()
	text = re.sub(r"\s+", " ", text)
	return text.strip()


def extract_text_from_pdf(file_obj) -> str:
	chunks = []
	with pdfplumber.open(file_obj) as pdf:
		for page in pdf.pages:
			value = page.extract_text() or ""
			if value:
				chunks.append(value)
	return "\n".join(chunks)


def extract_text_from_docx(file_obj) -> str:
	doc = Document(file_obj)
	return "\n".join(p.text for p in doc.paragraphs if p.text)


def read_uploaded_resume(uploaded_file):
	if uploaded_file is None:
		return ""

	name = uploaded_file.name.lower()
	if name.endswith(".pdf"):
		return extract_text_from_pdf(uploaded_file)
	if name.endswith(".docx"):
		return extract_text_from_docx(uploaded_file)
	if name.endswith(".txt"):
		return uploaded_file.read().decode("utf-8", errors="ignore")
	return ""


def extract_skills(text: str):
	normalized = normalize_text(text)
	found = {skill for skill in COMMON_SKILLS if skill in normalized}
	return sorted(found)


def match_resume_with_jd(resume_text: str, jd_text: str):
	resume_skills = set(extract_skills(resume_text))
	jd_skills = set(extract_skills(jd_text))

	if not jd_skills:
		return {
			"score": 0,
			"matched": [],
			"missing": [],
			"resume_skills": sorted(resume_skills),
			"jd_skills": [],
		}

	matched = sorted(resume_skills & jd_skills)
	missing = sorted(jd_skills - resume_skills)
	score = round((len(matched) / len(jd_skills)) * 100, 2)
	return {
		"score": score,
		"matched": matched,
		"missing": missing,
		"resume_skills": sorted(resume_skills),
		"jd_skills": sorted(jd_skills),
	}


def main():
	st.set_page_config(page_title="CV Checker", layout="centered")
	st.title("📄 CV Checker")
	st.caption("Upload resume and paste JD to get match score and missing skills.")

	uploaded_file = st.file_uploader("Upload Resume (PDF/DOCX/TXT)", type=["pdf", "docx", "txt"])
	resume_text = read_uploaded_resume(uploaded_file)
	jd_text = st.text_area("Paste Job Description", height=260)

	if st.button("Analyze CV", type="primary"):
		if not resume_text:
			st.error("Please upload a valid resume file.")
			return
		if not jd_text.strip():
			st.error("Please paste job description text.")
			return

		result = match_resume_with_jd(resume_text, jd_text)
		st.metric("CV Match Score", f"{result['score']}%")

		c1, c2 = st.columns(2)
		with c1:
			st.markdown("### ✅ Matched Skills")
			st.write(result["matched"] if result["matched"] else "No strong match found yet.")
		with c2:
			st.markdown("### ❌ Missing Skills")
			st.write(result["missing"] if result["missing"] else "No critical skills missing.")


if __name__ == "__main__":
	main()


