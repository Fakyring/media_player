import * as esbuild from 'esbuild'
import { rimraf } from 'rimraf'
import stylePlugin from 'esbuild-style-plugin'
import autoprefixer from 'autoprefixer'
import tailwindcss from 'tailwindcss'
import { cp, mkdir } from 'node:fs/promises'
import sharp from 'sharp'

const args = process.argv.slice(2)
const isProd = args[0] === '--production'

await rimraf('dist')
await mkdir('dist/icons', { recursive: true })
await cp('public/icons', 'dist/icons', { recursive: true })
await cp('public/manifest.webmanifest', 'dist/manifest.webmanifest')
const appIcon = sharp('public/icons/media-library.svg')
await Promise.all(
  [180, 192, 512].map((size) =>
    appIcon.clone().resize(size, size).png().toFile(`dist/icons/media-library-${size}.png`),
  ),
)

/**
 * @type {esbuild.BuildOptions}
 */
const esbuildOpts = {
  color: true,
  entryPoints: ['src/main.tsx', 'index.html'],
  outdir: 'dist',
  entryNames: '[name]',
  write: true,
  bundle: true,
  format: 'iife',
  sourcemap: isProd ? false : 'linked',
  minify: isProd,
  treeShaking: true,
  jsx: 'automatic',
  loader: {
    '.html': 'copy',
    '.png': 'file',
  },
  plugins: [
    stylePlugin({
      postcss: {
        plugins: [tailwindcss, autoprefixer],
      },
    }),
  ],
}

if (isProd) {
  await esbuild.build(esbuildOpts)
} else {
  const ctx = await esbuild.context(esbuildOpts)
  await ctx.watch()
  const { hosts, port } = await ctx.serve()
  console.log(`Running on:`)
  hosts.forEach((host) => {
    console.log(`http://${host}:${port}`)
  })
}
