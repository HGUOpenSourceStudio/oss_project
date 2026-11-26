import { useRef, useState } from 'react'
import Map, { Marker, NavigationControl, Popup } from 'react-map-gl/maplibre'
import type { MapRef } from 'react-map-gl/maplibre'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { DATASETS, fetchPlaces } from './api'
import type { DatasetId, Place } from './api'
import './App.css'

// Bundlers cannot discover maplibre's web worker on their own; point it at the packaged file.
setWorkerUrl(workerUrl)

// Raster OpenStreetMap tiles are fine for development and light use.
// For heavier production traffic, switch to a tile provider that allows it.
const MAP_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
}

const SEOUL_CITY_HALL = { latitude: 37.5665, longitude: 126.978, zoom: 14 }

function App() {
  const mapRef = useRef<MapRef>(null)
  const [dataset, setDataset] = useState<DatasetId>('pharmacy')
  const [places, setPlaces] = useState<Place[]>([])
  const [selected, setSelected] = useState<Place | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const search = async (target: DatasetId, lat: number, lng: number) => {
    setLoading(true)
    setError(null)
    setSelected(null)
    try {
      setPlaces(await fetchPlaces(target, lat, lng))
      setSearched(true)
    } catch (e) {
      setPlaces([])
      setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const searchAtMapCenter = () => {
    const center = mapRef.current?.getCenter()
    if (center) void search(dataset, center.lat, center.lng)
  }

  const searchAtMyLocation = () => {
    if (!navigator.geolocation) {
      setError('이 브라우저는 위치 정보를 지원하지 않습니다.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        mapRef.current?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 15 })
        void search(dataset, coords.latitude, coords.longitude)
      },
      () => setError('위치 권한이 거부되었거나 위치를 가져오지 못했습니다.'),
    )
  }

  const focusPlace = (place: Place) => {
    setSelected(place)
    mapRef.current?.flyTo({ center: [place.lng, place.lat], zoom: 16 })
  }

  return (
    <div className="layout">
      <aside className="panel">
        <h1>oss_project</h1>
        <p className="subtitle">공공데이터로 찾는 주변 약국·병원</p>

        <div className="tabs" role="tablist" aria-label="데이터셋">
          {DATASETS.map((d) => (
            <button
              key={d.id}
              role="tab"
              aria-selected={dataset === d.id}
              className={dataset === d.id ? 'tab active' : 'tab'}
              onClick={() => {
                setDataset(d.id)
                setPlaces([])
                setSelected(null)
                setSearched(false)
              }}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="actions">
          <button onClick={searchAtMapCenter} disabled={loading}>
            이 지도 중심에서 검색
          </button>
          <button onClick={searchAtMyLocation} disabled={loading} className="secondary">
            내 위치에서 검색
          </button>
        </div>

        {loading && <p role="status">불러오는 중…</p>}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {!loading && !error && searched && places.length === 0 && <p>검색 결과가 없습니다.</p>}
        {!searched && !loading && !error && (
          <p className="hint">지도를 움직인 뒤 검색 버튼을 눌러 보세요.</p>
        )}

        <ul className="results">
          {places.map((p) => (
            <li key={p.id}>
              <button
                className={selected?.id === p.id ? 'result selected' : 'result'}
                onClick={() => focusPlace(p)}
              >
                <strong>{p.name}</strong>
                <span>{p.address}</span>
                <span className="meta">
                  {p.category}
                  {p.hours && ` · ${p.hours.start}–${p.hours.end}`}
                  {p.distanceKm !== undefined && ` · ${p.distanceKm.toFixed(2)}km`}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="footnote">
          출처: 국립중앙의료원(공공데이터포털). 운영시간은 대표 시간이며 요일별로 다를 수 있습니다.
        </p>
      </aside>

      <main className="map">
        <Map ref={mapRef} initialViewState={SEOUL_CITY_HALL} mapStyle={MAP_STYLE}>
          <NavigationControl position="top-right" />
          {places.map((p) => (
            <Marker
              key={p.id}
              latitude={p.lat}
              longitude={p.lng}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                setSelected(p)
              }}
            >
              <span className={`pin ${p.dataset}`} aria-label={p.name} />
            </Marker>
          ))}
          {selected && (
            <Popup
              latitude={selected.lat}
              longitude={selected.lng}
              anchor="top"
              onClose={() => setSelected(null)}
              closeOnClick={false}
            >
              <strong>{selected.name}</strong>
              <div>{selected.address}</div>
              {selected.phone && <div>{selected.phone}</div>}
              {selected.hours && (
                <div>
                  {selected.hours.start}–{selected.hours.end}
                </div>
              )}
            </Popup>
          )}
        </Map>
      </main>
    </div>
  )
}

export default App
