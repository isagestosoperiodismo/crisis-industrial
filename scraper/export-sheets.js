#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

const SHEET_ID = process.env.SHEET_ID;
const CREDS_RAW = process.env.GOOGLE_CREDENTIALS;

const SHEETS = [
	{ name: 'empresas', out: path.resolve('data/empresas.csv') },
	{ name: 'por_verificar', out: path.resolve('data/por_verificar.csv') }
];

function csvEscape(value) {
	const s = value == null ? '' : String(value);
	if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
	return s;
}

function stringifyCSV(rows) {
	if (!rows.length) return '';
	const lines = rows.map((r) => r.map(csvEscape).join(','));
	return lines.join('\n') + '\n';
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

async function exportSheet(sheets, sheet) {
	const res = await sheets.spreadsheets.values.get({
		spreadsheetId: SHEET_ID,
		range: `${sheet.name}!A:Z`
	});

	const rows = res.data.values || [];
	if (!rows.length) {
		console.log(`Sin filas en sheet "${sheet.name}".`);
		return;
	}

	fs.writeFileSync(sheet.out, stringifyCSV(rows), 'utf-8');
	console.log(`OK: ${sheet.out} actualizado (${rows.length - 1} filas).`);
}

async function main() {
	const sheets = await getSheets();
	for (const sheet of SHEETS) {
		await exportSheet(sheets, sheet);
	}
}

main().catch((e) => {
	console.error('Error exportando sheets:', e);
	process.exit(1);
});
