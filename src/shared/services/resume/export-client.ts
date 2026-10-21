export async function requestResumeDocx(
  payload: {
    title: string;
    rewrittenResume: string;
    templateId?: string;
    layoutTemplateId?: string;
    visualThemeId?: string;
  },
  options: { signal?: AbortSignal; timeoutMs?: number; startedAt?: number } = {}
) {
  const started = options.startedAt ?? performance.now();
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, options.timeoutMs ?? 30000);
  try {
    const response = await fetch('/api/resume/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (
      !response.ok ||
      !response.headers
        .get('content-type')
        ?.includes('wordprocessingml.document')
    )
      throw new Error('Export failed');
    const blob = await response.blob();
    if (controller.signal.aborted)
      throw new DOMException('Export aborted', 'AbortError');
    if (!blob.size) throw new Error('Empty export');
    return { blob, durationMs: Math.round(performance.now() - started) };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}
