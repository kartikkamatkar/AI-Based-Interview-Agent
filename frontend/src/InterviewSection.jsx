import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    endInterviewSession,
    getInterviewSessionState,
    startInterviewSession,
    submitInterviewAnswer,
    transcribeInterviewAudio,
} from "./services/interviewApi";

const FILLER_WORDS = ["um", "uh", "like", "you know", "basically", "actually", "so", "hmm"];

export default function InterviewSection() {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const recognitionRef = useRef(null);
    const streamRef = useRef(null);
    const audioStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioMimeTypeRef = useRef("audio/webm");
    const audioChunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const audioMonitorIntervalRef = useRef(null);
    const audioSpeechDetectedRef = useRef(false);
    const audioLastVoiceAtRef = useRef(0);
    const audioRecordStartAtRef = useRef(0);
    const syncTimerRef = useRef(null);
    const faceMonitorRef = useRef(null);
    const fallbackMonitorRef = useRef(null);
    const visibilityLockTimeoutRef = useRef(null);
    const fallbackPrevFrameRef = useRef(null);
    const proctorViolationRef = useRef(false);
    const multiFaceActiveRef = useRef(false);
    const multiFaceWarningCountRef = useRef(0);
    const transcriptRef = useRef("");
    const loadingRef = useRef(false);
    const sessionRef = useRef("");
    const handsFreeRef = useRef(false);

    const [duration, setDuration] = useState(15);
    const [sessionId, setSessionId] = useState("");
    const [secondsRemaining, setSecondsRemaining] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState("");
    const [transcript, setTranscript] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [recognitionConfidence, setRecognitionConfidence] = useState([]);
    const [speechStartedAt, setSpeechStartedAt] = useState(null);
    const [liveFeed, setLiveFeed] = useState([]);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [cameraReady, setCameraReady] = useState(false);
    const [aiSpeaking, setAiSpeaking] = useState(false);
    const [handsFreeMode, setHandsFreeMode] = useState(false);
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [interviewLocked, setInterviewLocked] = useState(false);
    const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
    const [proctorAlert, setProctorAlert] = useState("");
    const [cameraAnalysisMode, setCameraAnalysisMode] = useState("FaceDetector");

    const [videoMetrics, setVideoMetrics] = useState({
        facialExpression: 6,
        eyeContact: 6,
        bodyLanguage: 6,
    });

    const speechSupport = useMemo(() => {
        return typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    }, []);

    const audioRecordSupport = useMemo(() => {
        return typeof window !== "undefined" && !!window.MediaRecorder && !!navigator.mediaDevices?.getUserMedia;
    }, []);

    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    useEffect(() => {
        sessionRef.current = sessionId;
    }, [sessionId]);

    useEffect(() => {
        handsFreeRef.current = handsFreeMode;
    }, [handsFreeMode]);

    useEffect(() => {
        if (!speechSupport || recognitionRef.current) {
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 3;

        recognition.onresult = (event) => {
            let nextTranscript = "";
            const confidenceCollector = [];

            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                nextTranscript += result[0].transcript;
                if (result.isFinal && typeof result[0].confidence === "number") {
                    confidenceCollector.push(result[0].confidence);
                }
            }

            setTranscript(nextTranscript.trim());
            if (confidenceCollector.length > 0) {
                setRecognitionConfidence((prev) => [...prev, ...confidenceCollector]);
            }
        };

        recognition.onend = async () => {
            setIsListening(false);
            if (
                handsFreeRef.current
                && sessionRef.current
                && !loadingRef.current
                && transcriptRef.current.trim()
            ) {
                await handleSubmitAnswer(true);
            }
        };
        recognition.onerror = () => setIsListening(false);

        recognitionRef.current = recognition;
    }, [speechSupport]);

    useEffect(() => {
        if (!sessionId || report) {
            return undefined;
        }

        const timer = setInterval(() => {
            setSecondsRemaining((prev) => {
                if (prev <= 1) {
                    handleEndSession();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [sessionId, report]);

    useEffect(() => {
        if (!sessionId || report) {
            return undefined;
        }

        syncTimerRef.current = setInterval(async () => {
            try {
                const state = await getInterviewSessionState(sessionId);
                if (!state) return;
                setSecondsRemaining(state.secondsRemaining || 0);
                if (state.currentQuestion) {
                    setCurrentQuestion(state.currentQuestion);
                }
            } catch {
                // silent sync failure
            }
        }, 12000);

        return () => {
            if (syncTimerRef.current) {
                clearInterval(syncTimerRef.current);
                syncTimerRef.current = null;
            }
        };
    }, [sessionId, report]);

    useEffect(() => {
        return () => {
            if (faceMonitorRef.current) {
                clearInterval(faceMonitorRef.current);
                faceMonitorRef.current = null;
            }
            if (fallbackMonitorRef.current) {
                clearInterval(fallbackMonitorRef.current);
                fallbackMonitorRef.current = null;
            }
            stopListening();
            stopAudioRecording();
            stopAudioMonitor();
            stopCamera();
            window.speechSynthesis?.cancel();
        };
    }, []);

    const stopAudioMonitor = () => {
        if (audioMonitorIntervalRef.current) {
            clearInterval(audioMonitorIntervalRef.current);
            audioMonitorIntervalRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
    };

    useEffect(() => {
        if (!sessionId || !streamRef.current || !videoRef.current) {
            return;
        }

        if (videoRef.current.srcObject !== streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }

        const playPromise = videoRef.current.play?.();
        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {});
        }
    }, [sessionId, cameraReady]);

    useEffect(() => {
        if (!sessionId || report || interviewLocked) {
            return undefined;
        }

        const blockEvent = (event) => event.preventDefault();

        const onKeyDown = (event) => {
            const key = event.key.toLowerCase();
            const isClipboardShortcut = (event.ctrlKey || event.metaKey) && ["c", "v", "x", "a", "insert"].includes(key);
            const isShiftInsert = event.shiftKey && key === "insert";
            const isTab = key === "tab";

            if (isClipboardShortcut || isShiftInsert || isTab) {
                event.preventDefault();
            }
        };

        const lockInterview = () => {
            setHandsFreeMode(false);
            stopListening();
            stopAudioRecording();
            setProctorAlert("Tab/background switch detected. Please stay on this interview screen.");
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                if (visibilityLockTimeoutRef.current) {
                    clearTimeout(visibilityLockTimeoutRef.current);
                }
                visibilityLockTimeoutRef.current = setTimeout(() => {
                    if (document.visibilityState === "hidden") {
                        lockInterview();
                    }
                }, 2500);
            } else if (visibilityLockTimeoutRef.current) {
                clearTimeout(visibilityLockTimeoutRef.current);
                visibilityLockTimeoutRef.current = null;
            }
        };

        document.addEventListener("copy", blockEvent);
        document.addEventListener("paste", blockEvent);
        document.addEventListener("cut", blockEvent);
        document.addEventListener("contextmenu", blockEvent);
        window.addEventListener("keydown", onKeyDown);
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            if (visibilityLockTimeoutRef.current) {
                clearTimeout(visibilityLockTimeoutRef.current);
                visibilityLockTimeoutRef.current = null;
            }
            document.removeEventListener("copy", blockEvent);
            document.removeEventListener("paste", blockEvent);
            document.removeEventListener("cut", blockEvent);
            document.removeEventListener("contextmenu", blockEvent);
            window.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, [sessionId, report, interviewLocked]);

    const speakText = (text) => {
        if (!text || !("speechSynthesis" in window)) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            let settled = false;
            const finish = () => {
                if (settled) {
                    return;
                }
                settled = true;
                setAiSpeaking(false);
                resolve();
            };

            const timeout = setTimeout(() => {
                finish();
            }, 5000);

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "en-US";
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.onstart = () => setAiSpeaking(true);
            utterance.onend = () => {
                clearTimeout(timeout);
                finish();
            };
            utterance.onerror = () => {
                clearTimeout(timeout);
                finish();
            };
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        });
    };

    const startCamera = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setError("Camera API is unavailable in this browser. Interview will continue without camera analysis.");
            setCameraReady(false);
            return true;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                const playPromise = videoRef.current.play?.();
                if (playPromise && typeof playPromise.catch === "function") {
                    playPromise.catch(() => {});
                }
            }
            setCameraReady(true);
            setError("");
            runVideoHeuristics();
            return true;
        } catch (error) {
            setCameraReady(false);
            const reason = error?.name ? ` (${error.name})` : "";
            setError(`Camera start failed${reason}. Allow camera permission and click Enable Camera.`);
            return true;
        }
    };

    const handleEnableCamera = async () => {
        await startCamera();
    };

    const stopCamera = () => {
        if (faceMonitorRef.current) {
            clearInterval(faceMonitorRef.current);
            faceMonitorRef.current = null;
        }
        if (fallbackMonitorRef.current) {
            clearInterval(fallbackMonitorRef.current);
            fallbackMonitorRef.current = null;
        }
        fallbackPrevFrameRef.current = null;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setCameraReady(false);
    };

    const runVideoHeuristics = () => {
        if (!videoRef.current) {
            return;
        }

        if (!("FaceDetector" in window)) {
            setCameraAnalysisMode("Fallback");
            runFallbackVideoHeuristics();
            return;
        }

        setCameraAnalysisMode("FaceDetector");

        if (faceMonitorRef.current) {
            clearInterval(faceMonitorRef.current);
        }
        if (fallbackMonitorRef.current) {
            clearInterval(fallbackMonitorRef.current);
            fallbackMonitorRef.current = null;
        }

        const smoothScore = (prev, next) => (prev * 0.6) + (next * 0.4);
        const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
        faceMonitorRef.current = setInterval(async () => {
            if (!videoRef.current || !streamRef.current) {
                if (faceMonitorRef.current) {
                    clearInterval(faceMonitorRef.current);
                    faceMonitorRef.current = null;
                }
                return;
            }
            try {
                const faces = await detector.detect(videoRef.current);
                if (faces.length > 1 && !proctorViolationRef.current) {
                    if (!multiFaceActiveRef.current) {
                        multiFaceActiveRef.current = true;
                        multiFaceWarningCountRef.current += 1;
                    }

                    if (multiFaceWarningCountRef.current <= 2) {
                        setProctorAlert(`Warning ${multiFaceWarningCountRef.current}/2: More than one person detected. Keep only one face in camera.`);
                    } else {
                        proctorViolationRef.current = true;
                        setProctorAlert("Multiple-face violation exceeded limit. Interview has been terminated.");
                        await handleEndSession();
                    }
                    return;
                }

                if (faces.length <= 1) {
                    multiFaceActiveRef.current = false;
                    if (!proctorViolationRef.current && proctorAlert.startsWith("Warning")) {
                        setProctorAlert("");
                    }
                }

                if (faces.length === 0) {
                    setVideoMetrics((prev) => ({
                        facialExpression: Number(smoothScore(prev.facialExpression, 4.9).toFixed(1)),
                        eyeContact: Number(smoothScore(prev.eyeContact, 4.6).toFixed(1)),
                        bodyLanguage: Number(smoothScore(prev.bodyLanguage, 4.8).toFixed(1)),
                    }));
                    return;
                }

                const face = faces[0]?.boundingBox;
                const videoWidth = videoRef.current.videoWidth || 1;
                const videoHeight = videoRef.current.videoHeight || 1;
                const faceCenter = face ? (face.x + face.width / 2) / videoWidth : 0.5;
                const faceAreaRatio = face ? (face.width * face.height) / (videoWidth * videoHeight) : 0.12;
                const centered = Math.abs(faceCenter - 0.5) <= 0.18;

                const targetExpression = centered ? (faceAreaRatio > 0.08 ? 8.1 : 7.1) : 6.0;
                const targetEyeContact = centered ? 8.3 : 5.9;
                const targetBodyLanguage = faceAreaRatio > 0.06 ? 7.8 : 6.2;

                setVideoMetrics((prev) => ({
                    facialExpression: Number(smoothScore(prev.facialExpression, targetExpression).toFixed(1)),
                    eyeContact: Number(smoothScore(prev.eyeContact, targetEyeContact).toFixed(1)),
                    bodyLanguage: Number(smoothScore(prev.bodyLanguage, targetBodyLanguage).toFixed(1)),
                }));
            } catch {
                setVideoMetrics((prev) => ({
                    facialExpression: Number(smoothScore(prev.facialExpression, 6.0).toFixed(1)),
                    eyeContact: Number(smoothScore(prev.eyeContact, 6.0).toFixed(1)),
                    bodyLanguage: Number(smoothScore(prev.bodyLanguage, 6.0).toFixed(1)),
                }));
            }
        }, 1800);
    };

    const runFallbackVideoHeuristics = () => {
        if (!videoRef.current) {
            return;
        }

        if (fallbackMonitorRef.current) {
            clearInterval(fallbackMonitorRef.current);
        }
        if (faceMonitorRef.current) {
            clearInterval(faceMonitorRef.current);
            faceMonitorRef.current = null;
        }

        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 120;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
            return;
        }

        const smoothScore = (prev, next) => (prev * 0.7) + (next * 0.3);

        fallbackMonitorRef.current = setInterval(() => {
            if (!videoRef.current || !streamRef.current) {
                if (fallbackMonitorRef.current) {
                    clearInterval(fallbackMonitorRef.current);
                    fallbackMonitorRef.current = null;
                }
                return;
            }

            if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
                return;
            }

            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

            let brightnessSum = 0;
            let centerBrightnessSum = 0;
            let centerCount = 0;
            let diffSum = 0;
            let sampleCount = 0;

            const prevFrame = fallbackPrevFrameRef.current;
            for (let i = 0; i < frame.length; i += 16) {
                const r = frame[i];
                const g = frame[i + 1];
                const b = frame[i + 2];
                const pixelIndex = i / 4;
                const x = pixelIndex % canvas.width;
                const y = Math.floor(pixelIndex / canvas.width);
                const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                brightnessSum += luma;

                if (x > canvas.width * 0.3 && x < canvas.width * 0.7 && y > canvas.height * 0.2 && y < canvas.height * 0.8) {
                    centerBrightnessSum += luma;
                    centerCount += 1;
                }

                if (prevFrame) {
                    const pr = prevFrame[i];
                    const pg = prevFrame[i + 1];
                    const pb = prevFrame[i + 2];
                    const prevLuma = (0.299 * pr + 0.587 * pg + 0.114 * pb) / 255;
                    diffSum += Math.abs(luma - prevLuma);
                    sampleCount += 1;
                }
            }

            fallbackPrevFrameRef.current = new Uint8ClampedArray(frame);

            const avgBrightness = brightnessSum / (frame.length / 16);
            const avgCenterBrightness = centerCount > 0 ? centerBrightnessSum / centerCount : avgBrightness;
            const motion = sampleCount > 0 ? Math.min(1, diffSum / sampleCount / 0.25) : 0.2;

            const targetExpression = 5.2 + Math.min(3, avgCenterBrightness * 3.2);
            const targetEyeContact = 5 + Math.min(3.5, avgCenterBrightness * 3.8) - Math.min(1.5, motion * 1.1);
            const targetBodyLanguage = 5.2 + Math.min(3, (1 - Math.abs(motion - 0.35)) * 2.8);

            setVideoMetrics((prev) => ({
                facialExpression: Number(smoothScore(prev.facialExpression, targetExpression).toFixed(1)),
                eyeContact: Number(smoothScore(prev.eyeContact, targetEyeContact).toFixed(1)),
                bodyLanguage: Number(smoothScore(prev.bodyLanguage, targetBodyLanguage).toFixed(1)),
            }));
        }, 1300);
    };

    const startListening = () => {
        if (interviewLocked) {
            return;
        }
        if (!speechSupport) {
            startAudioRecording();
            return;
        }
        if (!recognitionRef.current || isListening) {
            return;
        }
        setSpeechStartedAt(Date.now());
        recognitionRef.current.start();
        setIsListening(true);
    };

    const stopListening = () => {
        if (!speechSupport) {
            stopAudioRecording();
            return;
        }
        if (!recognitionRef.current) {
            return;
        }
        recognitionRef.current.stop();
        setIsListening(false);
    };

    const startAudioRecording = async () => {
        if (!audioRecordSupport || isRecordingAudio || interviewLocked) {
            if (!audioRecordSupport) {
                setError("Voice recording API is unavailable in this browser. Use Chrome/Edge over localhost or HTTPS.");
            }
            return;
        }

        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            audioStreamRef.current = audioStream;

            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : "audio/webm";
            audioMimeTypeRef.current = mimeType;

            const recorder = new MediaRecorder(audioStream, { mimeType, audioBitsPerSecond: 128000 });
            audioChunksRef.current = [];
            audioSpeechDetectedRef.current = false;
            audioLastVoiceAtRef.current = Date.now();
            audioRecordStartAtRef.current = Date.now();

            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                const audioContext = new AudioCtx();
                const source = audioContext.createMediaStreamSource(audioStream);
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                source.connect(analyser);
                audioContextRef.current = audioContext;

                const dataArray = new Uint8Array(analyser.fftSize);
                if (audioMonitorIntervalRef.current) {
                    clearInterval(audioMonitorIntervalRef.current);
                }

                audioMonitorIntervalRef.current = setInterval(() => {
                    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
                        return;
                    }

                    analyser.getByteTimeDomainData(dataArray);
                    let sumSquares = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        const normalized = (dataArray[i] - 128) / 128;
                        sumSquares += normalized * normalized;
                    }
                    const rms = Math.sqrt(sumSquares / dataArray.length);
                    const now = Date.now();

                    if (rms > 0.02) {
                        audioSpeechDetectedRef.current = true;
                        audioLastVoiceAtRef.current = now;
                    }

                    const silenceMs = now - audioLastVoiceAtRef.current;
                    const totalMs = now - audioRecordStartAtRef.current;

                    if (audioSpeechDetectedRef.current && silenceMs > 1500) {
                        stopAudioRecording();
                        return;
                    }

                    if (!audioSpeechDetectedRef.current && totalMs > 8000) {
                        stopAudioRecording();
                        return;
                    }

                    if (totalMs > 90000) {
                        stopAudioRecording();
                    }
                }, 200);
            }

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = async () => {
                setIsRecordingAudio(false);
                stopAudioMonitor();
                if (audioStreamRef.current) {
                    audioStreamRef.current.getTracks().forEach((track) => track.stop());
                    audioStreamRef.current = null;
                }

                if (audioChunksRef.current.length === 0 || interviewLocked) {
                    return;
                }

                const speechDurationMs = speechStartedAt ? (Date.now() - speechStartedAt) : 0;
                if (speechDurationMs < 1200) {
                    setError("Recording too short. Please speak for at least 1-2 seconds.");
                    return;
                }

                const finalMimeType = audioMimeTypeRef.current || "audio/webm";
                const extension = finalMimeType.includes("ogg") ? "ogg" : "webm";
                const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
                setLoading(true);
                setIsTranscribingAudio(true);
                try {
                    const transcriptText = await transcribeInterviewAudio(
                        new File([audioBlob], `interview-answer.${extension}`, { type: finalMimeType })
                    );
                    if (transcriptText?.trim()) {
                        setTranscript(transcriptText.trim());
                        setRecognitionConfidence((prev) => [...prev, 0.7]);
                        transcriptRef.current = transcriptText.trim();
                        if (
                            handsFreeRef.current
                            && sessionRef.current
                            && !loadingRef.current
                        ) {
                            await handleSubmitAnswer(true);
                        }
                    } else {
                        setError("Voice captured but transcription is empty. Please try again.");
                    }
                } catch {
                    setError("Audio transcription failed. Please retry speaking clearly.");
                } finally {
                    setIsTranscribingAudio(false);
                    setLoading(false);
                }
            };

            mediaRecorderRef.current = recorder;
            setSpeechStartedAt(Date.now());
            recorder.start();
            setIsRecordingAudio(true);
        } catch {
            setError("Microphone access failed. Please allow microphone permission.");
        }
    };

    const stopAudioRecording = () => {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== "inactive") {
            recorder.stop();
        } else {
            stopAudioMonitor();
        }
        setIsRecordingAudio(false);
    };

    const startRealtimeVoiceReply = () => {
        if (interviewLocked) {
            return;
        }
        setHandsFreeMode(true);
        startListening();
    };

    const stopRealtimeVoiceReply = () => {
        setHandsFreeMode(false);
        stopListening();
    };

    const handleStartInterview = async () => {
        setLoading(true);
        setError("");
        try {
            proctorViolationRef.current = false;
            multiFaceActiveRef.current = false;
            multiFaceWarningCountRef.current = 0;
            setProctorAlert("");
            setInterviewLocked(false);
            const data = await startInterviewSession(duration);
            setSessionId(data.sessionId);
            setSecondsRemaining(data.secondsRemaining || 0);
            setCurrentQuestion(data.currentQuestion || "");
            setReport(null);
            setLiveFeed([]);
            setTranscript("");
            setRecognitionConfidence([]);
            void startCamera();
            void speakText(data.currentQuestion || "Let's begin the interview.");
        } catch (error) {
            setError(error?.message || "Unable to start interview session. Please check backend and API setup.");
        } finally {
            setLoading(false);
        }
    };

    const countFillerWords = (text) => {
        const lower = (text || "").toLowerCase();
        return FILLER_WORDS.reduce((total, word) => {
            const regex = new RegExp(`\\b${word.replace(/\s+/g, "\\s+")}\\b`, "g");
            return total + (lower.match(regex)?.length || 0);
        }, 0);
    };

    const handleSubmitAnswer = async (skipVoiceStop = false) => {
        if (!sessionId || loading || interviewLocked) {
            return;
        }

        const cleanTranscript = transcript.trim();
        if (!cleanTranscript) {
            setError("Please speak your answer before submitting.");
            return;
        }

        setLoading(true);
        setError("");
        if (!skipVoiceStop) {
            stopListening();
        }

        const avgConfidence = recognitionConfidence.length
            ? recognitionConfidence.reduce((sum, value) => sum + value, 0) / recognitionConfidence.length
            : 0.65;
        const liveCameraConfidence = Math.min(
            10,
            Math.max(0, (videoMetrics.facialExpression + videoMetrics.eyeContact + videoMetrics.bodyLanguage) / 3),
        );

        const speechSeconds = speechStartedAt ? Math.max(1, Math.round((Date.now() - speechStartedAt) / 1000)) : 45;
        const words = cleanTranscript.split(/\s+/).filter(Boolean).length;
        const wordsPerMinute = (words / speechSeconds) * 60;

        const payload = {
            transcript: cleanTranscript,
            facialExpression: "observed",
            confidenceLevel: Math.min(10, Math.max(0, ((avgConfidence * 10) * 0.6) + (liveCameraConfidence * 0.4))),
            eyeContact: videoMetrics.eyeContact,
            toneOfVoice: Math.min(10, Math.max(0, (wordsPerMinute >= 95 && wordsPerMinute <= 165) ? 7.5 : 6.0)),
            speakingClarity: Math.min(10, Math.max(0, avgConfidence * 10)),
            fillerWordUsage: countFillerWords(cleanTranscript),
            bodyLanguage: "stable",
            facialExpressionScore: videoMetrics.facialExpression,
            bodyLanguageScore: videoMetrics.bodyLanguage,
        };

        try {
            const response = await submitInterviewAnswer(sessionId, payload);
            setLiveFeed((prev) => [
                ...prev,
                {
                    question: currentQuestion,
                    answer: cleanTranscript,
                    evaluation: response.evaluationSummary,
                },
            ]);

            setTranscript("");
            setRecognitionConfidence([]);
            setSpeechStartedAt(null);
            setSecondsRemaining(response.secondsRemaining || 0);

            if (response.sessionEnded) {
                setReport(response.finalReport);
                setCurrentQuestion("");
                stopListening();
                void speakText("Interview is completed. Your report is ready.");
                return;
            }

            setCurrentQuestion(response.currentQuestion || "");
            const aiVoiceLine = [response.interviewerResponse, response.currentQuestion].filter(Boolean).join(" ");
            void speakText(aiVoiceLine);
            if (handsFreeMode && !interviewLocked) {
                startListening();
            }
        } catch (error) {
            setError(error?.message || "Unable to evaluate answer right now.");
        } finally {
            setLoading(false);
        }
    };

    const handleEndSession = async () => {
        if (!sessionId) {
            return;
        }

        setLoading(true);
        try {
            const finalReport = await endInterviewSession(sessionId);
            setReport(finalReport);
            setCurrentQuestion("");
            setHandsFreeMode(false);
            stopListening();
            void speakText("Interview ended. Final report generated.");
        } catch (error) {
            setError(error?.message || "Unable to end session right now.");
        } finally {
            setLoading(false);
        }
    };

    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
        const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
        return `${mins}:${secs}`;
    };

    return (
        <div className="min-h-screen bg-[#11111b] text-[#cdd6f4] px-6 py-5">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-4 bg-[#1e1e2e] border border-[#313244] rounded-xl px-4 py-3">
                    <button
                        onClick={() => navigate("/")}
                        className="px-3 py-1.5 rounded-md bg-[#1e1e2e] border border-[#313244] text-xs"
                    >
                        Back to Home
                    </button>
                    <div className="text-sm font-semibold">Professional HR Voice Interview</div>
                    <div className="text-xs text-[#89b4fa]">AI Voice: {aiSpeaking ? "Speaking" : "Ready"}</div>
                    <div className="text-sm font-mono">{sessionId ? formatTimer(secondsRemaining) : "00:00"}</div>
                </div>

                {!sessionId && (
                    <div className="bg-[#1e1e2e] border border-[#313244] rounded-xl p-5 mb-5">
                        <div className="text-sm mb-3">Select interview duration</div>
                        <div className="flex gap-3 mb-4">
                            <button
                                onClick={() => setDuration(15)}
                                className={`px-4 py-2 rounded-md text-sm border ${duration === 15 ? "bg-[#89b4fa] text-black border-[#89b4fa]" : "border-[#313244]"}`}
                            >
                                15 Minutes
                            </button>
                            <button
                                onClick={() => setDuration(30)}
                                className={`px-4 py-2 rounded-md text-sm border ${duration === 30 ? "bg-[#89b4fa] text-black border-[#89b4fa]" : "border-[#313244]"}`}
                            >
                                30 Minutes
                            </button>
                        </div>
                        <button
                            onClick={handleStartInterview}
                            disabled={loading}
                            className="px-5 py-2 rounded-md text-sm bg-[#89b4fa] text-black font-semibold disabled:opacity-50"
                        >
                            Start Interview
                        </button>
                    </div>
                )}

                {sessionId && !report && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 bg-[#1e1e2e] border border-[#313244] rounded-xl p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                <div className="bg-[#11111b] border border-[#313244] rounded-lg p-3">
                                    <div className="text-xs text-[#6c7086] uppercase tracking-wider mb-1">AI Interviewer</div>
                                    <div className="text-sm font-semibold text-[#89b4fa]">Maya (HR)</div>
                                    <div className="text-xs text-[#cdd6f4] mt-1">Mode: Strict, concise, professional</div>
                                    <div className="text-xs mt-1 text-[#a6e3a1]">Voice Status: {aiSpeaking ? "Speaking to candidate" : "Waiting for response"}</div>
                                </div>
                                <div className="bg-[#11111b] border border-[#313244] rounded-lg p-3">
                                    <div className="text-xs text-[#6c7086] uppercase tracking-wider mb-1">Candidate</div>
                                    <div className="text-sm font-semibold text-[#a6e3a1]">You (Live)</div>
                                    <div className="text-xs text-[#cdd6f4] mt-1">Mic: {isListening ? "On" : "Off"}</div>
                                    <div className="text-xs mt-1 text-[#f9e2af]">Hands-free Realtime: {handsFreeMode ? "Enabled" : "Disabled"}</div>
                                </div>
                            </div>

                            <div className="text-xs text-[#6c7086] uppercase tracking-wider mb-1">Current Question</div>
                            <div className="text-sm leading-6 mb-4">{currentQuestion || "Preparing next question..."}</div>

                            <div className="text-xs text-[#6c7086] uppercase tracking-wider mb-1">Your Response (Speech to Text)</div>
                            <textarea
                                value={transcript}
                                onChange={(event) => setTranscript(event.target.value)}
                                className="w-full min-h-[130px] bg-[#11111b] border border-[#313244] rounded-md p-3 text-sm outline-none"
                                placeholder="Your spoken answer will appear here..."
                            />

                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={startListening}
                                    disabled={(!speechSupport && !audioRecordSupport) || isListening || isRecordingAudio || loading || aiSpeaking || interviewLocked}
                                    className="px-3 py-2 rounded-md text-xs bg-[#313244] disabled:opacity-50"
                                >
                                    {speechSupport ? "Start Voice" : "Start Recording"}
                                </button>
                                {speechSupport && (
                                    <button
                                        onClick={stopListening}
                                        disabled={!isListening}
                                        className="px-3 py-2 rounded-md text-xs bg-[#313244] disabled:opacity-50"
                                    >
                                        Stop Voice
                                    </button>
                                )}
                                <button
                                    onClick={handsFreeMode ? stopRealtimeVoiceReply : startRealtimeVoiceReply}
                                    disabled={!speechSupport || loading || aiSpeaking || interviewLocked}
                                    className="px-3 py-2 rounded-md text-xs bg-[#313244] disabled:opacity-50"
                                >
                                    {handsFreeMode ? "Stop Realtime" : "Realtime Voice Reply"}
                                </button>
                                <button
                                    onClick={() => setTranscript("")}
                                    className="px-3 py-2 rounded-md text-xs bg-[#313244]"
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={handleSubmitAnswer}
                                    disabled={loading || interviewLocked}
                                    className="ml-auto px-4 py-2 rounded-md text-xs bg-[#89b4fa] text-black font-semibold disabled:opacity-50"
                                >
                                    Submit Answer
                                </button>
                            </div>

                            {isTranscribingAudio && (
                                <div className="text-xs text-[#89b4fa] mt-2">Transcribing recorded voice...</div>
                            )}

                            {!speechSupport && (
                                <div className="text-xs text-[#fab387] mt-2">
                                    Browser live speech recognition is unavailable. Voice recording with server transcription is enabled and auto-stops after silence.
                                </div>
                            )}

                            {!speechSupport && isRecordingAudio && (
                                <div className="text-xs mt-2 text-[#89b4fa]">
                                    Recording... Keep speaking, silence detect hote hi recording auto-stop ho jayegi.
                                </div>
                            )}

                            {speechSupport && (
                                <div className="text-xs mt-2 text-[#89b4fa]">
                                    {isListening
                                        ? "Listening in realtime. Your voice is being converted to text."
                                        : "Press Start Voice or Realtime Voice Reply to answer by voice."}
                                </div>
                            )}

                            <div className="mt-5">
                                <div className="text-xs text-[#6c7086] uppercase tracking-wider mb-2">Live Interview Feed</div>
                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                    {liveFeed.map((item, idx) => (
                                        <div key={idx} className="bg-[#11111b] border border-[#313244] rounded-md p-3">
                                            <div className="text-xs text-[#89b4fa] mb-1">Q: {item.question}</div>
                                            <div className="text-xs text-[#a6e3a1] mb-1">A: {item.answer}</div>
                                            <div className="text-xs text-[#cdd6f4]">Evaluation: {item.evaluation}</div>
                                        </div>
                                    ))}
                                    {liveFeed.length === 0 && (
                                        <div className="text-xs text-[#6c7086]">Responses will appear here after submission.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1e1e2e] border border-[#313244] rounded-xl p-4">
                            <div className="text-xs text-[#6c7086] uppercase tracking-wider mb-2">Candidate Camera</div>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-[220px] object-cover bg-black rounded-md border border-[#313244]"
                                onLoadedMetadata={() => {
                                    const playPromise = videoRef.current?.play?.();
                                    if (playPromise && typeof playPromise.catch === "function") {
                                        playPromise.catch(() => {});
                                    }
                                }}
                            />
                            <div className="mt-3 text-xs space-y-1">
                                <div>Camera Status: {cameraReady ? "On" : "Off"}</div>
                                <div>Candidate Visible: {cameraReady ? "Yes" : "No"}</div>
                                <div>Analysis Mode: {cameraAnalysisMode}</div>
                                <div>Live Confidence: {((videoMetrics.facialExpression + videoMetrics.eyeContact + videoMetrics.bodyLanguage) / 3).toFixed(1)}/10</div>
                                <div>Facial Expression: {videoMetrics.facialExpression.toFixed(1)}/10</div>
                                <div>Eye Contact: {videoMetrics.eyeContact.toFixed(1)}/10</div>
                                <div>Body Language: {videoMetrics.bodyLanguage.toFixed(1)}/10</div>
                            </div>

                            {!cameraReady && (
                                <button
                                    onClick={handleEnableCamera}
                                    disabled={loading}
                                    className="w-full mt-3 px-4 py-2 rounded-md text-xs bg-[#313244] text-[#cdd6f4] disabled:opacity-50"
                                >
                                    Enable Camera
                                </button>
                            )}

                            <button
                                onClick={handleEndSession}
                                disabled={loading}
                                className="w-full mt-4 px-4 py-2 rounded-md text-xs bg-[#f38ba8] text-black font-semibold disabled:opacity-50"
                            >
                                End Session
                            </button>
                        </div>
                    </div>
                )}

                {report && (
                    <div className="bg-[#1e1e2e] border border-[#313244] rounded-xl p-5">
                        <div className="text-base font-semibold mb-4">End Session Report</div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
                            <div className="bg-[#11111b] border border-[#313244] rounded-lg p-4 flex items-center justify-center">
                                <ScoreRing score={report.finalScore} />
                            </div>

                            <div className="lg:col-span-2 bg-[#11111b] border border-[#313244] rounded-lg p-4 space-y-2">
                                <MetricBar label="Communication Skills" value={report.communicationSkills} />
                                <MetricBar label="Confidence Level" value={report.confidenceLevel} />
                                <MetricBar label="Facial Expression" value={report.facialExpression} />
                                <MetricBar label="Eye Contact" value={report.eyeContact} />
                                <MetricBar label="Tone & Clarity" value={report.toneAndClarity} />
                                <MetricBar label="Body Language" value={report.bodyLanguage} />
                                <MetricBar label="Professionalism" value={report.professionalism} />
                            </div>
                        </div>

                        <ReportBlock title="Strengths" value={report.strengths} />
                        <ReportBlock title="Areas of Improvement" value={report.areasOfImprovement} />
                        <ReportBlock title="How to Improve" value={report.howToImprove} />
                        <ReportBlock title="Suggested Practice Plan" value={report.suggestedPracticePlan} />
                    </div>
                )}

                {error && (
                    <div className="mt-4 text-xs text-[#f38ba8]">{error}</div>
                )}

                {proctorAlert && (
                    <div className="mt-2 text-xs text-[#fab387]">{proctorAlert}</div>
                )}

                {interviewLocked && (
                    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center">
                        <div className="bg-[#1e1e2e] border border-red-500/50 rounded-xl p-6 text-center max-w-xl mx-4">
                            <h2 className="text-red-400 text-lg font-bold mb-2">Interview Locked</h2>
                            <p className="text-[#cdd6f4] text-sm leading-6">
                                Tab switch, blur, copy, paste, cut, and context menu are blocked in live interview mode.
                            </p>
                            <p className="text-[#f38ba8] text-xs mt-3">Please restart the interview session to continue.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ReportBlock({ title, value }) {
    return (
        <div className="mb-3">
            <div className="text-xs uppercase tracking-wider text-[#89b4fa] mb-1">{title}</div>
            <div className="text-sm bg-[#11111b] border border-[#313244] rounded-md p-3 whitespace-pre-wrap">{value}</div>
        </div>
    );
}

function ScoreRing({ score }) {
    const normalized = Math.max(0, Math.min(10, Number(score) || 0));
    const degree = (normalized / 10) * 360;

    return (
        <div className="flex flex-col items-center gap-2">
            <div
                className="w-36 h-36 rounded-full grid place-items-center"
                style={{
                    background: `conic-gradient(#89b4fa ${degree}deg, #313244 ${degree}deg 360deg)`,
                }}
            >
                <div className="w-26 h-26 rounded-full bg-[#11111b] border border-[#313244] flex flex-col items-center justify-center">
                    <div className="text-[11px] text-[#6c7086]">Final Score</div>
                    <div className="text-xl font-bold text-[#cdd6f4]">{normalized.toFixed(1)}</div>
                    <div className="text-[11px] text-[#89b4fa]">/ 10</div>
                </div>
            </div>
            <div className="text-xs text-[#6c7086]">Overall Interview Performance</div>
        </div>
    );
}

function MetricBar({ label, value }) {
    const normalized = Math.max(0, Math.min(10, Number(value) || 0));
    const width = `${(normalized / 10) * 100}%`;

    return (
        <div>
            <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#cdd6f4]">{label}</span>
                <span className="text-[#89b4fa] font-semibold">{normalized.toFixed(1)}/10</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#1e1e2e] border border-[#313244] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1]" style={{ width }} />
            </div>
        </div>
    );
}
