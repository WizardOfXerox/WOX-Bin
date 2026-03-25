import { mountAfterdarkSurface } from "./afterdark-surface.js";

window.addEventListener("load", () => {
  const params = new URLSearchParams(window.location.search || "");
  document.body.classList.add("ext-app", "ext-afterdark-view");
  if (params.get("embed") === "1") {
    document.body.classList.add("ext-afterdark-embedded");
  }
  const root = document.getElementById("afterdark-root");
  void mountAfterdarkSurface(root);
});
