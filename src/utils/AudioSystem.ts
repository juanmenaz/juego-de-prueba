class AudioSystem {
  private ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playJump() {
    this.playTone(400, 'square', 0.1, 0.1);
    setTimeout(() => this.playTone(600, 'square', 0.1, 0.05), 50);
  }

  playDash() {
    this.playTone(200, 'sawtooth', 0.2, 0.1);
    this.playTone(150, 'sawtooth', 0.2, 0.1);
  }

  playShoot() {
    this.playTone(800, 'sine', 0.05, 0.1);
    this.playTone(400, 'sine', 0.05, 0.05);
  }

  playHit() {
    this.playTone(100, 'sawtooth', 0.3, 0.2);
    this.playTone(50, 'sawtooth', 0.3, 0.1);
  }

  playWin() {
    [440, 554, 659, 880].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.2, 0.1), i * 100);
    });
  }
}

export const audio = new AudioSystem();
