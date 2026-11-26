// Local date (YYYY-MM-DD). The model dates its entries with the local date, so
// every comparison and heading must use it too: UTC is a day behind for the
// first hours after midnight.
export function localDate(date = new Date()) {
  return date.toLocaleDateString('sv-SE')
}
