import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef } from "react";

export type AudioPlaybackState = "loading" | "ready" | "playing" | "paused" | "blocked" | "ended" | "error";
export type AudioProgress = { currentTime: number; duration: number; buffered: number };
export interface AudioControllerHandle {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
}

function PersistentAudioPlayerImpl(
  {
    src,
    startAt,
    onStateChange,
    onProgressChange,
  }: {
    src: string;
    startAt: number;
    onStateChange: (state: AudioPlaybackState) => void;
    onProgressChange: (progress: AudioProgress) => void;
  },
  ref: React.ForwardedRef<AudioControllerHandle>,
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const initialSeekAppliedRef = useRef(false);

  const reportProgress = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const bufferedEnd = audio.buffered.length ? audio.buffered.end(audio.buffered.length - 1) : 0;

    onProgressChange({
      currentTime,
      duration,
      buffered: duration > 0 ? Math.min(1, bufferedEnd / duration) : 0,
    });
  }, [onProgressChange]);

  const seekToConfiguredStart = useCallback((force = false) => {
    const audio = audioRef.current;
    if (!audio || (!force && initialSeekAppliedRef.current)) return false;

    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    if (!duration) return false;

    const target = startAt >= 0 && startAt < duration ? startAt : 0;
    try {
      audio.currentTime = target;
      initialSeekAppliedRef.current = Math.abs(audio.currentTime - target) < 1;
      reportProgress();
      return initialSeekAppliedRef.current;
    } catch {
      return false;
    }
  }, [reportProgress, startAt]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    seekToConfiguredStart();

    void audio.play().catch((error: DOMException) => {
      onStateChange(error.name === "NotAllowedError" ? "blocked" : "error");
    });
  }, [onStateChange, seekToConfiguredStart]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;

    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    audio.currentTime = Math.min(Math.max(0, seconds), duration || seconds);
    reportProgress();
  }, [reportProgress]);

  useImperativeHandle(ref, () => ({ play, pause, seek }), [pause, play, seek]);

  useEffect(() => {
    initialSeekAppliedRef.current = false;
    seekToConfiguredStart();
  }, [src, startAt, seekToConfiguredStart]);

  return (
    <audio
      ref={audioRef}
      className="persistent-audio-player"
      src={src}
      preload="auto"
      playsInline
      onLoadStart={() => onStateChange("loading")}
      onLoadedMetadata={() => seekToConfiguredStart()}
      onCanPlay={() => {
        seekToConfiguredStart();
        if (audioRef.current?.paused) onStateChange("ready");
        reportProgress();
      }}
      onPlay={() => {
        seekToConfiguredStart();
        onStateChange("playing");
      }}
      onPlaying={() => {
        seekToConfiguredStart();
        onStateChange("playing");
      }}
      onPause={() => onStateChange("paused")}
      onTimeUpdate={reportProgress}
      onDurationChange={reportProgress}
      onProgress={reportProgress}
      onEnded={() => {
        onStateChange("ended");
        initialSeekAppliedRef.current = false;
        seekToConfiguredStart(true);
        play();
      }}
      onError={() => onStateChange("error")}
    />
  );
}

export const PersistentAudioPlayer = memo(forwardRef(PersistentAudioPlayerImpl));
