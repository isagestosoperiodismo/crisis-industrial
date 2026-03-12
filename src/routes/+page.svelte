<script context="module">
	export const csr = true;
</script>
<script>
	import EmpresasTable from '$lib/components/EmpresasTable.svelte';

	export let data;

	const { empresas, totalEmpleados, totalCierres, rubrosUnicos } = data;

	let filtroMunicipio = '';
	let filtroRubro = '';
	let filtroCerro = '';
	let filtroTexto = '';
	let ordenCol = 'fecha';
	let ordenDir = 'desc';

	const ui = {
		input:
			"min-w-[200px] rounded-none border-2 border-[#1a1a16] px-3 py-2 font-[Space_Mono] text-xs text-[#1a1a16] placeholder:text-[#5a4a42] focus:outline-none focus:ring-2 focus:ring-[#1a1a16]",
		select:
			"cursor-pointer rounded-none border-2 border-[#1a1a16] px-3 py-2 font-[Space_Mono] text-xs text-[#1a1a16] focus:outline-none focus:ring-2 focus:ring-[#1a1a16]",
		button:
			"cursor-pointer rounded-none border-2 border-[#1a1a16] bg-[#1a1a16] px-3 py-2 font-[Space_Mono] text-xs text-[#f7f1e1] hover:bg-[#333]",
		th:
			"cursor-pointer px-4 py-3 text-left font-[Space_Mono] text-[0.65rem] tracking-[0.2em] whitespace-nowrap text-[#f7f1e1] uppercase select-none",
		thRight:
			"cursor-pointer px-4 py-3 text-right font-[Space_Mono] text-[0.65rem] tracking-[0.2em] whitespace-nowrap text-[#f7f1e1] uppercase select-none",
		thHidden:
			"hidden cursor-pointer px-4 py-3 text-left font-[Space_Mono] text-[0.65rem] tracking-[0.2em] whitespace-nowrap text-[#f7f1e1] uppercase select-none md:table-cell",
		thStatic:
			"px-4 py-3 text-left font-[Space_Mono] text-[0.65rem] tracking-[0.2em] whitespace-nowrap text-[#f7f1e1] uppercase",
		cellMono: "px-4 py-3 font-[Space_Mono] text-xs whitespace-nowrap text-[#3a2f2b]",
		cellCompany: "px-4 py-3 font-[Space_Mono] font-bold text-[#1a1a16]",
		cellRight: "px-4 py-3 text-right font-[Space_Mono] text-xs text-[#1a1a16]",
		badgeBase:
			"inline-block rounded-none border-2 border-[#1a1a16] px-2 py-0.5 font-[Space_Mono] text-[0.65rem] uppercase tracking-[0.08em]",
		badgeCerro:
			"inline-block rounded-none border-2 border-[#1a1a16] bg-[#c6382f] px-2 py-0.5 font-[Space_Mono] text-[0.65rem] uppercase tracking-[0.08em] text-[#f7f1e1]",
		badgeReduccion:
			"inline-block rounded-none border-2 border-[#1a1a16] bg-[#e7b24d] px-2 py-0.5 font-[Space_Mono] text-[0.65rem] uppercase tracking-[0.08em] text-[#1a1a16]",
		badgeSinDato:
			"inline-block rounded-none border-2 border-[#1a1a16] bg-[#e0d6c0] px-2 py-0.5 font-[Space_Mono] text-[0.65rem] uppercase tracking-[0.08em] text-[#1a1a16]",
		empty: "text-center py-16 font-[Space_Mono] text-xs text-[#3a2f2b]"
	};

	const rowClass = (cerro) =>
		`border-b-2 border-[#1a1a16] hover:bg-[#f1e2c4] ${cerro ? 'bg-[#f4d1c7]' : ''}`;

	const normalizeClient = (value) =>
		(value || '')
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.trim();

	const matchesFilters = (e, municipio, rubro, cerro, texto) => {
		if (municipio && e.municipio !== municipio) return false;
		if (rubro && e.rubro !== rubro) return false;
		if (cerro) {
			if (cerro === 'Si') {
				if (!isCerroSi(e.cerro)) return false;
			} else if (e.cerro !== cerro) {
				return false;
			}
		}
		if (texto) {
			const q = normalizeClient(texto);
			if (!q) return true;
			if (!normalizeClient(e.empresa).includes(q) && !normalizeClient(e.municipio).includes(q))
				return false;
		}
		return true;
	};

	const sortableValue = (row, col) => {
		if (col === 'fecha') return fechaComparable(row[col]);
		if (col === 'empleados') return Number(row[col]);
		return row[col];
	};

	const compareRows = (a, b, col, dir) => {
		const va = sortableValue(a, col);
		const vb = sortableValue(b, col);
		if (va < vb) return dir === 'asc' ? -1 : 1;
		if (va > vb) return dir === 'asc' ? 1 : -1;
		return 0;
	};

	const municipiosLista = [
		...new Set(empresas.map((e) => (e.municipio || '').trim()).filter(Boolean))
	].sort();

	$: filtered = empresas
		.filter((e) => matchesFilters(e, filtroMunicipio, filtroRubro, filtroCerro, filtroTexto))
		.sort((a, b) => compareRows(a, b, ordenCol, ordenDir));

	$: totalFiltradosEmpleados = filtered.reduce((s, e) => s + e.empleados, 0);

	function fechaComparable(str) {
		if (!str) return '0';
		const m = str.match(/(\d{1,2})\/(\d{2})\/(\d{4})/);
		if (m) return `${m[3]}${m[2]}${m[1].padStart(2, '0')}`;
		return str;
	}

	function toggleOrden(col) {
		if (ordenCol === col) {
			ordenDir = ordenDir === 'asc' ? 'desc' : 'asc';
		} else {
			ordenCol = col;
			ordenDir = 'desc';
		}
	}

	function resetFiltros() {
		filtroMunicipio = '';
		filtroRubro = '';
		filtroCerro = '';
		filtroTexto = '';
	}

	const flechas = (col) => {
		if (ordenCol !== col) return '↕';
		return ordenDir === 'asc' ? '↑' : '↓';
	};

	const isCerroSi = (value) => {
		if (!value) return false;
		return ['Si', 'Sí', 'SÍ', 'SI', 'si'].includes(value);
	};

	const rubroColor = (rubro) => {
		const r = rubro.split('/')[0].trim().toLowerCase();
		if (r.includes('alimento')) return 'bg-[#d7e2b8] text-[#1a1a16]';
		if (r.includes('automotriz')) return 'bg-[#c3d2e8] text-[#1a1a16]';
		if (r.includes('textil')) return 'bg-[#e8c3d8] text-[#1a1a16]';
		if (r.includes('construc')) return 'bg-[#f1d59a] text-[#1a1a16]';
		if (r.includes('logistica')) return 'bg-[#f0c3a3] text-[#1a1a16]';
		if (r.includes('comercio')) return 'bg-[#c2e0da] text-[#1a1a16]';
		if (r.includes('farmac')) return 'bg-[#d4c7f2] text-[#1a1a16]';
		if (r.includes('quimica')) return 'bg-[#bfe0de] text-[#1a1a16]';
		if (r.includes('electrodom')) return 'bg-[#c6d8f2] text-[#1a1a16]';
		return 'bg-[#e1d7c3] text-[#1a1a16]';
	};
