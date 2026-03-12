#!/usr/bin/env node

/**
 * Scraper de despidos y cierres — Conurbano bonaerense
 * Desde: 01/11/2023
 *
 * Genera:
 *   data/por_verificar.csv  → noticias para revisar y completar manualmente
 *
 * No toca data/empresas.csv (solo lo lee para no duplicar eventos ya confirmados)
 *
 * Uso:
 *   node scraper.mjs           → modo normal
 *   node scraper.mjs --debug   → muestra por qué se descarta cada artículo
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEBUG = process.argv.includes('--debug');

// ── Paths ──────────────────────────────────────────────────────────────────
const DATA_DIR = path.resolve(__dirname, '../data');
const CSV_VERIFICADO = path.join(DATA_DIR, 'empresas.csv');
const CSV_POR_VERIFICAR = path.join(DATA_DIR, 'por_verificar.csv');

// ── Config ─────────────────────────────────────────────────────────────────
const START_DATE = '01/11/2023';
const SLEEP_MS = 1400;

// ── Columnas del por_verificar ─────────────────────────────────────────────
const COLS = [
	'fecha',
	'municipio',
	'titulo',
	'url',
	'medio',
	'empresa',
	'rubro',
	'despedidos',
	'cerro_empresa'
];

// ── Municipios del Conurbano ───────────────────────────────────────────────
const MUNICIPIOS = [
	'AVELLANEDA',
	'LANUS',
	'LOMAS DE ZAMORA',
	'LA MATANZA',
	'MORON',
	'TRES DE FEBRERO',
	'SAN MARTIN',
	'GENERAL SAN MARTIN',
	'VICENTE LOPEZ',
	'SAN ISIDRO',
	'QUILMES',
	'BERAZATEGUI',
	'FLORENCIO VARELA',
	'ALMIRANTE BROWN',
	'ESTEBAN ECHEVERRIA',
	'EZEIZA',
	'MERLO',
	'MORENO',
	'HURLINGHAM',
	'ITUZAINGO',
	'MALVINAS ARGENTINAS',
	'JOSE C PAZ',
	'SAN MIGUEL',
	'TIGRE',
	'SAN FERNANDO',
	'ESCOBAR',
	'PILAR',
	'CAMPANA',
	'ZARATE',
	'LUJAN',
	'GENERAL RODRIGUEZ',
	'MARCOS PAZ',
	'PRESIDENTE PERON',
	'BERNAL',
	'WILDE',
	'TEMPERLEY',
	'BURZACO',
	'MONTE GRANDE'
];

// ── Keywords ───────────────────────────────────────────────────────────────
const KEYWORDS = [
	'despidos conurbano',
	'despidos Gran Buenos Aires',
	'cierre fabrica conurbano',
	'empresa cerro conurbano',
	'frigorifico cerro Buenos Aires',
	'suspensiones trabajadores conurbano',
	'quiebra empresa conurbano',
	'trabajadores calle Buenos Aires fabrica',
	'despidos provincia Buenos Aires industria'
];

const YEARS = ['2023', '2024', '2025', '2026'];

// ── Feeds RSS ──────────────────────────────────────────────────────────────
const FEEDS = [
	{ url: 'https://www.mundogremial.com/feed/', medio: 'Mundo Gremial' },
	{ url: 'https://www.infogremiales.com.ar/feed/', medio: 'Infogremiales' },
	{ url: 'https://agenciapacourondo.com.ar/feed/', medio: 'Agencia Paco Urondo' },
	{ url: 'https://www.dataconurbano.com.ar/feed/', medio: 'Data Conurbano' },
	{ url: 'https://www.pagina12.com.ar/rss/portada', medio: 'Página 12' },
	{ url: 'https://www.infobae.com/feeds/rss/', medio: 'Infobae' }
];

// ── Helpers ────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dbg = (...args) => DEBUG && console.log('  [DBG]', ...args);

function normalize(text) {
	return (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function esc(val) {
	const s = String(val || '')
		.replace(/\r?\n|\r/g, ' ')
		.trim();
	return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}

// ── Fechas ─────────────────────────────────────────────────────────────────
function parseDate(str) {
	if (!str) return null;

	const rfc = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
	if (rfc) {
		const M = {
			Jan: '01',
			Feb: '02',
			Mar: '03',
			Apr: '04',
			May: '05',
			Jun: '06',
			Jul: '07',
			Aug: '08',
			Sep: '09',
			Oct: '10',
			Nov: '11',
			Dec: '12',
			Ene: '01',
			Abr: '04',
			Ago: '08',
			Dic: '12'
		};
		const mes = M[rfc[2]] || M[rfc[2]?.slice(0, 3)];
		if (!mes) return null;
		return `${rfc[1].padStart(2, '0')}/${mes}/${rfc[3]}`;
	}

	const iso = str.match(/(\d{4})-(\d{2})-(\d{2})/);
	if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

	return null;
}

function dateKey(d) {
	const m = (d || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
	return m ? `${m[3]}${m[2]}${m[1]}` : '00000000';
}

// ── Detección de municipio ─────────────────────────────────────────────────
function detectMunicipio(text) {
	const t = normalize(text).toUpperCase();
	const sorted = [...MUNICIPIOS].sort((a, b) => b.length - a.length);
	return sorted.find((m) => t.includes(m)) || '';
}

// ── Relevancia ─────────────────────────────────────────────────────────────
function isRelevant(title, snippet) {
	const t = normalize((title || '') + ' ' + (snippet || '')).toLowerCase();
	const geo =
		MUNICIPIOS.some((m) => t.includes(m.toLowerCase())) ||
		t.includes('conurbano') ||
		t.includes('gran buenos aires') ||
		t.includes('provincia de buenos aires');
	const laboral = /despido|suspension|cierre|quiebra|concurso|desvinculacion|en la calle|paro/.test(
		t
	);
	return geo && laboral;
}

// ── RSS parser ─────────────────────────────────────────────────────────────
// Google News usa <link> de forma no estándar en RSS 2.0:
// el tag está vacío o el contenido real está en <guid isPermaLink="true">
// o inmediatamente después del tag de cierre </title> como texto suelto.
// La estrategia más robusta: intentar múltiples formas de extraer la URL.
function extractURL(block) {
	// 1) <link>https://...</link>  — formato estándar
	let m = block.match(/<link[^>]*>([^<]+)<\/link>/);
	if (m && m[1].trim().startsWith('http')) return m[1].trim();

	// 2) <link>  seguido de texto antes del próximo tag — Google News RSS a veces
	//    pone la URL entre <link> y el próximo tag sin cerrar correctamente
	m = block.match(/<link[^/]*\/?>[\s\n]*(https?:\/\/[^\s<]+)/);
	if (m) return m[1].trim();

	// 3) <guid isPermaLink="true">https://...</guid>
	m = block.match(/<guid[^>]*isPermaLink="true"[^>]*>([^<]+)<\/guid>/);
	if (m && m[1].trim().startsWith('http')) return m[1].trim();

	// 4) <guid>https://...</guid>  sin atributo
	m = block.match(/<guid[^>]*>([^<]+)<\/guid>/);
	if (m && m[1].trim().startsWith('http')) return m[1].trim();

	// 5) Cualquier URL https:// en el bloque (último recurso)
	m = block.match(/https?:\/\/[^\s<"]+/);
	if (m) return m[0].trim();

	return '';
}

function parseRSS(xml) {
	const items = [];
	const rx = /<item>([\s\S]*?)<\/item>/g;
	let m;
	while ((m = rx.exec(xml))) {
		const block = m[1];

		const getTag = (tag) => {
			const r = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
			return r
				? r[1]
						.replace(/<!\[CDATA\[|\]\]>/g, '')
						.replace(/<[^>]+>/g, '')
						.trim()
				: '';
		};

		const url = extractURL(block);
		const title = getTag('title');
		const date = getTag('pubDate');
		const snippet = getTag('description');

		items.push({ title, url, date, snippet });
	}
	return items;
}

async function fetchText(url) {
	const res = await fetch(url, {
		headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DespidosBot/1.0)' },
		signal: AbortSignal.timeout(12000)
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.text();
}

async function googleNews(keyword) {
	const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=es-419&gl=AR&ceid=AR:es-419`;
	try {
		const xml = await fetchText(url);
		const items = parseRSS(xml);

		if (DEBUG && items.length > 0) {
			dbg(`"${keyword}" → ${items.length} items`);
			dbg(`  url[0]:   ${items[0].url?.slice(0, 80)}`);
			dbg(`  title[0]: ${items[0].title?.slice(0, 60)}`);
			dbg(`  date[0]:  ${items[0].date}`);
		}

		return items.map((i) => ({ ...i, medio: 'Google News' }));
	} catch (e) {
		console.warn(`  ⚠ Google News [${keyword}]:`, e.message);
		return [];
	}
}

async function fetchFeed({ url, medio }) {
	try {
		const xml = await fetchText(url);
		return parseRSS(xml).map((i) => ({ ...i, medio }));
	} catch (e) {
		console.warn(`  ⚠ Feed [${medio}]:`, e.message);
		return [];
	}
}

// ── CSV I/O ────────────────────────────────────────────────────────────────
function loadCSV(filepath) {
	if (!fs.existsSync(filepath)) return [];
	const text = fs.readFileSync(filepath, 'utf8').trim();
	if (!text) return [];
	const lines = text.split('\n');
	const headers = lines
		.shift()
		.split(',')
		.map((h) => h.trim());
	return lines
		.filter((l) => l.trim())
		.map((l) => {
			const parts = [];
			let cur = '',
				inQ = false;
			for (const c of l) {
				if (c === '"') inQ = !inQ;
				else if (c === ',' && !inQ) {
					parts.push(cur.trim());
					cur = '';
				} else cur += c;
			}
			parts.push(cur.trim());
			const obj = {};
			headers.forEach((h, i) => (obj[h] = (parts[i] || '').replace(/^"|"$/g, '')));
			return obj;
		});
}

function saveCSV(filepath, rows) {
	if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
	const lines = rows.map((r) => COLS.map((c) => esc(r[c] || '')).join(','));
	fs.writeFileSync(filepath, [COLS.join(','), ...lines].join('\n'), 'utf8');
}

function eventKey(municipio, fecha, empresa = '') {
	const mes = dateKey(fecha).slice(0, 6);
	const mun = normalize(municipio).toLowerCase();
	const emp = normalize(empresa).toLowerCase().replace(/\s+/g, '').slice(0, 20);
	return emp ? `${mun}|${mes}|${emp}` : `${mun}|${mes}`;
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
	console.log('══════════════════════════════════════');
	console.log('  SCRAPER DESPIDOS — CONURBANO');
	if (DEBUG) console.log('  (modo --debug activo)');
	console.log('══════════════════════════════════════\n');

	const verificados = loadCSV(CSV_VERIFICADO);
	const porVerificar = loadCSV(CSV_POR_VERIFICAR);

	const urlSet = new Set([
		...verificados.map((r) => r.url).filter(Boolean),
		...porVerificar.map((r) => r.url).filter(Boolean)
	]);

	const eventosConfirmados = new Set(
		verificados
			.filter((r) => r.municipio && r.fecha)
			.map((r) => eventKey(r.municipio, r.fecha, r.empresa))
	);

	const eventosPendientes = new Set(
		porVerificar.filter((r) => r.municipio && r.fecha).map((r) => eventKey(r.municipio, r.fecha))
	);

	// ── Recolectar ────────────────────────────────────────────────────────
	let articles = [];

	console.log('🔍 Google News...');
	for (const kw of KEYWORDS) {
		for (const year of YEARS) {
			const q = `${kw} ${year}`;
			process.stdout.write(`   ${q} `);
			await sleep(SLEEP_MS);
			const res = await googleNews(q);
			process.stdout.write(`→ ${res.length}\n`);
			articles.push(...res);
		}
	}

	console.log('\n📡 Feeds RSS...');
	for (const feed of FEEDS) {
		await sleep(SLEEP_MS);
		const res = await fetchFeed(feed);
		console.log(`   ${feed.medio}: ${res.length} items`);
		articles.push(...res);
	}

	// ── Deduplicar por URL ────────────────────────────────────────────────
	const batchUrls = new Set();
	let sinUrl = 0;
	const beforeDedup = articles.length;

	articles = articles.filter((a) => {
		if (!a.url) {
			sinUrl++;
			return false;
		}
		if (batchUrls.has(a.url)) return false;
		batchUrls.add(a.url);
		return true;
	});

	console.log(
		`\n📰 Artículos: ${beforeDedup} totales → ${articles.length} únicos (${sinUrl} sin URL descartados)`
	);

	if (articles.length === 0) {
		console.log('\n⚠ No se pudo recolectar artículos. Verificá la conexión a internet.');
		process.exit(1);
	}

	// Muestra de los primeros 3 para confirmar que el parser funciona
	if (DEBUG) {
		console.log('\n── Muestra primeros 3 artículos ──');
		for (const a of articles.slice(0, 3)) {
			console.log(`  título:  ${a.title?.slice(0, 70)}`);
			console.log(`  url:     ${a.url?.slice(0, 80)}`);
			console.log(`  fecha:   ${a.date}`);
			console.log();
		}
	}

	console.log('─────────────────────────────────────\n');

	// ── Filtrar y agregar ─────────────────────────────────────────────────
	let added = 0;
	const stats = { url: 0, relevancia: 0, fecha: 0, municipio: 0, dupe: 0 };

	for (const a of articles) {
		if (urlSet.has(a.url)) {
			dbg(`SKIP url repetida: ${a.url?.slice(0, 60)}`);
			stats.url++;
			continue;
		}

		if (!isRelevant(a.title, a.snippet)) {
			dbg(`SKIP no relevante: "${a.title?.slice(0, 60)}"`);
			stats.relevancia++;
			continue;
		}

		const fecha = parseDate(a.date);
		if (!fecha || dateKey(fecha) < dateKey(START_DATE)) {
			dbg(`SKIP fecha: "${a.date}" → ${fecha}`);
			stats.fecha++;
			continue;
		}

		const municipio = detectMunicipio(a.title + ' ' + (a.snippet || ''));
		if (!municipio) {
			dbg(`SKIP sin municipio: "${a.title?.slice(0, 60)}"`);
			stats.municipio++;
			continue;
		}

		const ek = eventKey(municipio, fecha);
		if (eventosConfirmados.has(ek) || eventosPendientes.has(ek)) {
			dbg(`SKIP dupe: ${municipio} ${fecha}`);
			stats.dupe++;
			continue;
		}

		porVerificar.push({
			fecha,
			municipio,
			titulo: a.title,
			url: a.url,
			medio: a.medio,
			empresa: '',
			rubro: '',
			despedidos: '',
			cerro_empresa: ''
		});

		urlSet.add(a.url);
		eventosPendientes.add(ek);
		added++;

		console.log(`  ✅ [${fecha}] ${municipio} — ${a.title?.slice(0, 65)}`);
	}

	porVerificar.sort((a, b) => dateKey(b.fecha).localeCompare(dateKey(a.fecha)));
	saveCSV(CSV_POR_VERIFICAR, porVerificar);

	console.log('\n══════════════════════════════════════');
	console.log(`  Nuevos en por_verificar.csv : ${added}`);
	console.log(`  Total acumulado             : ${porVerificar.length}`);
	console.log('──────────────────────────────────────');
	console.log(`  Descartados — URL repetida  : ${stats.url}`);
	console.log(`  Descartados — no relevante  : ${stats.relevancia}`);
	console.log(`  Descartados — fecha fuera   : ${stats.fecha}`);
	console.log(`  Descartados — sin municipio : ${stats.municipio}`);
	console.log(`  Descartados — evento duplic.: ${stats.dupe}`);
	console.log('══════════════════════════════════════\n');

	if (added > 0) {
		console.log('📋 Abrí data/por_verificar.csv, completá empresa / rubro /');
		console.log('   despedidos / cerro_empresa y pasá los confirmados a empresas.csv\n');
	} else {
		console.log('ℹ Todos los artículos ya estaban procesados o fueron descartados.');
		console.log('  Usá --debug para ver el detalle de cada descarte.\n');
	}
}

main().catch((e) => {
	console.error('Error fatal:', e);
	process.exit(1);
});
