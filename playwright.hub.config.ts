import base from './playwright.config';

// Override: port 5173 is occupied by another project's dev server, so run this
// app on a dedicated free port for the Hub grouping specs.
const PORT = 5199;

export default {
  ...base,
  use: { ...(base as any).use, baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60000,
  },
};
