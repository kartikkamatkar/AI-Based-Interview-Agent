import axios from "axios";

// Judge0 CE via RapidAPI — set your key in .env as VITE_JUDGE0_KEY
const JUDGE0_URL = "https://judge0-ce.p.rapidapi.com";
const API_KEY = (import.meta.env.VITE_JUDGE0_KEY || "").trim();

const headers = {
    "X-RapidAPI-Key": API_KEY,
    "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
    "Content-Type": "application/json",
};

function b64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}
function unb64(str) {
    try { return decodeURIComponent(escape(atob(str))); } catch { return str || ""; }
}

async function submitToJudge0(sourceCode, languageId, stdin) {
    const { data } = await axios.post(
        `${JUDGE0_URL}/submissions?base64_encoded=true&wait=false`,
        {
            source_code: b64(sourceCode),
            language_id: languageId,
            stdin: b64(stdin),
        },
        { headers }
    );
    return data.token;
}

async function pollResult(token, maxRetries = 12, delayMs = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        await new Promise((r) => setTimeout(r, delayMs));
        const { data } = await axios.get(
            `${JUDGE0_URL}/submissions/${token}?base64_encoded=true`,
            { headers }
        );
        // Status IDs: 1=In Queue, 2=Processing, 3=Accepted, 4=Wrong Answer, 5+=Error
        if (data.status.id > 2) {
            return {
                stdout: unb64(data.stdout || ""),
                stderr: unb64(data.stderr || ""),
                compile_output: unb64(data.compile_output || ""),
                status: data.status,
                time: data.time,
                memory: data.memory,
            };
        }
    }
    throw new Error("Execution timed out");
}

function judgeUnavailableResult() {
    return {
        stdout: "",
        stderr: "Judge0 API key is missing. Set VITE_JUDGE0_KEY to run real code execution.",
        compile_output: "",
        status: { id: 0, description: "Judge Unavailable" },
        time: "",
        memory: 0,
        mocked: true,
    };
}

/**
 * Run a single test case.
 * @returns {{ stdout, stderr, compile_output, status, time, memory }}
 */
export async function runTestCase(sourceCode, languageId, stdin, expectedOutput) {
    if (!API_KEY) {
        return judgeUnavailableResult();
    }
    const token = await submitToJudge0(sourceCode, languageId, stdin);
    return pollResult(token);
}

/**
 * Run multiple test cases and return annotated results.
 */
export async function runAllCases(sourceCode, languageId, testCases) {
    const results = await Promise.all(
        testCases.map(async (tc) => {
            try {
                const res = await runTestCase(
                    sourceCode,
                    languageId,
                    tc.input,
                    tc.expectedOutput
                );
                const actual = res.stdout.trim();
                const expected = tc.expectedOutput.trim();
                const passed =
                    res.status.id === 3 && actual === expected;
                return { ...res, actual, expected, input: tc.input, passed };
            } catch (err) {
                return {
                    actual: "",
                    expected: tc.expectedOutput,
                    input: tc.input,
                    passed: false,
                    stderr: err.message,
                    status: { id: 0, description: "Error" },
                };
            }
        })
    );
    return results;
}
