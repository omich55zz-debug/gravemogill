// Procedural audio engine — no external files, all sounds synthesised at runtime
// via the Web Audio API. Keeps the build tiny and avoids licensing headaches.
//
// Public API:
//   audio.play("dig"), audio.play("coin"), audio.play("unlock"),
//   audio.play("crystal"), audio.play("rareCrystal"), audio.play("place"),
//   audio.play("path"), audio.play("click"), audio.play("footstep").
//   audio.music.start()  / audio.music.stop()
//
// The first user gesture unlocks the AudioContext; we attach a one-shot
// listener so the very first play() after that "just works" on mobile.

type SoundName =
  | "dig"
  | "coin"
  | "unlock"
  | "crystal"
  | "rareCrystal"
  | "place"
  | "path"
  | "click"
  | "footstep"
  | "success"
  | "fail";

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  public muted = false;

  constructor() {
    if (typeof window !== "undefined") {
      // Wait for a user gesture before starting audio (iOS + autoplay rules).
      const unlock = () => {
        this.ensureContext();
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
        window.removeEventListener("touchstart", unlock);
      };
      window.addEventListener("pointerdown", unlock, { once: true });
      window.addEventListener("keydown", unlock, { once: true });
      window.addEventListener("touchstart", unlock, { once: true, passive: true });
    }
  }

  private ensureContext(): AudioContext | null {
    if (!this.ctx) {
      try {
        const Ctor =
          (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.6;
        this.masterGain.connect(this.ctx.destination);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.8;
        this.sfxGain.connect(this.masterGain);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.25;
        this.musicGain.connect(this.masterGain);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  setMuted(v: boolean) {
    this.muted = v;
    if (this.masterGain) this.masterGain.gain.value = v ? 0 : 0.6;
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  play(name: SoundName) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    switch (name) {
      case "dig":
        this.noiseHit(ctx, 0.18, 240, 80, 0.35);
        break;
      case "path":
        this.noiseHit(ctx, 0.14, 320, 140, 0.3);
        break;
      case "coin":
        this.toneChain(ctx, [880, 1320], [0.04, 0.08], "triangle", 0.25);
        break;
      case "success":
        this.toneChain(ctx, [523, 659, 784, 1047], [0.08, 0.08, 0.08, 0.15], "triangle", 0.3);
        break;
      case "unlock":
        this.toneChain(ctx, [523, 659, 784, 1047, 1319], [0.06, 0.06, 0.06, 0.06, 0.18], "square", 0.2);
        break;
      case "crystal":
        this.toneChain(ctx, [1760, 1320, 1975], [0.06, 0.06, 0.12], "sine", 0.25);
        break;
      case "rareCrystal":
        this.toneChain(ctx, [660, 880, 1320, 1760, 2349, 1760], [0.06, 0.06, 0.08, 0.1, 0.12, 0.18], "sine", 0.3);
        break;
      case "place":
        this.toneChain(ctx, [440, 330], [0.05, 0.1], "square", 0.18);
        break;
      case "click":
        this.toneChain(ctx, [700], [0.04], "square", 0.12);
        break;
      case "footstep":
        this.noiseHit(ctx, 0.06, 200, 40, 0.12);
        break;
      case "fail":
        this.toneChain(ctx, [330, 247, 196], [0.1, 0.1, 0.2], "sawtooth", 0.25);
        break;
    }
  }

  private toneChain(
    ctx: AudioContext,
    freqs: number[],
    durs: number[],
    type: OscillatorType,
    gain: number,
  ) {
    let t = ctx.currentTime;
    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freqs[i];
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(gain, t + 0.01);
      env.gain.linearRampToValueAtTime(0, t + durs[i]);
      osc.connect(env);
      env.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + durs[i] + 0.02);
      t += durs[i];
    }
  }

  private noiseHit(
    ctx: AudioContext,
    duration: number,
    freqStart: number,
    freqEnd: number,
    gain: number,
  ) {
    // Short noise burst band-passed around a falling frequency — good for
    // impact / dig / footstep sounds.
    const bufLen = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const t = i / bufLen;
      data[i] = (Math.random() * 2 - 1) * (1 - t);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(freqStart, ctx.currentTime);
    bp.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    bp.Q.value = 6;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, ctx.currentTime);
    env.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    src.connect(bp);
    bp.connect(env);
    env.connect(this.sfxGain!);
    src.start();
    src.stop(ctx.currentTime + duration + 0.02);
  }

  // ---------- Background music ----------
  // Very simple ambient loop: slow minor-key arpeggios over a pad drone.

  get music() { return { start: () => this.startMusic(), stop: () => this.stopMusic() }; }

  private startMusic() {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicGain) return;
    if (this.musicTimer != null) return;
    // Minor-key ambient cycle: A minor pentatonic with occasional variations.
    // Each step is ~700ms, cycle length 16 steps (~11s).
    const scale = [220, 261.6, 293.7, 329.6, 392, 440, 523.3, 587.3]; // A minor-ish
    const pattern = [0, 2, 4, 5, 4, 2, 0, -1, 2, 4, 3, 1, 0, -1, -2, -3];
    const stepMs = 700;
    const advance = () => {
      if (!this.ctx || !this.musicGain) return;
      const idx = pattern[this.musicStep % pattern.length];
      const freq = idx >= 0 ? scale[idx % scale.length] : scale[0] / 2;
      const now = this.ctx.currentTime;
      // Bell tone (short triangle with softened envelope).
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.35, now + 0.05);
      env.gain.linearRampToValueAtTime(0, now + 0.9);
      osc.connect(env);
      env.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 1);
      // Low drone every 4 steps.
      if (this.musicStep % 4 === 0) {
        const drone = this.ctx.createOscillator();
        const dEnv = this.ctx.createGain();
        drone.type = "sine";
        drone.frequency.value = 110;
        dEnv.gain.setValueAtTime(0, now);
        dEnv.gain.linearRampToValueAtTime(0.25, now + 0.5);
        dEnv.gain.linearRampToValueAtTime(0, now + 2.6);
        drone.connect(dEnv);
        dEnv.connect(this.musicGain);
        drone.start(now);
        drone.stop(now + 2.8);
      }
      this.musicStep++;
    };
    advance();
    this.musicTimer = window.setInterval(advance, stepMs);
  }

  private stopMusic() {
    if (this.musicTimer != null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const audio = new AudioEngine();
