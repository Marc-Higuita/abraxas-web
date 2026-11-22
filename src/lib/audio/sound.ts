"use client";
/**
 * Gestor de audio de la exposición (Web Audio API, un solo contexto para todo el sitio).
 *
 * Canal 1 · música ambiental (fondo.mp3 = «fodno.mp3» del equipo): bucle, volumen bajo,
 *           se activa/silencia con setMusicOn; fundidos suaves; el estado persiste.
 * Canal 2 · efectos: play(nombre) con anti-rebote por efecto, límite de voces y
 *           precarga; independiente del botón de música (se apaga con setSfxOn).
 * Canal 3 · audio de video: setVideoActive(true) baja la música mientras suena un video.
 * Ducking: cada efecto marcado como "importante" baja la música un instante y la recupera.
 *
 * Nada suena antes de una interacción válida: unlock() se llama en el primer gesto.
 */

export type SfxName =
  | "cuarto-magico" | "fotos-desplazamiento" | "tunel" | "puerta-vidrio"
  | "habitacion-aparece" | "fotos-fragmentan" | "collage-ensambla"
  | "libro-abrir" | "pagina" | "libro-cerrar"
  | "recorte-tomar" | "recorte-arrastrar" | "recorte-pegar" | "recortar" | "composicion-completa";

const BASE = "/assets/audio/";
const MUSIC_SRC = BASE + "fondo.mp3";
const MUSIC_VOL = 0.16;
const LS = "abx-audio-v1";

/** volumen relativo, ms mínimos entre repeticiones, si hace ducking */
const SFX: Record<SfxName, { vol: number; gap: number; duck?: boolean; maxDur?: number }> = {
  "cuarto-magico": { vol: 0.5, gap: 9000 },
  "fotos-desplazamiento": { vol: 0.35, gap: 12000, maxDur: 6 },
  tunel: { vol: 0.55, gap: 8000, duck: true },
  "puerta-vidrio": { vol: 0.6, gap: 10000, duck: true },
  "habitacion-aparece": { vol: 0.55, gap: 10000, duck: true },
  "fotos-fragmentan": { vol: 0.45, gap: 9000, maxDur: 6 },
  "collage-ensambla": { vol: 0.5, gap: 8000 },
  "libro-abrir": { vol: 0.8, gap: 600, duck: true },
  pagina: { vol: 0.7, gap: 220 },
  "libro-cerrar": { vol: 0.8, gap: 600 },
  "recorte-tomar": { vol: 0.55, gap: 250, maxDur: 1.2 },
  "recorte-arrastrar": { vol: 0.35, gap: 900 },
  "recorte-pegar": { vol: 0.7, gap: 150 },
  recortar: { vol: 0.7, gap: 300 },
  "composicion-completa": { vol: 0.85, gap: 1500, duck: true },
};
const MAX_VOICES = 4;

type Listener = () => void;
interface State { musicOn: boolean; sfxOn: boolean; unlocked: boolean }

class SoundManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private musicEl: HTMLAudioElement | null = null;
  private buffers = new Map<SfxName, Promise<AudioBuffer | null>>();
  private last = new Map<SfxName, number>();
  private voices: { src: AudioBufferSourceNode; name: SfxName }[] = [];
  private duckUntil = 0;
  private videoActive = false;
  private listeners = new Set<Listener>();
  private detach: () => void = () => {};
  private mediaConnected = false;
  state: State = { musicOn: true, sfxOn: true, unlocked: false };

  constructor() {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(localStorage.getItem(LS) || "{}");
      if (typeof saved.musicOn === "boolean") this.state.musicOn = saved.musicOn;
      if (typeof saved.sfxOn === "boolean") this.state.sfxOn = saved.sfxOn;
    } catch { /* sin almacenamiento */ }
    // Eventos que los navegadores aceptan como gesto de activación. Se mantienen hasta que el
    // contexto queda "running" y la música arrancó (en móviles pointerdown táctil NO activa; touchend sí).
    const unlock = () => this.unlock();
    const evs = ["pointerdown", "pointerup", "mousedown", "touchend", "keydown", "click", "wheel"] as const;
    evs.forEach((e) => window.addEventListener(e, unlock, { passive: true, capture: true }));
    this.detach = () => evs.forEach((e) => window.removeEventListener(e, unlock, { capture: true } as EventListenerOptions));
    // la pista de fondo se descarga desde el inicio para que suene apenas haya permiso
    this.musicEl = new Audio(MUSIC_SRC);
    this.musicEl.loop = true;
    this.musicEl.preload = "auto";
    this.musicEl.crossOrigin = "anonymous";
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) { this.musicEl?.pause(); this.ctx.suspend().catch(() => {}); }
      else { this.ctx.resume().catch(() => {}); if (this.state.musicOn && this.state.unlocked) this.musicEl?.play().catch(() => {}); }
    });
  }

  /** la música se retoma si algo externo la pausó mientras debía sonar */
  private watchdog = typeof window !== "undefined" ? window.setInterval(() => {
    if (!this.ctx || !this.musicEl || !this.state.unlocked || !this.state.musicOn || document.hidden) return;
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    if (this.musicEl.paused) this.musicEl.play().catch(() => {});
  }, 2500) : 0;

  subscribe(fn: Listener) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() {
    try { localStorage.setItem(LS, JSON.stringify({ musicOn: this.state.musicOn, sfxOn: this.state.sfxOn })); } catch { /* */ }
    this.state = { ...this.state };
    this.listeners.forEach((f) => f());
  }

  private ensure() {
    if (this.ctx || typeof window === "undefined") return this.ctx;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.state.sfxOn ? 1 : 0;
    this.sfxGain.connect(this.master);
    if (this.musicEl && !this.mediaConnected) {
      try { this.ctx.createMediaElementSource(this.musicEl).connect(this.musicGain); this.mediaConnected = true; }
      catch { /* sin Web Audio para el elemento: se usa su volumen propio */ }
    }
    // todos los efectos pesan ~1 MB: se descargan y decodifican de una vez para que suenen sin retraso
    (Object.keys(SFX) as SfxName[]).forEach((n) => this.load(n));
    return this.ctx;
  }

  /** primer gesto válido del visitante: a partir de aquí el navegador permite sonido */
  unlock() {
    const ctx = this.ensure();
    if (!ctx) return;
    const done = () => {
      if (ctx.state !== "running") return;
      if (!this.state.unlocked) { this.state.unlocked = true; this.emit(); }
      // iOS: un búfer silencioso dentro del gesto termina de habilitar el canal de efectos
      try { const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch { /* */ }
      if (this.state.musicOn) this.startMusic();
      else this.detach();
    };
    if (ctx.state === "running") done();
    else ctx.resume().then(done).catch(() => {});
  }

  private startMusic() {
    if (!this.ctx || !this.musicEl) return;
    const el = this.musicEl;
    if (!this.mediaConnected) el.volume = this.targetMusic() / MUSIC_VOL * 0.3;
    const p = el.play();
    if (p) p.then(() => this.detach()).catch(() => { /* sigue esperando un gesto válido */ });
    this.rampMusic();
  }

  private targetMusic() {
    if (!this.state.musicOn) return 0;
    let v = MUSIC_VOL;
    if (this.videoActive) v *= 0.15;
    if (performance.now() < this.duckUntil) v *= 0.45;
    return v;
  }

  private rampMusic(time = 0.8) {
    if (!this.ctx) return;
    const g = this.musicGain.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(this.targetMusic(), now + time);
  }

  setMusicOn(on: boolean) {
    this.state.musicOn = on;
    this.emit();
    if (!this.ctx) return;
    if (on) this.startMusic();
    else {
      this.rampMusic(0.6);
      window.setTimeout(() => { if (!this.state.musicOn) this.musicEl?.pause(); }, 700);
    }
  }
  toggleMusic() { this.unlock(); this.setMusicOn(!this.state.musicOn); }

  setSfxOn(on: boolean) {
    this.state.sfxOn = on;
    this.emit();
    if (this.ctx) this.sfxGain.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05);
    if (!on) this.stopAll();
  }
  toggleSfx() { this.unlock(); this.setSfxOn(!this.state.sfxOn); }

  /** canal 3: un video con sonido baja la música mientras se reproduce */
  setVideoActive(active: boolean) { this.videoActive = active; this.rampMusic(0.5); }

  /** baja la música un instante (ducking) */
  duck(ms = 1600) {
    this.duckUntil = performance.now() + ms;
    this.rampMusic(0.25);
    window.setTimeout(() => this.rampMusic(1.2), ms);
  }

  private load(name: SfxName) {
    let p = this.buffers.get(name);
    if (!p) {
      const ctx = this.ctx;
      p = ctx
        ? fetch(BASE + name + ".mp3").then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).catch(() => null)
        : Promise.resolve(null);
      if (ctx) this.buffers.set(name, p);
    }
    return p;
  }

  preload(names: SfxName[]) { if (this.ctx) names.forEach((n) => this.load(n)); }

  /** reproduce un efecto; devuelve false si se omitió (silenciado, anti-rebote, sin desbloquear) */
  play(name: SfxName, opts: { volume?: number; force?: boolean } = {}) {
    if (!this.state.sfxOn || !this.state.unlocked || !this.ctx) return false;
    const cfg = SFX[name];
    const now = performance.now();
    if (!opts.force && now - (this.last.get(name) ?? -1e9) < cfg.gap) return false;
    this.last.set(name, now);
    const ctx = this.ctx;
    this.load(name).then((buf) => {
      if (!buf || !this.state.sfxOn) return;
      while (this.voices.length >= MAX_VOICES) { const v = this.voices.shift(); try { v?.src.stop(); } catch { /* */ } }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      const vol = cfg.vol * (opts.volume ?? 1);
      g.gain.value = vol;
      src.connect(g).connect(this.sfxGain);
      const dur = cfg.maxDur ? Math.min(cfg.maxDur, buf.duration) : buf.duration;
      if (cfg.maxDur && buf.duration > cfg.maxDur) {
        g.gain.setValueAtTime(vol, ctx.currentTime + dur - 0.6);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
      }
      src.start(0, 0, dur);
      const voice = { src, name };
      this.voices.push(voice);
      src.onended = () => { this.voices = this.voices.filter((v) => v !== voice); };
      if (cfg.duck) this.duck(Math.min(2400, dur * 1000));
    });
    return true;
  }

  /** tecla de máquina de escribir: golpe corto sintetizado (el paquete del equipo no trae este sonido) */
  typeKey(strength = 1) {
    if (!this.state.sfxOn || !this.state.unlocked || !this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime, len = 0.045;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800 + Math.random() * 900; bp.Q.value = 1.4;
    const g = ctx.createGain(); g.gain.value = 0.22 * strength;
    src.connect(bp).connect(g).connect(this.sfxGain);
    src.start(t0);
  }

  /** corta los efectos largos de una sección al salir de ella */
  stop(names?: SfxName[]) {
    this.voices.forEach((v) => {
      if (names && !names.includes(v.name)) return;
      try { v.src.stop(); } catch { /* */ }
    });
  }
  stopAll() { this.stop(); }
}

export const sound: SoundManager =
  typeof window === "undefined"
    ? (new Proxy({}, { get: () => () => false }) as unknown as SoundManager)
    : ((window as unknown as { __abxSound?: SoundManager }).__abxSound ??= new SoundManager());
