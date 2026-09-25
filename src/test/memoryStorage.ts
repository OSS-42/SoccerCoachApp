/** In-memory Storage for tests; set `failWrites` to simulate a full quota. */
export function memoryStorage(): Storage & { failWrites: boolean; data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    failWrites: false,
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem(key, value) {
      if (this.failWrites) throw new DOMException('QuotaExceededError', 'QuotaExceededError')
      data.set(key, String(value))
    },
  }
}
