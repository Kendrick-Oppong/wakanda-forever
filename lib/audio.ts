export const playSound = (
  audioContext: AudioContext | null,
  frequency: number,
  duration: number,
  volume: number = 0.1,
  isMuted: boolean = false
): void => {
  if (isMuted || !audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.frequency.value = frequency;
  gainNode.gain.value = volume;
  oscillator.start();
  setTimeout(() => oscillator.stop(), duration);
};

export const playUnlockSound = (isMuted: boolean): void => {
  if (isMuted || typeof window === "undefined") return;

  const audioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();
  [500, 600, 700, 900].forEach((freq, i) => {
    setTimeout(() => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.15;
      osc.start();
      setTimeout(() => osc.stop(), 200);
    }, i * 150);
  });
};

export const startAmbientSound = (
  audioContext: AudioContext | null,
  isMuted: boolean
): { oscillators: OscillatorNode[]; gains: GainNode[] } => {
  const ambientOscillators: OscillatorNode[] = [];
  const ambientGains: GainNode[] = [];

  if (isMuted || !audioContext) {
    return { oscillators: ambientOscillators, gains: ambientGains };
  }

  const frequencies = [55, 82.5, 110, 165];

  frequencies.forEach((baseFreq, i) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.value = baseFreq;

    filter.type = "lowpass";
    filter.frequency.value = 400;

    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(
      0.02 + i * 0.005,
      audioContext.currentTime + 3
    );

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);

    osc.start();

    ambientOscillators.push(osc);
    ambientGains.push(gain);

    setInterval(() => {
      if (!isMuted && osc.frequency) {
        const drift = (Math.random() - 0.5) * 0.5;
        osc.frequency.setValueAtTime(
          baseFreq + drift,
          audioContext.currentTime
        );
      }
    }, 5000 + i * 1000);
  });

  return { oscillators: ambientOscillators, gains: ambientGains };
};

export const stopAmbientSound = (oscillators: OscillatorNode[]): void => {
  oscillators.forEach((osc) => {
    try {
      osc.stop();
    } catch (e) {
      console.error("Failed to stop oscillator:", e);
    }
  });
};
