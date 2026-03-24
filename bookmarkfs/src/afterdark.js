import { mountAfterdarkSurface } from "./afterdark-surface.js";

window.addEventListener("load", () => {
  document.body.classList.add("ext-app", "ext-afterdark-view");
  const root = document.getElementById("afterdark-root");
  void mountAfterdarkSurface(root);
});
