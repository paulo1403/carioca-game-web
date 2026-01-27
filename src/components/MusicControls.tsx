"use client";

import { Music, Volume2, VolumeX } from "lucide-react";
import { useBackgroundMusicContext } from "@/components/BackgroundMusicProvider";

export const MusicControls = () => {
  const { isPlaying, isMuted, currentTrack, availableTracks, togglePlay, toggleMute, changeTrack } =
    useBackgroundMusicContext();

  const getTrackName = (trackPath: string) => {
    if (trackPath === "/songs/background-music.mp3") {
      return "Default Music";
    }
    return trackPath.split("/").pop()?.replace(".mp3", "") || "Unknown Track";
  };

  return (
    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-lg p-2 border border-white/10">
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="p-2 rounded-full hover:bg-white/20 transition-colors"
        title={isPlaying ? "Pause Music" : "Play Music"}
      >
        {isPlaying ? (
          <Volume2 className="w-5 h-5 text-white" />
        ) : (
          <VolumeX className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Mute Button */}
      <button
        onClick={toggleMute}
        className="p-2 rounded-full hover:bg-white/20 transition-colors"
        title={isMuted ? "Unmute Music" : "Mute Music"}
      >
        <VolumeX className="w-5 h-5 text-white opacity-60" />
      </button>

      {/* Track Selector */}
      {availableTracks.length > 1 && (
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-white" />
          <select
            value={currentTrack}
            onChange={(e) => changeTrack(e.target.value)}
            className="bg-transparent text-white text-sm border border-white/20 rounded px-2 py-1 focus:outline-none focus:border-white/40"
          >
            {availableTracks.map((track) => (
              <option key={track} value={track} className="bg-gray-800 text-white">
                {getTrackName(track)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Current Track Display */}
      {availableTracks.length === 1 && (
        <span className="text-white text-sm opacity-80">{getTrackName(currentTrack)}</span>
      )}
    </div>
  );
};
