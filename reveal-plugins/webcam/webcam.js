/*
    Live webcam picture-in-picture plugin for reveal.js.
    Inspired by: http://vxlabs.com/2013/10/11/impress-js-with-embedded-live-webcam/
    Plugin author: Alex Dainiak
    Web: https://github.com/dainiak
    Email: dainiak@gmail.com
 */

(function() {
    var FULLSCREEN_VIDEO_HORIZONTAL_PADDING =
		Reveal.getConfig().webcam && Reveal.getConfig().webcam.fullscreen_horizontal_padding ?
			Reveal.getConfig().webcam.fullscreen_horizontal_padding
		:
			20;
    var FULLSCREEN_VIDEO_VERTICAL_PADDING =
		Reveal.getConfig().webcam && Reveal.getConfig().webcam.fullscreen_vertical_padding ?
			Reveal.getConfig().webcam.fullscreen_vertical_padding
		:
			20;
    var FULLSCREEN_VIDEO_OPACITY =
		Reveal.getConfig().webcam && Reveal.getConfig().webcam.fullscreen_opacity ?
			Reveal.getConfig().webcam.fullscreen_opacity
		:
			1.0;
    var SHRINK_ON_OVERVIEW =
		Reveal.getConfig().webcam && Reveal.getConfig().webcam.shrink_on_overview ?
			Reveal.getConfig().webcam.shrink_on_overview
		:
			true;

    const KEYCODE_C = 67;
    var currentlyFullscreen = false;
    var currentlyHidden = false;

    function shrinkWebcamVideo(videoElement) {
        if (!currentlyHidden && videoElement.hasAttribute('data-webcam-old-opacity'))
            videoElement.style.opacity = videoElement.getAttribute('data-webcam-old-opacity');
        if (videoElement.hasAttribute('data-webcam-old-left'))
            videoElement.style.left = videoElement.getAttribute('data-webcam-old-left');
        if (videoElement.hasAttribute('data-webcam-old-right'))
            videoElement.style.right = videoElement.getAttribute('data-webcam-old-right');
        if (videoElement.hasAttribute('data-webcam-old-top'))
            videoElement.style.top = videoElement.getAttribute('data-webcam-old-top');
        if (videoElement.hasAttribute('data-webcam-old-bottom'))
            videoElement.style.bottom = videoElement.getAttribute('data-webcam-old-bottom');
        if (videoElement.hasAttribute('data-webcam-old-width'))
            videoElement.style.width = videoElement.getAttribute('data-webcam-old-width');
        if (videoElement.hasAttribute('data-webcam-old-height'))
            videoElement.style.height = videoElement.getAttribute('data-webcam-old-height');
    }

    function expandWebcamVideo(videoElement) {
        var viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        var viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

        var videoHeight = videoElement.videoHeight;
        var videoWidth = videoElement.videoWidth;
        // If video size is completely specified by user take this as canonical video dimensions
        if(videoElement.style.width && videoElement.style.height){
            videoHeight = parseInt(videoElement.style.height);
            videoWidth = parseInt(videoElement.style.width);
        }

        var hRatio = (videoHeight + 2 * FULLSCREEN_VIDEO_VERTICAL_PADDING) / viewportHeight;
        var wRatio = (videoWidth + 2 * FULLSCREEN_VIDEO_HORIZONTAL_PADDING) / viewportWidth;

        if(!currentlyHidden) {
            if (!videoElement.hasAttribute('data-webcam-old-opacity')) {
                videoElement.setAttribute('data-webcam-old-opacity', videoElement.style.opacity);
            }
            videoElement.style.opacity = FULLSCREEN_VIDEO_OPACITY;
        }

        var newVideoWidth, newVideoHeight, horizontalPadding, verticalPadding;
        if (wRatio > hRatio) {
            newVideoWidth = Math.round(viewportWidth - 2 * FULLSCREEN_VIDEO_HORIZONTAL_PADDING);
            newVideoHeight = Math.round(newVideoWidth * videoHeight/videoWidth);
            horizontalPadding = FULLSCREEN_VIDEO_HORIZONTAL_PADDING;
            verticalPadding = Math.round(0.5 * (viewportHeight - newVideoHeight));
        }
        else{
            newVideoHeight = Math.round(viewportHeight - 2 * FULLSCREEN_VIDEO_VERTICAL_PADDING);
            newVideoWidth = Math.round(newVideoHeight * videoWidth / videoHeight);
            horizontalPadding = Math.round(0.5 * (viewportWidth - newVideoWidth));
            verticalPadding = FULLSCREEN_VIDEO_VERTICAL_PADDING;
        }

        if (videoElement.style.height) {
            videoElement.setAttribute('data-webcam-old-height', videoElement.style.height);
            videoElement.style.height = newVideoHeight.toString() + 'px';
        }
        if (videoElement.style.width) {
            videoElement.setAttribute('data-webcam-old-width', videoElement.style.width);
            videoElement.style.width = newVideoWidth.toString() + 'px';
        }
        if (videoElement.style.top) {
            videoElement.setAttribute('data-webcam-old-top', videoElement.style.top);
            videoElement.style.top = verticalPadding.toString() + 'px';
        }
        else {
            videoElement.setAttribute('data-webcam-old-bottom', videoElement.style.bottom);
            videoElement.style.bottom = verticalPadding.toString() + 'px';
        }
        if (videoElement.style.left) {
            videoElement.setAttribute('data-webcam-old-left', videoElement.style.left);
            videoElement.style.left = horizontalPadding.toString() + 'px';
        }
        else {
            videoElement.setAttribute('data-webcam-old-right', videoElement.style.right);
            videoElement.style.right = horizontalPadding.toString() + 'px';
        }
    }

    Reveal.addEventListener('ready', function (event) {
        navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia );
        if (navigator.getUserMedia) {
            navigator.getUserMedia(
                {video: true},
                function (localMediaStream) {
                    var url = window.URL.createObjectURL(localMediaStream);

                    //Attach webcam stream to all videos with webcam class
                    var webcam_containers = document.querySelectorAll('video.webcam');
                    for (var i = 0; i < webcam_containers.length; ++i) {
                        webcam_containers[i].src = url;
                        webcam_containers[i].setAttribute('autoplay', true);
                        webcam_containers[i].setAttribute('data-autoplay', true);
                    }

                    //Create permanent webcam
                    var permanentCam = document.querySelector('video.webcam.permanent');
                    if (permanentCam){
                        permanentCam.src = url;
                        permanentCam.setAttribute('autoplay', 'true');
                        if(SHRINK_ON_OVERVIEW) {
                            Reveal.addEventListener('overviewshown', function (event) {
                                if (currentlyFullscreen && !currentlyHidden) {
                                    shrinkWebcamVideo(permanentCam);
                                    currentlyFullscreen = false;
                                }
                            });
                        }

                        window.addEventListener( 'keydown', function( event ) {
                            if ( document.querySelector( ':focus' ) !== null || event.altKey || event.ctrlKey || event.metaKey )
                                return;

                            if( event.keyCode === KEYCODE_C ) {
                                event.preventDefault();

                                if(event.shiftKey){
                                    if (currentlyFullscreen) {
                                        shrinkWebcamVideo(permanentCam);
                                        currentlyFullscreen = false;
                                    }
                                    else {
                                        expandWebcamVideo(permanentCam);
                                        currentlyFullscreen = true;
                                    }
                                }
                                else{
                                    if(!currentlyHidden){
                                        if(!permanentCam.hasAttribute('data-webcam-old-opacity')){
                                            permanentCam.setAttribute('data-webcam-old-opacity', permanentCam.style.opacity);
                                        }

                                        permanentCam.style.opacity = 0;
                                        currentlyHidden = true;
                                    }
                                    else{
                                        if(currentlyFullscreen)
                                            permanentCam.style.opacity = FULLSCREEN_VIDEO_OPACITY;
                                        else
                                            permanentCam.style.opacity = permanentCam.getAttribute('data-webcam-old-opacity');

                                        currentlyHidden = false;
                                    }
                                }
                            }
                        }, false );
                    }
                },
                function (err) {
                    console.log(err);
                    alert('Unable to open webcam: ' + err.name + ', ' + err.message);
                }
            );
        } else {
            alert("Couldn't retrieve webcam video: feature unsupported by your browser");
        }
    });
})();