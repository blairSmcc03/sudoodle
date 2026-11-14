const TIME_ZONE = "Europe/London";

const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The Europe/London calendar date (YYYY-MM-DD) at the given instant. */
export function londonDateKey(instant: Date): string {
  return dateFormat.format(instant);
}
