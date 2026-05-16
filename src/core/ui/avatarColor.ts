const AVATAR_PALETTE = [
  '#06B6D4',
  '#22D3EE',
  '#10B981',
  '#F59E0B',
  '#F43F5E',
  '#EC4899',
  '#84CC16',
  '#A78BFA',
];

export function avatarColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function avatarInitial(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}
