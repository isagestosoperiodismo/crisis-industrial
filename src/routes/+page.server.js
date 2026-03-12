import fs from "node:fs";
import path from "node:path";

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

export function load() {
	const csvPath = path.resolve("data/empresas.csv");
	const content = fs.readFileSync(csvPath, "utf-8");

	const raw = parseCSV(content);
	const columnKeyMap = {
		[normalizeKey("fecha")]: "fecha",
		[normalizeKey("empresa")]: "empresa",
		[normalizeKey("rubro")]: "rubro",
		[normalizeKey("despedidos")]: "despedidos",
		[normalizeKey("provincia")]: "provincia",
		[normalizeKey("municipio")]: "municipio",
		[normalizeKey("cerro_empresa")]: "cerro_empresa"
	};

	const empresas = raw.map((row, i) => {
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
			cerro: (r["cerro_empresa"] || "").trim()
		};
	});

	const totalEmpleados = empresas.reduce((s, e) => s + e.empleados, 0);
	const totalCierres = empresas.filter((e) => isCerroSi(e.cerro)).length;
	const municipiosUnicos = [...new Set(empresas.map((e) => e.municipio).filter(Boolean))].sort();
	const rubrosUnicos = [...new Set(empresas.map((e) => e.rubro).filter(Boolean))].sort();

	return { empresas, totalEmpleados, totalCierres, municipiosUnicos, rubrosUnicos };
}

