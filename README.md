# oss_project

공공데이터로 주변 약국과 병·의원을 찾는 지도 기반 웹앱입니다 (개발 중).
이후에는 자연어로 묻고 공공데이터로 답하는 장소 검색을 목표로 합니다.

## 현재 되는 것

- 약국(`pharmacy`), 병·의원(`clinic`) 데이터셋 조회
- 지도 중심 또는 내 위치를 기준으로 검색하고 목록과 마커로 표시
- 데이터셋마다 작은 어댑터 하나로 구현 (`server/src/adapters`)

## REST API

| 엔드포인트 | 설명 |
|---|---|
| `GET /api/health` | 서버 상태 |
| `GET /api/datasets` | 사용할 수 있는 데이터셋의 `id`와 `label` 목록 |
| `GET /api/places?dataset=&lat=&lng=&limit=` | 좌표 주변의 장소 조회 |
| `POST /api/query` | **예정** (아직 없음). 자연어 질문을 검색 조건으로 바꿔 조회 |

`/api/places`의 파라미터:

| 이름 | 필수 | 값 |
|---|---|---|
| `dataset` | 예 | `pharmacy` 또는 `clinic` |
| `lat` | 예 | 위도, -90 ~ 90 |
| `lng` | 예 | 경도, -180 ~ 180 |
| `limit` | 아니오 | 1 ~ 50의 정수, 기본 20 |

응답은 `{ dataset, count, items }` 형식입니다. 잘못된 파라미터는 400, 서비스 키가 설정되지 않았으면 503,
공공데이터 서버 호출에 실패하면 502를 돌려줍니다.

`/api/query`를 만들 때 LLM은 검색 조건만 뽑고, 답은 공공데이터 API 결과에서 가져올 계획입니다.

## 기술 스택

React, Vite, TypeScript, MapLibre GL, Fastify, Vitest

## 실행 방법

Node.js 22.12 이상이 필요합니다.

```bash
npm install
cp .env.example .env.local   # DATA_GO_KR_SERVICE_KEY 입력
npm run server               # API 서버 (http://localhost:3000)
npm run dev                  # 다른 터미널에서 실행. 화면의 /api 요청은 3000번 포트로 전달됨
```

### 서비스 키

- [공공데이터포털](https://www.data.go.kr)에서 약국(`ErmctInsttInfoInqireService`)과
  병·의원(`HsptlAsembySearchService`) API의 활용신청을 하고 서비스 키를 발급받습니다.
- `.env.local`의 `DATA_GO_KR_SERVICE_KEY`에 **디코딩(Decoding) 키**를 넣습니다.
- `.env.local`은 커밋하지 않습니다. 키가 노출되면 바로 재발급하세요.
- `.env.example`의 `BIZROUTER_API_KEY`는 예정된 기능용이며 지금은 비워 둬도 됩니다.

### 검사

```bash
npm run lint
npm run typecheck:server
npm test        # 서비스 키 없이 실행됨
npm run build
```

## 데이터 출처

- 약국, 병·의원 정보: 국립중앙의료원, [공공데이터포털](https://www.data.go.kr) 제공.
  운영시간은 원본이 제공하는 대표 시간이며 요일별로 다를 수 있습니다.
- 지도: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
  OpenStreetMap 타일은 개발과 가벼운 사용을 전제로 하며, 트래픽이 많아지면
  [타일 이용 정책](https://operations.osmfoundation.org/policies/tiles/)에 맞는 다른 타일 제공자로 바꿔야 합니다.

## 라이선스

코드는 [MIT](LICENSE)입니다. 공공데이터는 각 데이터셋의 이용 조건을 따릅니다.
