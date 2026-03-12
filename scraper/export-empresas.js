#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

const SHEET_ID = process.env.SHEET_ID;
const CREDS_RAW = process.env.GOOGLE_CREDENTIALS;

const SHEET_NAME = 'empresas';
const OUT_PATH = path.resolve('data/empresas.csv');
const COLS = ['fecha', 'empresa', 'rubro', 'despedidos', 'provincia', 'municipio', 'cerro_empresa'];

function normalize(text) {
	return (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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

async function getSheets() {
	if (!CREDS_RAW) throw new Error('Falta variable de entorno GOOGLE_CREDENTIALS');
	if (!SHEET_ID) throw new Error('Falta variable de entorno SHEET_ID');
	const creds = JSON.parse(CREDS_RAW);
	const auth = new GoogleAuth({
		credentials: creds,
		scopes: [
			'https://www.googleapis.com/auth/spreadsheets.readonly',
			'https://www.googleapis.com/auth/drive.readonly'
		]
	});
	return google.sheets({ version: 'v4', auth });
}

async function main() {
	const sheets = await getSheets();
	const res = await sheets.spreadsheets.values.get({
		spreadsheetId: SHEET_ID,
		range: `${SHEET_NAME}!A:Z`
	});

	const rows = res.data.values || [];
	if (rows.length < 2) {
		console.log('Sin filas en sheet "empresas". No se modifica data/empresas.csv.');
		return;
	}

	const headers = rows[0].map((h) => h.trim().toLowerCase());
	const data = rows.slice(1).map((row) => {
		const obj = {};
		headers.forEach((h, i) => (obj[h] = row[i] || ''));
		return obj;
	});

	const mapped = data.map((r) => ({
		fecha: r.fecha || '',
		empresa: r.empresa || r['empresa/organismo'] || '',
		rubro: r.rubro || r['rubro principal'] || '',
		despedidos: r.despedidos || r['cantidad de empleados despedidos'] || '',
		provincia: r.provincia || '',
		municipio: normalize(r.municipio || r['si fue en pba poner en que municipio'] || '')
			.trim()
			.toUpperCase(),
		cerro_empresa: r.cerro_empresa || r['la empresa cerro?'] || r['¿la empresa cerró?'] || ''
	}));

	fs.writeFileSync(OUT_PATH, stringifyCSV(mapped, COLS), 'utf-8');
	console.log(`OK: data/empresas.csv actualizado (${mapped.length} filas).`);
}

main().catch((e) => {
	console.error('Error exportando empresas:', e);
	process.exit(1);
});
