/*
    Inking plugin for reveal.js
    Relies heavily on fabric.js framework
    Plugin author: Alex Dainiak
    Web: https://github.com/dainiak
    Email: dainiak@gmail.com
 */

var RevealInking = window.RevealInking || (function (){
    var link = document.createElement( 'link' );
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = '../reveal-plugins/inking/inking.css';
    document.getElementsByTagName( 'head' )[0].appendChild( link );

    var currentFormula = '';
    var currentImage = null;
    var formulaeRenderingResolution = 1;
    var canvasAboveControls = true;
    var drawShadows = true;
    var pencilColor = 'rgb(250,0,0)';
    var formulaeColor = 'rgb(250,250,250)';
    var isInDrawMode = false;
    var isInEraseMode = false;
    var isMouseLeftButtonDown = false;
    var isShiftDown = false;

    var pathToFabric = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/1.6.6/fabric.min.js';

    loadScript(pathToFabric, function () {
        var viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        var viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        var bottomPadding = 0;
        if (canvasAboveControls){
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


        canvas.on('object:added', function(e){
            var obj = e.target;
            if(obj.type == 'path') {
                obj.hasControls = false;
                obj.hasBorders = false;
                if (drawShadows){
                    obj.setShadow({
                        color: 'rgb(50,0,0)',
                        blur: 10
                    });
                }
            }
        });

        canvas.on('mouse:over', function(e){
            if(isInEraseMode && isMouseLeftButtonDown) {
                e.target.remove();
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
                if(isInDrawMode){
                    canvas.isDrawingMode = true;
                }
                isInEraseMode = false;
                canvas.selection = true;
                document.querySelector('.ink-erase').style.textShadow = '';
            }
        }

        canvas.upperCanvasEl.style.position = 'fixed';
        canvas.lowerCanvasEl.style.position = 'fixed';
        canvas.freeDrawingBrush.color = pencilColor;
        canvas.freeDrawingBrush.width = 2;
        canvas.targetFindTolerance = 3;
        window.addEventListener( 'keydown', function(e){
            if(e.keyCode == 17) {
                enterDrawingMode();
            }
            if(e.keyCode == 16){
                isShiftDown = true;
                enterDeletionMode();
                canvas.selection = false;
            }
        });
        canvas.on( 'mouse:down', function(e) {
            isMouseLeftButtonDown = true;
        });
        canvas.on( 'mouse:up', function(e) {
            isMouseLeftButtonDown = false;
        });

        canvas.on( 'selection:cleared', function(e) {
            if(currentImage){
                currentImage = null;
                document.querySelector('.ink-formula').style.textShadow = '';
            }
        });

        window.addEventListener( 'keyup', function(e){
            if(e.keyCode == 17) {
                leaveDrawingMode();
            }
            if(e.keyCode == 16) {
                leaveDeletionMode();
            }
            if(e.keyCode == 46) {
                if(canvas.getActiveGroup()) {
                    canvas.getActiveGroup().getObjects().forEach(function (o) {
                        o.remove();
                    });
                }
                if(canvas.getActiveObject()){
                    canvas.getActiveObject().remove();
                }
            }
        });


        window.addEventListener( 'keyup', function(e){
            if(e.keyCode == 187) {
                createNewFormulaWithQuery();
            }
        });

        var controls = createSingletonNode(document.body, 'aside', 'ink-controls',
            '<div class="ink-pencil"></div>' +
            '<div class="ink-erase"></div>' +
			'<div class="ink-formula"></div>' +
			'<div class="ink-clear"></div>' +
            '<div class="ink-hidecanvas"></div>');

        document.querySelector('.ink-pencil').onclick = function(){
            toggleDrawingMode();
        };

        document.querySelector('.ink-formula').onclick = createNewFormulaWithQuery;

        document.querySelector('.ink-clear').onclick = function(){
            canvas.clear();
        };

        document.querySelector('.ink-hidecanvas').onclick = function(){
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
                canvas.isDrawingMode = true;
                document.querySelector('.ink-pencil').style.textShadow = '0 0 5px ' + pencilColor;
        }
        function leaveDrawingMode() {
                canvas.isDrawingMode = false;
                document.querySelector('.ink-pencil').style.textShadow = '';
        }

        function createNewFormulaWithQuery(){
            document.querySelector('.ink-formula').style.textShadow = '0 0 5px ' + formulaeColor;

            var currentFontSize = window.getComputedStyle(Reveal.getCurrentSlide()).fontSize.toString();
            var style = {
                color: formulaeColor,
                fontSize: currentFontSize.replace(/^\d+/, (formulaeRenderingResolution * parseInt(currentFontSize)).toString())
            };
            var formula = prompt('Please enter a formula', currentFormula);
            if(formula) {
                renderFormulaToImageKatex(formula, style, function (img) {
                    img.hasRotatingPoint = false;
                    img.hasBorders = false;
                    img.preserveAspectRatio = true;
                    /*if (drawShadows) {
                        img.setShadow({
                            color: 'rgb(50,0,0)',
                            blur: 10
                        });
                    }*/

                    var positionScale = 1 / formulaeRenderingResolution;
                    var positionLeft = 0;
                    var positionTop = 0;
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

                    canvas.setActiveObject(img);

                    img.on('selected', function (event) {
                        currentFormula = formula;
                        currentImage = img;
                        document.querySelector('.ink-formula').style.textShadow = '0 0 1px ' + formulaeColor;
                    });
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

    function createTemporaryDivUsingStyle(style){
        style = style || window.getComputedStyle(document.body);
        var div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.top = div.style.left = '0';
        div.style.opacity = 0;
        div.style.color = style.color;
        div.style.fontSize = style.fontSize;
        return div;
    }

    function renderFormulaToImageMathjax(formula, style, callback){
        var tempMathDiv = createTemporaryDivUsingStyle(style);
        document.body.appendChild(tempMathDiv);
        tempMathDiv.textContent = '\\(' + formula + '\\)';
        MathJax.Hub.Queue(['Typeset', MathJax.Hub, tempMathDiv]);
        MathJax.Hub.Queue(function () {
            html2canvas(tempMathDiv, {onrendered: function (newCanvas) {
                document.body.removeChild(tempMathDiv);
                callback.call( null, new fabric.Image(newCanvas) );
            }});
        });
    }

    function renderFormulaToImageKatex(formula, style, callback){
        var tempMathDiv = createTemporaryDivUsingStyle(style);
        document.body.appendChild(tempMathDiv);
        katex.render(formula, tempMathDiv);
        html2canvas(tempMathDiv, {onrendered: function (newCanvas) {
            document.body.removeChild(tempMathDiv);
            callback.call( null, new fabric.Image(newCanvas) );
        }});
    }

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
