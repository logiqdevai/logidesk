import { ApiRoutes } from "@/config/api/routes";
import i18n from "@/i18n";
import { apiRequest } from "@/lib/request";
import type { ContactDto } from "../interfaces/contact.interfaces";

export const sendContactMessage = (dto: ContactDto) => apiRequest<{ success: boolean }>("post", ApiRoutes.contact, i18n.t("contact:errors.send"), dto);
