import { globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextVitals,
  globalIgnores(['.next/**', 'managed/**', 'public/managed/**', 'node_modules/**']),
];

export default config;
