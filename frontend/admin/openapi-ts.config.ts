import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: '../../backend/internal/transport/http/openapi.yaml',
  output: {
    path: 'src/lib/sdk',
    clean: true,
  },
  plugins: [
    '@hey-api/typescript',
    '@hey-api/sdk',
    {
      name: '@hey-api/client-fetch',
      runtimeConfigPath: '../hey-api',
    },
  ],
})
