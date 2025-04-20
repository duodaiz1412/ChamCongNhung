// NAME
const STORE_NAME = "state";

// NETWORK
const NETWORK_CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL + "/api",
  TIMEOUT: 30000,
  RETRY: false,
  USE_TOKEN: true,
  WITH_METADATA: false,
  DISPLAY_ERROR: true,
};

// PATHNAME
const PATHNAME = {
  HOME: "/",
  LOGIN: "/login",
};

// LANGUAGE
const LANGUAGE = {
  DEFAULT: "vi",
};

export default {
  STORE_NAME,
  NETWORK_CONFIG,
  PATHNAME,
  LANGUAGE,
};
