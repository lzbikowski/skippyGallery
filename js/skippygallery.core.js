//TODO: Reference with object making it stateful

loading_window = $('#loadingModal')
album_modal = $('#albumModal');
album_inner = $('#albumModal .modal-body');
album_title = $('#albumModal .modal-header h3');

ctrl = $(".slider-control");
ban = $("#albumModal");
ctrl_left = $('.slider-control.left');
ctrl_right = $('.slider-control.right');
ctrl.hide('slow');
hiding = false;

slidingTime_manual = 800;
sliding = false;


SKIPPY = {
	STATUS: {
		UNDEFINED: -1,
		OK: 0,
		LOAD_ERROR: 101
	}
}


OpacitySlide =  {    
    // FIXME: remove global references 
    slide: function (direction, slidingTime) {
    	sliding = true;
    	var $active = $('#skippySlider DIV.active');
    	var $next = null;

    	if ($active.length == 0)
    		$active = $('#skippySlider DIV:last');

    	if (direction == 'prev')
    		$next = $active.prev().length ? $active.prev()
    				: $('#skippySlider DIV:last');
    	else
    		$next = $active.next().length ? $active.next()
    				: $('#skippySlider DIV:first');

    	$active.addClass('last-active');
    	nextimg = $next.find("img");
    	    	
    	//$('#skippySlider').css({width: (nextimg.width+5)+'px', height: (nextimg.height+10)+'px'});
    	//$('.slider-inner').animate({width: (nextimg.width()+5)+'px', height: (nextimg.height()+10)+'px'});
    	$active.css({opacity : 0.0});

    	$next.css({
    		opacity : 0.0,
    	}).addClass('active').animate({
    		opacity : 1.0,
    	}, slidingTime, function() {
    		$active.removeClass('active last-active');
    		sliding = false;
    	});
    	
    	//width = Math.max($active.width(), $next.width());
    	//$('#skippySlider').css({width: width+'px', height: ($next.height())+'px'});

    	album_modal.center();

    }
} // OpacitySlide

