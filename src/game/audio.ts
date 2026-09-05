// Quiet, locally synthesised ambience. Audio starts only after an explicit user gesture.
export class Ambience {
  context: AudioContext | null = null;
  gain: GainNode | null = null;
  oscillators: OscillatorNode[] = [];
  async start() {
    if (!this.context) {
      this.context = new AudioContext();
      this.gain = this.context.createGain();
      this.gain.gain.value = 0.015;
      this.gain.connect(this.context.destination);
      for (const f of [55, 82.4, 110.3]) {
        const o = this.context.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        o.connect(this.gain);
        o.start();
        this.oscillators.push(o);
      }
    }
    await this.context.resume();
  }
  stop() {
    void this.context?.suspend();
  }
  dispose() {
    this.oscillators.forEach((o) => o.stop());
    void this.context?.close();
  }
}
