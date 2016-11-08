/**
 * A plugin which enables rendering of math equations inside
 * of reveal.js slides. Essentially a thin wrapper for MathJax.
 *
 * @author Hakim El Hattab
 */
var RevealMath = window.RevealMath || (function(){

	var options = Reveal.getConfig().math || {};
	options.mathjax = options.mathjax || 'https://cdn.mathjax.org/mathjax/latest/MathJax.js';
	loadScript( options.mathjax, function() {
		MathJax.Hub.Config({
			extensions: [
				"tex2jax.js",
				"TeX/AMSmath.js",
				"TeX/AMSsymbols.js",
				"TeX/HTML.js"
			],
			jax: [
				"input/TeX",
				"output/HTML-CSS"
			],
			messageStyle: 'none',
			showMathMenu: false,
			showMathMenuMSIE: false,
			showProcessingMessages: false,
			skipStartupTypeset: true,

			tex2jax: {
				inlineMath: [['$','$'],['\\(','\\)']],
				displayMath: [['$$','$$'],['\\[','\\]']],
				skipTags: ['script','noscript','style','textarea','pre'],
				processEnvironments: false,
				preview: 'none'
			},

			TeX: {
				Macros: {
					bbA: '{\\mathbb{A}}',
					bbB: '{\\mathbb{B}}',
					bbF: '{\\mathbb{F}}',
					bbN: '{\\mathbb{N}}',
					bbP: '{\\mathbb{P}}',
					bbQ: '{\\mathbb{Q}}',
					bbR: '{\\mathbb{R}}',
					bbZ: '{\\mathbb{Z}}',

					calA: '{\\mathcal{A}}',
					calB: '{\\mathcal{B}}',
					calC: '{\\mathcal{C}}',
					calD: '{\\mathcal{D}}',
					calF: '{\\mathcal{F}}',
					calG: '{\\mathcal{G}}',
					calI: '{\\mathcal{I}}',
					calM: '{\\mathcal{M}}',
					calN: '{\\mathcal{N}}',
					calO: '{\\mathcal{O}}',
					calR: '{\\mathcal{R}}',
					calS: '{\\mathcal{S}}',

					bfA: '{\\mathbf{A}}',
					bfa: '{\\mathbf{a}}',
					bfb: '{\\mathbf{b}}',
					bfc: '{\\mathbf{c}}',
					bfe: '{\\mathbf{e}}',
					bfw: '{\\mathbf{w}}',
					bfx: '{\\mathbf{x}}',
					bfy: '{\\mathbf{y}}',
					bfz: '{\\mathbf{z}}',

					floor: ['{\\left\\lfloor #1 \\right\\rfloor}', 1],
					ceil: ['{\\left\\lceil #1 \\right\\rceil}', 1],

					le: '\\leqslant',
					ge: '\\geqslant',
					hat: '\\widehat',
					emptyset: '\\varnothing',
					epsilon: '\\varepsilon',
					step: ['\\class{fragment step}{#1}', 1]
				}
			}
		});

		// Typeset followed by an immediate reveal.js layout since
		// the typesetting process could affect slide height
		MathJax.Hub.Queue( [ 'Typeset', MathJax.Hub ] );
		MathJax.Hub.Queue( Reveal.layout );

		// Reprocess equations in slides when they turn visible
		/*Reveal.addEventListener( 'slidechanged', function( event ) {
			MathJax.Hub.Queue( [ 'Rerender', MathJax.Hub, event.currentSlide ] );
		} );*/

	} );

	function loadScript( url, callback ) {
		var head = document.querySelector( 'head' );
		var script = document.createElement( 'script' );
		script.type = 'text/javascript';
		script.src = url;

		// Wrapper for callback to make sure it only fires once
		script.onload =  function() {
			if( typeof callback === 'function' ) {
				callback.call();
				callback = null;
			}
		};

		head.appendChild( script );
	}
})();