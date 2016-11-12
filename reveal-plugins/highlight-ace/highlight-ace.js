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
	var CLOSE_ACE_ON_BLUR_BY_DEFAULT = options.close_editor_on_blur;
	var MOUSECLICK_MODIFIER = options.mouseclick_modifier_key;
	var ACE_DEFAULT_FONT_SIZE = options.editor_default_font_size || '14pt';
	var CODE_ELEMENTS_CSS_QUERY = options.css_query || 'pre code';

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
				maxLines: Infinity,
				trim: element.hasAttribute( 'data-trim' ),
				fontSize: codeElement['data-ace-font-size'] || ACE_DEFAULT_FONT_SIZE
			});
		}

		function destroyEditor(editor) {
			editor.container.style.transition = '0.4s ease';
			editor.container.style.opacity = 0;
			setTimeout(function () {
				if(editor.container.parentNode){
					editor.container.parentNode.removeChild(editor.container);
				}
				editor.destroy();
			}, 400);
		}
		function destroyEditorSavingChanges(editor) {
			editor.originalCodeElement.textContent = editor.getValue();
			editor.originalCodeElement.setAttribute('data-raw-code', editor.getValue());
			doStaticHighlight(editor.originalCodeElement);
			Reveal.layout();
			destroyEditor(editor);
		}

		ace.require('ace/commands/default_commands').commands.push({
			name: 'Return to slideshow discarding changes',
			bindKey: 'Esc',
			exec: destroyEditor
		});
		ace.require('ace/commands/default_commands').commands.push({
			name: 'Return to slideshow saving changes',
			bindKey: 'Ctrl+Enter',
			exec: destroyEditorSavingChanges
		});

		codeElement.setAttribute('data-raw-code', codeElement.textContent);
		doStaticHighlight(codeElement);

		if(codeElement.contentEditable && codeElement.contentEditable !== 'inherit') {
			codeElement.contentEditable = 'false';

			codeElement.onclick = function (event) {
				if( MOUSECLICK_MODIFIER && !event[MOUSECLICK_MODIFIER+'Key']) {
					return;
				}
				var editor = null;
				var editorDiv = document.createElement('div');
				editorDiv.style.position = 'fixed';
				editorDiv.style.opacity = 0;

				if(codeElement.hasAttribute('data-editor-inplace') || EDITOR_IN_PLACE_BY_DEFAULT) {
					var rect = codeElement.getBoundingClientRect();
					editorDiv.style.height = rect.height + 'px';
					editorDiv.style.width = rect.width + 'px';
					editorDiv.style.top = rect.top + 'px';
					editorDiv.style.left = rect.left + 'px';
				}
				else {
					editorDiv = document.createElement('div');
					editorDiv.style.width = '100%';
					editorDiv.style.height = '100%';
					editorDiv.style.left = '0px';
					editorDiv.style.top = '0px';
				}

				editorDiv.style.zIndex = window.getComputedStyle(Reveal.getCurrentSlide()).zIndex + 1;
				document.body.appendChild(editorDiv);

				editor = ace.edit(editorDiv);
				editor.commands.removeCommands(["gotoline", "find"]);

				editor.isInPlace = codeElement.hasAttribute('data-editor-inplace') || EDITOR_IN_PLACE_BY_DEFAULT;
				editor.$blockScrolling = Infinity; // To disable annoying ACE warning
				var value = codeElement.hasAttribute('data-raw-code') ? codeElement.getAttribute('data-raw-code') : codeElement.textContent;
				if (codeElement.hasAttribute( 'data-trim' )) {
					value = value.trim();
				}
				editor.setValue(value);
				editor.setOptions({
					theme: aceTheme,
					mode: aceMode,
					wrap: true,
					showGutter: true,
					fadeFoldWidgets: false,
					showPrintMargin: false,
					fontSize: codeElement['data-ace-font-size'] || ACE_DEFAULT_FONT_SIZE
				});

				editor.originalCodeElement = codeElement;
				editor.focus();
				if(CLOSE_ACE_ON_BLUR_BY_DEFAULT){
					editor.on('blur', function(){destroyEditor(editor)});
				}
				Reveal.addEventListener('slidechanged', function(){destroyEditor(editor)});
				Reveal.addEventListener('overviewshown', function(){destroyEditor(editor)});
				editor.resize();
				editor.gotoLine(1);
				editorDiv.style.transition = '0.5s ease';
				editorDiv.style.opacity = 1;
			}
		}
	}

	function loadScript( url, callback ) {
		var head = document.querySelector( 'head' );
		var script = document.createElement( 'script' );
		script.type = 'text/javascript';
		script.src = url;

		script.onload = function() {
			callback.call();
			callback = null;
		};

		head.appendChild( script );
	}

	loadScript(ACE_URL, function(){ loadScript(ACE_HIGHLIGHT_URL, function(){
		var hl_nodes = document.querySelectorAll(CODE_ELEMENTS_CSS_QUERY);

		for( var i = 0, len = hl_nodes.length; i < len; i++ ) {
			attachAce(hl_nodes[i]);
		}
	})});

	return true;
})();