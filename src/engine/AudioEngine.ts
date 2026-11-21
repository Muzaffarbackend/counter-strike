import { GameSettings, MapId, WeaponCategory } from '../types/game';

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private musicTimer: number | null = null;
  private ambientSource: AudioNode | null = null;
  private ambientGain: GainNode | null = null;
  private currentAmbientMap: MapId | null = null;

  private masterVol = 0.75;
  private musicVol = 0.45;
  private sfxVol = 0.85;

  public init(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.applyVolumes();
      this.buildNoiseBuffer();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public syncSettings(settings: GameSettings): void {
    this.masterVol = settings.masterVolume;
    this.musicVol = settings.musicVolume;
    this.sfxVol = settings.sfxVolume;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.masterVol, now, 0.03);
    this.musicGain.gain.setTargetAtTime(this.musicVol, now, 0.03);
    this.sfxGain.gain.setTargetAtTime(this.sfxVol, now, 0.03);
  }

  private buildNoiseBuffer(): void {
    if (!this.ctx) return;
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
  }

  public startMenuMusic(): void {
    this.init();
    this.stopAmbient();
    if (this.musicTimer !== null || !this.ctx || !this.musicGain) return;

    const scale = [110, 130.81, 146.83, 164.81, 196.0, 220];
    let step = 0;

    const tick = () => {
      if (!this.ctx || !this.musicGain || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;

      // Deep tactical bass pulse
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      const bassFilter = this.ctx.createBiquadFilter();
      bassOsc.type = 'sawtooth';
      const root = step % 8 < 4 ? 55 : step % 8 < 6 ? 65.41 : 49.0;
      bassOsc.frequency.setValueAtTime(root, now);

      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(220, now);
      bassFilter.frequency.exponentialRampToValueAtTime(95, now + 0.45);

      bassGain.gain.setValueAtTime(0.001, now);
      bassGain.gain.linearRampToValueAtTime(0.16, now + 0.04);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.musicGain);
      bassOsc.start(now);
      bassOsc.stop(now + 0.6);

      // Sparse atmospheric arpeggio
      if (step % 2 === 0) {
        const arpOsc = this.ctx.createOscillator();
        const arpGain = this.ctx.createGain();
        arpOsc.type = 'triangle';
        const note = scale[(step * 3) % scale.length] * 2;
        arpOsc.frequency.setValueAtTime(note, now);
        arpGain.gain.setValueAtTime(0.001, now);
        arpGain.gain.linearRampToValueAtTime(0.055, now + 0.05);
        arpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        arpOsc.connect(arpGain);
        arpGain.connect(this.musicGain);
        arpOsc.start(now);
        arpOsc.stop(now + 0.95);
      }
      step++;
    };

    tick();
    this.musicTimer = window.setInterval(tick, 620);
  }

  public stopMenuMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public startMapAmbient(mapId: MapId): void {
    this.init();
    this.stopMenuMusic();
    if (this.currentAmbientMap === mapId && this.ambientSource) return;
    this.stopAmbient();
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;

    this.currentAmbientMap = mapId;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    if (mapId === 'underground_facility' || mapId === 'industrial_zone') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(170, now);
      gain.gain.setValueAtTime(0.08, now);
    } else if (mapId === 'snow_base' || mapId === 'mountain_village' || mapId === 'desert_town') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420, now);
      filter.Q.setValueAtTime(1.4, now);
      gain.gain.setValueAtTime(0.06, now);
    } else if (mapId === 'tropical_island' || mapId === 'harbor') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(340, now);
      gain.gain.setValueAtTime(0.07, now);
    } else {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, now);
      gain.gain.setValueAtTime(0.05, now);
    }

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);

    this.ambientSource = src;
    this.ambientGain = gain;
  }

  public stopAmbient(): void {
    if (this.ambientSource && 'stop' in this.ambientSource) {
      try {
        (this.ambientSource as AudioBufferSourceNode).stop();
      } catch {
        // ignore
      }
    }
    this.ambientSource = null;
    this.ambientGain = null;
    this.currentAmbientMap = null;
  }

  public playUiHover(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(820, now + 0.04);
    g.gain.setValueAtTime(0.04, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playUiClick(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.07);
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  public playEquip(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.setValueAtTime(360, now + 0.04);
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playFootstep(sprinting = false): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(sprinting ? 320 + Math.random() * 80 : 240 + Math.random() * 60, now);
    filter.Q.setValueAtTime(1.8, now);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(sprinting ? 0.14 : 0.09, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(now, Math.random() * 0.5, 0.1);
  }

  public playWeaponFire(category: WeaponCategory, distanceFactor = 1): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const vol = Math.max(0.05, Math.min(1, distanceFactor));

    if (category === 'melee' || category === 'shield') {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(category === 'shield' ? 160 : 320, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
      g.gain.setValueAtTime(0.18 * vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.15);
      return;
    }

    // Punchy low-end transient
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = category === 'sniper' ? 'sawtooth' : 'triangle';

    const baseFreq =
      category === 'sniper'
        ? 145
        : category === 'shotgun'
        ? 110
        : category === 'smg'
        ? 230
        : category === 'pistol'
        ? 210
        : 175;
    const dur = category === 'sniper' ? 0.28 : category === 'shotgun' ? 0.24 : 0.13;

    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + dur);
    oscGain.gain.setValueAtTime(0.32 * vol, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.02);

    // Crisp noise burst
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(category === 'smg' ? 1700 : 1200, now);
    filter.Q.setValueAtTime(0.8, now);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.28 * vol, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);
    src.start(now, Math.random() * 0.4, dur + 0.03);
  }

  public playReload(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [0, 0.22].forEach((offset, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(idx === 0 ? 310 : 490, now + offset);
      osc.frequency.exponentialRampToValueAtTime(idx === 0 ? 180 : 620, now + offset + 0.06);
      g.gain.setValueAtTime(0.08, now + offset);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.09);
    });
  }

  public playHitMarker(eliminated = false): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(eliminated ? 980 : 760, now);
    osc.frequency.exponentialRampToValueAtTime(eliminated ? 1320 : 520, now + 0.08);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playMatchStart(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [220, 330, 440].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.11);
      g.gain.setValueAtTime(0.09, now + i * 0.11);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.25);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.11);
      osc.stop(now + i * 0.11 + 0.26);
    });
  }

  public playVictory(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [261.63, 329.63, 392.0, 523.25].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.13);
      g.gain.setValueAtTime(0.15, now + i * 0.13);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.13 + 0.55);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.13);
      osc.stop(now + i * 0.13 + 0.58);
    });
  }

  public playDefeat(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [293.66, 261.63, 220.0, 174.61].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(480, now);
      osc.frequency.setValueAtTime(freq, now + i * 0.16);
      g.gain.setValueAtTime(0.11, now + i * 0.16);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.16 + 0.45);
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.16);
      osc.stop(now + i * 0.16 + 0.48);
    });
  }
}

export const audioEngine = new ProceduralAudioEngine();
