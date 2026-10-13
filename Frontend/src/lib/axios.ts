import axios, { AxiosError, AxiosInstance } from "axios";
import { logger } from "./logger";
import { isAPIError, getErrorMessage } from "./apiTypes";
import { SERVICE_IDS } from "./serviceIds";

/**
 * Create API instance with interceptors
 */
export const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second timeout
});

/**
 * Helper to match relative API paths to their corresponding serviceId and extract path parameters.
 */
function matchRequest(
  url: string,
  method: string,
  data: any,
  params: any
): { serviceId: string; params?: Record<string, string> } | null {
  let path = url.split("?")[0];

  // Resolve absolute URLs to pathnames
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const parsed = new URL(path);
      path = parsed.pathname;
    } catch {
      // Ignore and proceed
    }
  }

  // Remove "/api" prefix if present
  if (path.startsWith("/api")) {
    path = path.substring(4);
  }

  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  const m = method.toUpperCase();

  // Exclude the centralized service endpoint itself
  if (path === "/service" || path === "/service/registry") {
    return null;
  }

  const match = (pattern: string) => {
    const regexPath = pattern.replace(/:[a-zA-Z0-9]+/g, "([^/]+)");
    const regex = new RegExp(`^${regexPath}$`);
    const result = path.match(regex);
    if (!result) return null;

    const keys = (pattern.match(/:[a-zA-Z0-9]+/g) || []).map((k) => k.substring(1));
    const extractedParams: Record<string, string> = {};
    keys.forEach((key, index) => {
      extractedParams[key] = result[index + 1];
    });
    return extractedParams;
  };

  // Auth Routes
  if (path === "/auth/register" && m === "POST") return { serviceId: SERVICE_IDS.AUTH.REGISTER };
  if (path === "/auth/login" && m === "POST") return { serviceId: SERVICE_IDS.AUTH.LOGIN };
  if (path === "/auth/logout" && m === "POST") return { serviceId: SERVICE_IDS.AUTH.LOGOUT };
  if (path === "/auth/me" && m === "GET") return { serviceId: SERVICE_IDS.AUTH.ME };
  if (path === "/auth/users" && m === "GET") return { serviceId: SERVICE_IDS.AUTH.USERS };
  if (path === "/auth/change-password" && m === "POST") return { serviceId: SERVICE_IDS.AUTH.CHANGE_PASSWORD };

  // Meetings
  let resParams = match("/meetings/:id/chat");
  if (resParams) return { serviceId: SERVICE_IDS.MEETINGS.CHAT, params: resParams };

  resParams = match("/meetings/:id/summarize");
  if (resParams) return { serviceId: SERVICE_IDS.MEETINGS.SUMMARIZE, params: resParams };

  resParams = match("/meetings/:id/delete");
  if (resParams) return { serviceId: SERVICE_IDS.MEETINGS.DELETE, params: resParams };

  resParams = match("/meetings/:id/archive");
  if (resParams) return { serviceId: SERVICE_IDS.MEETINGS.ARCHIVE, params: resParams };

  resParams = match("/meetings/:id/unArchive");
  if (resParams) return { serviceId: SERVICE_IDS.MEETINGS.UNARCHIVE, params: resParams };

  resParams = match("/meetings/:id/restore");
  if (resParams) return { serviceId: SERVICE_IDS.MEETINGS.RESTORE, params: resParams };

  resParams = match("/meetings/:id/pin");
  if (resParams) return { serviceId: SERVICE_IDS.MEETINGS.PIN, params: resParams };

  resParams = match("/meetings/:id/permanent");
  if (resParams) return { serviceId: SERVICE_IDS.MEETINGS.PERMANENT_DELETE, params: resParams };

  resParams = match("/meetings/:id/publish");
  if (resParams) return { serviceId: SERVICE_IDS.MEETINGS.PUBLISH, params: resParams };

  if (path === "/meetings/create/clone" && m === "POST") return { serviceId: SERVICE_IDS.MEETINGS.CLONE };

  resParams = match("/meetings/public/share/:token/verify");
  if (resParams) return { serviceId: SERVICE_IDS.MEETINGS.PUBLIC_SHARE_GET, params: resParams };

  resParams = match("/meetings/public/share/:token");
  if (resParams) return { serviceId: SERVICE_IDS.MEETINGS.PUBLIC_SHARE_GET, params: resParams };

  resParams = match("/meetings/:id");
  if (resParams) {
    if (m === "GET") return { serviceId: SERVICE_IDS.MEETINGS.GET, params: resParams };
    if (m === "PUT" || m === "PATCH") return { serviceId: SERVICE_IDS.MEETINGS.UPDATE, params: resParams };
  }

  if (path === "/meetings") {
    if (m === "GET") return { serviceId: SERVICE_IDS.MEETINGS.LIST };
    if (m === "POST") return { serviceId: SERVICE_IDS.MEETINGS.CREATE };
  }

  // Action Items
  if (path === "/action-items/leaderboard" && m === "GET") return { serviceId: SERVICE_IDS.ACTION_ITEMS.LEADERBOARD };

  resParams = match("/action-items/meeting/:meetingId");
  if (resParams) return { serviceId: SERVICE_IDS.ACTION_ITEMS.GET_BY_MEETING, params: resParams };

  resParams = match("/action-items/:id");
  if (resParams) {
    if (m === "GET") return { serviceId: SERVICE_IDS.ACTION_ITEMS.GET, params: resParams };
    if (m === "PUT" || m === "PATCH") return { serviceId: SERVICE_IDS.ACTION_ITEMS.UPDATE, params: resParams };
    if (m === "DELETE") return { serviceId: SERVICE_IDS.ACTION_ITEMS.DELETE, params: resParams };
  }

  if (path === "/action-items") {
    if (m === "GET") return { serviceId: SERVICE_IDS.ACTION_ITEMS.LIST };
    if (m === "POST") return { serviceId: SERVICE_IDS.ACTION_ITEMS.CREATE };
  }

  // Dashboard
  if (path === "/dashboard/stats" && m === "GET") return { serviceId: SERVICE_IDS.DASHBOARD.STATS };

  // Settings
  if (path === "/settings/sessions" && m === "GET") return { serviceId: SERVICE_IDS.SETTINGS.SESSIONS };
  if (path === "/settings" && m === "GET") return { serviceId: SERVICE_IDS.SETTINGS.GET };
  if (path === "/settings" && m === "PUT") return { serviceId: SERVICE_IDS.SETTINGS.UPDATE };

  // Notifications
  if (path === "/notifications/read-all" && m === "PATCH") return { serviceId: SERVICE_IDS.NOTIFICATIONS.READ_ALL };
  if (path === "/notifications" && m === "GET") return { serviceId: SERVICE_IDS.NOTIFICATIONS.LIST };
  if (path === "/notifications" && m === "DELETE") return { serviceId: SERVICE_IDS.NOTIFICATIONS.CLEAR };

  // Jobs
  resParams = match("/jobs/:id");
  if (resParams && m === "GET") return { serviceId: SERVICE_IDS.JOBS.GET, params: resParams };

  // Audit & Security Logs
  if (path === "/audit/stats" && m === "GET") return { serviceId: SERVICE_IDS.AUDIT.STATS };
  if (path === "/audit/logs" && m === "GET") return { serviceId: SERVICE_IDS.AUDIT.LOGS };

  return null;
}

