export function normalizePhone(number) {
  // Normaliza 52 -> 521 para MX
  if (number.startsWith('52') && !number.startsWith('521')) {
    return '521' + number.slice(2);
  }
  return number;
}
