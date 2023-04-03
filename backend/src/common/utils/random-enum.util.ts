export function getRandomEnumValue<T>(enumeration: T): Promise<T[keyof T]> {
  const values = Object.values(enumeration);
  const randomIndex = Math.floor(Math.random() * values.length);
  return values[randomIndex];
}