/**
 * Request Interceptor
 * Injects JWT token from localStorage and maps REST calls to service dispatcher
 */
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Inject CSRF token if available
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("_csrf="))
        ?.split("=")[1];

      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }

    // Intercept and rewrite request into service dispatcher format
    if (config.url) {
      const matched = matchRequest(config.url, config.method || "GET", config.data, config.params);
      if (matched) {
        logger.debug("Redirecting REST call to centralized serviceId", {
          originalUrl: config.url,
          serviceId: matched.serviceId,
        });

        config.url = "/service";
        config.method = "post";
        config.data = {
          serviceId: matched.serviceId,
          payload: config.data || {},
          params: matched.params || {},
          query: config.params || {},
        };
        config.params = {}; // Clear query params on the URL since they are in the body
      }
    }

    logger.debug("API Request", {
      method: config.method?.toUpperCase(),
      url: config.url,
    });

    return config;
  },
  (error) => {
    logger.error("Request interceptor error", error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles errors and validates responses
 */
api.interceptors.response.use(
  (response) => {
    logger.debug("API Response", {
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
    });
    return response;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    const errorData = error.response?.data;

    // Handle 401 Unauthorized - redirect to login
    if (status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Redirect to login (handle in app-level catch)
      }
    }

    // Handle 429 Rate Limit Exceeded - Toast notification
    if (status === 429 || (errorData && (errorData as any).code === "RATE_LIMIT_EXCEEDED")) {
      if (typeof window !== "undefined") {
        const rateLimitMessage = (errorData as any)?.message || "API rate limit exceeded. Please try again later.";
        window.dispatchEvent(
          new CustomEvent("app-notification", {
            detail: {
              type: "error",
              title: "Rate Limit Exceeded",
              message: rateLimitMessage,
            },
          })
        );
      }
    }

    // Log the error with context
    logger.error("API Error", error, {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status,
      errorType: isAPIError(errorData) ? errorData.error : "UNKNOWN",
    });

    // Return error with enhanced message
    const message = isAPIError(errorData)
      ? getErrorMessage(errorData)
      : error.message || "An unexpected error occurred";

    return Promise.reject({
      ...error,
      message,
      data: errorData,
    });
  }
);

/**
 * Helper function for typed API calls with error handling
 */
export async function apiCall<T>(
  method: "get" | "post" | "put" | "delete",
  url: string,
  data?: any,
  config?: any
): Promise<{ data: T; status: number }> {
  try {
    const response = await api[method]<T>(url, data, config);
    return {
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    logger.error(`API ${method.toUpperCase()} failed`, error as Error, { url });
    throw error;
  }
}

export default api;
