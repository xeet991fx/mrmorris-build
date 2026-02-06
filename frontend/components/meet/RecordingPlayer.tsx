"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlayIcon,
    PauseIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon,
    ArrowDownTrayIcon,
    ShareIcon,
    XMarkIcon,
    BackwardIcon,
    ForwardIcon,
} from "@heroicons/react/24/solid";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

interface RecordingPlayerProps {
    videoUrl: string;
    title: string;
    duration?: number;
    thumbnailUrl?: string;
    downloadUrl?: string;
    transcript?: {
        text: string;
        timestamps?: { start: number; end: number; text: string }[];
    };
    onShare?: () => void;
    onClose?: () => void;
    autoPlay?: boolean;
}

export function RecordingPlayer({
    videoUrl,
    title,
    duration,
    thumbnailUrl,
    downloadUrl,
    transcript,
    onShare,
    onClose,
    autoPlay = false,
}: RecordingPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [currentTime, setCurrentTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(duration || 0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [showTranscript, setShowTranscript] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Format time as mm:ss or hh:mm:ss
    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
                .toString()
                .padStart(2, "0")}`;
        }
        return `${minutes}:${secs.toString().padStart(2, "0")}`;
    };

    // Handle play/pause
    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    // Handle mute toggle
    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    // Handle volume change
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            setIsMuted(newVolume === 0);
        }
    };

    // Handle progress bar click
    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (progressRef.current && videoRef.current) {
            const rect = progressRef.current.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const newTime = percent * videoDuration;
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    // Handle fullscreen
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            videoRef.current?.parentElement?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Skip forward/backward
    const skip = (seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.max(
                0,
                Math.min(videoDuration, videoRef.current.currentTime + seconds)
            );
        }
    };

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeydown = (e: KeyboardEvent) => {
            switch (e.key) {
                case " ":
                    e.preventDefault();
                    togglePlay();
                    break;
                case "ArrowLeft":
                    skip(-10);
                    break;
                case "ArrowRight":
                    skip(10);
                    break;
                case "m":
                    toggleMute();
                    break;
                case "f":
                    toggleFullscreen();
                    break;
                case "Escape":
                    onClose?.();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [isPlaying, isMuted]);

    // Show/hide controls on mouse movement
    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    };

    // Get active transcript segment
    const getActiveTranscriptSegment = () => {
        if (!transcript?.timestamps) return null;
        return transcript.timestamps.find(
            (seg) => currentTime >= seg.start && currentTime <= seg.end
        );
    };

    const progress = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;

    return (
        <div className="flex flex-col lg:flex-row gap-4 w-full max-w-6xl mx-auto">
            {/* Video Player */}
            <div
                className={`relative bg-black rounded-xl overflow-hidden ${showTranscript ? "lg:w-2/3" : "w-full"
                    }`}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => isPlaying && setShowControls(false)}
            >
                {/* Loading Spinner */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* Video Element */}
                <video
                    ref={videoRef}
                    src={videoUrl}
                    poster={thumbnailUrl}
                    className="w-full aspect-video"
                    autoPlay={autoPlay}
                    onTimeUpdate={() =>
                        setCurrentTime(videoRef.current?.currentTime || 0)
                    }
                    onLoadedMetadata={() => {
                        setVideoDuration(videoRef.current?.duration || 0);
                        setIsLoading(false);
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onClick={togglePlay}
                />

                {/* Controls Overlay */}
                <AnimatePresence>
                    {showControls && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 flex flex-col justify-between"
                        >
                            {/* Top Bar */}
                            <div className="flex items-center justify-between p-4">
                                <h3 className="text-white font-medium truncate max-w-[60%]">
                                    {title}
                                </h3>
                                <div className="flex items-center gap-2">
                                    {transcript && (
                                        <button
                                            onClick={() => setShowTranscript(!showTranscript)}
                                            className={`p-2 rounded-full transition-colors ${showTranscript
                                                    ? "bg-white text-gray-900"
                                                    : "bg-white/20 text-white hover:bg-white/30"
                                                }`}
                                            title="Toggle transcript"
                                        >
                                            <DocumentTextIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                    {onShare && (
                                        <button
                                            onClick={onShare}
                                            className="p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
                                            title="Share"
                                        >
                                            <ShareIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                    {downloadUrl && (
                                        <a
                                            href={downloadUrl}
                                            download
                                            className="p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
                                            title="Download"
                                        >
                                            <ArrowDownTrayIcon className="w-5 h-5" />
                                        </a>
                                    )}
                                    {onClose && (
                                        <button
                                            onClick={onClose}
                                            className="p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
                                            title="Close"
                                        >
                                            <XMarkIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Center Play Button */}
                            <button
                                onClick={togglePlay}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-5 bg-white/30 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition-colors"
                            >
                                {isPlaying ? (
                                    <PauseIcon className="w-10 h-10" />
                                ) : (
                                    <PlayIcon className="w-10 h-10 ml-1" />
                                )}
                            </button>

                            {/* Bottom Controls */}
                            <div className="p-4 space-y-2">
                                {/* Progress Bar */}
                                <div
                                    ref={progressRef}
                                    onClick={handleProgressClick}
                                    className="h-1.5 bg-white/30 rounded-full cursor-pointer group"
                                >
                                    <div
                                        className="h-full bg-white rounded-full relative group-hover:bg-blue-400 transition-colors"
                                        style={{ width: `${progress}%` }}
                                    >
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>

                                {/* Control Buttons */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => skip(-10)}
                                            className="text-white hover:text-gray-300 transition-colors"
                                            title="Rewind 10s"
                                        >
                                            <BackwardIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={togglePlay}
                                            className="text-white hover:text-gray-300 transition-colors"
                                        >
                                            {isPlaying ? (
                                                <PauseIcon className="w-6 h-6" />
                                            ) : (
                                                <PlayIcon className="w-6 h-6" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => skip(10)}
                                            className="text-white hover:text-gray-300 transition-colors"
                                            title="Forward 10s"
                                        >
                                            <ForwardIcon className="w-5 h-5" />
                                        </button>

                                        {/* Volume */}
                                        <div className="flex items-center gap-2 group">
                                            <button
                                                onClick={toggleMute}
                                                className="text-white hover:text-gray-300 transition-colors"
                                            >
                                                {isMuted || volume === 0 ? (
                                                    <SpeakerXMarkIcon className="w-5 h-5" />
                                                ) : (
                                                    <SpeakerWaveIcon className="w-5 h-5" />
                                                )}
                                            </button>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                value={isMuted ? 0 : volume}
                                                onChange={handleVolumeChange}
                                                className="w-0 group-hover:w-20 transition-all duration-300 cursor-pointer accent-white"
                                            />
                                        </div>

                                        {/* Time Display */}
                                        <span className="text-white text-sm font-mono">
                                            {formatTime(currentTime)} / {formatTime(videoDuration)}
                                        </span>
                                    </div>

                                    {/* Fullscreen */}
                                    <button
                                        onClick={toggleFullscreen}
                                        className="text-white hover:text-gray-300 transition-colors"
                                        title="Toggle fullscreen"
                                    >
                                        {isFullscreen ? (
                                            <ArrowsPointingInIcon className="w-5 h-5" />
                                        ) : (
                                            <ArrowsPointingOutIcon className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Transcript Panel */}
            <AnimatePresence>
                {showTranscript && transcript && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="lg:w-1/3 bg-white rounded-xl border border-gray-200 overflow-hidden"
                    >
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900">Transcript</h4>
                            <button
                                onClick={() => setShowTranscript(false)}
                                className="p-1 text-gray-500 hover:text-gray-700"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 max-h-[400px] overflow-y-auto">
                            {transcript.timestamps ? (
                                <div className="space-y-3">
                                    {transcript.timestamps.map((segment, index) => {
                                        const isActive =
                                            currentTime >= segment.start &&
                                            currentTime <= segment.end;
                                        return (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    if (videoRef.current) {
                                                        videoRef.current.currentTime = segment.start;
                                                    }
                                                }}
                                                className={`block text-left w-full p-2 rounded-lg transition-colors ${isActive
                                                        ? "bg-blue-50 border border-blue-200"
                                                        : "hover:bg-gray-50"
                                                    }`}
                                            >
                                                <span className="text-xs text-gray-500 font-mono">
                                                    {formatTime(segment.start)}
                                                </span>
                                                <p
                                                    className={`text-sm mt-1 ${isActive ? "text-blue-900" : "text-gray-700"
                                                        }`}
                                                >
                                                    {segment.text}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                    {transcript.text}
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Compact player for embedded use
export function RecordingPlayerCompact({
    videoUrl,
    title,
    thumbnailUrl,
}: {
    videoUrl: string;
    title: string;
    thumbnailUrl?: string;
}) {
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    return (
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden group">
            <video
                ref={videoRef}
                src={videoUrl}
                poster={thumbnailUrl}
                className="w-full h-full object-cover"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />

            {/* Play/Pause Overlay */}
            <button
                onClick={() => {
                    if (videoRef.current) {
                        isPlaying ? videoRef.current.pause() : videoRef.current.play();
                    }
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                {isPlaying ? (
                    <PauseIcon className="w-12 h-12 text-white" />
                ) : (
                    <PlayIcon className="w-12 h-12 text-white ml-1" />
                )}
            </button>

            {/* Title Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-sm font-medium truncate">{title}</p>
            </div>
        </div>
    );
}
