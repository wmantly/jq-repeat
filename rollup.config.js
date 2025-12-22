import terser from '@rollup/plugin-terser';

export default [
	// Unminified build
	{
		input: 'src/jq-repeat.js',
		output: {
			file: 'dist/js/jq-repeat.js',
			format: 'iife',
			name: 'jqRepeat',
			globals: {
				jquery: 'jQuery',
				mustache: 'Mustache'
			},
			banner: '/*!\n * jq-repeat\n * https://github.com/wmantly/jq-repeat\n * MIT License\n */'
		},
		external: ['jquery', 'mustache']
	},
	// Minified build
	{
		input: 'src/jq-repeat.js',
		output: {
			file: 'dist/js/jq-repeat.min.js',
			format: 'iife',
			name: 'jqRepeat',
			globals: {
				jquery: 'jQuery',
				mustache: 'Mustache'
			},
			banner: '/*! jq-repeat - MIT License - https://github.com/wmantly/jq-repeat */',
			sourcemap: true
		},
		external: ['jquery', 'mustache'],
		plugins: [terser()]
	}
];
