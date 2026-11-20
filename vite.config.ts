export default defineConfig({
  plugins: [react],
  base: process.env.GITHUB_PAGES === 'true'
    ? '/debate-arena/'
    : '/'
})