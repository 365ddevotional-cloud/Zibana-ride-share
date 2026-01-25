export class NetworkError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isOffline: boolean = false,
    public isTimeout: boolean = false
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function getUserFriendlyErrorMessage(error: unknown): string {
  if (!isOnline()) {
    return "You appear to be offline. Please check your internet connection.";
  }

  if (error instanceof NetworkError) {
    if (error.isTimeout) {
      return "Request timed out. Please try again.";
    }
    if (error.isOffline) {
      return "Unable to connect. Please check your internet connection.";
    }
    if (error.statusCode === 401) {
      return "Your session has expired. Please sign in again.";
    }
    if (error.statusCode === 403) {
      return "You don't have permission to perform this action.";
    }
    if (error.statusCode === 404) {
      return "The requested resource was not found.";
    }
    if (error.statusCode === 429) {
      return "Too many requests. Please wait a moment and try again.";
    }
    if (error.statusCode && error.statusCode >= 500) {
      return "Server error. Please try again later.";
    }
  }

  if (error instanceof Error) {
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      return "Connection failed. Please check your internet and try again.";
    }
    if (error.message.includes("timeout")) {
      return "Request timed out. Please try again.";
    }
  }

  return "Something went wrong. Please try again.";
}

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  timeout?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    timeout = 30000,
    shouldRetry = (error, attempt) => {
      if (attempt >= maxRetries) return false;
      if (error instanceof NetworkError) {
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          return false;
        }
      }
      return true;
    },
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const result = await fetchFn();
        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error, attempt)) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export function createNetworkStatusListener(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}
