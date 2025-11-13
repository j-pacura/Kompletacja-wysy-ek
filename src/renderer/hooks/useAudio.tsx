import { useEffect, useRef, useState } from 'react';

interface AudioSettings {
  soundEffectsEnabled: boolean;
  voiceEnabled: boolean;
  soundVolume: number;
  voiceVolume: number;
  voiceLanguage: string;
}

// Sound effect types
type SoundEffect = 'scan' | 'success' | 'error' | 'complete';

export const useAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [settings, setSettings] = useState<AudioSettings>({
    soundEffectsEnabled: true,
    voiceEnabled: true,
    soundVolume: 70,
    voiceVolume: 80,
    voiceLanguage: 'pl-PL',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { ipcRenderer } = window.require('electron');
        const result = await ipcRenderer.invoke('db:get-settings');

        if (result.success) {
          const data = result.data;
          setSettings({
            soundEffectsEnabled: data.sound_effects_enabled === 'true',
            voiceEnabled: data.enable_voice === 'true',
            soundVolume: parseInt(data.sound_volume || '70'),
            voiceVolume: parseInt(data.voice_volume || '80'),
            voiceLanguage: data.voice_language || 'pl-PL',
          });
        }
      } catch (error) {
        console.error('Error loading audio settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Initialize Web Audio API
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // Play sound effect using Web Audio API
  const playSound = (type: SoundEffect) => {
    if (!settings.soundEffectsEnabled) return;

    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const volume = settings.soundVolume / 100;
    gainNode.gain.value = volume * 0.3; // Scale down to prevent clipping

    const now = ctx.currentTime;

    switch (type) {
      case 'scan':
        // Quick beep - 800Hz
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(volume * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;

      case 'success':
        // Pleasant two-tone success - 600Hz -> 800Hz
        oscillator.frequency.value = 600;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.linearRampToValueAtTime(800, now + 0.1);
        gainNode.gain.setValueAtTime(volume * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
        break;

      case 'error':
        // Low buzz - 200Hz
        oscillator.frequency.value = 200;
        oscillator.type = 'sawtooth';
        gainNode.gain.setValueAtTime(volume * 0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        break;

      case 'complete':
        // Victory fanfare - ascending notes
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          const startTime = now + i * 0.15;
          gain.gain.setValueAtTime(volume * 0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
          osc.start(startTime);
          osc.stop(startTime + 0.3);
        });
        break;
    }
  };

  // Speak text using Web Speech API
  const speak = (text: string, priority: 'low' | 'high' = 'low') => {
    if (!settings.voiceEnabled) return;

    // Check if speech synthesis is available
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Cancel low priority speech if new high priority arrives
    if (priority === 'high' && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = settings.voiceLanguage;
    utterance.volume = settings.voiceVolume / 100;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try to find Polish voice
    const voices = window.speechSynthesis.getVoices();
    const polishVoice = voices.find(voice => voice.lang.startsWith('pl'));
    if (polishVoice) {
      utterance.voice = polishVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  // Helper functions for common actions
  const playScanned = () => {
    playSound('scan');
  };

  const playPacked = (sapIndex: string) => {
    playSound('success');
    speak(`Spakowano część ${sapIndex}`, 'high');
  };

  const playError = (message?: string) => {
    playSound('error');
    if (message) {
      speak(message, 'high');
    }
  };

  const playCompleted = () => {
    playSound('complete');
    speak('Wysyłka zakończona! Gratulacje!', 'high');
  };

  const playProgress = (remaining: number) => {
    speak(`Pozostało ${remaining} ${remaining === 1 ? 'część' : remaining < 5 ? 'części' : 'części'}`, 'low');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    playSound,
    speak,
    playScanned,
    playPacked,
    playError,
    playCompleted,
    playProgress,
    settings,
    isLoading,
  };
};
