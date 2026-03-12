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
	class="min-h-screen bg-[#f2e7cf] text-[#1a1a16] font-[Cormorant_Garamond]"
	
>
	<!-- Header -->
	<header class="relative border-b-[3px] border-[#1a1a16] bg-[#f2e7cf] px-6 py-8 md:px-10">
		<div class="absolute right-6 top-5 hidden md:block">
			<span class="inline-block border-2 border-[#1a1a16] px-2 py-1 font-[Space_Mono] text-[0.6rem] tracking-[0.35em]">
				BOLETIN INDUSTRIAL
			</span>
		</div>
		<div class="flex flex-wrap items-start justify-between gap-6">
			<div>
				<span class="inline-block bg-[#1a1a16] text-[#f7f1e1] px-2 py-0.5 font-[Space_Mono] text-[0.65rem] tracking-[0.3em] uppercase">
					Conurbano Bonaerense
				</span>
				<h1 class="font-[Archivo_Black] uppercase tracking-[0.05em] text-[#1a1a16] text-3xl md:text-4xl">
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
					<span class="text-[0.65rem] tracking-wide text-[#3a2f2b] uppercase font-[Space_Mono]">empresas</span>
				</div>
				<div class="h-10 w-px bg-[#1a1a16]"></div>
				<div class="text-right">
					<span class="block font-[Archivo_Black] text-2xl leading-none text-[#c6382f]"
						>{totalEmpleados.toLocaleString('es-AR')}</span
					>
					<span class="text-[0.65rem] tracking-wide text-[#3a2f2b] uppercase font-[Space_Mono]"
						>empleos perdidos</span
					>
				</div>
				<div class="h-10 w-px bg-[#1a1a16]"></div>
				<div class="text-right">
					<span class="block font-[Archivo_Black] text-2xl leading-none text-[#c6382f]"
						>{totalCierres}</span
					>
					<span class="text-[0.65rem] tracking-wide text-[#3a2f2b] uppercase font-[Space_Mono]"
						>cierres definitivos</span
					>
				</div>
			</div>
		</div>
	</header>

	<!-- Filtros -->
	<section class="border-b-[3px] border-[#1a1a16] bg-[#e9d7b0] px-6 py-4 md:px-10"
	>
		<div class="flex flex-wrap items-center gap-2">
			<input
				type="text"
				placeholder="Buscar empresa o municipio..."
				bind:value={filtroTexto}
				class="min-w-[200px] rounded-none border-2 border-[#1a1a16] bg-[#f7f1e1] px-3 py-2 text-xs text-[#1a1a16] font-[Space_Mono] placeholder:text-[#5a4a42] focus:outline-none focus:ring-2 focus:ring-[#1a1a16]"
			/>
			<select
				bind:value={filtroMunicipio}
				class="cursor-pointer rounded-none border-2 border-[#1a1a16] bg-[#f7f1e1] px-3 py-2 text-xs text-[#1a1a16] font-[Space_Mono] focus:outline-none focus:ring-2 focus:ring-[#1a1a16]"
			>
				<option value="">Todos los municipios</option>
				{#each municipiosUnicos as m (m)}
					<option value={m}>{m}</option>
				{/each}
			</select>
			<select
				bind:value={filtroRubro}
				class="cursor-pointer rounded-none border-2 border-[#1a1a16] bg-[#f7f1e1] px-3 py-2 text-xs text-[#1a1a16] font-[Space_Mono] focus:outline-none focus:ring-2 focus:ring-[#1a1a16]"
			>
				<option value="">Todos los rubros</option>
				{#each rubrosUnicos as r (r)}
					<option value={r}>{r}</option>
				{/each}
			</select>
			<select
				bind:value={filtroCerro}
				class="cursor-pointer rounded-none border-2 border-[#1a1a16] bg-[#f7f1e1] px-3 py-2 text-xs text-[#1a1a16] font-[Space_Mono] focus:outline-none focus:ring-2 focus:ring-[#1a1a16]"
			>
				<option value="">Cierre / Reducción</option>
				<option value="Si">Cerró definitivamente</option>
				<option value="No">Redujo personal</option>
			</select>
			{#if filtroMunicipio || filtroRubro || filtroCerro || filtroTexto}
				<button
					on:click={resetFiltros}
					class="cursor-pointer rounded-none border-2 border-[#1a1a16] bg-[#1a1a16] px-3 py-2 text-xs text-[#f7f1e1] font-[Space_Mono] hover:bg-[#333]"
				>
					âœ• Limpiar
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
		<div class="overflow-x-auto">
			<table class="w-full border-[3px] border-[#1a1a16] bg-[#f7f1e1]">
				<thead>
					<tr class="sticky top-0 z-10 border-b-[3px] border-[#1a1a16] bg-[#1a1a16]">
						<th
							on:click={() => toggleOrden('fecha')}
							class="cursor-pointer px-4 py-3 text-left text-[0.65rem] font-[Space_Mono] tracking-[0.2em] whitespace-nowrap text-[#f7f1e1] uppercase select-none"
						>
							Fecha {flechas('fecha')}
						</th>
						<th
							on:click={() => toggleOrden('empresa')}
							class="cursor-pointer px-4 py-3 text-left text-[0.65rem] font-[Space_Mono] tracking-[0.2em] whitespace-nowrap text-[#f7f1e1] uppercase select-none"
						>
							Empresa {flechas('empresa')}
						</th>
						<th
							on:click={() => toggleOrden('municipio')}
							class="hidden cursor-pointer px-4 py-3 text-left text-[0.65rem] font-[Space_Mono] tracking-[0.2em] whitespace-nowrap text-[#f7f1e1] uppercase select-none md:table-cell"
						>
							Municipio {flechas('municipio')}
						</th>
						<th
							on:click={() => toggleOrden('rubro')}
							class="cursor-pointer px-4 py-3 text-left text-[0.65rem] font-[Space_Mono] tracking-[0.2em] whitespace-nowrap text-[#f7f1e1] uppercase select-none"
						>
							Rubro {flechas('rubro')}
						</th>
						<th
							on:click={() => toggleOrden('empleados')}
							class="cursor-pointer px-4 py-3 text-right text-[0.65rem] font-[Space_Mono] tracking-[0.2em] whitespace-nowrap text-[#f7f1e1] uppercase select-none"
						>
							Empleados {flechas('empleados')}
						</th>
						<th
							class="px-4 py-3 text-left text-[0.65rem] font-[Space_Mono] tracking-[0.2em] whitespace-nowrap text-[#f7f1e1] uppercase"
						>
							Estado
						</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as e (e.id)}
						<tr class="border-b-2 border-[#1a1a16] hover:bg-[#f1e2c4] {isCerroSi(e.cerro) ? 'bg-[#f4d1c7]' : ''}">
							<td class="px-4 py-3 font-[Space_Mono] text-xs whitespace-nowrap text-[#3a2f2b]"
								>{e.fecha}</td
							>
							<td class="px-4 py-3 font-semibold text-[#1a1a16]">{e.empresa}</td>
							<td class="hidden px-4 py-3 font-[Space_Mono] text-xs text-[#3a2f2b] md:table-cell"
								>{e.municipio}</td
							>
							<td class="px-4 py-3">
								<span
									class="inline-block rounded-none border-2 border-[#1a1a16] px-2 py-0.5 font-[Space_Mono] text-[0.65rem] uppercase tracking-[0.08em] {rubroColor(e.rubro)}"
								>
									{e.rubro}
								</span>
							</td>
							<td class="px-4 py-3 text-right font-[Space_Mono] text-xs text-[#1a1a16]">
								{e.empleados > 0 ? e.empleados.toLocaleString('es-AR') : 'â€”'}
							</td>
							<td class="px-4 py-3">
								{#if isCerroSi(e.cerro)}
									<span
										class="inline-block rounded-none border-2 border-[#1a1a16] bg-[#c6382f] px-2 py-0.5 font-[Space_Mono] text-[0.65rem] uppercase tracking-[0.08em] text-[#f7f1e1]"
										>Cerro</span
									>
								{:else if e.cerro === 'No'}
									<span
										class="inline-block rounded-none border-2 border-[#1a1a16] bg-[#e7b24d] px-2 py-0.5 font-[Space_Mono] text-[0.65rem] uppercase tracking-[0.08em] text-[#1a1a16]"
										>Redujo personal</span
									>
								{:else}
									<span
										class="inline-block rounded-none border-2 border-[#1a1a16] bg-[#e0d6c0] px-2 py-0.5 font-[Space_Mono] text-[0.65rem] uppercase tracking-[0.08em] text-[#1a1a16]"
										>Sin dato</span
									>
								{/if}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="text-center py-16 font-[Space_Mono] text-xs text-[#3a2f2b]">
								No hay resultados para los filtros seleccionados.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</main>

	<!-- Footer -->
	<footer class="border-t-[3px] border-[#1a1a16] bg-[#f2e7cf] px-6 py-4">
		<p class="text-center font-[Space_Mono] text-[0.62rem] text-[#3a2f2b]">
			Datos relevados desde medios de comunicación argentinos · Actualización automática vía GitHub
			Actions
		</p>
	</footer>
</div>


















