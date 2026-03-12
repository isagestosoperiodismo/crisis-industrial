#!/usr/bin/env node

/**
 * Scraper de despidos y cierres - Conurbano bonaerense
 * Desde: 01/11/2023
 *
 * Lee:    Google Sheet → pestaña "empresas"       (eventos ya confirmados)
 * Escribe: Google Sheet → pestaña "por_verificar" (noticias nuevas para revisar)
 *
 * Variables de entorno (opcional):
 *   GOOGLE_CREDENTIALS  -> contenido del JSON de la Service Account
 *   SHEET_ID            -> ID del Google Sheet
 *
 * Uso local:
 *   GOOGLE_CREDENTIALS=$(cat credentials.json) SHEET_ID=xxx node scraper.js
 *   node scraper.js --debug
 */

import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

const DEBUG = process.argv.includes('--debug');
const dbg = (...args) => DEBUG && console.log('  [DBG]', ...args);

// ── Config ─────────────────────────────────────────────────────────────────
const START_DATE = '01/11/2023';
const SLEEP_MS = 1400;
const SHEET_ID = process.env.SHEET_ID;
const HAS_SHEETS = Boolean(process.env.GOOGLE_CREDENTIALS && SHEET_ID);
const DATA_DIR = path.resolve('data');
const CSV_EMPRESAS = path.join(DATA_DIR, 'empresas.csv');
const CSV_POR_VERIFICAR = path.join(DATA_DIR, 'por_verificar.csv');

const SHEET_EMPRESAS = 'empresas';
const SHEET_POR_VERIFICAR = 'por_verificar';

const COLS_EMPRESAS = [
	'fecha',
	'empresa',
	'rubro',
	'despedidos',
	'provincia',
	'municipio',
	'cerro_empresa',
	'medio',
	'titulo',
	'url'
];

