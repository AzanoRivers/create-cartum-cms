#!/usr/bin/env node
import prompts from 'prompts'
import { downloadTemplate } from 'giget'
import { execSync } from 'child_process'
import { writeFileSync, existsSync } from 'fs'
import { copyFile } from 'fs/promises'
import kleur from 'kleur'

// ── Config ────────────────────────────────────────────────────────────────────
const REPO = 'AzanoRivers/cartum-cms'

// ── ANSI ──────────────────────────────────────────────────────────────────────
const UP  = n => `\x1b[${n}A`
const CLR = () => `\x1b[2K\r`

// ── Face expressions ──────────────────────────────────────────────────────────
//  Each sequence tells a small story — neutral, look around, blink, think, etc.
const FACE = {
  // Fetching / waiting — curious, scanning, blinking
  think: [
    '◕ _ ◕',  // neutral
    '◕ _ ◕',  // hold
    '– _ –',  // blink
    '◕ _ ◕',  // open
    '◔ _ ◕',  // glance left
    '◔ _ ◔',  // look far left
    '◕ _ ◕',  // center
    '◕ _ ◑',  // glance right
    '– _ –',  // blink
    '◕ _ ◕',  // open
    '• _ •',  // thinking
    '• ‥ •',  // deep thought
    '• _ •',  // still thinking
    '– _ –',  // blink
    '◕ . ◕',  // concentrate
    '◑ _ ◑',  // look inward
    '◕ _ ◕',  // neutral
    '– _ –',  // blink again
    '◕ _ ◕',  // back to start
  ],

  // Cloning / installing — busy, focused, occasionally glances up
  work: [
    '⊙ ◡ ⊙',  // working
    '◕ ◡ ◕',  // content
    '– ◡ –',  // happy blink
    '⊙ ◡ ⊙',  // back
    '◔ ◡ ◕',  // glance while working
    '◉ ◡ ◉',  // very focused
    '⊙ ◡ ⊙',  // working
    '– ◡ –',  // blink
    '◕ ◡ ◕',  // content
    '⊙ ◡ ◉',  // asymmetric (personality)
    '◉ ◡ ⊙',  // other side
    '⊙ ◡ ⊙',  // working
    '◕ ◡ ◕',  // content
    '– ◡ –',  // blink
    '⊙ ◡ ⊙',  // working
  ],

  // Reactions (static — used with faceMoment)
  surprised: '◉ ○ ◉',  // shocked open mouth
  curious:   '◔ ‿ ◕',  // one eyebrow raised
  storage:   '◕ ¬ ◕',  // thinking about storage
  email:     '◕ ω ◕',  // cute/friendly
  happy:     '◕ ‿ ◕',  // happy
  excited:   '^ ‿ ^',  // very happy
  oops:      '✖ ︿ ✖',  // error
}

// ── Box renderer (3 lines, no trailing newline) ───────────────────────────────
function box(expr, msg, c = kleur.cyan) {
  return (
    CLR() + `  ${c('╭─────────╮')}\n` +
    CLR() + `  ${c('│')}  ${expr}  ${c('│')}  ${msg}\n` +
    CLR() + `  ${c('╰─────────╯')}`
  )
}

// ── Animated face spinner ─────────────────────────────────────────────────────
// Organic timing: each frame has a slightly different delay for a natural feel.
function faceSpinner(frames, msg) {
  let i = 0
  process.stdout.write('\n' + box(frames[0], kleur.dim(msg)))

  function tick() {
    i++
    process.stdout.write('\r' + UP(2) + box(frames[i % frames.length], kleur.dim(msg)))
    // Vary delay: blink frames (– _ –, – ◡ –) are shorter; hold frames longer
    const expr = frames[i % frames.length]
    const delay = expr.includes('–')
      ? 80 + Math.random() * 60    // blink: fast
      : 160 + Math.random() * 120  // normal: organic
    id = setTimeout(tick, delay)
  }

  let id = setTimeout(tick, 200)

  return {
    succeed(doneMsg) {
      clearTimeout(id)
      process.stdout.write('\r' + UP(2) + box(FACE.happy, kleur.dim(doneMsg), kleur.green) + '\n')
    },
    fail(errMsg) {
      clearTimeout(id)
      process.stdout.write('\r' + UP(2) + box(FACE.oops, kleur.red(errMsg), kleur.red) + '\n')
    },
  }
}

