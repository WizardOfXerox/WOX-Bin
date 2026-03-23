export function getPasteAccessCookieName(slug: string) {
  return `woxbin-access-${slug}`;
}

export function getPasteCaptchaCookieName(slug: string) {
  return `woxbin-human-${slug}`;
}
