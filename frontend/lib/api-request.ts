export type RequestFailureKind = 'timeout' | 'network';

export class RequestFailure extends Error {
  constructor(
    public readonly kind: RequestFailureKind,
    message: string,
  ) {
    super(message);
    this.name = 'RequestFailure';
  }
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;

  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const signal = init.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal;

  try {
    return await fetch(input, {
      ...init,
      signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new RequestFailure(
        'timeout',
        'Permintaan terlalu lama. Periksa koneksi Anda lalu coba lagi.',
      );
    }

    // A caller deliberately cancelled it; do not falsely report a network outage.
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    if (error instanceof TypeError) {
      throw new RequestFailure(
        'network',
        'Tidak dapat terhubung ke layanan. Periksa koneksi internet lalu coba lagi.',
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}