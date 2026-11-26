import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseNmcItems } from '../src/adapters/nmc'
import { pharmacyAdapter, clinicAdapter } from '../src/adapters'

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

describe('parseNmcItems', () => {
  it('parses every item from a multi-item response', () => {
    const items = parseNmcItems(fixture('nmc-pharmacy.xml'))
    expect(items).toHaveLength(3)
    expect(items[0].dutyName).toBe('참약국')
  })

  it('returns an array even when the response has a single item', () => {
    const xml =
      '<response><header><resultCode>00</resultCode></header><body><items><item><dutyName>한곳</dutyName></item></items></body></response>'
    expect(parseNmcItems(xml)).toHaveLength(1)
  })

  it('returns an empty array when there are no items', () => {
    const xml =
      '<response><header><resultCode>00</resultCode></header><body><items/></body></response>'
    expect(parseNmcItems(xml)).toEqual([])
  })

  it('throws when the API reports an error code', () => {
    const xml =
      '<response><header><resultCode>30</resultCode><resultMsg>SERVICE KEY IS NOT REGISTERED</resultMsg></header></response>'
    expect(() => parseNmcItems(xml)).toThrow(/SERVICE KEY IS NOT REGISTERED/)
  })
})

describe('adapters', () => {
  it('maps a pharmacy item to a Place', () => {
    const [first] = pharmacyAdapter.parse(fixture('nmc-pharmacy.xml'))
    expect(first).toMatchObject({
      id: 'C1100601',
      dataset: 'pharmacy',
      name: '참약국',
      address: '서울특별시 강남구 일원로 95',
      phone: '02-3412-2577',
      category: '약국',
      hours: { start: '09:00', end: '19:00' },
    })
    expect(first.lat).toBeCloseTo(37.4857, 3)
    expect(first.lng).toBeCloseTo(127.0834, 3)
    expect(first.distanceKm).toBeCloseTo(0.31, 2)
  })

  it('maps a clinic item to a Place with its category', () => {
    const items = clinicAdapter.parse(fixture('nmc-clinic.xml'))
    expect(items.map((p) => p.category)).toEqual(['종합병원', '치과의원', '의원'])
    expect(items.every((p) => p.dataset === 'clinic')).toBe(true)
  })

  it('skips items that have no usable coordinates', () => {
    const xml =
      '<response><header><resultCode>00</resultCode></header><body><items><item><hpid>X1</hpid><dutyName>좌표없음</dutyName></item></items></body></response>'
    expect(pharmacyAdapter.parse(xml)).toEqual([])
  })
})
