import adapter from '@sveltejs/adapter-static';

const base = process.env.BASE_PATH || (process.env.NODE_ENV === 'production' ? '/crisis-industrial' : '');

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ pages: 'build', assets: 'build', fallback: 'index.html' }),
		paths: { base },
		prerender: {
			entries: ['*'],
			handleHttpError: ({ status, path, referrer }) => {
				if (status === 404 && path.endsWith('/favicon.ico')) return;
				throw new Error(`${status} ${path} (linked from ${referrer})`);
			}
		}
	}
};

export default config;
