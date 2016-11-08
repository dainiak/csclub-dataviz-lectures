/*
    Reveal.js easy fragment toggling plugin
    Author: Alex Dainiak
    Web: www.dainiak.com
    Email: dainiak@gmail.com
 */

var RevealFragKey = (function() {
	/*
		Copy of Reveal dispatchEvent code:
	 */
	function dispatchEvent( type, fragment ) {
		var event = document.createEvent( 'HTMLEvents', 1, 2 );
		event.initEvent( type, true, true );
		event.fragment = fragment;
		document.querySelector( '.reveal' ).dispatchEvent( event );

		// If we're in an iframe, post each reveal.js event to the
		// parent window. Used by the notes plugin
		if( Reveal.getConfig().postMessageEvents && window.parent !== window.self ) {
			window.parent.postMessage( JSON.stringify({ namespace: 'reveal', eventName: type, state: Reveal.getState() }), '*' );
		}
	}


	var DISPATCH_EVENTS = false;
	const KEYCODE_EQ = 187;
	const KEYCODE_DASH = 189;
	const KEYCODE_0 = 48;
	const KEYCODE_9 = 57;

	var waitForNavigation = false;
	document.addEventListener('keydown', function(event){
		if( document.querySelector( ':focus' ) !== null
			|| event.shiftKey || event.altKey || event.ctrlKey || event.metaKey )
			return;

		if(event.keyCode >= KEYCODE_0 && event.keyCode <= KEYCODE_9){
			event.preventDefault();
			var i = event.keyCode - KEYCODE_0;
			if(waitForNavigation){
				Reveal.navigateFragment(i);
				waitForNavigation = false;
			}
			else {
				var frag = Reveal.getCurrentSlide().querySelector('.fragment[data-fragment-index="' + i.toString() + '"]');
				if (frag) {
					var isVisible = frag.classList.toggle('visible');

					if (DISPATCH_EVENTS) {
						if (isVisible) {
							dispatchEvent('fragmentshown', frag);
						}
						else {
							dispatchEvent('fragmenthidden', frag);
						}
					}
				}
			}
		}
		else if(event.keyCode == KEYCODE_EQ){
			event.preventDefault();
			waitForNavigation = true;
		}
		else if(event.keyCode == KEYCODE_DASH){
			event.preventDefault();
			Reveal.navigateFragment(-1);
			waitForNavigation = false;
		}
	}, false);
})();