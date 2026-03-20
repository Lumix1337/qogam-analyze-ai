import { useState } from 'react'
import { PageShell } from '../_ui/PageShell'
import { env } from '../../shared/config/env'
import { Loader2, UploadCloud, AlertTriangle } from 'lucide-react'
import { useAdmin } from '../../shared/lib/useAdmin'

export function AnalyticsPage() {
  const isAdmin = useAdmin()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    const base = env.apiBaseUrl?.replace(/\/+$/, '') ?? ''
    const url = `${base}/analytics/upload-report/`
    const token = localStorage.getItem('token')

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
        body: formData,
      })

      if (!res.ok) {
        let errMsg = res.statusText
        try {
          const detail = await res.json()
          errMsg = detail.error || JSON.stringify(detail)
        } catch(e) {}
        throw new Error(`Ошибка: ${errMsg}`)
      }

      const data = await res.json()
      setResult(data)
      setFile(null)
      
      // Select the file input element and clear it
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell
      title="Аналитика"
      subtitle="Еженедельный AI‑анализ: загружайте сводки за день для генерации рейтинга районов и списка инцидентов."
    >
      {!isAdmin ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mb-3" />
          <h2 className="text-lg font-bold text-red-700">Доступ запрещен</h2>
          <p className="mt-2 text-red-600 max-w-md">Эти манипуляции с ИИ доступны только для администраторов платформы.</p>
        </div>
      ) : (
        <div className="max-w-2xl">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-600" /> Анализ документа
          </h2>
          
          <input 
            type="file" 
            accept=".rtf,.docx,.doc" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-500 mb-3 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Анализируем...' : 'Загрузить и проанализировать'}
          </button>

          {error && <div className="mt-3 text-sm text-red-600 p-2 bg-red-50 rounded-lg border border-red-100">{error}</div>}
          
          {result && (
            <div className="mt-4 p-3 bg-green-50 text-green-800 text-sm rounded-xl border border-green-100">
              <strong>Успешно проанализировано!</strong>
              <div className="mt-2 text-xs opacity-90">
                Обновлено районов: <b>{result.data?.districts?.length || 0}</b>
                <br/>
                Инцидентов добавлено: <b>{result.data?.incidents?.length || 0}</b>
              </div>
            </div>
          )}
        </section>
      </div>
      )}
    </PageShell>
  )
}

