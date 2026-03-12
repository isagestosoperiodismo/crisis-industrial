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
		if (ordenCol !== col) return '↕';
		return ordenDir === 'asc' ? '↑' : '↓';
	};

	const isCerroSi = (value) => {
		if (!value) return false;
		return ['Si', 'Sí', 'SÃ­', 'SI', 'si'].includes(value);
	};

	const rubroColor = (rubro) => {
		const r = rubro.split('/')[0].trim().toLowerCase();
		if (r.includes('alimento')) return 'bg-green-950 text-green-400 border-green-900';
		if (r.includes('automotriz')) return 'bg-blue-950 text-blue-400 border-blue-900';
		if (r.includes('textil')) return 'bg-purple-950 text-purple-400 border-purple-900';
		if (r.includes('construc')) return 'bg-yellow-950 text-yellow-400 border-yellow-900';
		if (r.includes('logística') || r.includes('logistica'))
			return 'bg-orange-950 text-orange-400 border-orange-900';
		if (r.includes('comercio')) return 'bg-cyan-950 text-cyan-400 border-cyan-900';
		if (r.includes('farmac')) return 'bg-violet-950 text-violet-400 border-violet-900';
		if (r.includes('química') || r.includes('quimica'))
			return 'bg-teal-950 text-teal-400 border-teal-900';
		if (r.includes('electrodom')) return 'bg-sky-950 text-sky-400 border-sky-900';
		return 'bg-neutral-900 text-neutral-400 border-neutral-800';
	};
</script>

<svelte:head>
	<title>Empresas que cerraron o despidieron en el Conurbano Bonaerense</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@300;400;600&display=swap"
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
				<span class="mb-1 block font-mono text-[0.62rem] tracking-[0.18em] text-red-500 uppercase">
					Conurbano Bonaerense
				</span>
				<h1 class="text-2xl leading-tight font-semibold text-[#f0ebe0] md:text-3xl">
					Registro de Despidos y Cierres
				</h1>
				<p class="mt-1 font-mono text-xs text-neutral-500">
					Desde noviembre de 2023 · Actualización diaria automática
				</p>
			</div>

			<div class="flex shrink-0 items-center gap-6">
				<div class="text-right">
					<span class="block font-mono text-2xl leading-none font-semibold text-red-500"
						>{empresas.length}</span
					>
					<span class="text-[0.65rem] tracking-wide text-neutral-500 uppercase">empresas</span>
				</div>
				<div class="h-10 w-px bg-neutral-800"></div>
				<div class="text-right">
					<span class="block font-mono text-2xl leading-none font-semibold text-red-500"
						>{totalEmpleados.toLocaleString('es-AR')}</span
					>
					<span class="text-[0.65rem] tracking-wide text-neutral-500 uppercase"
						>empleos perdidos</span
					>
				</div>
				<div class="h-10 w-px bg-neutral-800"></div>
				<div class="text-right">
					<span class="block font-mono text-2xl leading-none font-semibold text-red-500"
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
				<option value="">Cierre / Reducción</option>
				<option value="Si">Cerro definitivamente</option>
				<option value="No">Redujo personal</option>
			</select>
			{#if filtroMunicipio || filtroRubro || filtroCerro || filtroTexto}
				<button
					on:click={resetFiltros}
					class="cursor-pointer rounded-sm border border-neutral-700 bg-transparent px-3 py-2 font-mono text-xs text-neutral-500 transition-colors hover:border-red-500 hover:text-red-500"
				>
					✕ Limpiar
				</button>
			{/if}
		</div>

		<div class="flex gap-2 font-mono text-xs text-neutral-600">
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
						<tr
							class="border-b border-neutral-900 transition-colors hover:bg-neutral-900/50 {isCerroSi(
								e.cerro
							)
								? 'border-l-2 border-l-red-700'
								: ''}"
						>
							<td class="px-4 py-3 font-mono text-xs whitespace-nowrap text-neutral-500"
								>{e.fecha}</td
							>
							<td class="px-4 py-3 font-semibold text-[#e8e4dc]">{e.empresa}</td>
							<td class="hidden px-4 py-3 font-mono text-xs text-neutral-400 md:table-cell"
								>{e.municipio}</td
							>
							<td class="px-4 py-3">
								<span
									class="inline-block rounded-sm border px-2 py-0.5 font-mono text-[0.65rem] whitespace-nowrap {rubroColor(
										e.rubro
									)}"
								>
									{e.rubro}
								</span>
							</td>
							<td class="px-4 py-3 text-right font-mono text-xs text-neutral-300">
								{e.empleados > 0 ? e.empleados.toLocaleString('es-AR') : '—'}
							</td>
							<td class="px-4 py-3">
								{#if isCerroSi(e.cerro)}
									<span
										class="inline-block rounded-sm border border-red-900 bg-red-950 px-2 py-0.5 font-mono text-[0.65rem] font-semibold whitespace-nowrap text-red-400"
										>Cerro</span
									>
								{:else if e.cerro === 'No'}
									<span
										class="inline-block rounded-sm border border-yellow-900 bg-yellow-950 px-2 py-0.5 font-mono text-[0.65rem] font-semibold whitespace-nowrap text-yellow-400"
										>Redujo personal</span
									>
								{:else}
									<span
										class="inline-block rounded-sm border border-neutral-800 bg-neutral-900 px-2 py-0.5 font-mono text-[0.65rem] whitespace-nowrap text-neutral-600"
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
			Datos relevados desde medios de comunicación argentinos · Actualización automática vía GitHub
			Actions
		</p>
	</footer>
</div>