$.widget('intecco.skippyGallery', {
    options: {
    	debug: false,
    	showThumbnails: false,
    	reloadTries: 2
    },
    
    ajaxResponseData : null,
    galleryImages: new Array(),
    galleryImagesStatus: new Array(),
    maxWidth: 0,
    maxHeight: 0,
    galleryContent: new Array(),
    galleryTitle: '',
    loadError: false,
    reloadRetryCounter: 0,
    
    
    _create: function () {
        var options = this.options;
        // Initialize options set via HTML5 data-attributes:
        $.extend(options, $(this.element[0].cloneNode(false)).data());
        this._bindAjaxResponse();
    },
    // binds show/hide and sliding-left/right
    _bindControls : function() {
    	ban.on("mouseleave", this._hideControls);
        ban.on("mouseenter", this._showControls);
        // bind left/right slide
        ctrl_left.on("click", this._slidePrev);
        ctrl_right.on("click", this._slideNext);
    },
    
    _bindAjaxResponse : function() {
    	that = this
	    $('a[data-skippy-type=json-album-photos]')
		    .on("ajax:error", function(xhr, status, error) {//that._log(status);that._log(error);
		    })
		    .on('ajax:success', function(event, data, status, xhr) {that._ajaxSuccess(event, data, status, xhr)})
		    .on('ajax:complete', function(xhr, status, error) {album_modal.center()});
    },
    
    _ajaxSuccess: function(event, data, status, xhr) {
    	this.data = data
    	this._prepareGallery()
    	album_modal.modal('show')
    },
    
    // preloads pictures and binds successful/error 
    _preloadImage : function(i, url) {
		this.galleryImages[i] = new Image();
	    $(this.galleryImages[i]).on("load", function(e) {that._onPictureLoadOK(i)})
								.on("error", function(e) {that._onPictureLoadError(i)})
		
		this.galleryImages[i].src = url; // start prelading pictures			

    },
    
    // prepare gallery and executes preload
    _prepareGallery : function() {
    	that = this
		this.galleryTitle = '<h3 style="border: none">'+this.data.title+'</h3>'
		$.each(this.data.images, function(i, photo) {
								if (that._getPictureStatus(i) != SKIPPY.STATUS.OK)
    								that._preloadImage(i,photo.url)
							}
		);
    },
    

    _retryPicturesLoad : function() {
    	for (i=0;i<this.galleryImagesStatus.length;i++) {
    		if (this.galleryImagesStatus[i]==SKIPPY.STATUS.LOAD_ERROR) {
    			this.galleryImagesStatus.splice(i,1);
    			this.galleryImages[i] = new Image();
    			this.galleryImages[i].src = this.data.images[i].url
    		} 
    	} // for
    	this.reloadRetryCounter++
    },
    
    _allPicturesReady : function() {
	    album_title.replaceWith(this.galleryTitle);
		album_inner.replaceWith('<div id="skippySlider" class="modal-body">'+this.galleryContent.join('')+'</div>');

		$('#skippySlider').css({width: (this.maxWidth+50)+'px', height: (this.maxHeight+10)+'px'});
//    	$('#skippySlider').animate({width: (image.width+5)+'px', height: (image.height+10)+'px'})
		
		album_modal.center();
    	this._bindControls();
    },
    
    // verifies statuses when all pictures ready
    _verifyPictures : function() {
		if (this.loadError && this.reloadRetryCounter < this.options.reloadTries) {
	    	this.loadError = false
			this._retryPicturesLoad()
		} else {
			this._log("Pictures ready!")
			this._allPicturesReady()
		}    	
    },
    
    _onPictureLoadOK : function(i) {
    	// set max width/heigh to prepare right window size
    	if (this.galleryImages[i].width > this.maxWidth) this.maxWidth = this.galleryImages[i].width
    	if (this.galleryImages[i].height > this.maxHeight) this.maxHeight = this.galleryImages[i].height
    	
    	this._updatePictureStatus(i, SKIPPY.STATUS.OK)
    	this.galleryContent[i] = i==0 ? '<div class="item active"><img src="'+this.data.images[i].url+'" alt=""/></div>' : '<div class="item"><img src="'+this.data.images[i].url+'"/></div>'
    	this._log("Picture " + i + " loaded")
    	// when pictures loading done verify statuses
    	if (this.galleryImagesStatus.length == this.galleryImages.length)
    		this._verifyPictures()
    },
    _onPictureLoadError : function(i) {
    	this._updatePictureStatus(i, SKIPPY.STATUS.LOAD_ERROR);
    	this.loadError = true
    	this._log("rc:"+this.reloadRetryCounter+this.options.reloadTries)

    	// when pictures loading done verify statuses
    	if (this.galleryImagesStatus.length == this.galleryImages.length)
    		this._verifyPictures()
    },
    
    _updatePictureStatus : function (i, status) {
    	this.galleryImagesStatus[i] = status;
    	return this
    },
    
    _getPictureStatus : function (i) {
    	return this.galleryImagesStatus[i] === undefined ? SKIPPY.STATUS.UNDEFINED : this.galleryImagesStatus[i] 
    },
    
    
    // FIXME: change to jquery queues support
    // hide controls when enter and protect from multiple hiding/showing, run autoslide
    _hideControls : function (evt) {
    	if (ctrl.is(":visible") && !hiding) {
    		hiding = true;
    		ctrl.hide('slow', function() {
    			hiding = false;
    		});
    	}
    },
    // show controls when enter and protects from multiple hiding/showing, disable autoslide
    _showControls : function (evt) {
    	if (ctrl.is(":hidden") || hiding) {
    		ctrl.show('slow', function() {
    			hiding = false;
    		});
    	}
    },
    _slidePrev : function (evt) {
    	if (!sliding)
    		//FIXME: Make customizable for other effects
    		OpacitySlide.slide('prev', slidingTime_manual)
    },

    _slideNext : function (evt) {
    	if (!sliding)
    		//FIXME: Make customizable for other effects
    		OpacitySlide.slide('next', slidingTime_manual)
    },
    _destroy: function () {
    },
    
    _log :function(v) {
    	if (this.options.debug)
    		console.log(v)
    }
})

album_modal.skippyGallery({debug: true})