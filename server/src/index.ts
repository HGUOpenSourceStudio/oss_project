import { buildApp } from './app'

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '0.0.0.0'

const app = buildApp({
  serviceKey: process.env.DATA_GO_KR_SERVICE_KEY,
  logger: true,
})

if (!process.env.DATA_GO_KR_SERVICE_KEY) {
  app.log.warn('DATA_GO_KR_SERVICE_KEY is not set; /api/places will return 503')
}

app.listen({ port, host }).catch((error) => {
  app.log.error(error)
  process.exit(1)
})
