export type DatasetId = 'pharmacy' | 'clinic'

export interface Place {
  id: string
  dataset: DatasetId
  name: string
  address: string
  phone?: string
  category?: string
  lat: number
  lng: number
  hours?: { start: string; end: string }
  distanceKm?: number
}

export const DATASETS: { id: DatasetId; label: string }[] = [
  { id: 'pharmacy', label: '약국' },
  { id: 'clinic', label: '병·의원' },
]

export async function fetchPlaces(
  dataset: DatasetId,
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<Place[]> {
  const params = new URLSearchParams({
    dataset,
    lat: String(lat),
    lng: String(lng),
    limit: '30',
  })
  const res = await fetch(`/api/places?${params}`, { signal })
  if (!res.ok) {
    const body = await res.json().catch(() => undefined)
    throw new Error(body?.error ?? `요청 실패 (HTTP ${res.status})`)
  }
  const data = (await res.json()) as { items: Place[] }
  return data.items
}