</script>

<svelte:head>
	<title>Empresas que cerraron o despidieron en el Conurbano Bonaerense</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Cormorant+Garamond:wght@400;600;700&family=Space+Mono:wght@400;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="min-h-screen bg-white font-[Cormorant_Garamond] text-[#1a1a16]">
	<!-- Header -->
	<header class="relative px-6 py-8 md:px-10">
		<div class="flex flex-wrap items-start justify-between gap-6">
			<div>
				<span
					class="inline-block bg-[#1a1a16] px-2 py-0.5 font-[Space_Mono] text-[0.65rem] tracking-[0.3em] text-[#f7f1e1] uppercase"
				>
					Conurbano Bonaerense
				</span>
				<h1
					class="font-[Archivo_Black] text-3xl tracking-[0.05em] text-[#1a1a16] uppercase md:text-4xl"
				>
					Registro de Despidos y Cierres
				</h1>
				<p class="mt-1 font-[Space_Mono] text-xs text-[#3a2f2b]">
					Desde noviembre de 2023 · Actualización diaria automática
				</p>
			</div>

			<div class="flex shrink-0 flex-wrap items-center gap-4">
				<div class="text-right">
					<span class="block font-[Archivo_Black] text-2xl leading-none text-[#c6382f]"
						>{empresas.length}</span
					>
					<span class="font-[Space_Mono] text-[0.65rem] tracking-wide text-[#3a2f2b] uppercase"
						>empresas</span
					>
				</div>
				<div class="h-10 w-px bg-[#1a1a16]"></div>
				<div class="text-right">
					<span class="block font-[Archivo_Black] text-2xl leading-none text-[#c6382f]"
						>{totalEmpleados.toLocaleString('es-AR')}</span
					>
					<span class="font-[Space_Mono] text-[0.65rem] tracking-wide text-[#3a2f2b] uppercase"
						>empleos perdidos</span
					>
				</div>
				<div class="h-10 w-px bg-[#1a1a16]"></div>
				<div class="text-right">
					<span class="block font-[Archivo_Black] text-2xl leading-none text-[#c6382f]"
						>{totalCierres}</span
					>
					<span class="font-[Space_Mono] text-[0.65rem] tracking-wide text-[#3a2f2b] uppercase"
						>cierres definitivos</span
					>
				</div>
			</div>
		</div>
	</header>

	<!-- Filtros -->
	<section class="border-b-[3px] px-6 py-4 md:px-10">
		<div class="flex flex-wrap items-center gap-2">
			<input
				type="text"
				placeholder="Buscar empresa o municipio..."
				bind:value={filtroTexto}
				class={ui.input}
			/>
			<select
				bind:value={filtroMunicipio}
				class={ui.select}
			>
				<option value="">Todos los municipios</option>
				{#each municipiosLista as m (m)}
					<option value={m}>{m}</option>
				{/each}
			</select>
			<select
				bind:value={filtroRubro}
				class={ui.select}
			>
				<option value="">Todos los rubros</option>
				{#each rubrosUnicos as r (r)}
					<option value={r}>{r}</option>
				{/each}
			</select>
			<select
				bind:value={filtroCerro}
				class={ui.select}
			>
				<option value="">Cierre / Reducción</option>
				<option value="Si">Cerró</option>
				<option value="No">Redujo personal</option>
			</select>
			{#if filtroMunicipio || filtroRubro || filtroCerro || filtroTexto}
				<button
					on:click={resetFiltros}
					class={ui.button}
				>
					✕ Limpiar
				</button>
			{/if}
		</div>

		<div class="flex gap-2 font-[Space_Mono] text-xs text-[#3a2f2b]">
			<span>{filtered.length} empresa{filtered.length !== 1 ? 's' : ''}</span>
			{#if filtered.length !== empresas.length}
				<span>·</span>
				<span>{totalFiltradosEmpleados.toLocaleString('es-AR')} empleados afectados</span>
			{/if}
		</div>
	</section>

	<!-- Tabla -->
	<main class="flex-1 overflow-hidden">
		<EmpresasTable
			rows={filtered}
			ordenCol={ordenCol}
			ordenDir={ordenDir}
			onToggleOrden={toggleOrden}
			flechas={flechas}
			isCerroSi={isCerroSi}
			rubroColor={rubroColor}
			ui={ui}
			rowClass={rowClass}
		/>
	</main>

	<!-- Footer -->
	<footer class="border-t-[3px] border-[#1a1a16] bg-white px-6 py-4">
		<p class="text-center font-[Space_Mono] text-[0.62rem] text-[#3a2f2b]">
			Datos relevados desde medios de comunicación argentinos · Actualización automática vía GitHub
			Actions
		</p>
	</footer>
</div>

