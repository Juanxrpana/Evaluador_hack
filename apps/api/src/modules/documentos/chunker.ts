/**
 * A knowledge chunk: one coherent slice of text with its position in the
 * source document. Chunks are embedded (bge-m3) and stored as `conocimiento`
 * rows scoped to one proyecto.
 */
export interface ConocimientoChunk {
  index: number;
  text: string;
}

const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_CHUNK_OVERLAP = 150;

export function chunkText(
  text: string,
  size = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
): ConocimientoChunk[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();

  if (normalized.length === 0) {
    return [];
  }

  const chunks: ConocimientoChunk[] = [];
  let current = '';

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed.length > 0) {
      chunks.push({ index: chunks.length, text: trimmed });
    }
    current = overlap > 0 ? tail(trimmed, overlap) : '';
  };

  for (const paragraph of normalized.split(/\n{2,}|\n/)) {
    const piece = paragraph.trim();

    if (piece.length === 0) {
      continue;
    }

    if (piece.length > size) {
      // Hard-split oversized paragraphs on word boundaries.
      for (const part of splitLongText(piece, size, overlap)) {
        if (current.length + part.length + 1 > size) {
          flush();
        }
        current = current ? `${current}\n${part}` : part;
        flushIfBigEnough();
      }
      continue;
    }

    if (current.length + piece.length + 1 > size) {
      flush();
    }

    current = current ? `${current}\n${piece}` : piece;
    flushIfBigEnough();
  }

  const trimmed = current.trim();
  if (trimmed.length > 0 && (chunks.length === 0 || trimmed !== chunks[chunks.length - 1].text)) {
    chunks.push({ index: chunks.length, text: trimmed });
  }

  return chunks;

  function flushIfBigEnough() {
    if (current.trim().length >= size * 0.5) {
      flush();
    }
  }
}

function splitLongText(text: string, size: number, overlap: number): string[] {
  const parts: string[] = [];
  let position = 0;

  while (position < text.length) {
    let end = Math.min(position + size, text.length);

    if (end < text.length) {
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > position + size * 0.5) {
        end = lastSpace;
      }
    }

    parts.push(text.slice(position, end).trim());
    position = end - overlap > position ? end - overlap : end;
  }

  return parts.filter((part) => part.length > 0);
}

function tail(text: string, length: number): string {
  if (text.length === 0) {
    return '';
  }

  const tailText = text.slice(-length);
  const firstSpace = tailText.indexOf(' ');

  return firstSpace > 0 ? tailText.slice(firstSpace + 1) : tailText;
}
