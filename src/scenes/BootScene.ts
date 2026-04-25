import Phaser from "phaser";
import { generateAllTextures } from "../utils/sprites";

export class BootScene extends Phaser.Scene {
  constructor() { super("Boot"); }
  create() {
    generateAllTextures(this);
    this.scene.start("Menu");
  }
}
