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
  | "footstepStone"
  | "success"
  | "fail"
  | "zombieRise"
  | "zombieGone"
  | "zombieHit"
  | "bell"
  | "mapExpand"
  | "meow"
  | "caw"
  | "buildingUpgrade"
  | "modalOpen"
  | "modalClose"
  | "weather"
  | "rankUp"
  | "owl"
  | "wolf"
  | "choir"
  | "splash"
  | "doorCreak"
  | "tombThud"
  | "coinRain"
  | "heartbeat";

const PREFS_KEY = "gravemogill.audio.v1";
interface AudioPrefs { master: number; sfx: number; music: number; muted: boolean; }
function loadPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { master: 0.6, sfx: 0.8, music: 0.25, muted: false, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { master: 0.6, sfx: 0.8, music: 0.25, muted: false };
}
function savePrefs(p: AudioPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  public muted = false;
  public prefs: AudioPrefs = loadPrefs();

  constructor() {
    this.muted = this.prefs.muted;
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
        this.masterGain.gain.value = this.muted ? 0 : this.prefs.master;
        this.masterGain.connect(this.ctx.destination);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.prefs.sfx;
        this.sfxGain.connect(this.masterGain);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.prefs.music;
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
    this.prefs.muted = v;
    savePrefs(this.prefs);
    if (this.masterGain) this.masterGain.gain.value = v ? 0 : this.prefs.master;
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setMasterVolume(v: number) {
    this.prefs.master = Math.max(0, Math.min(1, v));
    savePrefs(this.prefs);
    if (this.masterGain && !this.muted) this.masterGain.gain.value = this.prefs.master;
  }
  setSfxVolume(v: number) {
    this.prefs.sfx = Math.max(0, Math.min(1, v));
    savePrefs(this.prefs);
    if (this.sfxGain) this.sfxGain.gain.value = this.prefs.sfx;
  }
  setMusicVolume(v: number) {
    this.prefs.music = Math.max(0, Math.min(1, v));
    savePrefs(this.prefs);
    if (this.musicGain) this.musicGain.gain.value = this.prefs.music;
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
      case "zombieRise":
        // Low rumble with rising pitch — earth splitting open.
        this.toneChain(ctx, [80, 110, 140, 175], [0.12, 0.12, 0.12, 0.25], "sawtooth", 0.22);
        this.noiseHit(ctx, 0.4, 180, 60, 0.22);
        break;
      case "zombieGone":
        // Muffled puff of dust.
        this.noiseHit(ctx, 0.25, 900, 200, 0.2);
        break;
      case "zombieHit":
        // Sharp whack — shovel meets skull.
        this.noiseHit(ctx, 0.12, 600, 100, 0.4);
        this.toneChain(ctx, [180, 130], [0.05, 0.08], "square", 0.18);
        break;
      case "footstepStone":
        // Sharper, higher than dirt footstep — boot on cobblestone.
        this.noiseHit(ctx, 0.05, 600, 200, 0.13);
        break;
      case "bell":
        // Deep cathedral bell with long decay — used on hour changes.
        this.bellTone(ctx, 196, 1.6, 0.32);
        this.bellTone(ctx, 392, 1.4, 0.18);
        break;
      case "mapExpand":
        // Magical "shing" — rising arpeggio with shimmer.
        this.toneChain(ctx, [523, 784, 1046, 1568, 2093], [0.06, 0.06, 0.08, 0.1, 0.2], "triangle", 0.22);
        this.noiseHit(ctx, 0.45, 4000, 800, 0.08);
        break;
      case "meow":
        // Cat purr-meow with slight pitch waver — short and friendly.
        this.meow(ctx);
        break;
      case "caw":
        // Crow caw — gravelly noise burst with falling pitch.
        this.noiseHit(ctx, 0.22, 1200, 300, 0.28);
        this.noiseHit(ctx, 0.18, 900, 240, 0.22);
        break;
      case "buildingUpgrade":
        // Heavy resonant gong — building tier up.
        this.bellTone(ctx, 130, 2.2, 0.42);
        this.toneChain(ctx, [261, 392, 523], [0.12, 0.12, 0.25], "triangle", 0.28);
        break;
      case "modalOpen":
        // Soft swoosh up.
        this.toneChain(ctx, [440, 660], [0.05, 0.08], "sine", 0.1);
        break;
      case "modalClose":
        // Soft swoosh down.
        this.toneChain(ctx, [660, 440], [0.05, 0.08], "sine", 0.1);
        break;
      case "weather":
        // Wind whoosh — long noise burst.
        this.noiseHit(ctx, 0.7, 350, 90, 0.16);
        break;
      case "rankUp":
        // Triumphant fanfare — reputation rank up.
        this.toneChain(ctx, [392, 523, 659, 784, 1046, 1319], [0.08, 0.08, 0.08, 0.08, 0.12, 0.25], "triangle", 0.3);
        this.bellTone(ctx, 261, 1.4, 0.2);
        break;
      case "owl":
        // Two-note "whoo-whooo" with breath.
        this.owlHoot(ctx);
        break;
      case "wolf":
        // Long mournful howl with vibrato.
        this.wolfHowl(ctx);
        break;
      case "choir":
        // Distant choral chord — stacked slow sine tones.
        this.choir(ctx);
        break;
      case "splash":
        // Short watery splash — descending noise + bubbly mod.
        this.noiseHit(ctx, 0.22, 1800, 400, 0.22);
        this.toneChain(ctx, [440, 300], [0.04, 0.08], "sine", 0.12);
        break;
      case "doorCreak":
        // Long creak — rising-then-falling sawtooth sweep + friction noise.
        this.doorCreak(ctx);
        break;
      case "tombThud":
        // Heavy stone-on-stone settle.
        this.noiseHit(ctx, 0.14, 150, 60, 0.5);
        this.toneChain(ctx, [80, 55], [0.06, 0.1], "sawtooth", 0.28);
        break;
      case "coinRain":
        // Cascade of little dings — big payout.
        for (let i = 0; i < 8; i++) {
          setTimeout(() => {
            this.toneChain(ctx, [1200 + Math.random() * 400, 1600 + Math.random() * 400],
              [0.03, 0.06], "triangle", 0.14);
          }, i * 70);
        }
        break;
      case "heartbeat":
        // Two thumps low-passed — danger ambient.
        this.heartBeat(ctx);
        break;
    }
  }

  /** Owl two-note hoot "whoo-whoooo". */
  private owlHoot(ctx: AudioContext) {
    if (!this.sfxGain) return;
    const now = ctx.currentTime;
    // First short hoot.
    this.owlTone(ctx, now, 0.22, 0.18);
    // Second longer hoot.
    this.owlTone(ctx, now + 0.3, 0.42, 0.2);
  }

  private owlTone(ctx: AudioContext, t0: number, dur: number, gain: number) {
    if (!this.sfxGain) return;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(260, t0);
    osc.frequency.linearRampToValueAtTime(230, t0 + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 600;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(gain, t0 + 0.08);
    env.gain.linearRampToValueAtTime(gain * 0.9, t0 + dur * 0.7);
    env.gain.linearRampToValueAtTime(0, t0 + dur);
    osc.connect(lp).connect(env).connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** Distant wolf howl — long vibrato. */
  private wolfHowl(ctx: AudioContext) {
    if (!this.sfxGain) return;
    const now = ctx.currentTime;
    const dur = 1.8;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(360, now + 0.45);
    osc.frequency.linearRampToValueAtTime(420, now + 1.0);
    osc.frequency.linearRampToValueAtTime(280, now + dur);
    // Vibrato.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 4.5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 12;
    lfo.connect(lfoGain).connect(osc.frequency);
    // Slightly muffled — distant.
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.18, now + 0.3);
    env.gain.linearRampToValueAtTime(0.22, now + 1.1);
    env.gain.linearRampToValueAtTime(0, now + dur);
    osc.connect(lp).connect(env).connect(this.sfxGain);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + dur + 0.1);
    lfo.stop(now + dur + 0.1);
  }

  /** Slow choral chord — D minor pad. */
  private choir(ctx: AudioContext) {
    if (!this.sfxGain) return;
    const now = ctx.currentTime;
    const freqs = [146.8, 220, 261.6, 349.2]; // D3 A3 C4 F4 — minor with add-4
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.09, now + 0.9);
      env.gain.linearRampToValueAtTime(0.05, now + 2.4);
      env.gain.linearRampToValueAtTime(0, now + 3.5);
      osc.connect(env).connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 3.6);
    }
  }

  /** Door creak — friction noise + pitched sawtooth sweep. */
  private doorCreak(ctx: AudioContext) {
    if (!this.sfxGain) return;
    const now = ctx.currentTime;
    const dur = 0.55;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(260, now + dur * 0.6);
    osc.frequency.linearRampToValueAtTime(170, now + dur);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 420;
    bp.Q.value = 3;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.18, now + 0.08);
    env.gain.linearRampToValueAtTime(0.12, now + dur * 0.7);
    env.gain.linearRampToValueAtTime(0, now + dur);
    osc.connect(bp).connect(env).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.05);
    // Brief friction noise at start.
    this.noiseHit(ctx, 0.12, 900, 300, 0.08);
  }

  /** Two low thumps — heartbeat. */
  private heartBeat(ctx: AudioContext) {
    const sfx = this.sfxGain;
    if (!sfx) return;
    const thump = (t0: number) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, t0);
      osc.frequency.linearRampToValueAtTime(60, t0 + 0.12);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 280;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t0);
      env.gain.linearRampToValueAtTime(0.42, t0 + 0.02);
      env.gain.linearRampToValueAtTime(0, t0 + 0.14);
      osc.connect(lp).connect(env).connect(sfx);
      osc.start(t0);
      osc.stop(t0 + 0.16);
    };
    const now = ctx.currentTime;
    thump(now);
    thump(now + 0.28);
  }

  /** Long-decay bell tone with a metallic partial. */
  private bellTone(ctx: AudioContext, freq: number, dur: number, gain: number) {
    if (!this.sfxGain) return;
    const now = ctx.currentTime;
    const fundamental = ctx.createOscillator();
    fundamental.type = "sine";
    fundamental.frequency.value = freq;
    const partial = ctx.createOscillator();
    partial.type = "sine";
    partial.frequency.value = freq * 2.756; // inharmonic bell partial
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);
    const partialEnv = ctx.createGain();
    partialEnv.gain.setValueAtTime(0, now);
    partialEnv.gain.linearRampToValueAtTime(gain * 0.4, now + 0.01);
    partialEnv.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.55);
    fundamental.connect(env);
    partial.connect(partialEnv);
    env.connect(this.sfxGain);
    partialEnv.connect(this.sfxGain);
    fundamental.start(now);
    partial.start(now);
    fundamental.stop(now + dur + 0.05);
    partial.stop(now + dur * 0.6 + 0.05);
  }

  /** Quick sliding "miau" with vibrato. */
  private meow(ctx: AudioContext) {
    if (!this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.linearRampToValueAtTime(620, now + 0.12);
    osc.frequency.linearRampToValueAtTime(440, now + 0.32);
    // Vibrato.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 7;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 18;
    lfo.connect(lfoGain).connect(osc.frequency);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1400;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.18, now + 0.04);
    env.gain.linearRampToValueAtTime(0.12, now + 0.2);
    env.gain.linearRampToValueAtTime(0, now + 0.36);
    osc.connect(lp).connect(env).connect(this.sfxGain);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.4);
    lfo.stop(now + 0.4);
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
