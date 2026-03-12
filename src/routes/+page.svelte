<script>
	export let data;

	const { empresas, totalEmpleados, totalCierres, municipiosUnicos, rubrosUnicos } = data;

	let filtroMunicipio = '';
	let filtroRubro = '';
	let filtroCerro = '';
	let filtroTexto = '';
	let ordenCol = 'fecha';
	let ordenDir = 'desc';

	$: filtered = empresas
		.filter((e) => {
			if (filtroMunicipio && e.municipio !== filtroMunicipio) return false;
			if (filtroRubro && e.rubro !== filtroRubro) return false;
			if (filtroCerro) {
				if (filtroCerro === 'Si') {
					if (!isCerroSi(e.cerro)) return false;
				} else if (e.cerro !== filtroCerro) {
					return false;
				}
			}
			if (filtroTexto) {
				const q = filtroTexto.toLowerCase();
				if (!e.empresa.toLowerCase().includes(q) && !e.municipio.toLowerCase().includes(q))
					return false;
			}
			return true;
		})
		.sort((a, b) => {
			let va = a[ordenCol];
			let vb = b[ordenCol];
			if (ordenCol === 'fecha') {
				va = fechaComparable(va);
				vb = fechaComparable(vb);
			}
			if (ordenCol === 'empleados') {
				va = Number(va);
				vb = Number(vb);
			}
			if (va < vb) return ordenDir === 'asc' ? -1 : 1;
			if (va > vb) return ordenDir === 'asc' ? 1 : -1;
			return 0;
		});

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
		if (ordenCol !== col) return "↕";
		return ordenDir === "asc" ? "↑" : "↓";
	};

	const isCerroSi = (value) => {
		if (!value) return false;
		return ["Si", "Sí", "SÍ", "SI", "si"].includes(value);
	};

	const rubroColor = (rubro) => {
		const r = rubro.split('/')[0].trim().toLowerCase();
		if (r.includes('alimento')) return 'rubro-alimentos';
		if (r.includes('automotriz')) return 'rubro-automotriz';
		if (r.includes('textil')) return 'rubro-textil';
		if (r.includes('construc')) return 'rubro-construccion';
		if (r.includes('logistica')) return 'rubro-logistica';
		if (r.includes('comercio')) return 'rubro-comercio';
		if (r.includes('farmac')) return 'rubro-farma';
		if (r.includes('quimica')) return 'rubro-quimica';
		if (r.includes('electrodom')) return 'rubro-electro';
		return 'rubro-otro';
	};</script>

<svelte:head>
	<title>Empresas que cerraron o despidieron en el Conurbano Bonaerense</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Cormorant+Garamond:wght@400;600;700&family=Space+Mono:wght@400;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div
	class="flex min-h-screen flex-col bg-[#0d0d0d] text-[#e8e4dc]"
	style="font-family: 'IBM Plex Sans', sans-serif;"
