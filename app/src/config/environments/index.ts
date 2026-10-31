const APP_NAME = "LogiDesk";
const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;
const API_URL = `${(import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/$/, "")}/`;

export const environments = {
  APP_NAME,
  APP_URL,
  API_URL,
};
