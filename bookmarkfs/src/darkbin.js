import { mountDarkBinSurface } from "./darkbin-surface.js";

function mount() {
  const root = document.getElementById("darkbin-root");
  if (!root) {
    return;
  }
  void mountDarkBinSurface(root);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}
