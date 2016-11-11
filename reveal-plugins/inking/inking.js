/*
    Inking plugin for reveal.js

    Plugin author: Alex Dainiak, Assoc. Prof. at Moscow Institute of Physics and Technology: https://mipt.ru/english/
    Web: wwww.dainiak.com
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
    var RENDERING_RESOLUTION = options.renderingResolution || 1;
    var CANVAS_ABOVE_CONTROLS = !!(options.canvasAboveControls);
    var CONTROLS_COLOR = options.controlsColor;
    var INK_COLOR = options.inkColor;
    var INK_SHADOW = options.inkShadow !== undefined ? options.inkShadow : 'rgb(50,50,50)';
    var MATH_COLOR = options.mathColor || 'rgb(250,250,250)';
    var MATH_SHADOW = options.mathShadow;
    var DISPLAY_STYLE_MATH = options.mathDisplayStyle !== false;
    var MATH_RENDERING_ENGINE = options.mathRenderer || 'MathJax';
    var FORMULAE_SUPPORT_ENABLED = options.math !== false;
    var MATH_MACROS = options.mathMacros || [];

    var currentFormula = '';
    var currentImage = null;
    var isInEraseMode = false;
    var isMouseLeftButtonDown = false;
    var isShiftDown = false;
    var formulaRenderingDiv = null;

    var scriptsToLoad = [
        {
            content: '.ink-controls {position: fixed;bottom: 10px;right: 200px;cursor: default;'
                + (CONTROLS_COLOR ? 'color:' + CONTROLS_COLOR + ';' : '')
                + 'z-index: 130;}'
                + '.ink-control-button {float: left;display: inline;font-size: 20pt;padding-left: 10pt; padding-right: 10pt;}'
                + '.ink-color:before {content: "\u25A0"} .ink-pencil:before {content: "\u270E"} '
                + '.ink-erase:before {content: "\u2421"} .ink-formula:before {content: "\u2211"} '
                + '.ink-clear:before {content: "\u239A"} .ink-hidecanvas:before {content: "\u22A0"}',
            type: 'text/css'
        }, {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/1.6.6/fabric.min.js',
            condition: !window.fabric
        }, {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/0.5.0-beta4/html2canvas.js',
            condition: FORMULAE_SUPPORT_ENABLED && !window.html2canvas
        }, {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.6.0/katex.min.js',
            condition: FORMULAE_SUPPORT_ENABLED && MATH_RENDERING_ENGINE == 'KaTeX' && !window.katex
        }, {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.6.0/katex.min.css',
            condition: FORMULAE_SUPPORT_ENABLED && MATH_RENDERING_ENGINE == 'KaTeX' && !window.katex
        }, {
            type: 'text/x-mathjax-config',
            content: options.mathjaxConfig ||
                "MathJax.Ajax.config.path['Contrib'] = 'https://cdn.mathjax.org/mathjax/contrib';"
                + "MathJax.Hub.Config({"
                + "skipStartupTypeset: true, messageStyle: 'none', showMathMenu: false, showMathMenuMSIE: false, showProcessingMessages: false,"
                + "extensions: ['tex2jax.js'],"
                + "jax: ['input/TeX', 'output/HTML-CSS'],"
                + "tex2jax: {preview: 'none'},"
                + "TeX: { extensions: ['AMSmath.js','AMSsymbols.js','noUndefined.js']}" +
                + "});",
            condition: FORMULAE_SUPPORT_ENABLED && MATH_RENDERING_ENGINE == 'MathJax' && !window.MathJax
        }, {
            url: 'https://cdn.mathjax.org/mathjax/latest/MathJax.js',
            condition: FORMULAE_SUPPORT_ENABLED && MATH_RENDERING_ENGINE == 'MathJax' && !window.MathJax
        }
    ];

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
        if(!INK_COLOR) {
            INK_COLOR = 'rgb(250,250,250);rgb(250,0,0);rgb(0,250,0);rgb(0,0,250)';
        }
        if(INK_COLOR.indexOf(';') >= 0) {
            var colors = INK_COLOR.trim().split(';');
            for(var i = 0; i < colors.length; ++i){
                colors[i] = colors[i].trim();
                if(colors[i]) {
                    colorContols += '<div class="ink-color ink-control-button" style="color: ' + colors[i] + '"></div>';
                }
            }
            INK_COLOR = colors[0];
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
            Array.prototype.forEach.call(document.querySelectorAll('.ink-color'), function(element){
                element.style.visibility = b ? 'visible' : 'hidden';
            });
        }

        toggleColorChoosers(false);
        document.querySelector('.canvas-container').oncontextmenu = function(){return false};

        Array.prototype.forEach.call(document.querySelectorAll('.ink-color'), function(element){
            element.onmousedown = function(event){
                var btn = event.target;
                INK_COLOR = btn.style.color;
                canvas.freeDrawingBrush.color = INK_COLOR;
                if(canvas.isDrawingMode) {
                    document.querySelector('.ink-pencil').style.textShadow = '0 0 10px ' + INK_COLOR;
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
            canvas.freeDrawingBrush.color = INK_COLOR;
            canvas.isDrawingMode = true;
            document.querySelector('.ink-pencil').style.textShadow = '0 0 10px ' + INK_COLOR;
            toggleColorChoosers(true);
        }
        function leaveDrawingMode() {
            canvas.isDrawingMode = false;
            document.querySelector('.ink-pencil').style.textShadow = '';
            toggleColorChoosers(false);
        }

        function createNewFormulaWithQuery(){
            document.querySelector('.ink-formula').style.textShadow = '0 0 10px ' + MATH_COLOR;

            if(!formulaRenderingDiv) {
                formulaRenderingDiv = document.createElement('div');
                formulaRenderingDiv.style.position = 'fixed';
                formulaRenderingDiv.style.top = formulaRenderingDiv.style.left = '0';
                formulaRenderingDiv.style.opacity = 0;
                formulaRenderingDiv.style.color = MATH_COLOR;
                document.body.appendChild(formulaRenderingDiv);
            }

            var currentFontSize = window.getComputedStyle(Reveal.getCurrentSlide()).fontSize.toString();
            formulaRenderingDiv.style.fontSize = currentFontSize.replace(/^\d+/, (RENDERING_RESOLUTION * parseInt(currentFontSize)).toString());

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
                    if (MATH_SHADOW){
                        img.setShadow(new fabric.Shadow({blur: 10, offsetX: 1, offsetY: 1, color: MATH_SHADOW}));
                    }
                    else if(MATH_SHADOW === undefined){
                        img.setShadow(new fabric.Shadow({blur: 1, offsetX: 0, offsetY: 0, color: MATH_COLOR}));
                    }

                    canvas.setActiveObject(img);

                    img.on('selected', function () {
                        currentFormula = formula;
                        currentImage = img;
                        document.querySelector('.ink-formula').style.textShadow = '0 0 10px ' + MATH_COLOR;
                    });

                    img.trigger('selected');
                });
            }
            document.querySelector('.ink-formula').style.textShadow = '';
        }
    } );

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