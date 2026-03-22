/** PDF default user space is 72 points per inch; PDF.js viewport scale ≈ dpi / 72. */
export const DPI_PRESETS = [
  { label: "Screen", sub: "72 DPI", dpi: 72 },
  { label: "Standard", sub: "150 DPI", dpi: 150 },
  { label: "High", sub: "300 DPI", dpi: 300 },
  { label: "Ultra", sub: "600 DPI", dpi: 600 }
] as const;

export type DpiPreset = (typeof DPI_PRESETS)[number]["dpi"];

export function dpiToRenderScale(dpi: number): number {
  return dpi / 72;
}
