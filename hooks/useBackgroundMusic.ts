import { useEffect } from "react";

export const useBackgroundMusic = (
  musicPath: string,
  isMuted: boolean,
  volume: number = 0.3
) => {
  useEffect(() => {
    const audio = new Audio(musicPath);
    audio.loop = true;
    audio.volume = volume;

    let hasStarted = false;

    const startMusic = () => {
      if (!hasStarted && !isMuted) {
        audio.play().catch((e) => {
          console.log("Audio autoplay blocked, will start on user interaction", e);
        });
        hasStarted = true;
      }
    };

    const handleInteraction = () => {
      startMusic();
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("wheel", handleInteraction);
    };

    window.addEventListener("click", handleInteraction);
    window.addEventListener("scroll", handleInteraction);
    window.addEventListener("wheel", handleInteraction);

    if (isMuted) {
      audio.pause();
    } else if (hasStarted) {
      audio.play().catch(() => {});
    }

    return () => {
      audio.pause();
      audio.src = "";
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("wheel", handleInteraction);
    };
  }, [musicPath, isMuted, volume]);
};
