import { useCallback, useEffect, useRef, useState } from 'react';

// Using Kenney Interface Sounds (CC0) hosted on GitHub Raw
// Repo: https://github.com/Calinou/kenney-interface-sounds
const BASE_URL = 'https://raw.githubusercontent.com/Calinou/kenney-interface-sounds/master/addons/kenney_interface_sounds';

export const SOUNDS = {
    CLICK: `${BASE_URL}/click_001.wav`,
    SELECT: `${BASE_URL}/click_003.wav`,
    DROP: `${BASE_URL}/drop_002.wav`, // Assuming drop_002 exists, otherwise fallback to click
    ERROR: `${BASE_URL}/error_001.wav`, // Assuming error_001 exists
    SUCCESS: `${BASE_URL}/confirmation_001.wav`, // Assuming confirmation_001 exists
    SHUFFLE: `${BASE_URL}/switch_002.wav`, // Assuming switch_002 exists
    POP: `${BASE_URL}/drop_001.wav`,
    START: `${BASE_URL}/confirmation_002.wav`,
    YOUR_TURN: `${BASE_URL}/confirmation_003.wav`,
    BUY_INTENT: `${BASE_URL}/notification_001.wav`
};

export const useGameSounds = () => {
    const [isMuted, setIsMuted] = useState(false);
    const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

    // Load mute preference
    useEffect(() => {
        const storedMute = localStorage.getItem('carioca_muted');
        if (storedMute) {
            setIsMuted(storedMute === 'true');
        }
    }, []);

    const toggleMute = () => {
        const newState = !isMuted;
        setIsMuted(newState);
        localStorage.setItem('carioca_muted', String(newState));
    };

    const playSound = useCallback((url: string, volume = 0.5) => {
        if (isMuted) return;

        try {
            // Create audio if not exists or reuse? 
            // Reusing might clip if played rapidly. 
            // For UI sounds, creating new is usually safer for rapid fire, or cloning.
            const audio = new Audio(url);
            audio.volume = volume;
            audio.play().catch(e => {
                // Ignore autoplay errors (user hasn't interacted yet)
                console.warn("Audio play failed", e);
            });
        } catch (e) {
            console.error("Audio error", e);
        }
    }, [isMuted]);

    return {
        isMuted,
        toggleMute,
        playClick: () => playSound(SOUNDS.CLICK, 0.3),
        playSelect: () => playSound(SOUNDS.SELECT, 0.3),
        playDrop: () => playSound(SOUNDS.DROP, 0.4),
        playError: () => playSound(SOUNDS.ERROR, 0.3),
        playSuccess: () => playSound(SOUNDS.SUCCESS, 0.4),
        playShuffle: () => playSound(SOUNDS.SHUFFLE, 0.4),
        playPop: () => playSound(SOUNDS.POP, 0.4),
        playStart: () => playSound(SOUNDS.START, 0.5),
        playYourTurn: () => playSound(SOUNDS.YOUR_TURN, 0.6),
        playBuyIntent: () => playSound(SOUNDS.BUY_INTENT, 0.45),
    };
};
