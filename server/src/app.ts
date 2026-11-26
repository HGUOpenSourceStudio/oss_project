import Fastify from 'fastify'
import { adapters } from './adapters'
import type { DatasetId } from './types'

export interface AppOptions {
  /** data.go.kr service key (decoded form). Never logged or returned to clients. */
  serviceKey: string | undefined
  fetchImpl?: typeof fetch
  logger?: boolean
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const UPSTREAM_TIMEOUT_MS = 10_000

function parseNumber(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function buildApp({ serviceKey, fetchImpl = fetch, logger = false }: AppOptions) {
  const app = Fastify({ logger })

  app.get('/api/health', async () => ({ status: 'ok' }))

  app.get('/api/datasets', async () =>
    Object.values(adapters).map(({ id, label }) => ({ id, label })),
  )

  app.get('/api/places', async (request, reply) => {
    const query = request.query as Record<string, unknown>

    const dataset = typeof query.dataset === 'string' ? query.dataset : undefined
    if (!dataset || !(dataset in adapters)) {
      return reply.code(400).send({
        error: `dataset must be one of: ${Object.keys(adapters).join(', ')}`,
      })
    }

    const lat = parseNumber(query.lat)
    const lng = parseNumber(query.lng)
    if (lat === undefined || lat < -90 || lat > 90) {
      return reply.code(400).send({ error: 'lat must be a number between -90 and 90' })
    }
    if (lng === undefined || lng < -180 || lng > 180) {
      return reply.code(400).send({ error: 'lng must be a number between -180 and 180' })
    }

    let limit = DEFAULT_LIMIT
    if (query.limit !== undefined) {
      const parsed = parseNumber(query.limit)
      if (parsed === undefined || !Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
        return reply.code(400).send({ error: `limit must be an integer between 1 and ${MAX_LIMIT}` })
      }
      limit = parsed
    }

    if (!serviceKey) {
      return reply.code(503).send({ error: 'server is not configured with a data.go.kr service key' })
    }

    const adapter = adapters[dataset as DatasetId]
    const url = new URL(adapter.endpoint)
    url.searchParams.set('ServiceKey', serviceKey)
    for (const [k, v] of Object.entries(adapter.buildQuery({ lat, lng, limit }))) {
      url.searchParams.set(k, v)
    }

    try {
      const upstream = await fetchImpl(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) })
      if (!upstream.ok) throw new Error(`upstream HTTP ${upstream.status}`)
      const items = adapter.parse(await upstream.text())
      return { dataset: adapter.id, count: items.length, items }
    } catch (error) {
      // Log the failure without the request URL: it contains the service key.
      request.log.error({ message: error instanceof Error ? error.message.replaceAll(serviceKey, '<key>') : 'unknown' }, 'upstream request failed')
      return reply.code(502).send({ error: 'failed to fetch data from the public data service' })
    }
  })

  return app
}
