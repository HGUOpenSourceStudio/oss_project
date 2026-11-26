import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../src/app'

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

const KEY = 'test+key/with=chars'

// Pass null to simulate a server without a service key (undefined would trigger the default).
function appWith(fetchImpl: typeof fetch, serviceKey: string | null = KEY) {
  return buildApp({ serviceKey: serviceKey ?? undefined, fetchImpl })
}

const okFetch = (xml: string) =>
  vi.fn(async () => new Response(xml, { status: 200 })) as unknown as typeof fetch

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await appWith(okFetch('')).inject('/api/health')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })
})

describe('GET /api/datasets', () => {
  it('lists the available datasets', async () => {
    const res = await appWith(okFetch('')).inject('/api/datasets')
    expect(res.statusCode).toBe(200)
    expect(res.json().map((d: { id: string }) => d.id)).toEqual(['pharmacy', 'clinic'])
  })
})

describe('GET /api/places', () => {
  it('returns places and calls the upstream with encoded key and coordinates', async () => {
    const fetchImpl = okFetch(fixture('nmc-pharmacy.xml'))
    const res = await appWith(fetchImpl).inject(
      '/api/places?dataset=pharmacy&lat=37.488201&lng=127.085156&limit=3',
    )
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.dataset).toBe('pharmacy')
    expect(body.count).toBe(3)
    expect(body.items[0]).toMatchObject({ name: '참약국', dataset: 'pharmacy' })

    const calledUrl = new URL(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]))
    expect(calledUrl.pathname).toContain('getParmacyLcinfoInqire')
    expect(calledUrl.searchParams.get('ServiceKey')).toBe(KEY)
    expect(calledUrl.searchParams.get('WGS84_LAT')).toBe('37.488201')
    expect(calledUrl.searchParams.get('WGS84_LON')).toBe('127.085156')
    expect(calledUrl.searchParams.get('numOfRows')).toBe('3')
  })

  it('supports the clinic dataset', async () => {
    const res = await appWith(okFetch(fixture('nmc-clinic.xml'))).inject(
      '/api/places?dataset=clinic&lat=37.488&lng=127.085',
    )
    expect(res.statusCode).toBe(200)
    expect(res.json().items[0].category).toBe('종합병원')
  })

  it.each([
    ['unknown dataset', '/api/places?dataset=nope&lat=37.5&lng=127'],
    ['missing dataset', '/api/places?lat=37.5&lng=127'],
    ['missing coordinates', '/api/places?dataset=pharmacy'],
    ['non-numeric lat', '/api/places?dataset=pharmacy&lat=abc&lng=127'],
    ['lat out of range', '/api/places?dataset=pharmacy&lat=95&lng=127'],
    ['lng out of range', '/api/places?dataset=pharmacy&lat=37&lng=200'],
    ['limit too large', '/api/places?dataset=pharmacy&lat=37&lng=127&limit=500'],
    ['limit zero', '/api/places?dataset=pharmacy&lat=37&lng=127&limit=0'],
  ])('rejects %s with 400', async (_name, url) => {
    const fetchImpl = okFetch('')
    const res = await appWith(fetchImpl).inject(url)
    expect(res.statusCode).toBe(400)
    expect(res.json()).toHaveProperty('error')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns 502 without leaking the key when the upstream fails', async () => {
    const failing = vi.fn(async () => {
      throw new Error(`connect failed for ServiceKey=${KEY}`)
    }) as unknown as typeof fetch
    const res = await appWith(failing).inject('/api/places?dataset=pharmacy&lat=37&lng=127')
    expect(res.statusCode).toBe(502)
    expect(res.body).not.toContain(KEY)
  })

  it('returns 502 when the upstream responds with an API error', async () => {
    const xml =
      '<response><header><resultCode>30</resultCode><resultMsg>SERVICE KEY IS NOT REGISTERED</resultMsg></header></response>'
    const res = await appWith(okFetch(xml)).inject('/api/places?dataset=pharmacy&lat=37&lng=127')
    expect(res.statusCode).toBe(502)
  })

  it('returns 503 when the service key is not configured', async () => {
    const res = await appWith(okFetch(''), null).inject(
      '/api/places?dataset=pharmacy&lat=37&lng=127',
    )
    expect(res.statusCode).toBe(503)
  })
})
