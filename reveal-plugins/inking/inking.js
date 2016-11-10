/*
    Inking plugin for reveal.js (https://github.com/hakimel/reveal.js)

    Plugin author: Alex Dainiak, Assoc. Prof. at Moscow Institute of Physics and Technology: https://mipt.ru/english/

    Web: https://github.com/dainiak
    Email: dainiak@gmail.com

    Plugin creation was facilitated by a Vladimir Potanin Foundation grant: http://english.fondpotanin.ru/

    The plugin is powered by:
        Reveal.js:   https://github.com/hakimel/reveal.js     (MIT license)
        Fabric.js:   https://github.com/kangax/fabric.js      (MIT license)
        HTML2canvas: https://github.com/niklasvh/html2canvas  (MIT license)
        KaTeX:       https://github.com/Khan/KaTeX            (MIT license)
        MathJax:     https://github.com/mathjax/MathJax       (Apache-2.0 license)
*/

var RevealInking = window.RevealInking || (function (){
        var options = Reveal.getConfig().inking || {};
    var RENDERING_RESOLUTION = options.renderingResolution || 4;
    var CANVAS_ABOVE_CONTROLS = !!(options.canvasAboveControls);
    var CONTROLS_COLOR = options.controlsColor;
    var PENCIL_COLOR = options.pencilColor;
    var INK_SHADOW = options.inkShadow !== undefined ? options.inkShadow : 'rgb(50,50,50)';
    var FORMULAE_COLOR = options.mathColor || 'rgb(250,250,250)';
    var FORMULAE_SHADOW = options.mathShadow || ( FORMULAE_COLOR == 'rgb(250,250,250)' ? 'rgb(250,250,250)' : '' );
    var DISPLAY_STYLE_MATH = options.mathDisplayStyle !== false;
    var MATH_RENDERING_ENGINE = options.mathRenderer || 'MathJax';
    var FORMULAE_SUPPORT_ENABLED = options.math !== false;
    var MATH_MACROS = options.mathMacros || [];

    var inkingCSS = 'CSS: .ink-controls {position: fixed;bottom: 10px;right: 200px;cursor: default;' + (CONTROLS_COLOR ? 'color:' + CONTROLS_COLOR + ';' : '') + 'z-index: 130;}'
            + '.ink-control-button {float: left;display: inline;font-size: 20pt;padding-left: 10pt; padding-right: 10pt;}'
            + '.ink-color:before {content: "■"} .ink-pencil:before {content: "✎"} .ink-erase:before {content: "␡"} .ink-formula:before {content: "∑"} .ink-clear:before {content: "⎚"} .ink-hidecanvas:before {content: "⊠"}';

    var currentFormula = '';
    var currentImage = null;
    var isInEraseMode = false;
    var isMouseLeftButtonDown = false;
    var isShiftDown = false;
    var formulaRenderingDiv = null;

    var scriptsToLoad = {
        'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/1.6.6/fabric.min.js' : !window.fabric,
        'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/0.5.0-beta4/html2canvas.js' : FORMULAE_SUPPORT_ENABLED && !window.html2canvas,
        'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.6.0/katex.min.js' : FORMULAE_SUPPORT_ENABLED && MATH_RENDERING_ENGINE == 'KaTeX' && !window.katex,
        'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.6.0/katex.min.css' : FORMULAE_SUPPORT_ENABLED && MATH_RENDERING_ENGINE == 'KaTeX' && !window.katex,
        'https://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS_HTML' : FORMULAE_SUPPORT_ENABLED && MATH_RENDERING_ENGINE == 'MathJax' && !window.MathJax
    };
    scriptsToLoad[inkingCSS] = true;


    loadScripts(scriptsToLoad, function () {
        var viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        var viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        var bottomPadding = 0;
        if (CANVAS_ABOVE_CONTROLS){
            bottomPadding = parseInt(window.getComputedStyle(document.querySelector('.controls')).height) + parseInt(window.getComputedStyle(document.querySelector('.controls')).bottom);
        }

        var canvasElement = document.createElement('canvas');
        canvasElement.id = 'revealjs_inking_canvas';
        canvasElement.width = viewportWidth;
        canvasElement.height = viewportHeight - bottomPadding;
        canvasElement.style.position = 'fixed';
        canvasElement.style.left = '0px';
        canvasElement.style.top = '0px';
        canvasElement.style.width = '100%';
        canvasElement.style.bottom = bottomPadding.toString() + 'px';
        canvasElement.style.zIndex = window.getComputedStyle(document.querySelector('.controls')).zIndex - 1;

        document.body.appendChild(canvasElement);

        var canvas = new fabric.Canvas(canvasElement, {
            perPixelTargetFind: true,
            renderOnAddRemove: true
        });


        Reveal.addEventListener('slidechanged',function(event){
            event.previousSlide.savedInkedContent = canvas.getObjects().slice(0);
            var slide = event.currentSlide;
            canvas.clear();
            if(slide.savedInkedContent){
                setTimeout(function(){
                    slide.savedInkedContent.forEach(function(obj){canvas.add(obj)});
                }, parseInt(window.getComputedStyle(slide).transitionDuration) || 800);
            }
            leaveDeletionMode();
        });


        canvas.on('object:added', function(evt){
            var obj = evt.target;
            if(obj.type == 'path') {
                obj.hasControls = false;
                obj.hasBorders = false;
            }
        });

        canvas.on('mouse:over', function(evt){
            if(isInEraseMode && isMouseLeftButtonDown) {
                evt.target.remove();
            }
        });

        function enterDeletionMode(){
            leaveDrawingMode();

            if(!isInEraseMode) {
                canvas.isDrawingMode = false;
                isInEraseMode = true;
                canvas.selection = false;
                document.querySelector('.ink-erase').style.textShadow = '0 0 5px white';
            }
        }
        function leaveDeletionMode(){
            if (isInEraseMode) {
                isInEraseMode = false;
                canvas.selection = true;
                document.querySelector('.ink-erase').style.textShadow = '';
            }
        }

        canvas.upperCanvasEl.style.position = 'fixed';
        canvas.lowerCanvasEl.style.position = 'fixed';
        canvas.freeDrawingBrush.width = 2;
        if(INK_SHADOW) {
            canvas.freeDrawingBrush.shadow = new fabric.Shadow({blur: 10, offsetX: 1, offsetY: 1, color: INK_SHADOW});
        }
        else{
            canvas.freeDrawingBrush.shadow = null;
        }

        canvas.targetFindTolerance = 3;
        window.addEventListener( 'keydown', function(evt){
            if(evt.keyCode == 17) {
                enterDrawingMode();
            }
            if(evt.keyCode == 16){
                isShiftDown = true;
                enterDeletionMode();
                canvas.selection = false;
            }
        });
        canvas.on( 'mouse:down', function() {
            isMouseLeftButtonDown = true;
        });
        canvas.on( 'mouse:up', function() {
            isMouseLeftButtonDown = false;
        });

        canvas.on( 'selection:cleared', function() {
            if(currentImage){
                currentImage = null;
                currentFormula = '';
                document.querySelector('.ink-formula').style.textShadow = '';
            }
        });

        window.addEventListener( 'keyup', function(evt){
            if(evt.keyCode == 17) {
                canvasElement.dispatchEvent(new MouseEvent('mouseup', {
                    'view': window,
                    'bubbles': true,
                    'cancelable': true
                }));
                leaveDrawingMode();
            }
            if(evt.keyCode == 16) {
                leaveDeletionMode();
            }
            if(evt.keyCode == 46) {
                if(canvas.getActiveGroup()) {
                    canvas.getActiveGroup().getObjects().forEach(function (obj) {
                        obj.remove();
                    });
                }
                if(canvas.getActiveObject()){
                    canvas.getActiveObject().remove();
                }
            }
        });


        window.addEventListener( 'keyup', function(evt){
            if(evt.keyCode == 187) {
                createNewFormulaWithQuery();
            }
        });

        var controls = document.createElement( 'aside' );
		controls.classList.add( 'ink-controls' );

        var colorContols = '';
        if(!PENCIL_COLOR) {
            PENCIL_COLOR = 'rgb(250,250,250)'
            colorContols = '<div class="ink-color ink-control-button" style="color: rgb(250,250,250)"></div>'
            + '<div class="ink-color ink-control-button" style="color: rgb(250,0,0)"></div>'
            + '<div class="ink-color ink-control-button" style="color: rgb(0,250,0)"></div>'
            + '<div class="ink-color ink-control-button" style="color: rgb(0,0,250)"></div>';
        }

		controls.innerHTML =
              colorContols
            + '<div class="ink-pencil ink-control-button"></div>'
            + '<div class="ink-erase ink-control-button"></div>'
            + (FORMULAE_SUPPORT_ENABLED ? '<div class="ink-formula ink-control-button"></div>' : '')
			+ '<div class="ink-clear ink-control-button"></div>'
            + '<div class="ink-hidecanvas ink-control-button"></div>';
		document.body.appendChild( controls );
        function toggleColorChoosers(b) {
            document.querySelectorAll('.ink-color').forEach(function(element){
                element.style.visibility = b ? 'visible' : 'hidden';
            });
        }

        toggleColorChoosers(false);

        document.querySelectorAll('.ink-color').forEach(function(element){
            element.onmousedown = function(event){
                var btn = event.target;
                PENCIL_COLOR = btn.style.color;
                canvas.freeDrawingBrush.color = PENCIL_COLOR;
                if(canvas.isDrawingMode) {
                    document.querySelector('.ink-pencil').style.textShadow = '0 0 10px ' + PENCIL_COLOR;
                }
                btn.style.textShadow = '0 0 20px ' + btn.style.color;
                setTimeout( function(){btn.style.textShadow = '';}, 200 );
            };
        });

        document.querySelector('.ink-pencil').onclick = function(){
            toggleDrawingMode();
        };

        if(FORMULAE_SUPPORT_ENABLED){
            document.querySelector('.ink-formula').onclick = createNewFormulaWithQuery;
        }

        document.querySelector('.ink-clear').onmousedown = function(event){
            var btn = event.target;
            btn.style.textShadow = '0 0 5px white';
            setTimeout( function(){btn.style.textShadow = '';}, 200 );
            canvas.clear();
        };

        document.querySelector('.ink-hidecanvas').onmousedown = function(){
            var cContainer = document.querySelector('.canvas-container');
            if (cContainer.style.display == 'none'){
                document.querySelector('.ink-hidecanvas').style.textShadow = '';
                cContainer.style.display = 'block';
            }
            else{
                cContainer.style.display = 'none';
                document.querySelector('.ink-hidecanvas').style.textShadow = '0 0 1px white';
            }

        };
        Reveal.addEventListener('overviewshown', function (event) {
            document.querySelector('.canvas-container').style.display = 'none';
            document.querySelector('.ink-hidecanvas').style.textShadow = '0 0 1px white';
        });

        document.querySelector('.ink-erase').onclick = function(){
            if (isInEraseMode){
                leaveDeletionMode();
            }
            else{
                enterDeletionMode();
            }
        };

        function toggleDrawingMode() {
            if (canvas.isDrawingMode) {
                leaveDrawingMode();
            }
            else {
                enterDrawingMode();
            }
        }
        function enterDrawingMode(){
            canvas.freeDrawingBrush.color = PENCIL_COLOR;
            canvas.isDrawingMode = true;
            document.querySelector('.ink-pencil').style.textShadow = '0 0 10px ' + PENCIL_COLOR;
            toggleColorChoosers(true);
        }
        function leaveDrawingMode() {
            canvas.isDrawingMode = false;
            document.querySelector('.ink-pencil').style.textShadow = '';
            toggleColorChoosers(false);
        }

        function createNewFormulaWithQuery(){
            document.querySelector('.ink-formula').style.textShadow = '0 0 10px ' + FORMULAE_COLOR;

            var currentFontSize = window.getComputedStyle(Reveal.getCurrentSlide()).fontSize.toString();
            var style = {
                color: FORMULAE_COLOR,
                fontSize: currentFontSize.replace(/^\d+/, (RENDERING_RESOLUTION * parseInt(currentFontSize)).toString())
            };
            createFormulaRenderingDiv(style);
            var formula = prompt('Please enter a formula', currentFormula);
            if(formula && formula.trim()) {
                formula = formula.trim();
                for(var i = 0; i < MATH_MACROS.length; ++i){
                    var from = MATH_MACROS[i][0].replace(/[\\$^[{}()?.*|]/g, function($0){return '\\'+$0});
                    var to = MATH_MACROS[i][1];
                    formula = formula.replace( new RegExp( from, 'g'), to );
                }

                (MATH_RENDERING_ENGINE == 'MathJax' ? renderFormulaToImageMathjax : renderFormulaToImageKatex)(formula, function (img) {
                    img.hasRotatingPoint = false;
                    img.hasBorders = false;
                    img.centeredScaling = true;
                    img.lockUniScaling = true;

                    var positionScale = 1.0 / RENDERING_RESOLUTION;
                    var positionLeft = 10;
                    var positionTop = 10;
                    var positionAngle = 0;
                    if (currentImage) {
                        positionScale = currentImage.getScaleX();
                        positionLeft = currentImage.getLeft();
                        positionTop = currentImage.getTop();
                        positionAngle = currentImage.getAngle();
                        canvas.remove(currentImage);
                    }

                    canvas.add(img.set({
                        left: positionLeft,
                        top: positionTop,
                        angle: positionAngle,
                        scaleX: positionScale,
                        scaleY: positionScale
                    }));
                    if (FORMULAE_SHADOW){
                        img.setShadow(new fabric.Shadow({blur: 10, offsetX: 1, offsetY: 1, color: FORMULAE_SHADOW}));
                    }

                    canvas.setActiveObject(img);

                    img.on('selected', function () {
                        currentFormula = formula;
                        currentImage = img;
                        document.querySelector('.ink-formula').style.textShadow = '0 0 10px ' + FORMULAE_COLOR;
                    });

                    img.trigger('selected');
                });
            }
            document.querySelector('.ink-formula').style.textShadow = '';
        }
    } );

    function createSingletonNode( container, tagname, classname, innerHTML ) {
		var node = document.createElement( tagname );
		node.classList.add( classname );
		if( typeof innerHTML === 'string' ) {
			node.innerHTML = innerHTML;
		}
		container.appendChild( node );
        return node;
	}

    function createFormulaRenderingDiv(style){
        if(formulaRenderingDiv) {
            return formulaRenderingDiv;
        }
        style = style || window.getComputedStyle(document.body);
        var div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.top = div.style.left = '0';
        div.style.opacity = 0;
        div.style.color = style.color;
        div.style.fontSize = style.fontSize;
        document.body.appendChild(div);
        formulaRenderingDiv = div;
        return formulaRenderingDiv;
    }

    function renderFormulaToImageMathjax(formula, callback){
        formula = formula.trim();
        if( MathJax.Hub.getAllJax(formulaRenderingDiv).length == 0 ){
            var jax = document.createElement('script');
            jax.type = 'math/tex';
            formulaRenderingDiv.appendChild(jax);
            MathJax.Hub.Queue(['Process', MathJax.Hub, formulaRenderingDiv]);
        }

        MathJax.Hub.Queue(['Text', MathJax.Hub.getAllJax(formulaRenderingDiv)[0], (DISPLAY_STYLE_MATH ? '\\displaystyle{' : '') + formula + (DISPLAY_STYLE_MATH ? '}' : '')]);

        MathJax.Hub.Queue(function () {
            html2canvas(formulaRenderingDiv, {onrendered: function (newCanvas) {
                callback.call( null, new fabric.Image(newCanvas) );
            }});
        });
    }

    function renderFormulaToImageKatex(formula, callback){
        try {
            katex.render(formula, formulaRenderingDiv, {
                displayMode: DISPLAY_STYLE_MATH,
                throwOnError: true
            });
        }
        catch (error) {
        }

        var whatToRender = formulaRenderingDiv.querySelector('.katex-html');
        if(!whatToRender) {
            document.querySelector('.ink-formula').style.textShadow = '';
            alert('Failed to parse the expression');
            console.log(formulaRenderingDiv);
            return;
        }

        html2canvas(whatToRender, {onrendered: function (newCanvas) {
            callback.call( null, new fabric.Image(newCanvas) );
        }});
    }

    function loadScript( url, callback ) {
        var script = null;
        if( url.match(/\.css[^.]*$/) ){
            script = document.createElement( 'link' );
            script.rel = 'stylesheet';
            script.type = 'text/css';
            script.href = url;
        }
        else if( url.match(/\.js[^.]*$/) ){
            script = document.createElement( 'script' );
            script.type = 'text/javascript';
            script.src = url;
        }
        else if( url.match(/^CSS: /) ){
            script = document.createElement( 'style' );
            script.textContent = url.substring('CSS: '.length);
        }
        else {
            script = document.createElement( 'script' );
            script.type = 'text/javascript';
            script.textContent = url;
        }

        if(script.src || script.href){
            script.onload =  function() {
                if( typeof callback === 'function' ) {
                    callback.call();
                }
            };
            document.querySelector( 'head' ).appendChild( script );
        }
        else {
            document.querySelector( 'head' ).appendChild( script );
            if( typeof callback === 'function' ) {
                callback.call();
            }
        }
	}

	function loadScripts( requirements, callback ) {
        for( url in requirements ) {
            if(requirements[url]) {
                requirements[url] = false;
                return loadScript( url, function(){
                    loadScripts( requirements, callback );
                });
            }
        }
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
    }

    return true;
})();
