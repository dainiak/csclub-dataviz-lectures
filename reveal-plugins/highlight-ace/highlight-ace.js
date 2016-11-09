/*
    Reveal.js alternative highlighting plugin based on ACE editor
    Author: Alex Dainiak
    Web: www.dainiak.com
    Email: dainiak@gmail.com
 */

var RevealHighlight = (function() {
	var options = Reveal.getConfig().highlighting || {};
	var ACE_DEFAULT_THEME = options.theme || 'twilight';
	var ACE_DEFAULT_LANGUAGE = options.language || 'python';
	var ACE_URL = options.ace_main_url || 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.5/ace.js';
	var ACE_HIGHLIGHT_URL = options.ace_static_highlighter_url || 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.5/ext-static_highlight.js';
	var EDITOR_IN_PLACE_BY_DEFAULT = options.editor_in_place !== false;
	var CLOSE_ACE_ON_BLUR_BY_DEFAULT =
		Reveal.getConfig().highlighting && Reveal.getConfig().highlighting.close_editor_on_blur ?
				Reveal.getConfig().highlighting.close_editor_on_blur
				: false;
	var MOUSECLICK_MODIFIER =
		Reveal.getConfig().highlighting && Reveal.getConfig().highlighting.mouseclick_modifier_key ?
				Reveal.getConfig().highlighting.mouseclick_modifier_key
				: null;
	var ACE_DEFAULT_FONT_SIZE =
		Reveal.getConfig().highlighting && Reveal.getConfig().highlighting.editor_default_font_size ?
				Reveal.getConfig().highlighting.editor_default_font_size
				: '14pt';

	function loadScript( url, callback ) {
		var head = document.querySelector( 'head' );
		var script = document.createElement( 'script' );
		script.type = 'text/javascript';
		script.src = url;

		// Wrapper for callback to make sure it only fires once
		var finish = function() {
			if( typeof callback === 'function' ) {
				callback.call();
				callback = null;
			}
		}

		script.onload = finish;
		head.appendChild( script );
	}

	function attachAce(codeElement) {
		var aceTheme = 'ace/theme/' + (codeElement.hasAttribute('data-theme') ? codeElement.getAttribute('data-theme') : ACE_DEFAULT_THEME);
		var aceMode = 'ace/mode/' + (codeElement.hasAttribute('data-language') ? codeElement.getAttribute('data-language') : ACE_DEFAULT_LANGUAGE);
		var highlight = ace.require('ace/ext/static_highlight');
		function doStaticHighlight(element) {
				highlight(element, {
				mode: aceMode,
				theme: aceTheme,
				startLineNumber: 1,
				showGutter: true,
				showPrintMargin: false,
				trim: element.hasAttribute( 'data-trim' )
			});
		}

		function destroyEditorDiscardChanges(editor) {
			editor.container.style.transition = '0.4s ease';
			editor.container.style.opacity = 0;
			setTimeout(function () {
				if(editor.container.parentNode){
					editor.container.parentNode.removeChild(editor.container);
				}
			}, 500);
		}
		function destroyEditor(editor) {
			editor.originalCodeElement.textContent = editor.getValue();
			editor.originalCodeElement.setAttribute('data-raw-code', editor.getValue());
			doStaticHighlight(editor.originalCodeElement);
			destroyEditorDiscardChanges(editor);
		}

		codeElement.setAttribute('data-raw-code', codeElement.textContent);
		doStaticHighlight(codeElement);

		if(codeElement.contentEditable && codeElement.contentEditable !== 'inherit') {
			codeElement.contentEditable = 'false';
			ace.require('ace/commands/default_commands').commands.push({
				name: 'Return to slideshow discarding changes',
				bindKey: 'Esc',
				exec: destroyEditorDiscardChanges
			});
			codeElement.onclick = function (event) {
				if( MOUSECLICK_MODIFIER && !event[MOUSECLICK_MODIFIER+'Key']) {
					return;
				}

				var editorDiv = document.createElement('div');
				var revealScale = Reveal.getScale();
				var bounds = codeElement.getBoundingClientRect();
				editorDiv.style.position = 'fixed';
				editorDiv.style.zIndex = editorDiv.style.zIndex + 1;
				if(codeElement.hasAttribute('data-editor-inplace') || EDITOR_IN_PLACE_BY_DEFAULT){
					editorDiv.style.width = Math.ceil(revealScale * bounds.width).toString() + 'px';
					editorDiv.style.height = Math.ceil(revealScale * bounds.height).toString() + 'px';
					editorDiv.style.left  = Math.floor(revealScale * bounds.left).toString() + 'px';
					editorDiv.style.top = Math.floor(revealScale * bounds.top).toString() + 'px';
				}
				else{
					editorDiv.style.width = '100%';
					editorDiv.style.height = '100%';
					editorDiv.style.left = '0px';
					editorDiv.style.top = '0px';
				}

				editorDiv.style.opacity = 0;
				document.body.appendChild(editorDiv);
				var editor = ace.edit(editorDiv);
				editor.$blockScrolling = Infinity; // To disable annoying ACE warning
				var value = codeElement.hasAttribute('data-raw-code') ? codeElement.getAttribute('data-raw-code') : codeElement.textContent;
				if (codeElement.hasAttribute( 'data-trim' )) {
					value = value.trim();
				}
				editor.setValue(value);
				editor.setFontSize(codeElement['data-ace-font-size'] || ACE_DEFAULT_FONT_SIZE);
				editor.setOptions({
					theme: aceTheme,
					mode: aceMode,
					wrap: true,
					showGutter: true,
					fadeFoldWidgets: false,
					showPrintMargin: false
				});
				editor.resize();
				editor.originalCodeElement = codeElement;
				editor.focus();
				if(CLOSE_ACE_ON_BLUR_BY_DEFAULT){
					editor.on('blur', function(){destroyEditor(editor)});
				}
				Reveal.addEventListener('slidechanged', function(){destroyEditor(editor)});
				Reveal.addEventListener('overviewshown', function(){destroyEditor(editor)});
				editor.gotoLine(1);
				editorDiv.style.transition = '0.5s ease';
				editorDiv.style.opacity = 1;
			}
		}
	}

	loadScript(ACE_URL, function(){ loadScript(ACE_HIGHLIGHT_URL,function(){
		if( typeof window.addEventListener === 'function' ) {
			var hl_nodes = document.querySelectorAll( 'pre code' );

			for( var i = 0, len = hl_nodes.length; i < len; i++ ) {
				attachAce(hl_nodes[i]);
			}
		}
	})});
})();