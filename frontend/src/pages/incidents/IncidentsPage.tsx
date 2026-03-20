import { useEffect, useState, useMemo } from 'react'
import { PageShell } from '../_ui/PageShell'
import { apiFetch } from '../../shared/api/apiClient'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type Crime = {
  id: number
  title: string
  crime_type: string
  district: number
  date_committed: string
  latitude: number
  longitude: number
}

const CRIME_TYPES: Record<string, string> = {
  theft: 'Кража',
  hooliganism: 'Хулиганство',
  beating: 'Избиение',
  administrative: 'Административное правонарушение',
  other: 'Другое',
}

export function IncidentsPage() {
  const [incidents, setIncidents] = useState<Crime[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [districtFilter, setDistrictFilter] = useState('all')

  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      apiFetch<Crime[]>('/map-data/crimes/'),
      apiFetch<any[]>('/map-data/districts/')
    ])
      .then(([crimesData, districtsData]) => {
        setIncidents(crimesData)
        setDistricts(districtsData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => {
      const matchSearch = i.title.toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === 'all' || i.crime_type === typeFilter
      const matchDistrict = districtFilter === 'all' || String(i.district) === districtFilter
      return matchSearch && matchType && matchDistrict
    })
  }, [incidents, search, typeFilter, districtFilter])

  const districtMap = useMemo(() => {
    const map = new Map()
    districts.forEach(d => map.set(d.id, d.name))
    return map
  }, [districts])

  return (
    <PageShell
      title="Инциденты"
      subtitle="Список всех правонарушений и инцидентов, включая добавленные вручную."
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
            {Object.entries(CRIME_TYPES).map(([k, v]) => (
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
                  <th className="px-5 py-4 font-semibold">Дата добавления</th>
                  <th className="px-5 py-4 font-semibold">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncidents.length > 0 ? (
                  filteredIncidents.map(inc => (
                    <tr key={inc.id} className="hover:bg-slate-50/50 transition duration-150">
                      <td className="px-5 py-4 font-medium text-slate-900">{inc.title}</td>
                      <td className="px-5 py-4">{districtMap.get(inc.district) || 'Неизвестен'}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-100/50 font-medium text-xs">
                          {CRIME_TYPES[inc.crime_type] || inc.crime_type}
                        </span>
                      </td>
                      <td className="px-5 py-4">{new Date(inc.date_committed).toLocaleString()}</td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => navigate(`/map?district=${inc.district}&incident=${inc.id}`)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
                        >
                          На карте
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                      Инцидентов не найдено
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

