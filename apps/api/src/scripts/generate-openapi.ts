import { writeFile } from 'node:fs/promises';
import { OpenAPIGenerator } from '@orpc/openapi';
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4';
import { contract } from '@repo/contracts';

const port = process.env.PORT ?? '3000';

const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

const spec = await generator.generate(contract, {
  info: {
    title: 'Monorepo API',
    version: '1.0.0',
  },
  servers: [{ url: `http://localhost:${port}/api` }],
});

const output = new URL('../../openapi.json', import.meta.url);
await writeFile(output, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');

console.log(`OpenAPI specification written to ${output.pathname}`);
