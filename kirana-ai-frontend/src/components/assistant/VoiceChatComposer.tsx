import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Send,
  Trash2,
  Sparkles,
  Square,
  Play,
  Languages,
  Check,
  Volume2
} from 'lucide-react';

interface VoiceChatComposerProps {
  onSendMessage: (message: string) => void;
  isGenerating?: boolean;
  queryExamples?: string[];
  placeholder?: string;
}

type LanguageMode = 'en-IN' | 'ta-IN';

export const VoiceChatComposer: React.FC<VoiceChatComposerProps> = ({
  onSendMessage,
  isGenerating = false,
  queryExamples = [
    'Show low stock items',
    'Today\'s total sales',
    'Price of Fortune Sunflower Oil',
    'Who has pending credit?',
    'சரக்கு இருப்பு காட்டு'
  ],
  placeholder = "Ask Kirana AI in Tamil or English (e.g. 'Show low stock', 'Today's sales')..."
}) => {
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageMode>('en-IN');
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(24).fill(12));
  const [micError, setMicError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  // Refs (not state) so speech/waveform callbacks always see the CURRENT value
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);

  // Format recording seconds into mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Setup Web Speech Recognition
  const initSpeechRecognition = useCallback((lang: LanguageMode) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript + ' ';
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }

        if (finalStr) {
          setTranscript((prev) => (prev + ' ' + finalStr).trim());
        }
        setInterimTranscript(interimStr);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition status:', event.error);
        const messages: Record<string, string> = {
          'not-allowed': 'Microphone permission blocked. Click the lock icon in the address bar and allow the microphone.',
          'service-not-allowed': 'Voice typing is blocked in this browser. Please use Chrome or Edge.',
          'audio-capture': 'No microphone was found. Check that one is connected and not used by another app.',
          'network': 'Voice typing needs an internet connection, and does not work in some browsers (Brave, the VS Code preview). Please try Chrome or Edge.',
          'language-not-supported': 'This browser cannot do voice typing in that language. Try the other language option.',
        };
        const msg = messages[event.error];
        if (msg) {
          setMicError(msg);
          if (event.error !== 'audio-capture') {
            // These errors will not fix themselves, so stop instead of showing a dead recorder.
            handleCancelRecording();
            setMicError(msg);
          }
        }
      };

      recognition.onend = () => {
        // If still supposed to be recording and not paused, restart
        if (recognitionRef.current === recognition && isRecordingRef.current && !isPausedRef.current) {
          try {
            recognition.start();
          } catch {
            // Ignore if already active
          }
        }
      };

      return recognition;
    } catch (err) {
      console.warn('Speech recognition initialization error:', err);
      return null;
    }
  }, []);

  // Audio stream & real-time frequency analysis for waveform
  const startAudioAnalysis = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        startSimulatedWaveform();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateWaveform = () => {
        if (!isRecordingRef.current || isPausedRef.current) return;
        analyser.getByteFrequencyData(dataArray);

        // Map to 24 waveform bars
        const bars: number[] = [];
        const step = Math.floor(dataArray.length / 24) || 1;
        for (let i = 0; i < 24; i++) {
          const val = dataArray[i * step] || 0;
          // Scale between 8px and 44px
          bars.push(Math.max(8, Math.round((val / 255) * 38) + 6));
        }
        setAudioLevels(bars);
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      updateWaveform();
    } catch {
      // If mic access fails, fall back to simulated silky waveform
      startSimulatedWaveform();
    }
  };

  const startSimulatedWaveform = () => {
    const updateSimulated = () => {
      const bars = Array.from({ length: 24 }).map((_, i) => {
        const time = Date.now() / 200;
        const wave = Math.sin(time + i * 0.4) * 0.5 + 0.5;
        return Math.max(8, Math.round(wave * 34) + 6);
      });
      setAudioLevels(bars);
      animationFrameRef.current = requestAnimationFrame(updateSimulated);
    };
    updateSimulated();
  };

  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevels(new Array(24).fill(10));
  };

  // Start voice recording session
  const handleStartRecording = () => {
    setMicError(null);

    // Browsers only allow the microphone on HTTPS or localhost.
    if (!window.isSecureContext) {
      setMicError(
        'The microphone only works on https:// or http://localhost. Open the app at http://localhost:3000 on this computer, or use the deployed https link.'
      );
      return;
    }

    const rec = initSpeechRecognition(selectedLanguage);
    if (!rec) {
      setMicError('Voice typing is not supported in this browser. Please use Chrome or Edge, or type your message.');
      return;
    }

    isRecordingRef.current = true;
    isPausedRef.current = false;
    setTranscript(textInput);
    setInterimTranscript('');
    setRecordingSeconds(0);
    setIsRecording(true);
    setIsPaused(false);

    // Start timer
    timerRef.current = window.setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    // Start audio visualizer
    startAudioAnalysis();

    // Start speech recognition
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      console.warn('Could not start recognition:', err);
    }
  };

  // Change language. The running recognition keeps its old language, so replace it.
  const handleLanguageChange = (next: LanguageMode) => {
    setSelectedLanguage(next);
    if (!isRecordingRef.current) return;

    const old = recognitionRef.current;
    recognitionRef.current = null; // stops the old one's onend from auto-restarting it
    try {
      old?.stop();
    } catch {}

    const rec = initSpeechRecognition(next);
    if (!rec) return;
    recognitionRef.current = rec;
    if (!isPausedRef.current) {
      // short delay: the old session must fully end before a new one starts
      setTimeout(() => {
        try {
          rec.start();
        } catch {}
      }, 250);
    }
  };

  // Pause or Resume recording
  const handleTogglePause = () => {
    if (isPaused) {
      isPausedRef.current = false;
      setIsPaused(false);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
      try {
        recognitionRef.current?.start();
      } catch {}
      startAudioAnalysis();
    } else {
      isPausedRef.current = true;
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      try {
        recognitionRef.current?.stop();
      } catch {}
      stopAudioAnalysis();
    }
  };

  // Cancel and discard recording
  const handleCancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      recognitionRef.current?.stop();
    } catch {}
    stopAudioAnalysis();
    recognitionRef.current = null;
    isRecordingRef.current = false;
    isPausedRef.current = false;
    setIsRecording(false);
    setIsPaused(false);
    setTranscript('');
    setInterimTranscript('');
    setRecordingSeconds(0);
  };

  // Send voice transcript
  const handleConfirmVoiceMessage = () => {
    const fullMessage = (transcript + ' ' + interimTranscript).trim();
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      recognitionRef.current?.stop();
    } catch {}
    stopAudioAnalysis();
    recognitionRef.current = null;
    isRecordingRef.current = false;
    isPausedRef.current = false;
    setIsRecording(false);
    setIsPaused(false);

    if (fullMessage) {
      onSendMessage(fullMessage);
      setTextInput('');
      setTranscript('');
      setInterimTranscript('');
    } else {
      // If nothing recognized, keep text mode
      setTextInput('');
    }
  };

  // Standard text send
  const handleSendText = (msgToSend?: string) => {
    const message = (msgToSend || textInput).trim();
    if (!message || isGenerating) return;
    onSendMessage(message);
    setTextInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  // Auto-resize textarea
  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAudioAnalysis();
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
  }, []);

  return (
    <div className="relative bg-[#10121C]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 sm:p-4 shadow-2xl transition-all duration-300 space-y-2.5">
      {/* Top Suggestion Query Chips (Only in text mode) */}
      {!isRecording && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <div className="flex items-center gap-1 text-slate-400 text-[11px] font-semibold shrink-0">
            <Sparkles className="w-3 h-3 text-[#FBBF24]" />
            <span>Try asking:</span>
          </div>
          {queryExamples.map((example, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendText(example)}
              className="px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white text-xs font-medium shrink-0 transition-colors cursor-pointer active:scale-95"
            >
              “{example}”
            </button>
          ))}
        </div>
      )}

      {/* Mic permission or notice alert */}
      {micError && (
        <div className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 text-xs border border-rose-500/30 flex items-center justify-between backdrop-blur-md">
          <span>⚠️ {micError}</span>
          <button
            onClick={() => setMicError(null)}
            className="text-rose-300 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* LIVE VOICE COMPOSER MODE (AI Chat 8 Block) */}
      {isRecording ? (
        <div className="flex flex-col gap-3 p-3 bg-black/40 border border-amber-500/40 rounded-xl animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl shadow-[0_0_20px_rgba(249,115,22,0.15)]">
          {/* Header bar: Recording badge, Timer, Language toggle */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                    isPaused ? 'bg-amber-400 opacity-60' : 'bg-rose-500 opacity-75'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    isPaused ? 'bg-amber-500' : 'bg-rose-600'
                  }`}
                />
              </span>
              <span className="font-mono text-xs font-extrabold text-white tracking-wider">
                {isPaused ? 'PAUSED' : 'LISTENING'} · {formatTime(recordingSeconds)}
              </span>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-1.5 bg-white/[0.06] border border-white/15 rounded-lg px-2 py-1 text-xs shadow-2xs">
              <Languages className="w-3.5 h-3.5 text-amber-400" />
              <button
                type="button"
                onClick={() => handleLanguageChange(selectedLanguage === 'en-IN' ? 'ta-IN' : 'en-IN')}
                className="font-bold text-white hover:text-amber-300 transition-colors cursor-pointer"
                title="Toggle between Tamil and English"
              >
                {selectedLanguage === 'en-IN' ? 'EN (English)' : 'தமிழ் (Tamil)'}
              </button>
            </div>
          </div>

          {/* Real-time Dynamic Waveform Audio Visualizer */}
          <div className="flex items-center justify-center gap-1 py-2 px-4 h-12 bg-black/40 rounded-lg border border-white/10 overflow-hidden">
            {audioLevels.map((height, i) => (
              <span
                key={i}
                style={{
                  height: `${isPaused ? 6 : height}px`,
                  transition: 'height 80ms ease'
                }}
                className={`w-1 rounded-full shadow-[0_0_6px_rgba(249,115,22,0.4)] ${
                  isPaused
                    ? 'bg-slate-600'
                    : i % 2 === 0
                    ? 'bg-gradient-to-t from-[#9333EA] to-[#F97316]'
                    : 'bg-gradient-to-t from-[#E11D48] to-[#FBBF24]'
                }`}
              />
            ))}
          </div>

          {/* Live Transcript Stream Card */}
          <div className="relative min-h-[56px] max-h-36 overflow-y-auto p-3 bg-black/50 rounded-lg border border-white/10 text-xs sm:text-sm text-white shadow-inner">
            {transcript || interimTranscript ? (
              <p className="leading-relaxed">
                <span className="font-semibold text-white">{transcript}</span>
                {interimTranscript && (
                  <span className="text-amber-300 italic ml-1 underline decoration-dotted decoration-amber-400/60">
                    {interimTranscript}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-slate-400 italic flex items-center gap-2">
                <Volume2 className="w-4 h-4 animate-pulse text-amber-400" />
                Speak now... listening to your query in{' '}
                <span className="text-amber-300 font-semibold">{selectedLanguage === 'ta-IN' ? 'Tamil' : 'English'}</span>
              </p>
            )}
          </div>

          {/* Controls: Discard, Pause/Resume, Send */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleCancelRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer"
              title="Discard recording"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePause}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 transition-colors cursor-pointer"
              >
                {isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleConfirmVoiceMessage}
                disabled={!transcript.trim() && !interimTranscript.trim()}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer ${
                  transcript.trim() || interimTranscript.trim()
                    ? 'bg-gradient-to-r from-[#9333EA] to-[#F97316] text-white hover:brightness-110 shadow-[0_0_15px_rgba(249,115,22,0.4)] active:scale-95'
                    : 'bg-white/10 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Send Transcript</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD TYPING INPUT COMPOSER */
        <div className="relative flex items-end gap-2 bg-white/[0.04] rounded-xl border border-white/10 p-2 focus-within:border-amber-500/50 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={textInput}
            onChange={handleInputResize}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 max-h-28 bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 resize-none focus:outline-hidden py-1.5 px-2.5 leading-relaxed"
          />

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Language for voice typing (choose before you speak) */}
            <button
              type="button"
              onClick={() => setSelectedLanguage(selectedLanguage === 'en-IN' ? 'ta-IN' : 'en-IN')}
              title="Voice language: tap to switch between English and Tamil"
              className="px-2 py-2 rounded-lg text-[11px] font-bold text-white bg-white/[0.06] hover:bg-white/10 border border-white/15 transition-all cursor-pointer"
            >
              {selectedLanguage === 'en-IN' ? 'EN' : 'தமிழ்'}
            </button>

            {/* Live Voice Composer Trigger Button */}
            <button
              type="button"
              onClick={handleStartRecording}
              title="Voice Composer with Live Transcript (AI Chat 8)"
              className="group relative p-2 rounded-lg text-amber-300 bg-gradient-to-r from-[#9333EA]/20 to-[#F97316]/20 hover:from-[#9333EA]/35 hover:to-[#F97316]/35 border border-amber-500/40 transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1"
              aria-label="Voice input with live transcript"
            >
              <Mic className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline text-[11px] font-bold text-amber-300 pr-1">
                Voice
              </span>
            </button>

            {/* Standard Send Message Button */}
            <button
              type="button"
              onClick={() => handleSendText()}
              disabled={!textInput.trim() || isGenerating}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                textInput.trim() && !isGenerating
                  ? 'bg-gradient-to-r from-[#9333EA] to-[#F97316] text-white hover:brightness-110 shadow-[0_0_12px_rgba(249,115,22,0.4)] active:scale-95'
                  : 'bg-white/10 text-slate-500 cursor-not-allowed'
              }`}
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceChatComposer;