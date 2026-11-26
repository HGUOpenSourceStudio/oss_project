import { XMLParser } from 'fast-xml-parser'
import type { DatasetId, Place, SearchParams } from '../types'

export interface NmcItem {
  hpid?: string
  dutyName?: string
  dutyAddr?: string
  dutyTel1?: string
  dutyDivName?: string
  latitude?: string
  longitude?: string
  startTime?: string
  endTime?: string
  distance?: string
}

const parser = new XMLParser({
  // Keep ids, phone numbers and times as text; numeric fields are converted explicitly.
  parseTagValue: false,
  isArray: (name) => name === 'item',
})

/** Parse an NMC XML response into raw items. Throws if the API reports an error. */
export function parseNmcItems(xml: string): NmcItem[] {
  const doc = parser.parse(xml)
  const response = doc.response
  if (!response) {
    const msg = doc.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg
    throw new Error(`Unexpected NMC response${msg ? `: ${msg}` : ''}`)
  }
  const code = response.header?.resultCode
  if (code !== undefined && String(code) !== '00') {
    throw new Error(`NMC API error ${code}: ${response.header.resultMsg ?? 'unknown'}`)
  }
  const items = response.body?.items
  if (!items || typeof items === 'string') return []
  return items.item ?? []
}

function toHHMM(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  return /^\d{4}$/.test(value) ? `${value.slice(0, 2)}:${value.slice(2)}` : undefined
}

/** Convert one NMC item to a Place, or undefined if it lacks usable coordinates. */
export function toPlace(dataset: DatasetId, item: NmcItem): Place | undefined {
  const lat = Number(item.latitude)
  const lng = Number(item.longitude)
  if (!item.latitude || !item.longitude || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return undefined
  }
  const start = toHHMM(item.startTime)
  const end = toHHMM(item.endTime)
  const distance = Number(item.distance)
  return {
    id: item.hpid ?? `${lat},${lng}`,
    dataset,
    name: item.dutyName ?? '',
    address: item.dutyAddr ?? '',
    phone: item.dutyTel1,
    category: item.dutyDivName,
    lat,
    lng,
    hours: start && end ? { start, end } : undefined,
    distanceKm: item.distance !== undefined && Number.isFinite(distance) ? distance : undefined,
  }
}

/** NMC location-search endpoints take WGS84 coordinates and return nearest-first results. */
export function nmcLocationQuery({ lat, lng, limit }: SearchParams): Record<string, string> {
  return {
    WGS84_LON: String(lng),
    WGS84_LAT: String(lat),
    pageNo: '1',
    numOfRows: String(limit),
  }
}
