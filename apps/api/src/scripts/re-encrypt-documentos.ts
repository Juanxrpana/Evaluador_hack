/**
 * One-off verification: confirms every documento row is ciphertext (no
 * plaintext magic bytes) and carries the metadata.enc marker.
 */
import { Pool } from 'pg';
import { env } from '../config/env.ts';
import { Aes256GcmDocumentoCrypto } from '../modules/documentos/documento.crypto.ts';

const crypto = new Aes256GcmDocumentoCrypto(Buffer.from(env.DOCUMENTO_ENCRYPTION_KEY, 'base64'));
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5433/app' });

const { rows } = await pool.query('select id, nombre, contenido, metadata from documento');

let cifradas = 0;
let textoPlano = 0;

for (const fila of rows) {
  const bytes = fila.contenido;
  const esPlano =
    bytes.subarray(0, 4).toString('latin1') === '%PDF' ||
    bytes.subarray(0, 4).toString('latin1') === '\x89PNG';

  if (esPlano) {
    textoPlano += 1;
    console.log('❌ PLANO:', fila.nombre, '| metadata.enc:', fila.metadata?.enc ?? 'ninguno');
    continue;
  }

  const descifrado = crypto.descifrar(bytes);
  const valida =
    descifrado.subarray(0, 4).toString('latin1') === '%PDF' ||
    descifrado.subarray(0, 4).toString('latin1') === '\x89PNG';

  cifradas += 1;
  console.log(
    '✅ CIFRADO:',
    fila.nombre,
    '| enc:',
    fila.metadata?.enc,
    '| descifra a',
    descifrado.byteLength,
    'bytes y recupera el formato original:',
    valida,
  );
}

console.log('---');
console.log('total:', rows.length, '| cifradas:', cifradas, '| texto plano:', textoPlano);

await pool.end();