const COLS_POR_VERIFICAR = [
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

// ── Municipios ─────────────────────────────────────────────────────────────
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

function normalize(text) {
	return (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ── Google Sheets auth ─────────────────────────────────────────────────────
async function getSheetsClient() {
	const credsRaw = process.env.GOOGLE_CREDENTIALS;
	if (!credsRaw) throw new Error('Falta variable de entorno GOOGLE_CREDENTIALS');
	if (!SHEET_ID) throw new Error('Falta variable de entorno SHEET_ID');

	const creds = JSON.parse(credsRaw);
	const auth = new GoogleAuth({
		credentials: creds,
		scopes: [
			'https://www.googleapis.com/auth/spreadsheets',
			'https://www.googleapis.com/auth/drive'
		]
	});
	return google.sheets({ version: 'v4', auth });
}

// ── CSV local helpers ──────────────────────────────────────────────────────
function parseCSV(content) {
	const text = content.replace(/\uFEFF/g, '').trim();
	if (!text) return [];

	const rows = [];
	let row = [];
	let field = '';
	let inQuotes = false;

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		const next = text[i + 1];

		if (ch === '"') {
			if (inQuotes && next === '"') {
				field += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
			continue;
		}

		if (ch === ',' && !inQuotes) {
			row.push(field);
			field = '';
			continue;
		}

		if ((ch === '\n' || ch === '\r') && !inQuotes) {
			if (ch === '\r' && next === '\n') i++;
			row.push(field);
			field = '';
			if (row.some((v) => v !== '')) rows.push(row);
			row = [];
			continue;
		}

		field += ch;
	}

	row.push(field);
	if (row.some((v) => v !== '')) rows.push(row);

	if (!rows.length) return [];
	const headers = rows.shift().map((h) => h.trim());
	return rows.map((r) => {
		const obj = {};
		for (let i = 0; i < headers.length; i++) obj[headers[i]] = r[i] ?? '';
		return obj;
	});
}

function csvEscape(value) {
	const s = value == null ? '' : String(value);
	if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
	return s;
}

function stringifyCSV(records, columns) {
	const header = columns.map(csvEscape).join(',');
	const lines = records.map((r) => columns.map((c) => csvEscape(r[c])).join(','));
	return [header, ...lines].join('\n') + '\n';
}

function ensureCsvHeaders(filePath, columns) {
	if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
	if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf-8').trim().length === 0) {
		fs.writeFileSync(filePath, stringifyCSV([], columns), 'utf-8');
	}
}

function readCsvFile(filePath) {
	if (!fs.existsSync(filePath)) return [];
	const content = fs.readFileSync(filePath, 'utf-8');
	return parseCSV(content);
}

function appendCsvRows(filePath, columns, rows) {
	if (rows.length === 0) return;
	const existing = readCsvFile(filePath);
	const merged = existing.concat(rows);
	fs.writeFileSync(filePath, stringifyCSV(merged, columns), 'utf-8');
}

// ── Leer sheet ─────────────────────────────────────────────────────────────
async function readSheet(sheets, sheetName) {
	const res = await sheets.spreadsheets.values.get({
		spreadsheetId: SHEET_ID,
		range: `${sheetName}!A:Z`
	});

	const rows = res.data.values || [];
	if (rows.length < 2) return []; // solo header o vacío

	const headers = rows[0].map((h) => h.trim());
	return rows.slice(1).map((row) => {
		const obj = {};
		headers.forEach((h, i) => (obj[h] = row[i] || ''));
		return obj;
	});
}

// ── Agregar filas al final del sheet ──────────────────────────────────────
async function appendRows(sheets, sheetName, cols, rows) {
	if (rows.length === 0) return;

	const values = rows.map((r) => cols.map((c) => r[c] || ''));

	await sheets.spreadsheets.values.append({
		spreadsheetId: SHEET_ID,
		range: `${sheetName}!A:A`,
		valueInputOption: 'USER_ENTERED',
		insertDataOption: 'INSERT_ROWS',
		requestBody: { values }
	});
}

// ── Asegurar que el sheet tenga headers si está vacío ─────────────────────
async function ensureHeaders(sheets, sheetName, cols) {
	const res = await sheets.spreadsheets.values.get({
		spreadsheetId: SHEET_ID,
		range: `${sheetName}!A1:Z1`
	});
	const firstRow = res.data.values?.[0] || [];
	if (firstRow.length === 0) {
		await sheets.spreadsheets.values.update({
			spreadsheetId: SHEET_ID,
			range: `${sheetName}!A1`,
			valueInputOption: 'RAW',
			requestBody: { values: [cols] }
		});
		console.log(`  Headers creados en pestaña "${sheetName}"`);
	}
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

// ── Detección ──────────────────────────────────────────────────────────────
function detectMunicipio(text) {
	const t = normalize(text).toUpperCase();
	const sorted = [...MUNICIPIOS].sort((a, b) => b.length - a.length);
	return sorted.find((m) => t.includes(m)) || '';
}

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

// ── RSS ────────────────────────────────────────────────────────────────────
function extractURL(block) {
	let m = block.match(/<link[^>]*>([^<]+)<\/link>/);
	if (m && m[1].trim().startsWith('http')) return m[1].trim();

	m = block.match(/<link[^/]*\/?>[\s\n]*(https?:\/\/[^\s<]+)/);
	if (m) return m[1].trim();

	m = block.match(/<guid[^>]*isPermaLink="true"[^>]*>([^<]+)<\/guid>/);
	if (m && m[1].trim().startsWith('http')) return m[1].trim();

	m = block.match(/<guid[^>]*>([^<]+)<\/guid>/);
	if (m && m[1].trim().startsWith('http')) return m[1].trim();

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
		items.push({
			title: getTag('title'),
			url: extractURL(block),
			date: getTag('pubDate'),
			snippet: getTag('description')
		});
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
		dbg(`"${keyword}" → ${items.length} items, url[0]: ${items[0]?.url?.slice(0, 60)}`);
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

// ── Clave de evento para deduplicar ───────────────────────────────────────
function eventKey(municipio, fecha, empresa = '') {
	const mes = dateKey(fecha).slice(0, 6);
	const mun = normalize(municipio).toLowerCase();
	const emp = normalize(empresa).toLowerCase().replace(/\s+/g, '').slice(0, 20);
	return emp ? `${mun}|${mes}|${emp}` : `${mun}|${mes}`;
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
	console.log('══════════════════════════════════════');
	console.log('  SCRAPER DESPIDOS - CONURBANO');
	if (DEBUG) console.log('  (modo --debug activo)');
	console.log('══════════════════════════════════════\n');

	// ── Conectar a Sheets o modo CSV ───────────────────────────────────────
	let sheets = null;
	let verificados = [];
	let porVerificar = [];

	if (HAS_SHEETS) {
		console.log('🔗 Conectando a Google Sheets...');
		sheets = await getSheetsClient();

		// Asegurar headers si las pestañas están vacías
		await ensureHeaders(sheets, SHEET_EMPRESAS, COLS_EMPRESAS);
		await ensureHeaders(sheets, SHEET_POR_VERIFICAR, COLS_POR_VERIFICAR);

		// ── Leer datos existentes ──────────────────────────────────────────────
		console.log('📖 Leyendo datos existentes (Sheets)...');
		verificados = await readSheet(sheets, SHEET_EMPRESAS);
		porVerificar = await readSheet(sheets, SHEET_POR_VERIFICAR);
	} else {
		console.log('ℹ Sin GOOGLE_CREDENTIALS/SHEET_ID. Modo local CSV.');
		ensureCsvHeaders(CSV_EMPRESAS, COLS_EMPRESAS);
		ensureCsvHeaders(CSV_POR_VERIFICAR, COLS_POR_VERIFICAR);

		console.log('📖 Leyendo datos existentes (CSV)...');
		verificados = readCsvFile(CSV_EMPRESAS);
		porVerificar = readCsvFile(CSV_POR_VERIFICAR);
	}

	console.log(`   empresas:      ${verificados.length} filas`);
	console.log(`   por_verificar: ${porVerificar.length} filas`);

	// URLs ya vistas en cualquiera de las dos pestañas
	const urlSet = new Set([
		...verificados.map((r) => r.url).filter(Boolean),
		...porVerificar.map((r) => r.url).filter(Boolean)
	]);

	// Eventos ya confirmados
	const eventosConfirmados = new Set(
		verificados
			.filter((r) => r.municipio && r.fecha)
			.map((r) => eventKey(r.municipio, r.fecha, r.empresa))
	);

	// Eventos ya pendientes
	const eventosPendientes = new Set(
		porVerificar.filter((r) => r.municipio && r.fecha).map((r) => eventKey(r.municipio, r.fecha))
	);

	// ── Recolectar artículos ───────────────────────────────────────────────
	let articles = [];

	console.log('\n🔍 Google News...');
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

	// Deduplicar por URL dentro del batch
	const batchUrls = new Set();
	let sinUrl = 0;
	const total = articles.length;
	articles = articles.filter((a) => {
		if (!a.url) {
			sinUrl++;
			return false;
		}
		if (batchUrls.has(a.url)) return false;
		batchUrls.add(a.url);
		return true;
	});

	console.log(`\n📰 Artículos: ${total} totales → ${articles.length} únicos (${sinUrl} sin URL)`);

	if (articles.length === 0) {
		console.log('\n⚠ No se pudo recolectar artículos. Verificá la conexión.');
		process.exit(1);
	}

	// ── Filtrar y preparar nuevas filas ────────────────────────────────────
	console.log('─────────────────────────────────────\n');

	const nuevasFilas = [];
	const stats = { url: 0, relevancia: 0, fecha: 0, municipio: 0, dupe: 0 };

	for (const a of articles) {
		if (urlSet.has(a.url)) {
			stats.url++;
			continue;
		}
		if (!isRelevant(a.title, a.snippet)) {
			stats.relevancia++;
			continue;
		}

		const fecha = parseDate(a.date);
		if (!fecha || dateKey(fecha) < dateKey(START_DATE)) {
			stats.fecha++;
			continue;
		}

		const municipio = detectMunicipio(a.title + ' ' + (a.snippet || ''));
		if (!municipio) {
			stats.municipio++;
			continue;
		}

		const ek = eventKey(municipio, fecha);
		if (eventosConfirmados.has(ek) || eventosPendientes.has(ek)) {
			stats.dupe++;
			continue;
		}

		nuevasFilas.push({
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

		console.log(`  ✅ [${fecha}] ${municipio} — ${a.title?.slice(0, 65)}`);
	}

	// ── Escribir en Sheets ─────────────────────────────────────────────────
	if (nuevasFilas.length > 0) {
		if (HAS_SHEETS) {
			console.log(`\n💾 Escribiendo ${nuevasFilas.length} filas nuevas en Sheets...`);
			await appendRows(sheets, SHEET_POR_VERIFICAR, COLS_POR_VERIFICAR, nuevasFilas);
			console.log('   ✅ Listo');
		} else {
			console.log(`\n💾 Escribiendo ${nuevasFilas.length} filas nuevas en CSV...`);
			appendCsvRows(CSV_POR_VERIFICAR, COLS_POR_VERIFICAR, nuevasFilas);
			console.log('   ✅ Listo');
		}
	}

	// ── Resumen ────────────────────────────────────────────────────────────
	console.log('\n══════════════════════════════════════');
	console.log(`  Filas nuevas agregadas  : ${nuevasFilas.length}`);
	console.log('──────────────────────────────────────');
	console.log(`  Descartados — URL repetida  : ${stats.url}`);
	console.log(`  Descartados — no relevante  : ${stats.relevancia}`);
	console.log(`  Descartados — fecha fuera   : ${stats.fecha}`);
	console.log(`  Descartados — sin municipio : ${stats.municipio}`);
	console.log(`  Descartados — evento duplic.: ${stats.dupe}`);
	console.log('══════════════════════════════════════\n');

	if (nuevasFilas.length > 0) {
		console.log('📋 Abrí el Sheet, completá empresa / rubro / despedidos /');
		console.log("   cerro_empresa en 'por_verificar' y pasá los confirmados");
		console.log("   a la pestaña 'empresas'.\n");
	} else {
		console.log('ℹ Sin noticias nuevas hoy.\n');
	}
}

main().catch((e) => {
	console.error('Error fatal:', e);
	process.exit(1);
});
