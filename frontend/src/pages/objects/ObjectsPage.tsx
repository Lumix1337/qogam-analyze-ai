import { useEffect, useState, useMemo } from 'react'
import { PageShell } from '../_ui/PageShell'
import { apiFetch } from '../../shared/api/apiClient'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type SocialObject = {
  id: number
  name: string
  object_type: string
  district: number
  latitude: number
  longitude: number
}

const OBJECT_TYPES: Record<string, string> = {
  school: 'Школа',
  kindergarten: 'Детский сад',
  hospital: 'Больница',
  other: 'Другое',
}

export function ObjectsPage() {
  const [objects, setObjects] = useState<SocialObject[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [districtFilter, setDistrictFilter] = useState('all')

  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      apiFetch<SocialObject[]>('/map-data/social-objects/'),
      apiFetch<any[]>('/map-data/districts/')
    ])
      .then(([objectsData, districtsData]) => {
        setObjects(objectsData)
        setDistricts(districtsData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filteredObjects = useMemo(() => {
    return objects.filter(o => {
      const matchSearch = o.name.toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === 'all' || o.object_type === typeFilter
      const matchDistrict = districtFilter === 'all' || String(o.district) === districtFilter
      return matchSearch && matchType && matchDistrict
    })
  }, [objects, search, typeFilter, districtFilter])

  const districtMap = useMemo(() => {
    const map = new Map()
    districts.forEach(d => map.set(d.id, d.name))
    return map
  }, [districts])

  return (
    <PageShell
      title="Социальные объекты"
      subtitle="Список всех школ, садов, больниц и других объектов, включая добавленные вручную."
    >
      <div className="flex flex-col gap-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition"
          >
            <option value="all">Все типы</option>
            {Object.entries(OBJECT_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition"
          >
            <option value="all">Все районы</option>
            {districts.map(d => (
              <option key={d.id} value={String(d.id)}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Загрузка...</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="px-5 py-4 font-semibold">Название</th>
                  <th className="px-5 py-4 font-semibold">Район</th>
                  <th className="px-5 py-4 font-semibold">Тип</th>
                  <th className="px-5 py-4 font-semibold">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredObjects.length > 0 ? (
                  filteredObjects.map(obj => (
                    <tr key={obj.id} className="hover:bg-slate-50/50 transition duration-150">
                      <td className="px-5 py-4 font-medium text-slate-900">{obj.name}</td>
                      <td className="px-5 py-4">{districtMap.get(obj.district) || 'Неизвестен'}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100/50 font-medium text-xs">
                          {OBJECT_TYPES[obj.object_type] || obj.object_type}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {/* 
                            Assuming the MapPage can optionally zoom to an object if we pass object=... in the URL.
                            For now we can pass the district, but we could also add support for object=obj.id in MapPage.
                        */}
                        <button
                          onClick={() => navigate(`/map?district=${obj.district}&object=${obj.id}`)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
                        >
                          На карте
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                      Объектов не найдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageShell>
  )
}

