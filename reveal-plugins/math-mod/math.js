/**
 * A plugin which enables rendering of math equations inside
 * of reveal.js slides. Essentially a thin wrapper for MathJax.
 *
 * @author Hakim El Hattab
 */
var RevealMath = window.RevealMath || (function(){
	var options = Reveal.getConfig().math || {};
	options.mathjax = options.mathjax || 'https://cdn.mathjax.org/mathjax/latest/MathJax.js';
	var scriptsToLoad = [
		{
            type: 'text/x-mathjax-config',
            content: options.mathjaxConfig ||
"MathJax.Ajax.config.path['Contrib'] = '//cdn.mathjax.org/mathjax/contrib';" +
"MathJax.Hub.Config({" +
"	extensions: [" +
"		'tex2jax.js'," +
"		'TeX/AMSmath.js'," +
"		'TeX/AMSsymbols.js'," +
"		'TeX/HTML.js'" +
"	]," +
"	jax: [" +
"		'input/TeX'," +
"		'output/HTML-CSS'" +
"	]," +
"	messageStyle: 'none'," +
"	showMathMenu: false," +
"	showMathMenuMSIE: false," +
"	showProcessingMessages: false," +
"	skipStartupTypeset: true," +

"	tex2jax: {" +
"		inlineMath: [['$','$'],['\\\\(','\\\\)']]," +
"		displayMath: [['$$','$$'],['\\\\[','\\\\]']]," +
"		skipTags: ['script','noscript','style','textarea']," +
"		processEnvironments: true," +
"		preview: 'none'" +
"	}," +

"	TeX: {" +
"       extensions: [" +
"           'AMSmath.js'," +
"           'AMSsymbols.js'," +
"           'HTML.js'," +
"           'noUndefined.js'," +
"           'begingroup.js'," +
"           '[Contrib]/xyjax/xypic.js'," +
"           '[Contrib]/img/img.js'," +
"       ]," +
"		Macros: {" +
"			bbA: '{\\\\mathbb{A}}'," +
"			bbB: '{\\\\mathbb{B}}'," +
"			bbF: '{\\\\mathbb{F}}'," +
"			bbN: '{\\\\mathbb{N}}'," +
"			bbP: '{\\\\mathbb{P}}'," +
"			bbQ: '{\\\\mathbb{Q}}'," +
"			bbR: '{\\\\mathbb{R}}'," +
"			bbZ: '{\\\\mathbb{Z}}'," +

"			calA: '{\\\\mathcal{A}}'," +
"			calB: '{\\\\mathcal{B}}'," +
"			calC: '{\\\\mathcal{C}}'," +
"			calD: '{\\\\mathcal{D}}'," +
"			calF: '{\\\\mathcal{F}}'," +
"			calG: '{\\\\mathcal{G}}'," +
"			calI: '{\\\\mathcal{I}}'," +
"			calM: '{\\\\mathcal{M}}'," +
"			calN: '{\\\\mathcal{N}}'," +
"			calO: '{\\\\mathcal{O}}'," +
"			calR: '{\\\\mathcal{R}}'," +
"			calS: '{\\\\mathcal{S}}'," +

"			bfA: '{\\\\mathbf{A}}'," +
"			bfP: '{\\\\mathbf{P}}'," +
"			bfQ: '{\\\\mathbf{Q}}'," +
"			bfa: '{\\\\mathbf{a}}'," +
"			bfb: '{\\\\mathbf{b}}'," +
"			bfc: '{\\\\mathbf{c}}'," +
"			bfe: '{\\\\mathbf{e}}'," +
"			bfw: '{\\\\mathbf{w}}'," +
"			bfx: '{\\\\mathbf{x}}'," +
"			bfy: '{\\\\mathbf{y}}'," +
"			bfz: '{\\\\mathbf{z}}'," +

"			floor: ['{\\\\left\\\\lfloor #1 \\\\right\\\\rfloor}', 1]," +
"			ceil: ['{\\\\left\\\\lceil #1 \\\\right\\\\rceil}', 1]," +

"			le: '\\\\leqslant'," +
"			ge: '\\\\geqslant'," +
"			hat: '\\\\widehat'," +
"			emptyset: '\\\\varnothing'," +
"			epsilon: '\\\\varepsilon'," +
"			step: ['\\\\class{fragment step}{#1}', 1]," +
"			fragment: ['\\\\class{fragment}{#1}', 1]," +
"			zoomable: ['\\\\class{zoomable}{#1}', 1]," +
"			green: ['\\\\class{green}{#1}', 1]," +
"			red: ['\\\\class{red}{#1}', 1]" +
"		}" +
"	}" +
"});",
            condition: !window.MathJax
        }, {
            url: options.mathjax,
            condition: !window.MathJax
        }
    ];

	loadScripts(scriptsToLoad, function () {
        function typesetMath() {
            MathJax.Hub.Queue( [ 'Typeset', MathJax.Hub ] );
            MathJax.Hub.Queue( function(){
                MathJax.Hub.getAllJax('.slides').forEach(function (jax) {
                    var node = document.getElementById(jax.inputID + '-Frame');
                    if(node && node.querySelector('.fragment')){

                        while( node.tagName.toLowerCase() != 'section' ){
                            node = node.parentNode;
                        }

                        var fragments = node.querySelectorAll('[data-fragment-index]');
                        for(var i = 0; i < fragments.length; ++i) {
                            fragments[i].removeAttribute('data-fragment-index');
                        }
                        return;
                    }
                });
                Reveal.sync();
            } );
        }

        if(Reveal.isReady()) {
            typesetMath();
        }
        else
            Reveal.addEventListener('ready', typesetMath);

		// Reveal.addEventListener( 'slidechanged', function( event ) {
         //    var curSlide = event.currentSlide;
         //    MathJax.Hub.Queue( [ 'Rerender', MathJax.Hub, curSlide ] );
         //    MathJax.Hub.Queue( function(){
         //        var fragments = curSlide.querySelectorAll('[data-fragment-index]');
         //        for(var i = 0; i < fragments.length; ++i) {
         //            fragments[i].removeAttribute('data-fragment-index');
         //        }
         //        Reveal.sync();
		//     });
		// });
	});


	function loadScript( params, extraCallback ) {
        if(params.condition !== undefined
          && !(params.condition === true || typeof params.condition == 'function' && params.condition.call())) {
            return extraCallback ? extraCallback.call() : false;
        }

        if( params.type === undefined ) {
            params.type = (params.url && params.url.match(/\.css[^.]*$/)) ? 'text/css' : 'text/javascript';
        }

        var script = null;

        if( params.type == 'text/css' ){
            if( params.content ){
                script = document.createElement( 'style' );
                script.textContent = params.content;
            }
            else {
                script = document.createElement( 'link' );
                script.rel = 'stylesheet';
                script.type = 'text/css';
                script.href = params.url;
            }
        }
        else {
            script = document.createElement('script');
            script.type = params.type || 'text/javascript';
            if( params.content ) {
                script.textContent = params.content;
            }
            else {
                script.src = params.url;
            }
        }

        if(params.content){
            document.querySelector( 'head' ).appendChild( script );
            if(params.callback) {
                params.callback.call();
            }
            if(extraCallback) {
                extraCallback.call();
            }
        }
        else {
            script.onload = function(){
                if(params.callback) {
                    params.callback.call();
                }
                if(extraCallback) {
                    extraCallback.call();
                }
            };

            document.querySelector( 'head' ).appendChild( script );
        }
	}

	function loadScripts( scripts, callback ) {
        if(!scripts || scripts.length == 0) {
            if (typeof callback === 'function') {
                if(Reveal.isReady()) {
                    callback.call();
                    callback = null;
                }
                else {
                    Reveal.addEventListener('ready', function () {
                        callback.call();
                        callback = null;
                    });
                }
            }
            return;
        }

        var script = scripts.splice(0, 1)[0];
        loadScript(script, function () {
            loadScripts(scripts, callback);
        });
    }

	return true;
})();