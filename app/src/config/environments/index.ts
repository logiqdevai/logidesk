import { APP_NAME } from "@/config/constants/app";

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;
const API_URL = `${(import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/$/, "")}/`;

/** When "true", UI that is only for admin / super admin accounts is hidden. Unset or any other value shows it. */
const HIDE_ADMIN_UI = String(import.meta.env.VITE_HIDE_ADMIN_UI ?? "").trim().toLowerCase() === "true";

export const environments = {
  APP_NAME,
  APP_URL,
  API_URL,
  HIDE_ADMIN_UI,
};
