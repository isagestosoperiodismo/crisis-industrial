import fs from "node:fs";
import path from "node:path";
import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";

export const prerender = true;

function parseCSV(content) {
	const text = content.replace(/\uFEFF/g, "").trim();
	if (!text) return [];

	const rows = [];
	let row = [];
	let field = "";
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

		if (ch === "," && !inQuotes) {
			row.push(field);
			field = "";
			continue;
		}

		if ((ch === "\n" || ch === "\r") && !inQuotes) {
			if (ch === "\r" && next === "\n") i++;
			row.push(field);
			field = "";
			if (row.some((v) => v !== "")) rows.push(row);
			row = [];
			continue;
		}

		field += ch;
	}

	row.push(field);
	if (row.some((v) => v !== "")) rows.push(row);

	if (!rows.length) return [];
	const headers = rows.shift().map((h) => h.trim());
	return rows.map((r) => {
		const obj = {};
		for (let i = 0; i < headers.length; i++) obj[headers[i]] = r[i] ?? "";
		return obj;
	});
}

function normalizeText(text) {
	return (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeKey(text) {
	return normalizeText(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isCerroSi(value) {
	const v = normalizeText(value).toLowerCase().trim();
	return v === "si" || v === "s" || v === "si." || v === "sí";
}

function parseFecha(value) {
	if (!value) return null;
	const s = String(value).trim();
	const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (m) {
		const day = Number(m[1]);
		const month = Number(m[2]) - 1;
		const year = Number(m[3]);
		const d = new Date(year, month, day);
		if (!Number.isNaN(d.getTime())) return d;
	}
	const d = new Date(s);
	if (!Number.isNaN(d.getTime())) return d;
	return null;
}

const CSV_PATH = path.resolve("data/empresas.csv");
const HAS_SHEETS = Boolean(process.env.SHEET_ID && (process.env.GOOGLE_CREDENTIALS || fs.existsSync(path.resolve('credentials.json')) || process.env.GOOGLE_CREDENTIALS_PATH));

const columnKeyMap = {
	[normalizeKey("fecha")]: "fecha",
	[normalizeKey("empresa")]: "empresa",
	[normalizeKey("empresa/organismo")]: "empresa",
	[normalizeKey("rubro")]: "rubro",
	[normalizeKey("rubro principal")]: "rubro",
	[normalizeKey("despedidos")]: "despedidos",
	[normalizeKey("cantidad de empleados despedidos")]: "despedidos",
	[normalizeKey("provincia")]: "provincia",
	[normalizeKey("municipio")]: "municipio",
	[normalizeKey("si fue en pba poner en que municipio")]: "municipio",
	[normalizeKey("cerro_empresa")]: "cerro_empresa",
	[normalizeKey("la empresa cerro?")]: "cerro_empresa",
	[normalizeKey("¿la empresa cerró?")]: "cerro_empresa",
	[normalizeKey("link")]: "link",
	[normalizeKey("enlace")]: "link",
	[normalizeKey("url")]: "link",
	[normalizeKey("nota")]: "link",
	[normalizeKey("fuente")]: "link"
};

function mapRowsToEmpresas(raw) {
	return raw.map((row, i) => {
		const r = {};
		for (const [key, value] of Object.entries(row)) {
			const canon = columnKeyMap[normalizeKey(key)] || key;
			r[canon] = value;
		}
		return {
			id: i,
			fecha: r["fecha"] || "",
			empresa: r["empresa"] || "",
			rubro: r["rubro"] || "",
			empleados: parseInt(r["despedidos"]) || 0,
			provincia: r["provincia"] || "",
			municipio: normalizeText(r["municipio"] || "").trim().toUpperCase(),
			cerro: (r["cerro_empresa"] || "").trim(),
			link: (r["link"] || "").trim()
		};
	});
}

async function readFromSheets() {
	let credsRaw = process.env.GOOGLE_CREDENTIALS;
	const sheetId = process.env.SHEET_ID;
	const localCredsPath =
		process.env.GOOGLE_CREDENTIALS_PATH || path.resolve("credentials.json");
	if (!credsRaw && fs.existsSync(localCredsPath)) {
		credsRaw = fs.readFileSync(localCredsPath, "utf-8");
	}
	if (!credsRaw || !sheetId) return [];

	const creds = JSON.parse(credsRaw);
	const auth = new GoogleAuth({
		credentials: creds,
		scopes: [
			"https://www.googleapis.com/auth/spreadsheets.readonly",
			"https://www.googleapis.com/auth/drive.readonly"
		]
	});
	const sheets = google.sheets({ version: "v4", auth });
	const res = await sheets.spreadsheets.values.get({
		spreadsheetId: sheetId,
		range: "empresas!A:Z"
	});
	const rows = res.data.values || [];
	if (rows.length < 2) return [];

	const headers = rows[0].map((h) => h.trim());
	return rows.slice(1).map((r) => {
		const obj = {};
		headers.forEach((h, idx) => (obj[h] = r[idx] || ""));
		return obj;
	});
}

function readFromCsv() {
	if (!fs.existsSync(CSV_PATH)) return [];
	const content = fs.readFileSync(CSV_PATH, "utf-8");
	return parseCSV(content);
}

export async function load() {
	let raw = [];

	if (HAS_SHEETS) {
		try {
			raw = await readFromSheets();
		} catch (e) {
			console.warn("Sheets read failed, fallback to CSV:", e.message);
			raw = readFromCsv();
		}
	} else {
		raw = readFromCsv();
	}

	const empresas = mapRowsToEmpresas(raw);

	const totalEmpleados = empresas.reduce((s, e) => s + e.empleados, 0);
	const totalCierres = empresas.filter((e) => isCerroSi(e.cerro)).length;
	const municipiosUnicos = [...new Set(empresas.map((e) => e.municipio).filter(Boolean))].sort();
	const rubrosUnicos = [...new Set(empresas.map((e) => e.rubro).filter(Boolean))].sort();

	const lastUpdatedDate = empresas
		.map((e) => parseFecha(e.fecha))
		.filter(Boolean)
		.sort((a, b) => b - a)[0];

	return {
		empresas,
		totalEmpleados,
		totalCierres,
		municipiosUnicos,
		rubrosUnicos,
		lastUpdated: lastUpdatedDate ? lastUpdatedDate.toISOString() : null
	};
}


