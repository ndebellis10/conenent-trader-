/* PDF → CSV-ish text.

   Broker statements are laid out as positioned text, not rows, so we
   reconstruct the table: group text fragments by their Y position into lines,
   order each line left-to-right, and insert a comma wherever there's a real
   horizontal gap between columns. The result is fed to the same parseTradeCSV
   pipeline the CSV importer uses, so PDFs and CSVs share one code path.

   pdfjs (~1.5 MB) is imported dynamically so it only loads when someone
   actually imports a PDF — it stays out of the main app bundle. */
export async function pdfToCsvText(file) {
  const pdfjsLib = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise
  const lines = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()

    // bucket text items by rounded Y (a "row")
    const rows = new Map()
    for (const it of content.items) {
      const str = (it.str || '').trim()
      if (!str) continue
      const x = it.transform[4]
      const y = Math.round(it.transform[5])
      const w = it.width || 0
      if (!rows.has(y)) rows.set(y, [])
      rows.get(y).push({ x, xEnd: x + w, str })
    }

    // top-to-bottom, then left-to-right; comma between columns with a gap
    const ys = [...rows.keys()].sort((a, b) => b - a)
    for (const y of ys) {
      const items = rows.get(y).sort((a, b) => a.x - b.x)
      let line = ''
      let prevEnd = null
      for (const it of items) {
        if (prevEnd === null) line = it.str
        else if (it.x - prevEnd > 6) line += ',' + it.str  // real column gap
        else line += ' ' + it.str                          // same cell, keep as words
        prevEnd = it.xEnd
      }
      if (line.trim()) lines.push(line)
    }
  }

  return lines.join('\n')
}

// Detect a PDF by extension or MIME so the uploader can route it correctly.
export function isPdf(file) {
  return !!file && (/\.pdf$/i.test(file.name || '') || file.type === 'application/pdf')
}
