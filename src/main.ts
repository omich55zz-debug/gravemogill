import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { GameScene } from "./scenes/GameScene";
import { UIScene } from "./scenes/UIScene";

function computeSize() {
  return {
    width: Math.min(window.innerWidth, 1280),
    height: Math.min(window.innerHeight, 900),
  };
}

const size = computeSize();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#0b0b12",
  width: size.width,
  height: size.height,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, UIScene],
  physics: { default: "arcade", arcade: { debug: false } },
  input: { activePointers: 3 },
};

new Phaser.Game(config);
