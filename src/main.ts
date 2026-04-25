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
  // Transparent so the Three.js 3D scene (mounted behind the Phaser canvas)
  // shows through. Phaser draws only the HUD on top.
  transparent: true,
  backgroundColor: "rgba(0,0,0,0)",
  width: size.width,
  height: size.height,
  pixelArt: false,
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, UIScene],
  physics: { default: "arcade", arcade: { debug: false } },
  input: { activePointers: 3 },
};

const game = new Phaser.Game(config);

// Ensure Phaser's canvas sits above the Three.js canvas (which is inserted
// later by ThreeWorld with z-index 0). Use inline style + high z-index.
game.events.once("ready", () => {
  const c = game.canvas;
  if (c) {
    c.style.position = "absolute";
    c.style.inset = "0";
    c.style.zIndex = "10";
    c.style.background = "transparent";
  }
});

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
