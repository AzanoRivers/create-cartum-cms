<div align="center">
  <img src="https://cartum.azanolabs.com/images/brand/icon.svg" width="72" alt="Cartum CMS" />

  # create-cartum-cms

  ![version](https://img.shields.io/badge/version-1.0.0-0BD2FF?style=flat-square)
  ![license](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)
  ![node](https://img.shields.io/badge/node-%3E%3D18-f59e0b?style=flat-square)

  **[🇪🇸 Español](#-español) · [🇬🇧 English](#-english)**
</div>

---

## 🇪🇸 Español

Crea un nuevo proyecto de [Cartum CMS](https://github.com/AzanoRivers/cartum-cms) de forma interactiva.

### Uso

```bash
pnpm create cartum-cms
# o
npx create-cartum-cms
# o
yarn create cartum-cms
```

### Qué hace

1. Te deja elegir el **idioma** (Español / English)
2. Pregunta el **nombre del proyecto**
3. Te deja elegir la **versión** (la última o una específica)
4. **Clona** la plantilla desde GitHub (sin historial de git)
5. Opcionalmente te guía por las **variables de entorno** una a una
6. Opcionalmente ejecuta **`pnpm install`** por ti

### Después del scaffolding

```bash
cd tu-proyecto
# completa el .env si elegiste "configurar luego"
pnpm db:push   # sincroniza el esquema con tu base de datos
pnpm dev       # inicia el servidor de desarrollo
```

### Grupos de variables de entorno

| Grupo | Variables |
|---|---|
| **Requeridas** | `DATABASE_URL`, `DB_PROVIDER`, `AUTH_SECRET`, `AUTH_URL` |
| **Almacenamiento — R2** | `R2_ENDPOINT`, `R2_PUBLIC_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` |
| **Almacenamiento — Blob** | `BLOB_READ_WRITE_TOKEN` |
| **Email** | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |

<div align="center">

Hecho con ❤️ por [AzanoLabs](https://github.com/AzanoRivers)

</div>

---

## 🇬🇧 English

Scaffold a new [Cartum CMS](https://github.com/AzanoRivers/cartum-cms) project interactively.

### Usage

```bash
pnpm create cartum-cms
# or
npx create-cartum-cms
# or
yarn create cartum-cms
```

### What it does

1. Lets you pick a **language** (Español / English)
2. Asks for your **project name**
3. Lets you pick a **version** (latest or specific release)
4. **Clones** the template from GitHub (no git history)
5. Optionally walks you through **environment variables** one by one
6. Optionally runs **`pnpm install`** for you

### After scaffolding

```bash
cd your-project
# fill in .env if you chose "configure later"
pnpm db:push   # push schema to your database
pnpm dev       # start development server
```

### Environment variable groups

| Group | Variables |
|---|---|
| **Required** | `DATABASE_URL`, `DB_PROVIDER`, `AUTH_SECRET`, `AUTH_URL` |
| **Storage — R2** | `R2_ENDPOINT`, `R2_PUBLIC_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` |
| **Storage — Blob** | `BLOB_READ_WRITE_TOKEN` |
| **Email** | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |

<div align="center">

Made with ❤️ by [AzanoLabs](https://github.com/AzanoRivers)

</div>