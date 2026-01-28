import { useCallback, useEffect, useRef, useState } from "react";

interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioLevel: number;
  audioLevels: number[];
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(9).fill(0));

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const updateAudioLevels = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    // @ts-expect-error - Uint8Array type compatibility issue with TS 5.6+
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // Calculate overall audio level
    const sum = dataArrayRef.current.reduce((a: number, b: number) => a + b, 0);
    const average = sum / dataArrayRef.current.length;
    const normalizedLevel = Math.min(average / 128, 1);
    setAudioLevel(normalizedLevel);

    // Create 9 frequency bands for visualization
    const bandSize = Math.floor(dataArrayRef.current.length / 9);
    const levels: number[] = [];

    for (let i = 0; i < 9; i++) {
      let bandSum = 0;
      for (let j = 0; j < bandSize; j++) {
        bandSum += dataArrayRef.current[i * bandSize + j];
      }
      const bandAverage = bandSum / bandSize;
      // Add some randomness and smooth the levels
      const normalizedBand = Math.min(
        (bandAverage / 128) * (0.8 + Math.random() * 0.4),
        1,
      );
      levels.push(normalizedBand);
    }

    setAudioLevels(levels);

    animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // Set up audio analysis for visualization
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      setIsRecording(true);
      updateAudioLevels();

      return true;
    } catch (error) {
      console.error("Failed to start audio recording:", error);
      return false;
    }
  }, [updateAudioLevels]);

  const stopRecording = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    dataArrayRef.current = null;

    setIsRecording(false);
    setAudioLevel(0);
    setAudioLevels(Array(9).fill(0));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    isRecording,
    audioLevel,
    audioLevels,
    startRecording,
    stopRecording,
  };
}
