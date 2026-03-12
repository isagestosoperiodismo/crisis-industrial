# Registro de Despidos y Cierres — Conurbano Bonaerense

Aplicación SvelteKit con scraping automático diario de medios argentinos.

## Estructura

```
/
├── data/
│   └── empresas.csv              ← fuente de datos (versionado en git)
├── scraper/
│   ├── scraper.js                ← scraper en Node.js (ESM)
│   └── package.json
├── .github/
│   └── workflows/
│       └── daily-scrape.yml      ← GitHub Actions: corre todos los días 8am ARG
└── src/
    └── routes/
        ├── +page.server.js       ← carga y normaliza el CSV
        └── +page.svelte          ← tabla con filtros
```

## Setup

### 1. Clonar e instalar

```bash
git clone https://github.com/TU_USUARIO/TU_REPO.git
cd TU_REPO

# App SvelteKit
npm install

# Scraper
cd scraper && npm install && cd ..
```

### 2. Correr en desarrollo

```bash
npm run dev
```

### 3. Correr el scraper manualmente

```bash
cd scraper
node scraper.js
```

### 4. GitHub Actions (scraping automático)

El workflow `.github/workflows/daily-scrape.yml` corre automáticamente todos los
días a las 11:00 UTC (8:00am hora Argentina).

Para activarlo:

1. Subir el repo a GitHub
2. Ir a **Settings → Actions → General → Workflow permissions**
3. Activar **"Read and write permissions"**

El bot hace commit automático del CSV actualizado al repo. Cada commit activa el
redeploy si tenés Vercel/Netlify conectado.

### 5. Deploy en Vercel

```bash
npm install -g vercel
vercel
```

> ⚠️ En producción el CSV se lee desde el repo. Cada push del scraper actualiza
> los datos.

## Columnas del CSV

| Columna                                | Descripción                |
| -------------------------------------- | -------------------------- |
| `Fecha`                                | DD/MM/YYYY                 |
| `Empresa/Organismo`                    | Nombre de la empresa       |
| `Rubro Principal`                      | Sector económico           |
| `Cantidad de empleados despedidos`     | Número (puede estar vacío) |
| `Provincia`                            | Buenos Aires               |
| `Si fue en PBA poner en que municipio` | Municipio del conurbano    |
| `¿La empresa cerró?`                   | Sí / No                    |

## Medios que cubre el scraper

Vía Google News RSS (incluye automáticamente):

- Infobae, Clarín, La Nación, Página 12, Tiempo Argentino, El Destape, InfoGEI,
  El1Digital, y más

Scraping directo adicional:

- El Destape Web
- Página 12
