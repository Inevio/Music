$('.wz-app-9')

.on('wz-new-window',function(){
	
	var audio			= $('audio',this);
	var audioAppArea	= $(this).children('.wz-app-area');
	var audioControls	= audioAppArea.children('.weemusic-controls');
	var audioCurrent	= audioControls.children('.weemusic-current');
	var audioTotal		= audioControls.children('.weemusic-total');
	
	var audioBackprogress	= audioControls.children('.weemusic-backprogress');
	var audioBufferprogress	= audioBackprogress.children('.weemusic-bufferprogress');
	var audioSeeker			= audioBackprogress.children('.weemusic-seeker');
	var audioProgress		= audioBackprogress.children('.weemusic-progress');
		
	audio
		.on('play',function(){
			
			audioAppArea.removeClass('pause').addClass('play');
				
		})
		
		.on('pause',function(){
			
			audioAppArea.removeClass('play').addClass('pause');
				
		})
		
		.on('before',function(){
			
			alert('Ahora se pondría la anterior canción');
			//$(this).parent('.wz-app-area').removeClass('play').addClass('pause');
				
		})
		
		.on('next',function(){
			
			alert('Ahora se pondría la siguiente canción');
			//$(this).parent('.wz-app-area').removeClass('play').addClass('pause');
				
		})
		
		.on('volumechange', function(e){
			
			if(this.muted && audioAppArea.hasClass('muted')){
				this.muted = false;
				return false;
			}
			
			if(this.muted){
								
				audioAppArea.addClass('muted').removeClass('volume-0 volume-33 volume-66 volume-100');
				
			}else{
				
				if(this.volume == 0){
					audioAppArea.addClass('volume-0').removeClass('muted volume-33 volume-66 volume-100');
				}else if(this.volume <= 0.33){
					audioAppArea.addClass('volume-33').removeClass('muted volume-0 volume-66 volume-100');
				}else if(this.volume <= 0.66){
					audioAppArea.addClass('volume-66').removeClass('muted volume-0 volume-33 volume-100');
				}else{
					audioAppArea.addClass('volume-100').removeClass('muted volume-0 volume-33 volume-66');
				}
				
			}
			
		})
		
		.on('timeupdate', function(e){
						
			var time = this.currentTime;
			var hour = parseInt(time/3600);
			var rem	 = (time%3600);
			var min	 = parseInt(rem/60);
			var sec	 = parseInt(rem%60);
			
			if(hour<10){ hour = '0'+hour}	
			if(min <10){ min  = '0'+min }
			if(sec <10){ sec  = '0'+sec }
						
			if(audioCurrent.hasClass('hour')){
				audioCurrent.text(hour+':'+min+':'+sec);
			}else{
				audioCurrent.text(min+':'+sec);
			}
			
			var pos = audioBackprogress.width()*(this.currentTime/this.duration);
			
			/*
			 *
			 * El planteamiento del factor de corrección está más en el evento wz-drag-x
			 * que fue donde se utilizó por primera vez, y posteriormente, aplicado a este
			 * evento.
			 * 
			 * En este caso, el factor de corrección es aplicado a la inversa, pues la
			 * reproducción introduce 13px de más en el seeker al final del vídeo.
			 * Sin el factor de corrección, la barra de progreso mete saltos cuando se hace
			 * seeking.
			 *
			 * En este caso, nos vamos a basar en dos propiedades del audio para determinar
			 * el factor y así ahorrarnos lecturas del DOM.
			 *
			 *		duracion -> 13
			 *		actual	 ->	 x
			 *
			 * El factor se aplica negativamente sobre la posición, que está por exceso.
			 * 
			 */
						
			if(!audioSeeker.hasClass('wz-draggable-active')){
				
				var seekerWidth	= audioSeeker.width();
				var correction	= (this.currentTime*seekerWidth)/this.duration;
				audioProgress.width(pos+seekerWidth-correction);
				audioSeeker.css('left',pos-correction);
				
			}
			
		})
		
		.on('durationchange', function(e){
												
			var time = this.duration;
			var hour = parseInt(time/3600);
			var rem	 = (time%3600);
			var min	 = parseInt(rem/60);
			var sec	 = parseInt(rem%60);
		
			if(hour<10){ hour = '0'+hour}	
			if(min <10){ min  = '0'+min }
			if(sec <10){ sec  = '0'+sec }
						
			if(parseInt(hour)){
				audioCurrent.addClass('hour').text('00:00:00');
				audioTotal.text(hour+':'+min+':'+sec);
			}else{
				audioCurrent.text('00:00');
				audioTotal.text(min+':'+sec);
			}
		
		})
		
		.on('progress',function(){
						
			try{
				var buffer	= this.buffered.end(0);
			}catch(e){}
			
			var width	= (audioBackprogress.width()*(buffer/this.duration))
			
			if(width > 0){
				audioBufferprogress.animate({width:width},100);
			}
					
		})
		
		.on('ended', function(){
			
			// Prevent jump when gragger-magnet is invoked
			if(audioSeeker.hasClass('wz-draggable-active')){
				return false;
			}
						
			audioProgress.width(0);
			audioSeeker.css('left',0);
			
			if(audioCurrent.hasClass('hour')){
				audioCurrent.text('00:00:00');
			}else{
				audioCurrent.text('00:00');
			}
			
			this.currentTime = 0;
						
			if(audioAppArea.hasClass('loop')){
				this.play();
			}else{
				this.pause();
			}
			
		});
		
})

