"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

interface BackgroundMusicContextType {
  isPlaying: boolean;
  isMuted: boolean;
  currentTrack: string;
  availableTracks: string[];
  togglePlay: () => void;
  toggleMute: () => void;
  changeTrack: (track: string) => void;
}

const BackgroundMusicContext = createContext<BackgroundMusicContextType | undefined>(undefined);

export const useBackgroundMusicContext = () => {
  const context = useContext(BackgroundMusicContext);
  if (!context) {
    throw new Error("useBackgroundMusicContext must be used within a BackgroundMusicProvider");
  }
  return context;
};

export const BackgroundMusicProvider = ({ children }: { children: ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrack, setCurrentTrack] = useState("/songs/background-music.mp3");
  const availableTracks = ["/songs/background-music.mp3"];

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleMute = () => setIsMuted(!isMuted);
  const changeTrack = (track: string) => setCurrentTrack(track);

  return (
    <BackgroundMusicContext.Provider
      value={{
        isPlaying,
        isMuted,
        currentTrack,
        availableTracks,
        togglePlay,
        toggleMute,
        changeTrack,
      }}
    >
      {children}
    </BackgroundMusicContext.Provider>
  );
};
