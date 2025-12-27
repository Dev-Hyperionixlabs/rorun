/**
 * Optional malware scanning hook.
 * In v1, this is a no-op unless an external scanner is wired in.
 */
export async function scanUploadedObject(_storageKey: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  // Placeholder: integrate with virus scanner (e.g. ClamAV/Lambda) later.
  return { ok: true };
}


