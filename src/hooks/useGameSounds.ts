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
    const [volume, setVolumeState] = useState(0.7);
    const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

    // Load mute preference
    useEffect(() => {
        const storedMute = localStorage.getItem('carioca_muted');
        if (storedMute) {
            setIsMuted(storedMute === 'true');
        }
        const storedVolume = localStorage.getItem('carioca_volume');
        if (storedVolume) {
            const parsed = Number(storedVolume);
            if (!Number.isNaN(parsed)) {
                setVolumeState(Math.min(1, Math.max(0, parsed)));
            }
        }
    }, []);

    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key === 'carioca_muted') {
                setIsMuted(event.newValue === 'true');
            }
            if (event.key === 'carioca_volume') {
                const parsed = Number(event.newValue);
                if (!Number.isNaN(parsed)) {
                    setVolumeState(Math.min(1, Math.max(0, parsed)));
                }
            }
        };

        const handleCustom = (event: Event) => {
            const custom = event as CustomEvent<{ isMuted?: boolean; volume?: number }>;
            if (typeof custom.detail?.isMuted === 'boolean') {
                setIsMuted(custom.detail.isMuted);
            }
            if (typeof custom.detail?.volume === 'number') {
                setVolumeState(Math.min(1, Math.max(0, custom.detail.volume)));
            }
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener('carioca_sound_settings', handleCustom as EventListener);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('carioca_sound_settings', handleCustom as EventListener);
        };
    }, []);

    const emitSoundSettings = (next: { isMuted?: boolean; volume?: number }) => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('carioca_sound_settings', { detail: next }));
    };

    const toggleMute = () => {
        const newState = !isMuted;
        setIsMuted(newState);
        localStorage.setItem('carioca_muted', String(newState));
        emitSoundSettings({ isMuted: newState });
    };

    const setVolume = (nextVolume: number) => {
        const clamped = Math.min(1, Math.max(0, nextVolume));
        setVolumeState(clamped);
        localStorage.setItem('carioca_volume', String(clamped));
        emitSoundSettings({ volume: clamped });
    };

    const decreaseVolume = () => setVolume(volume - 0.1);
    const increaseVolume = () => setVolume(volume + 0.1);

    const playSound = useCallback((url: string, baseVolume = 0.5) => {
        if (isMuted || volume <= 0) return;

        try {
            // Create audio if not exists or reuse? 
            // Reusing might clip if played rapidly. 
            // For UI sounds, creating new is usually safer for rapid fire, or cloning.
            const audio = new Audio(url);
            audio.volume = Math.min(1, Math.max(0, baseVolume * volume));
            audio.play().catch(e => {
                // Ignore autoplay errors (user hasn't interacted yet)
                console.warn("Audio play failed", e);
            });
        } catch (e) {
            console.error("Audio error", e);
        }
    }, [isMuted, volume]);

    return {
        isMuted,
        volume,
        toggleMute,
        setVolume,
        decreaseVolume,
        increaseVolume,
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
