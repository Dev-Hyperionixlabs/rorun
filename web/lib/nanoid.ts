export function nanoid(size = 12): string {
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let id = "";
  const array = new Uint8Array(size);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(array);
    for (let i = 0; i < size; i++) {
      id += chars[array[i] % chars.length];
    }
  } else {
    for (let i = 0; i < size; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return id;
}


