const enc = new TextEncoder();

function esc(value: unknown) {
  return String(value ?? '').replace(/[\\()]/g, '\\$&').replace(/[\r\n]+/g, ' ');
}

function wrap(text: string, max = 92) {
  const words = esc(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > max) {
      if (line) lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines.length ? lines : ['—'];
}

export function basicPdf(title: string, subtitle: string, sections: { heading: string; lines: string[] }[]) {
  const pageLines = [
    { text: 'FarmaHub360', size: 18 },
    { text: 'Gestión interna del Servicio de Farmacia', size: 11 },
    { text: `Fecha de generación: ${new Date().toLocaleString('es-ES')}`, size: 9 },
    { text: title, size: 15 },
    { text: subtitle, size: 11 },
  ];
  for (const section of sections) {
    pageLines.push({ text: section.heading, size: 12 });
    for (const line of section.lines) for (const part of wrap(line)) pageLines.push({ text: part, size: 9 });
  }
  pageLines.push({ text: 'No introducir ni compartir información clínica identificable ni datos personales de pacientes.', size: 8 });
  pageLines.push({ text: 'FarmaHub360 · Desarrollado por Ramón Morillo · 2026', size: 8 });

  let y = 800;
  const content = ['BT', '/F1 12 Tf'];
  for (const line of pageLines.slice(0, 58)) {
    content.push(`/F1 ${line.size} Tf`, `50 ${y} Td (${esc(line.text)}) Tj`, `-50 -${Math.max(14, line.size + 5)} Td`);
    y -= Math.max(14, line.size + 5);
  }
  content.push('ET');
  const stream = content.join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${enc.encode(stream).length} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) { offsets.push(enc.encode(pdf).length); pdf += `${object}\n`; }
  const xref = enc.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer << /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xref}\n%%EOF`;
  return enc.encode(pdf);
}
