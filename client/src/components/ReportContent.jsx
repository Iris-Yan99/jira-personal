// Renders report text with pipe-delimited table blocks displayed as HTML tables.
// Plain text (for copy/export) is kept separately by callers — this component only affects display.

function parseCells(line) {
  return line.split('|').map((c) => c.trim()).filter((c) => c !== '')
}

function isSeparator(line) {
  // Lines like "-------- | ------ | --------"
  return /^[\s|\-]+$/.test(line) && line.includes('-')
}

function isTableRow(line) {
  // Must have at least 2 | to be considered a table row
  return (line.match(/\|/g) || []).length >= 2
}

function parse(content) {
  const lines = content.split('\n')
  const segments = []
  let textBuf = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (isTableRow(line) || (isSeparator(line) && i > 0 && isTableRow(lines[i - 1]))) {
      // Flush pending text
      if (textBuf.length > 0) {
        segments.push({ type: 'text', content: textBuf.join('\n') })
        textBuf = []
      }
      // Collect table block
      const block = []
      while (i < lines.length && (isTableRow(lines[i]) || isSeparator(lines[i]))) {
        block.push(lines[i])
        i++
      }
      const dataRows = block.filter((l) => !isSeparator(l)).map(parseCells)
      if (dataRows.length >= 1) {
        segments.push({ type: 'table', headers: dataRows[0], rows: dataRows.slice(1) })
      }
    } else {
      textBuf.push(line)
      i++
    }
  }

  if (textBuf.length > 0) {
    segments.push({ type: 'text', content: textBuf.join('\n') })
  }

  return segments
}

export default function ReportContent({ content }) {
  if (!content) return null
  const segments = parse(content)

  return (
    <div className="text-sm text-gray-700 font-sans leading-7">
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return (
            <pre key={idx} className="whitespace-pre-wrap font-sans m-0">
              {seg.content}
            </pre>
          )
        }

        // Table segment
        return (
          <div key={idx} className="my-3 overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  {seg.headers.map((h, j) => (
                    <th
                      key={j}
                      className="border-b border-gray-300 px-4 py-2.5 text-left font-semibold text-gray-700 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seg.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    {seg.headers.map((_, ci) => (
                      <td
                        key={ci}
                        className="border-t border-gray-100 px-4 py-2 text-gray-700 align-top"
                      >
                        {row[ci] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
                {seg.rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={seg.headers.length}
                      className="px-4 py-3 text-gray-400 text-center"
                    >
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