.on('click','.wz-app-area:not(.play) .weemusic-play',function(){
	
	$(this).parents('.wz-app-area').children('audio')[0].play();

})

.on('click','.wz-app-area.play .weemusic-play',function(){
	
	$(this).parents('.wz-app-area').children('audio')[0].pause();

})

.on('click','.wz-app-area:not(.muted) .weemusic-speaker',function(){
	
	$(this).parents('.wz-app-area').children('audio')[0].muted=true;
	
})

.on('click','.wz-app-area.muted .weemusic-speaker',function(){
	
	$(this).parents('.wz-app-area').children('audio')[0].muted=false;

})

.on('click','.weemusic-loop',function(){
	$(this).parents('.wz-app-area').toggleClass('loop');
})

.on('mouseleave', '.weemusic-volume-panel', function(){
	
	if(!$(this).find('.wz-dragger-y').hasClass('wz-draggable-active')){
		$(this).children('.weemusic-volume-menu, .weemusic-arrow')
			.stop(true)
			.animate({opacity:1},0,function(){
				
				$(this)
					.delay(500)
					.animate({opacity:0},250,function(){
						$(this).css('display','none');
					})
				
			});
	}
	
})

.on('mousemove', '.weemusic-volume-panel', function(){
	
	$(this).children('.weemusic-volume-menu, .weemusic-arrow')
		.css('display','block')
		.stop(true)
		.animate({opacity:1},250);
	
})

.on('wz-dragend', '.weemusic-seeker', function(){
	
	var parent	= $(this).parents('.wz-app-area');
	var app		= parent.parents('.wz-app');
	
	parent.children('audio')[0].play();
		
	if(!app.is(':hover')){
		app.mouseleave();
	}
	
})

.on('wz-dragend', '.weemusic-volume-seeker', function(){
	
	var app		= $(this).parents('.wz-app');
			
	if(!app.is(':hover')){
		app.mouseleave();
	}
	
})

.on('wz-dragend', '.weemusic-volume-seeker', function(){
	
	var panel = $(this).parents('.weemusic-volume-panel');
	
	if(!panel.is(':hover')){
		panel.mouseleave();
	}
	
})

.on('wz-dragmove', '.weemusic-seeker', function(e,drag,pos,per){
	
	var parent		= $(this).parent();
	var audio		= parent.parents('.wz-app-area').children('audio');
	
	audio[0].pause();
	
	var parentWidth = parent.width();
	var seekerWidth = $(this).width();
		
	// Yep, this prevent the show timeupdate lag in the progress bar
	parent.children('.weemusic-progress').width((parentWidth*per.x) + ((1-per.x)*seekerWidth));
	
	var time = per.x*audio[0].duration;
	
	audio[0].currentTime = time;
	
})

.on('wz-dragmove', '.weemusic-volume-seeker', function(e,drag,pos,per){
	
	var parent		= $(this).parent();
	var audio		= parent.parents('.wz-app-area').children('audio');
	
	var parentHeight = parent.height();
	var seekerHeight = $(this).height();
	
	var height = (parentHeight*(1-per.y));
	
	parent.children('.weemusic-volume').css('top',parentHeight-height).height(height);
	
	audio[0].volume = 1-per.y;
	
	console.log(audio[0].volume);
	
});