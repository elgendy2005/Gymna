// Demo media is stored as paths relative to one base URL, so the files can
// move to a CDN later by changing this value alone.
const MEDIA_BASE_URL = "/exercise-media";

/** Frame size of the bundled photo demos. */
export const FRAME_SIZE = { width: 600, height: 400 } as const;

/** Resolves a stored media path. Absolute URLs pass through unchanged. */
export function exerciseMediaUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${MEDIA_BASE_URL}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
