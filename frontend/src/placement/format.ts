export function formatDate(raw: string | null | undefined): string {
  if (raw == null || raw === '') return 'TBD'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function downloadBlob(bytes: Uint8Array, filename: string, mime?: string) {
  const blob = new Blob([Uint8Array.from(bytes)], {
    type:
      mime ??
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
