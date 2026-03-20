import { Link, useLocation, useNavigate } from 'react-router-dom'
import { NAV_ITEMS } from './nav'
import { Search } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../../shared/api/apiClient'

function useCurrentPageTitle() {
  const location = useLocation()
  const current = NAV_ITEMS.find((i) => i.to === location.pathname)
  return current?.label ?? 'Платформа'
}

export function TopBar() {
  const title = useCurrentPageTitle()
  const username = localStorage.getItem('username')
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [districts, setDistricts] = useState<any[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadDistricts() {
      try {
        const data = await apiFetch<any[]>('/map-data/districts/')
        setDistricts(data)
      } catch (e) {
        console.error(e)
      }
    }
    loadDistricts()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredDistricts = districts.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectDistrict = (id: string, name: string) => {
    setIsDropdownOpen(false)
    setSearchQuery(name)
    navigate(`/map?district=${id}`)
    setSearchQuery('')
  }

  return (
    <header className="relative z-[1000] flex flex-col gap-3 rounded-[1rem] border border-slate-200 bg-white p-4 items-center justify-between shadow-sm md:flex-row">
      <div className="min-w-0 flex-shrink-0">
        <div className="text-[17px] font-bold text-slate-900 leading-tight">{title}</div>
        <div className="mt-0.5 text-[13px] text-slate-500 font-medium">
          Интерактивная карта, аналитика и управление источниками данных
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3 w-full">
        <div ref={searchRef} className="relative hidden w-full max-w-[420px] md:block">
          <div className="flex items-center gap-2 rounded-[100px] border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-sm text-slate-600 focus-within:border-slate-300 focus-within:bg-white transition-colors">
            <Search className="size-4 text-slate-400" />
            <input
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-slate-400"
              placeholder="Поиск района..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setIsDropdownOpen(true)
              }}
              onFocus={() => setIsDropdownOpen(true)}
            />
          </div>
          {isDropdownOpen && searchQuery.length > 0 && (
            <div className="absolute top-[110%] left-0 w-full rounded-[16px] border border-slate-200 bg-white p-2 shadow-xl z-50">
              {filteredDistricts.length > 0 ? (
                <div className="max-h-[300px] overflow-auto">
                  <div className="px-2 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Районы
                  </div>
                  {filteredDistricts.map(d => (
                    <button
                      key={d.id}
                      className="w-full rounded-[10px] px-3 py-2 text-left text-[14px] text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium transition-colors"
                      onClick={() => handleSelectDistrict(d.id, d.name)}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-4 text-center text-[13px] text-slate-500">
                  Ничего не найдено
                </div>
              )}
            </div>
          )}
        </div>
        
        {localStorage.getItem('token') ? (
          <>
            <div className="flex items-center rounded-[100px] border border-slate-200 bg-white px-3 py-1.5 text-sm">
              <div className="flex flex-col leading-none">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Профиль:</span>
                <span className="text-[13px] font-bold text-slate-700">{username}</span>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                localStorage.removeItem('is_admin');
                window.location.href = '/';
              }}
              className="rounded-[100px] bg-[#0B1221] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#1a233b] transition"
            >
              Выйти
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="rounded-[100px] border border-slate-200 bg-white px-5 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Войти
          </Link>
        )}
        <Link
          to="/help"
          className="rounded-[100px] border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <span className="block leading-none max-w-[80px] text-center">Как пользоваться</span>
        </Link>
      </div>
    </header>
  )
}