>
	<!-- Header -->
	<header class="border-b border-neutral-800 bg-[#0d0d0d] px-6 py-7 md:px-10">
		<div class="flex flex-wrap items-start justify-between gap-6">
			<div>
				<span class="retro-kicker mb-1 block font-mono text-[0.62rem] tracking-[0.18em] text-red-500 uppercase">
					Conurbano Bonaerense
				</span>
				<h1 class="text-2xl leading-tight font-semibold text-[#f0ebe0] md:text-3xl">
					Registro de Despidos y Cierres
				</h1>
				<p class="subtitle mt-1 font-mono text-xs text-neutral-500">
					Desde noviembre de 2023 Â· ActualizaciÃ³n diaria automÃ¡tica
				</p>
			</div>

			<div class="flex shrink-0 items-center gap-6">
				<div class="text-right">
					<span class="stat-num block font-mono text-2xl leading-none font-semibold text-red-500"
						>{empresas.length}</span
					>
					<span class="text-[0.65rem] tracking-wide text-neutral-500 uppercase">empresas</span>
				</div>
				<div class="h-10 w-px bg-neutral-800"></div>
				<div class="text-right">
					<span class="stat-num block font-mono text-2xl leading-none font-semibold text-red-500"
						>{totalEmpleados.toLocaleString('es-AR')}</span
					>
					<span class="text-[0.65rem] tracking-wide text-neutral-500 uppercase"
						>empleos perdidos</span
					>
				</div>
				<div class="h-10 w-px bg-neutral-800"></div>
				<div class="text-right">
					<span class="stat-num block font-mono text-2xl leading-none font-semibold text-red-500"
						>{totalCierres}</span
					>
					<span class="text-[0.65rem] tracking-wide text-neutral-500 uppercase"
						>cierres definitivos</span
					>
				</div>
			</div>
		</div>
	</header>

	<!-- Filtros -->
	<section
		class="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-950 px-6 py-3 md:px-10"
	>
		<div class="flex flex-wrap items-center gap-2">
			<input
				type="text"
				placeholder="Buscar empresa o municipio..."
				bind:value={filtroTexto}
				class="min-w-[200px] rounded-sm border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-[#e8e4dc] transition-colors outline-none placeholder:text-neutral-600 focus:border-red-500"
			/>
			<select
				bind:value={filtroMunicipio}
				class="cursor-pointer rounded-sm border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-[#e8e4dc] transition-colors outline-none focus:border-red-500"
			>
				<option value="">Todos los municipios</option>
				{#each municipiosUnicos as m (m)}
					<option value={m}>{m}</option>
				{/each}
			</select>
			<select
				bind:value={filtroRubro}
				class="cursor-pointer rounded-sm border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-[#e8e4dc] transition-colors outline-none focus:border-red-500"
			>
				<option value="">Todos los rubros</option>
				{#each rubrosUnicos as r (r)}
					<option value={r}>{r}</option>
				{/each}
			</select>
			<select
				bind:value={filtroCerro}
				class="cursor-pointer rounded-sm border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-[#e8e4dc] transition-colors outline-none focus:border-red-500"
			>
				<option value="">Cierre / ReducciÃ³n</option>
				<option value="Si">Cerro definitivamente</option>
				<option value="No">Redujo personal</option>
			</select>
			{#if filtroMunicipio || filtroRubro || filtroCerro || filtroTexto}
				<button
					on:click={resetFiltros}
					class="cursor-pointer rounded-sm border border-neutral-700 bg-transparent px-3 py-2 font-mono text-xs text-neutral-500 transition-colors hover:border-red-500 hover:text-red-500"
				>
					âœ• Limpiar
				</button>
			{/if}
		</div>

		<div class="flex gap-2 font-mono text-xs text-neutral-600">
			<span>{filtered.length} empresa{filtered.length !== 1 ? 's' : ''}</span>
			{#if filtered.length !== empresas.length}
				<span>Â·</span>
				<span>{totalFiltradosEmpleados.toLocaleString('es-AR')} empleados afectados</span>
			{/if}
		</div>
	</section>

	<!-- Tabla -->
	<main class="flex-1 overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="sticky top-0 z-10 border-b-2 border-neutral-800 bg-neutral-950">
						<th
							on:click={() => toggleOrden('fecha')}
							class="cursor-pointer px-4 py-3 text-left text-[0.65rem] font-semibold tracking-widest whitespace-nowrap text-neutral-500 uppercase transition-colors select-none hover:text-red-500"
						>
							Fecha {flechas('fecha')}
						</th>
						<th
							on:click={() => toggleOrden('empresa')}
							class="cursor-pointer px-4 py-3 text-left text-[0.65rem] font-semibold tracking-widest whitespace-nowrap text-neutral-500 uppercase transition-colors select-none hover:text-red-500"
						>
							Empresa {flechas('empresa')}
						</th>
						<th
							on:click={() => toggleOrden('municipio')}
							class="hidden cursor-pointer px-4 py-3 text-left text-[0.65rem] font-semibold tracking-widest whitespace-nowrap text-neutral-500 uppercase transition-colors select-none hover:text-red-500 md:table-cell"
						>
							Municipio {flechas('municipio')}
						</th>
						<th
							on:click={() => toggleOrden('rubro')}
							class="cursor-pointer px-4 py-3 text-left text-[0.65rem] font-semibold tracking-widest whitespace-nowrap text-neutral-500 uppercase transition-colors select-none hover:text-red-500"
						>
							Rubro {flechas('rubro')}
						</th>
						<th
							on:click={() => toggleOrden('empleados')}
							class="cursor-pointer px-4 py-3 text-right text-[0.65rem] font-semibold tracking-widest whitespace-nowrap text-neutral-500 uppercase transition-colors select-none hover:text-red-500"
						>
							Empleados {flechas('empleados')}
						</th>
						<th
							class="px-4 py-3 text-left text-[0.65rem] font-semibold tracking-widest whitespace-nowrap text-neutral-500 uppercase"
						>
							Estado
						</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as e (e.id)}
						<tr class="retro-row {isCerroSi(e.cerro) ? 'retro-cerro-row' : ''}">
							<td class="px-4 py-3 font-mono text-xs whitespace-nowrap text-neutral-500"
								>{e.fecha}</td
							>
							<td class="px-4 py-3 font-semibold text-[#e8e4dc]">{e.empresa}</td>
							<td class="hidden px-4 py-3 font-mono text-xs text-neutral-400 md:table-cell"
								>{e.municipio}</td
							>
							<td class="px-4 py-3">
								<span
									class="retro-badge {rubroColor(e.rubro)}"
								>
									{e.rubro}
								</span>
							</td>
							<td class="px-4 py-3 text-right font-mono text-xs text-neutral-300">
								{e.empleados > 0 ? e.empleados.toLocaleString('es-AR') : 'â€”'}
							</td>
							<td class="px-4 py-3">
								{#if isCerroSi(e.cerro)}
									<span
										class="retro-badge retro-cerro"
										>Cerro</span
									>
								{:else if e.cerro === 'No'}
									<span
										class="retro-badge retro-reduccion"
										>Redujo personal</span
									>
								{:else}
									<span
										class="retro-badge retro-sindato"
										>Sin dato</span
									>
								{/if}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="text-center py-16 font-mono text-xs text-neutral-700">
								No hay resultados para los filtros seleccionados.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</main>

	<!-- Footer -->
	<footer class="border-t border-neutral-900 bg-[#0d0d0d] px-6 py-4">
		<p class="text-center font-mono text-[0.62rem] text-neutral-700">
			Datos relevados desde medios de comunicaciÃ³n argentinos Â· ActualizaciÃ³n automÃ¡tica vÃ­a GitHub
			Actions
		</p>
	</footer>
</div>

<style>
	:global(body) {
		background: #f2e7cf;
		color: #1a1a16;
		font-family: 'Cormorant Garamond', serif;
	}

	.retro-app {
		min-height: 100vh;
		background:
			linear-gradient(0deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.08)),
			repeating-linear-gradient(
				90deg,
				rgba(0, 0, 0, 0.03),
				rgba(0, 0, 0, 0.03) 1px,
				transparent 1px,
				transparent 6px
			),
			#f2e7cf;
		padding-bottom: 2.5rem;
	}

	.retro-app header {
		background: #f2e7cf;
		border-bottom: 3px solid #1a1a16;
		padding: 2.5rem 2rem 1.5rem;
		position: relative;
	}

	.retro-app header::after {
		content: 'BOLETIN INDUSTRIAL';
		position: absolute;
		top: 1.2rem;
		right: 2rem;
		font-family: 'Space Mono', monospace;
		letter-spacing: 0.3em;
		font-size: 0.6rem;
		color: #1a1a16;
		border: 2px solid #1a1a16;
		padding: 0.2rem 0.5rem;
		transform: rotate(-2deg);
	}

	.retro-kicker {
		display: inline-block;
		background: #1a1a16;
		color: #f7f1e1 !important;
		padding: 0.2rem 0.45rem;
		letter-spacing: 0.2em !important;
	}

	.retro-app h1 {
		font-family: 'Archivo Black', sans-serif;
		color: #1a1a16 !important;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: clamp(2rem, 4vw, 3.2rem) !important;
	}

	.retro-app .subtitle {
		font-family: 'Space Mono', monospace;
		color: #3a2f2b !important;
	}

	.retro-app .stats,
	.retro-app .retro-stats {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.retro-app .stat,
	.retro-app .retro-stat {
		border: 2px solid #1a1a16;
		padding: 0.6rem 0.8rem;
		background: #f7f1e1;
		box-shadow: 4px 4px 0 #1a1a16;
	}

	.retro-app .stat-num {
		font-family: 'Archivo Black', sans-serif !important;
		color: #c6382f !important;
	}

	.retro-app .filtros,
	.retro-app .retro-filters {
		background: #e9d7b0 !important;
		border-bottom: 3px solid #1a1a16 !important;
		padding: 1rem 2rem !important;
	}

	.retro-app input,
	.retro-app select {
		font-family: 'Space Mono', monospace;
		border: 2px solid #1a1a16 !important;
		background: #f7f1e1 !important;
		color: #1a1a16 !important;
	}

	.retro-app button {
		font-family: 'Space Mono', monospace;
		border: 2px solid #1a1a16 !important;
		background: #1a1a16 !important;
		color: #f7f1e1 !important;
	}

	.retro-app table {
		border: 3px solid #1a1a16;
		background: #f7f1e1;
	}

	.retro-app thead th {
		font-family: 'Space Mono', monospace;
		background: #1a1a16 !important;
		color: #f7f1e1 !important;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		border-bottom: 3px solid #1a1a16 !important;
	}

	.retro-row {
		border-bottom: 2px solid #1a1a16;
	}

	.retro-row:nth-child(odd) {
		background: #f1e2c4;
	}

	.retro-cerro-row {
		background: #f4d1c7 !important;
	}

	.retro-badge {
		display: inline-block;
		padding: 0.2rem 0.5rem;
		border: 2px solid #1a1a16;
		font-family: 'Space Mono', monospace;
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		background: #f7f1e1;
	}

	.retro-cerro {
		background: #c6382f;
		color: #f7f1e1;
	}

	.retro-reduccion {
		background: #e7b24d;
		color: #1a1a16;
	}

	.retro-sindato {
		background: #e0d6c0;
		color: #1a1a16;
	}

	.rubro-alimentos { background: #d7e2b8; }
	.rubro-automotriz { background: #c3d2e8; }
	.rubro-textil { background: #e8c3d8; }
	.rubro-construccion { background: #f1d59a; }
	.rubro-logistica { background: #f0c3a3; }
	.rubro-comercio { background: #c2e0da; }
	.rubro-farma { background: #d4c7f2; }
	.rubro-quimica { background: #bfe0de; }
	.rubro-electro { background: #c6d8f2; }
	.rubro-otro { background: #e1d7c3; }
</style>




