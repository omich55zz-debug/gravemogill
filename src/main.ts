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

// Register the service worker so the PWA works offline.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    // sw.js lives at the base URL (public/ → dist/). Using a relative path
    // lets the same build work under / and /<repo-name>/ hosts (GitHub Pages).
    const swUrl = new URL("./sw.js", document.baseURI).toString();
    navigator.serviceWorker.register(swUrl).catch(() => {
      /* ignore: offline mode is a nice-to-have. */
    });
  });
}
