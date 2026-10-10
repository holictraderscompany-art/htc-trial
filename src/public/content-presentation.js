export const categoryLabels = {
  INTRODUCTION: 'Introduction', INFORMATION: 'Information', EDITORIAL: 'Editorial',
  DISCOVERY: 'Discovery', FUTURE_JOURNEY: 'Future journey', VALIDATION: 'Validation',
};
export const mimeLabels = {
  'image/jpeg': 'JPEG image', 'image/png': 'PNG image', 'image/webp': 'WebP image',
  'video/mp4': 'MP4 video', 'audio/mpeg': 'MP3 audio', 'application/pdf': 'PDF document',
};
export const roleLabels = { PRIMARY: 'Primary media', THUMBNAIL: 'Thumbnail reference', ATTACHMENT: 'Attachment' };
export function continuationPath(cursor, category) {
  const parameters = new URLSearchParams({ cursor });
  if (category) parameters.set('category', category);
  return `/content?${parameters}`;
}
