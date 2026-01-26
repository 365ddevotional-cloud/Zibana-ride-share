import { useCallback, useRef } from "react";

const NOTIFICATION_SOUNDS = {
  rideOffer: "/sounds/ride-offer.mp3",
  safetyCheck: "/sounds/safety-alert.mp3",
  notification: "/sounds/notification.mp3",
} as const;

type SoundType = keyof typeof NOTIFICATION_SOUNDS;

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback((type: SoundType = "notification") => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const audio = new Audio(NOTIFICATION_SOUNDS[type]);
      audioRef.current = audio;
      audio.volume = 0.7;
      
      audio.play().catch((error) => {
        console.log("Audio playback prevented:", error.message);
      });
    } catch (error) {
      console.log("Sound playback error:", error);
    }
  }, []);

  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  return { playSound, stopSound };
}
