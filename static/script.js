
wz.app.addScript( 5, 'common', function( win, params ){
	
	var audio = $('audio',win);
	var weemusicTitle = $('.weemusic-info-title',win);
	var weemusicArtist = $('.weemusic-info-artist',win);
	var weemusicAlbum = $('.weemusic-info-album',win);
	var weemusicCover = $('.weemusic-info-cover',win);
	var weemusicCurrentTime = $('.currentTime',win);
	var weemusicTotalTime = $('.totalTime',win);
	var weemusicProgress = $('.weemusic-info-progress',win);
	var weemusicBackprogress = $('.weemusic-info-backprogress',win);
	var weemusicBufferprogress = $('.weemusic-info-buffer',win);
	var weemusicSeeker = $('.weemusic-info-seeker',win);
	var weemusicSeekerWidth = weemusicSeeker.width()/2;
	
	if( params && params.length ){
		
		wz.structure( params[0], function( error, structure ){
			
			audio.append( $('<source></source>').attr('type','audio/mp3').attr('src', structure.formats.mp3.url) );
			audio.append( $('<source></source>').attr('type','audio/ogg').attr('src', structure.formats.ogg.url) );
			
			weemusicTitle.text(structure.meta3.id3.title);
			weemusicArtist.text(structure.meta3.id3.artist);
			weemusicAlbum.text(structure.meta3.id3.album);
			weemusicCover.attr('src',structure.meta3.id3.cover);
			
		});
		
	}
	
	$( win )
	
		.on('click', '.weemusic-controls-play', function(){
			
			if( win.hasClass('play') ){
				audio[0].pause();
			}else{
				audio[0].play();
			}
			
		})
		
		.on('click', '.weemusic-volume-icon', function(){
			
			if( win.hasClass('muted') ){
				audio[0].muted = false;
			}else{
				audio[0].muted = true;
			}
			
		})
		
		.on('click', '.weemusic-controls-rewind', function(){
			
			audio[0].currentTime -= 10;
			
		})
		
		.on('click', '.weemusic-controls-forward', function(){
			
			audio[0].currentTime += 10;
			
		});
	
	audio
	
		.on('play',function(){
			win.addClass('play');
		})
		
		.on('pause',function(){
			win.removeClass('play');
		})
		
		.on('volumechange', function(){
			
			if( this.muted ){
				win.addClass('muted');
			}else{
				win.removeClass('muted');
			}
			
		})
		
		.on('timeupdate', function(e){
			
			var time = this.duration;
			var totalHour = parseInt(time/3600);
			var rem	 = (time%3600);
			var totalMin = parseInt(rem/60);
						
			var time = this.currentTime;
			var hour = parseInt(time/3600);
			var rem	 = (time%3600);
			var min	 = parseInt(rem/60);
			var sec	 = parseInt(rem%60);
			
			if(totalHour > 9 && hour < 10){ hour = '0' + hour}	
			if(totalHour > 0 || (totalMin > 10 && min < 10)){ min  = '0' + min }
			if(sec < 10){ sec  = '0'+sec }
						
			if(totalHour){
				weemusicCurrentTime.text(hour+':'+min+':'+sec);
			}else if(totalMin){
				weemusicCurrentTime.text(min+':'+sec);
			}else{
				weemusicCurrentTime.text('0:'+sec);
			}
			
			var pos = weemusicBackprogress.width()*(this.currentTime/this.duration);

			weemusicProgress.width(pos);

			weemusicSeeker.css('left',pos-weemusicSeekerWidth);
			
		})
		
		.on('durationchange', function(e){
												
			var time = this.duration;
			var hour = parseInt(time/3600);
			var rem	 = (time%3600);
			var min	 = parseInt(rem/60);
			var sec	 = parseInt(rem%60);
		
			if(hour > 0 && min < 10){ min  = '0' + min }
			if(sec < 10){ sec  = '0' + sec }
			
			weemusicBackprogress.animate({'opacity':'1'},250);

			if(9 < hour){
				weemusicCurrentTime.animate({'opacity':'1'},250).text('00:00:00');
				weemusicTotalTime.animate({'opacity':'1'},250).text(hour+':'+min+':'+sec);
			}else if(0 < hour && hour < 10){
				weemusicCurrentTime.animate({'opacity':'1'},250).text('0:00:00');
				weemusicTotalTime.animate({'opacity':'1'},250).text(hour+':'+min+':'+sec);
			}else if(9 < min){
				weemusicCurrentTime.animate({'opacity':'1'},250).text('00:00');
				weemusicTotalTime.animate({'opacity':'1'},250).text(min+':'+sec);
			}else{
				weemusicCurrentTime.animate({'opacity':'1'},250).text('0:00');
				weemusicTotalTime.animate({'opacity':'1'},250).text(min+':'+sec);
			}
		
		})
		
		.on('progress',function(){
						
			try{
				var buffer	= this.buffered.end(0);
			}catch(e){}
			
			var width = (weemusicBackprogress.width()*(buffer/this.duration));
			
			if(width > 0){
				weemusicBufferprogress.animate({width:width},100);
			}
					
		})
		
		.on('ended', function(){
						
			var time = this.duration;
			var hour = parseInt(time/3600);
			weemusicProgress.width(0);
			weemusicSeeker.css('left',9);
			
			if(parseInt(hour)){
				weemusicCurrentTime.text('00:00:00');
			}else{
				weemusicCurrentTime.text('00:00');
			}
			
			this.currentTime = 0;
			this.pause();
						
		});
	
});
