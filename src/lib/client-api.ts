export class ApiClientError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface ApiResult<T> {
  ok: boolean;
  data?: T;
  code?: string;
  message?: string;
}

/** Generic fetch wrapper that throws a friendly ApiClientError on failure. */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiClientError(
      "NETWORK",
      "Connection lost. Please check your internet connection and try again.",
      0,
    );
  }

  let payload: ApiResult<T> | null = null;
  const isJson = response.headers.get("content-type")?.includes("application/json");
  if (isJson) {
    try {
      payload = (await response.json()) as ApiResult<T>;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message = payload?.message ?? "Something went wrong. Please try again.";
    const code = payload?.code ?? "INTERNAL";
    throw new ApiClientError(code, message, response.status);
  }

  if (payload && !payload.ok) {
    throw new ApiClientError(payload.code ?? "INTERNAL", payload.message ?? "Something went wrong.", response.status);
  }

  return payload?.data as T;
}

export function apiJson(body: unknown, method = "POST"): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
