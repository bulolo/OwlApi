import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: '../../backend/docs/swagger.json',
  output: {
    path: 'src/lib/sdk',
    clean: true,
  },
  plugins: [
    '@hey-api/typescript',
    {
      name: '@hey-api/sdk',
      responseStyle: 'data',
    },
    {
      name: '@hey-api/client-fetch',
      runtimeConfigPath: '../hey-api',
    },
  ],
})
