import Phaser from "phaser";
import { CONFIG } from "../data/config";

/** Tracks in-game day/time. Fires "dayChanged" and "hourChanged" events. */
export class TimeSystem extends Phaser.Events.EventEmitter {
  day = 1;
  hour = 8; // 8:00 AM start
  paused = false;

  private accum = 0;
  private lastHour = 8;

  tick(deltaMs: number) {
    if (this.paused) return;
    this.accum += deltaMs;
    // 1 day = DAY_MS, 16 waking hours mapped across it (8:00 -> 24:00).
    const progressDay = (this.accum % CONFIG.DAY_MS) / CONFIG.DAY_MS;
    this.hour = 8 + Math.floor(progressDay * 16);
    if (this.hour !== this.lastHour) {
      this.lastHour = this.hour;
      this.emit("hourChanged", this.hour);
    }
    if (this.accum >= CONFIG.DAY_MS) {
      this.accum -= CONFIG.DAY_MS;
      this.day++;
      this.hour = 8;
      this.lastHour = 8;
      this.emit("dayChanged", this.day);
    }
  }

  setPaused(v: boolean) { this.paused = v; }

  timeString(): string {
    return `${String(this.hour).padStart(2, "0")}:00`;
  }
}