// ── One-shot face moment (reaction before a prompts section) ──────────────────
// Draws the face box then waits briefly — gives the "reaction" feel.
// Returns a promise so you can await it.
function faceMoment(expr, msg, ms = 700) {
  return new Promise(resolve => {
    process.stdout.write('\n' + box(expr, kleur.dim(msg), kleur.cyan) + '\n')
    setTimeout(resolve, ms)
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const onCancel = () => { console.log(''); process.exit(0) }
const ask = config => prompts(config, { onCancel })

function detectPm() {
  const ua = process.env.npm_config_user_agent ?? ''
  if (ua.startsWith('pnpm')) return 'pnpm'
  if (ua.startsWith('yarn')) return 'yarn'
  return 'npm'
}

async function fetchTags() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/tags`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data.map(t => t.name) : []
  } catch { return [] }
}

// ── i18n ──────────────────────────────────────────────────────────────────────
const MESSAGES = {
  en: {
    langQ:        'Language / Idioma:',
    projectName:  'Project name:',
    version:      'Version:',
    latest:       'latest',
    react: {
      project:    "Oh, a new project! What are we calling it?",
      versions:   "Let me check what versions are available...",
      clone:      "Cloning the template, hang tight...",
      envAsk:     "I'll need a few details from you.",
      required:   "Required — the essentials",
      storage:    "Optional — where should media live?",
      email:      "Optional — want to set up email?",
      installing: "Almost there, grabbing dependencies...",
    },
    configEnv:    'Configure environment variables?',
    configNow:    'Yes, configure now',
    configLater:  'Configure later',
    dbUrl:        'DATABASE_URL  (PostgreSQL connection string):',
    dbUrlHint:    'postgresql://user:pass@host/dbname',
    dbProvider:   'DB_PROVIDER:',
    authSecret:   'AUTH_SECRET  (tip: openssl rand -base64 32):',
    authUrl:      'AUTH_URL  (base URL, no trailing slash):',
    cfgStorage:   'Configure storage?',
    r2:           'Cloudflare R2',
    blob:         'Vercel Blob',
    skip:         'Skip for now',
    r2Endpoint:   'R2_ENDPOINT:',
    r2EndpH:      'https://<ACCOUNT_ID>.r2.cloudflarestorage.com',
    r2PublicUrl:  'R2_PUBLIC_URL:',
    r2AccessKey:  'R2_ACCESS_KEY_ID:',
    r2SecretKey:  'R2_SECRET_ACCESS_KEY:',
    r2Bucket:     'R2_BUCKET_NAME:',
    blobToken:    'BLOB_READ_WRITE_TOKEN:',
    cfgEmail:     'Configure email (Resend)?',
    resendKey:    'RESEND_API_KEY:',
    resendFrom:   'RESEND_FROM_EMAIL:',
    resendFromH:  'noreply@yourdomain.com',
    installDeps:  'Install dependencies now?',
    envWritten:   '.env written',
    envCopied:    '.env created — fill in values before running',
    sp: {
      tags:       'Checking versions...',
      clone:      'Cloning template...',
      install:    'Installing dependencies...',
    },
    ok: {
      tags:       'Versions loaded',
      clone:      'Template cloned',
      install:    'Dependencies installed',
    },
    err: {
      clone:      'Clone failed',
      install:    'Install failed — run',
      manually:   'manually',
    },
    ready:        "🚀  Houston, we're ready to launch.",
    nextSteps:    'Next steps:',
    fillEnv:      '# fill in .env',
  },
  es: {
    langQ:        'Language / Idioma:',
    projectName:  'Nombre del proyecto:',
    version:      'Versión:',
    latest:       'última',
    react: {
      project:    '¡Un proyecto nuevo! ¿Cómo lo llamamos?',
      versions:   'Revisando versiones disponibles...',
      clone:      'Clonando la plantilla, espera un momento...',
      envAsk:     'Voy a necesitar algunos datos.',
      required:   'Requeridas — lo esencial',
      storage:    'Opcional — ¿dónde vive el contenido multimedia?',
      email:      'Opcional — ¿configuramos el email?',
      installing: 'Casi listo, instalando dependencias...',
    },
    configEnv:    '¿Configurar variables de entorno?',
    configNow:    'Sí, configurar ahora',
    configLater:  'Configurar luego',
    dbUrl:        'DATABASE_URL  (cadena de conexión PostgreSQL):',
    dbUrlHint:    'postgresql://user:pass@host/dbname',
    dbProvider:   'DB_PROVIDER:',
    authSecret:   'AUTH_SECRET  (tip: openssl rand -base64 32):',
    authUrl:      'AUTH_URL  (URL base, sin barra al final):',
    cfgStorage:   '¿Configurar almacenamiento?',
    r2:           'Cloudflare R2',
    blob:         'Vercel Blob',
    skip:         'Omitir por ahora',
    r2Endpoint:   'R2_ENDPOINT:',
    r2EndpH:      'https://<ACCOUNT_ID>.r2.cloudflarestorage.com',
    r2PublicUrl:  'R2_PUBLIC_URL:',
    r2AccessKey:  'R2_ACCESS_KEY_ID:',
    r2SecretKey:  'R2_SECRET_ACCESS_KEY:',
    r2Bucket:     'R2_BUCKET_NAME:',
    blobToken:    'BLOB_READ_WRITE_TOKEN:',
    cfgEmail:     '¿Configurar email (Resend)?',
    resendKey:    'RESEND_API_KEY:',
    resendFrom:   'RESEND_FROM_EMAIL:',
    resendFromH:  'noreply@tudominio.com',
    installDeps:  '¿Instalar dependencias ahora?',
    envWritten:   '.env generado',
    envCopied:    '.env creado — completa los valores antes de ejecutar',
    sp: {
      tags:       'Verificando versiones...',
      clone:      'Clonando plantilla...',
      install:    'Instalando dependencias...',
    },
    ok: {
      tags:       'Versiones cargadas',
      clone:      'Plantilla clonada',
      install:    'Dependencias instaladas',
    },
    err: {
      clone:      'Error al clonar',
      install:    'Instalación fallida — ejecuta',
      manually:   'manualmente',
    },
    ready:        '🚀  Todo listo, Houston.',
    nextSteps:    'Próximos pasos:',
    fillEnv:      '# completa el .env',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

// ── Header ────────────────────────────────────────────────────────────────────
console.log('')
console.log(kleur.bold().cyan('  ╔═══════════════════════╗'))
console.log(kleur.bold().cyan('  ║') + kleur.bold('   C A R T U M   C M S   ') + kleur.bold().cyan('║'))
console.log(kleur.bold().cyan('  ╚═══════════════════════╝'))
console.log(kleur.dim('         by AzanoLabs'))
console.log('')

// ── Language ──────────────────────────────────────────────────────────────────
const { lang } = await ask({
  type: 'select',
  name: 'lang',
  message: 'Language / Idioma:',
  choices: [
    { title: '🇬🇧  English', value: 'en' },
    { title: '🇪🇸  Español', value: 'es' },
  ],
  initial: 0,
})
const t = MESSAGES[lang]

// ── Project name (surprised reaction) ────────────────────────────────────────
await faceMoment(FACE.surprised, t.react.project, 700)
const { projectName } = await ask({
  type: 'text',
  name: 'projectName',
  message: t.projectName,
  initial: 'my-cms',
  validate: v => v.trim().length > 0 || (lang === 'es' ? 'Nombre requerido' : 'Name is required'),
})
const dest = projectName.trim()

// ── Fetch versions ────────────────────────────────────────────────────────────
const sp1 = faceSpinner(FACE.think, t.sp.tags)
const tags = await fetchTags()
sp1.succeed(`${t.ok.tags}${tags[0] ? kleur.dim(` — ${tags[0]}`) : ''}`)

let selectedTag = tags[0] ?? ''
if (tags.length > 1) {
  const { version } = await ask({
    type: 'select',
    name: 'version',
    message: t.version,
    choices: [
      { title: `${t.latest} (${tags[0]})`, value: tags[0] },
      ...tags.slice(1).map(v => ({ title: v, value: v })),
    ],
    initial: 0,
  })
  selectedTag = version
}

// ── Clone ─────────────────────────────────────────────────────────────────────
const ref = selectedTag ? `#${selectedTag}` : ''
const sp2 = faceSpinner(FACE.work, t.sp.clone)
try {
  await downloadTemplate(`github:${REPO}${ref}`, { dir: dest, force: true })
  sp2.succeed(t.ok.clone)
} catch (err) {
  sp2.fail(`${t.err.clone}: ${err.message}`)
  process.exit(1)
}

// ── Environment variables ─────────────────────────────────────────────────────
const ENV = {}

await faceMoment(FACE.curious, t.react.envAsk, 700)
const { envChoice } = await ask({
  type: 'select',
  name: 'envChoice',
  message: t.configEnv,
  choices: [
    { title: t.configNow,   value: 'now' },
    { title: t.configLater, value: 'later' },
  ],
  initial: 0,
})

if (envChoice === 'now') {
  console.log('')
  console.log(kleur.bold().white(`  ── ${t.react.required} ──`))
  console.log('')

  const { dbUrl }   = await ask({ type: 'text',     name: 'dbUrl',   message: t.dbUrl,      hint: t.dbUrlHint })
  const { dbProv }  = await ask({ type: 'select',   name: 'dbProv',  message: t.dbProvider, choices: [{ title: 'neon', value: 'neon' }, { title: 'supabase', value: 'supabase' }] })
  const { authSec } = await ask({ type: 'password', name: 'authSec', message: t.authSecret })
  const { authUrl } = await ask({ type: 'text',     name: 'authUrl', message: t.authUrl,    initial: 'http://localhost:3000' })

  ENV['DATABASE_URL'] = dbUrl   ?? ''
  ENV['DB_PROVIDER']  = dbProv  ?? 'neon'
  ENV['AUTH_SECRET']  = authSec ?? ''
  ENV['AUTH_URL']     = authUrl ?? 'http://localhost:3000'

  await faceMoment(FACE.storage, t.react.storage, 650)
  const { storage } = await ask({
    type: 'select', name: 'storage', message: t.cfgStorage,
    choices: [
      { title: t.r2,   value: 'r2'   },
      { title: t.blob, value: 'blob' },
      { title: t.skip, value: 'skip' },
    ],
    initial: 2,
  })

  if (storage === 'r2') {
    const { a } = await ask({ type: 'text',     name: 'a', message: t.r2Endpoint,  hint: t.r2EndpH })
    const { b } = await ask({ type: 'text',     name: 'b', message: t.r2PublicUrl })
    const { c } = await ask({ type: 'text',     name: 'c', message: t.r2AccessKey })
    const { d } = await ask({ type: 'password', name: 'd', message: t.r2SecretKey })
    const { e } = await ask({ type: 'text',     name: 'e', message: t.r2Bucket    })
    ENV['R2_ENDPOINT']          = a ?? ''
    ENV['R2_PUBLIC_URL']        = b ?? ''
    ENV['R2_ACCESS_KEY_ID']     = c ?? ''
    ENV['R2_SECRET_ACCESS_KEY'] = d ?? ''
    ENV['R2_BUCKET_NAME']       = e ?? ''
  } else if (storage === 'blob') {
    const { a } = await ask({ type: 'password', name: 'a', message: t.blobToken })
    ENV['BLOB_READ_WRITE_TOKEN'] = a ?? ''
  }

  await faceMoment(FACE.email, t.react.email, 650)
  const { doEmail } = await ask({ type: 'confirm', name: 'doEmail', message: t.cfgEmail, initial: false })
  if (doEmail) {
    const { a } = await ask({ type: 'password', name: 'a', message: t.resendKey })
    const { b } = await ask({ type: 'text',     name: 'b', message: t.resendFrom, hint: t.resendFromH })
    ENV['RESEND_API_KEY']    = a ?? ''
    ENV['RESEND_FROM_EMAIL'] = b ?? ''
  }

  writeFileSync(`${dest}/.env`, [
    '# Environment Variables — Cartum CMS',
    '# Generated by create-cartum-cms',
    '',
    '# ─── Runtime ──────────────────────────────────',
    'NODE_ENV=development',
    '',
    '# ─── Database ─────────────────────────────────',
    `DATABASE_URL=${ENV['DATABASE_URL'] ?? ''}`,
    `DB_PROVIDER=${ENV['DB_PROVIDER'] ?? 'neon'}`,
    '',
    '# ─── Authentication ───────────────────────────',
    `AUTH_SECRET=${ENV['AUTH_SECRET'] ?? ''}`,
    `AUTH_URL=${ENV['AUTH_URL'] ?? 'http://localhost:3000'}`,
    '',
    '# ─── Storage (Cloudflare R2) ──────────────────',
    `R2_ENDPOINT=${ENV['R2_ENDPOINT'] ?? ''}`,
    `R2_PUBLIC_URL=${ENV['R2_PUBLIC_URL'] ?? ''}`,
    `R2_ACCESS_KEY_ID=${ENV['R2_ACCESS_KEY_ID'] ?? ''}`,
    `R2_SECRET_ACCESS_KEY=${ENV['R2_SECRET_ACCESS_KEY'] ?? ''}`,
    `R2_BUCKET_NAME=${ENV['R2_BUCKET_NAME'] ?? ''}`,
    '',
    '# ─── Storage (Vercel Blob) ─────────────────────',
    `BLOB_READ_WRITE_TOKEN=${ENV['BLOB_READ_WRITE_TOKEN'] ?? ''}`,
    '',
    '# ─── Email (Resend) ────────────────────────────',
    `RESEND_API_KEY=${ENV['RESEND_API_KEY'] ?? ''}`,
    `RESEND_FROM_EMAIL=${ENV['RESEND_FROM_EMAIL'] ?? ''}`,
  ].join('\n') + '\n')

  console.log('')
  console.log(`  ${kleur.green('✓')}  ${kleur.dim(t.envWritten)}`)

} else {
  if (existsSync(`${dest}/.env.example`)) {
    await copyFile(`${dest}/.env.example`, `${dest}/.env`)
  }
  console.log('')
  console.log(`  ${kleur.dim('○')}  ${kleur.dim(t.envCopied)}`)
}

// ── Install dependencies ──────────────────────────────────────────────────────
console.log('')
const { doInstall } = await ask({ type: 'confirm', name: 'doInstall', message: t.installDeps, initial: true })

if (doInstall) {
  const pm  = detectPm()
  const sp3 = faceSpinner(FACE.work, t.sp.install)
  try {
    execSync(`${pm} install`, { cwd: dest, stdio: 'pipe' })
    sp3.succeed(t.ok.install)
  } catch {
    sp3.fail(`${t.err.install} \`${pm} install\` ${t.err.manually}`)
  }
}

// ── Done — excited face ───────────────────────────────────────────────────────
console.log('')
console.log(kleur.bold().cyan('  ╭─────────╮'))
console.log(kleur.bold().cyan('  │') + '  ' + FACE.excited + '  ' + kleur.bold().cyan('│') + '  ' + kleur.bold().green(t.ready))
console.log(kleur.bold().cyan('  ╰─────────╯'))
console.log('')
console.log(kleur.bold(`  ${t.nextSteps}`))
console.log('')
console.log(`    ${kleur.cyan('cd')} ${dest}`)
if (envChoice === 'later') console.log(`    ${kleur.dim(t.fillEnv)}`)
console.log(`    ${kleur.cyan('pnpm db:push')}`)
console.log(`    ${kleur.cyan('pnpm dev')}`)
console.log('')
