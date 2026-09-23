/** Platform owner can see/manage all institutes. Everyone else = tenant (own only). */
export function getPlatformOwnerEmail(): string {
  return (
    process.env.NEXT_PUBLIC_PLATFORM_OWNER_EMAIL ||
    process.env.PLATFORM_OWNER_EMAIL ||
    "cdas99633@gmail.com"
  )
    .trim()
    .toLowerCase();
}

export function isPlatformOwner(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === getPlatformOwnerEmail();
}
