/** True when the drag operation includes local files (desktop / OS file drag). */
export function dataTransferHasFiles(dt: DataTransfer | null | undefined): boolean {
  return !!dt?.types?.includes("Files");
}
