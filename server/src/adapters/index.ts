import type { DatasetAdapter, DatasetId, Place } from '../types'
import { nmcLocationQuery, parseNmcItems, toPlace } from './nmc'

function nmcAdapter(
  id: DatasetId,
  label: string,
  endpoint: string,
): DatasetAdapter {
  return {
    id,
    label,
    endpoint,
    buildQuery: nmcLocationQuery,
    parse: (xml) =>
      parseNmcItems(xml)
        .map((item) => toPlace(id, item))
        .filter((place): place is Place => place !== undefined),
  }
}

export const pharmacyAdapter = nmcAdapter(
  'pharmacy',
  '약국',
  'https://apis.data.go.kr/B552657/ErmctInsttInfoInqireService/getParmacyLcinfoInqire',
)

export const clinicAdapter = nmcAdapter(
  'clinic',
  '병·의원',
  'https://apis.data.go.kr/B552657/HsptlAsembySearchService/getHsptlMdcncLcinfoInqire',
)

export const adapters: Record<DatasetId, DatasetAdapter> = {
  pharmacy: pharmacyAdapter,
  clinic: clinicAdapter,
}
