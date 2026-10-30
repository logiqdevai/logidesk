export const TimeZoneOptions: { id: string; label: string }[] = [
  "UTC", "Europe/London", "Europe/Dublin", "Europe/Lisbon", "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Rome",
  "Europe/Amsterdam", "Europe/Brussels", "Europe/Zurich", "Europe/Vienna", "Europe/Warsaw", "Europe/Prague", "Europe/Stockholm",
  "Europe/Athens", "Europe/Bucharest", "Europe/Helsinki", "Europe/Istanbul", "Asia/Nicosia", "Asia/Dubai", "Asia/Kolkata",
  "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Toronto", "America/Sao_Paulo",
].map((tz) => ({ id: tz, label: tz.replace("_", " ") }));
