<script>
	export let rows = [];
	export let ordenCol;
	export let ordenDir;
	export let onToggleOrden;
	export let flechas;
	export let isCerroSi;
	export let rubroColor;
	export let ui;
	export let rowClass;

	const formatMonthYear = (value) => {
		if (!value) return '';
		const s = String(value).trim();
		let date;
		const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
		if (dmy) {
			const day = Number(dmy[1]);
			const month = Number(dmy[2]) - 1;
			const year = Number(dmy[3]);
			date = new Date(year, month, day);
		} else {
			const parsed = new Date(s);
			if (!Number.isNaN(parsed.getTime())) date = parsed;
		}
		if (!date) return s;
		return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
	};
</script>

<div class="overflow-x-auto">
	<table class="w-full border-[3px] border-[#1a1a16] bg-white">
		<thead>
			<tr class="sticky top-0 z-10 border-b-[3px] border-[#1a1a16] bg-[#1a1a16]">
				<th on:click={() => onToggleOrden('fecha')} class={ui.th}>
					Fecha {flechas('fecha')}
				</th>
				<th on:click={() => onToggleOrden('empresa')} class={ui.th}>
					Empresa {flechas('empresa')}
				</th>
				<th on:click={() => onToggleOrden('municipio')} class={ui.thHidden}>
					Municipio {flechas('municipio')}
				</th>
				<th on:click={() => onToggleOrden('rubro')} class={ui.th}>
					Rubro {flechas('rubro')}
				</th>
				<th on:click={() => onToggleOrden('empleados')} class={ui.thRight}>
					Empleados {flechas('empleados')}
				</th>
				<th class={ui.thStatic}>Estado</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as e (e.id)}
				<tr class={rowClass(isCerroSi(e.cerro))}>
					<td class={ui.cellMono}>{formatMonthYear(e.fecha)}</td>
					<td class={ui.cellCompany}>{e.empresa}</td>
					<td class={`hidden md:table-cell ${ui.cellMono}`}>{e.municipio}</td>
					<td class="px-4 py-3">
						<span class={`${ui.badgeBase} ${rubroColor(e.rubro)}`}>{e.rubro}</span>
					</td>
					<td class={ui.cellRight}>
						{e.empleados > 0 ? e.empleados.toLocaleString('es-AR') : '—'}
					</td>
					<td class="px-4 py-3">
						{#if isCerroSi(e.cerro)}
							<span class={ui.badgeCerro}>Cerró</span>
						{:else if String(e.cerro || '').trim().toLowerCase() === 'no'}
							<span class={ui.badgeReduccion}>Redujo personal</span>
						{:else}
							<span class={ui.badgeSinDato}>Sin dato</span>
						{/if}
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="6" class={ui.empty}>
						No hay resultados para los filtros seleccionados.
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

