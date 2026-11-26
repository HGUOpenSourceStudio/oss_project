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
  /** Representative opening hours as reported by the source ("HH:MM"). Day of week is not specified by the source. */
  hours?: { start: string; end: string }
  distanceKm?: number
}

export interface SearchParams {
  lat: number
  lng: number
  limit: number
}

export interface DatasetAdapter {
  id: DatasetId
  label: string
  /** Full API URL (without query string) of the upstream service. */
  endpoint: string
  /** Query parameters for the upstream request, excluding the service key. */
  buildQuery(params: SearchParams): Record<string, string>
  /** Convert the upstream XML response into places. */
  parse(xml: string): Place[]
}
