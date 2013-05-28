
wz.app.addScript( 5, 'common', function( win, app, lang, params ){
    
    var audio                   = $('audio',win);
    var weemusicTitle           = $('.weemusic-info-title span',win);
    var weemusicArtist          = $('.weemusic-info-artist span',win);
    var weemusicAlbum           = $('.weemusic-info-album span',win);
    var weemusicCover           = $('.weemusic-info-cover',win);
    var weemusicCurrentTime     = $('.currentTime',win);
    var weemusicTotalTime       = $('.totalTime',win);
    var weemusicProgress        = $('.weemusic-info-progress',win);
    var weemusicBackprogress    = $('.weemusic-info-backprogress',win);
    var weemusicBufferprogress  = $('.weemusic-info-buffer',win);
    var weemusicSeeker          = $('.weemusic-info-seeker',win);
    var weemusicVolume          = $('.weemusic-volume-current',win);
    var weemusicMaxVolume       = $('.weemusic-volume-max',win);
    var weemusicVolumeSeeker    = $('.weemusic-volume-seeker',win);
    var list                    = [];
    var pointers                = [];
    var pointer                 = 0;
    var loop                    = $('.weemusic-info-repeat',win);
    var randomize               = $('.weemusic-info-random',win);
    
    var randomly = function(){
        return ( Math.round( Math.random() ) - 0.5 );
    };
    
    var loadItem = function(){
    
        wz.structure( list[pointers[pointer]], function( error, structure ){
            
            audio.empty();
                        
            audio.append( $('<source></source>').attr('type','audio/mpeg').attr('src', structure.formats.mpeg.url) );
            audio.append( $('<source></source>').attr('type','audio/ogg').attr('src', structure.formats.ogg.url) );
            
            weemusicTitle.text( ( structure.metadata && structure.metadata.id3 && structure.metadata.id3.title )? structure.metadata.id3.title : lang.unknown );
            weemusicArtist.text( ( structure.metadata && structure.metadata.id3 && structure.metadata.id3.artist[0] )? structure.metadata.id3.artist[0] : lang.unknown );
            weemusicAlbum.text( ( structure.metadata && structure.metadata.id3 && structure.metadata.id3.album )? structure.metadata.id3.album : lang.unknown );
            weemusicCover.attr('src',structure.thumbnails.big);
            
        });
        
        pointer++;
        
    };
    
    win.on( 'app-param', function( e, params ){

        if( params && params.length ){
            
            list.push( params[ 0 ] );
            pointers.push( pointers.length );
            
            loadItem();
            
        }

    });
    
    audio.on('durationchange', function(){
                                                
        var time  = this.duration;
        var hour  = parseInt(time/3600, 10);
        var rem   = (time%3600);
        var min   = parseInt(rem/60, 10);
        var sec   = parseInt(rem%60, 10);
    
        if(hour > 0 && min < 10){ min  = '0' + min; }
        if(sec < 10){ sec  = '0' + sec; }
        
        weemusicBackprogress.transition({'opacity':'1'},250);

        if(9 < hour){
            weemusicCurrentTime.transition({'opacity':'1'},250).text('00:00:00');
            weemusicTotalTime.transition({'opacity':'1'},250).text(hour+':'+min+':'+sec);
        }else if(0 < hour && hour < 10){
            weemusicCurrentTime.transition({'opacity':'1'},250).text('0:00:00');
            weemusicTotalTime.transition({'opacity':'1'},250).text(hour+':'+min+':'+sec);
        }else if(9 < min){
            weemusicCurrentTime.transition({'opacity':'1'},250).text('00:00');
            weemusicTotalTime.transition({'opacity':'1'},250).text(min+':'+sec);
        }else{
            weemusicCurrentTime.transition({'opacity':'1'},250).text('0:00');
            weemusicTotalTime.transition({'opacity':'1'},250).text(min+':'+sec);
        }
        
        var volumePosition = this.volume*weemusicMaxVolume.width();
        weemusicVolume.css('width',volumePosition);
        weemusicVolumeSeeker.css({x:volumePosition});
        weemusicVolumeSeeker.addClass('wz-dragger-x');
        weemusicSeeker.addClass('wz-dragger-x');
        
        audio[0].play();
        
        $( win )
        
            .on('wz-dragmove', '.weemusic-volume-seeker', function(e,posX,posY){
                
                if( win.hasClass('muted') ){
                    audio[0].muted = false;
                }
                
                weemusicVolume.css('width',posX * weemusicMaxVolume.width());
                
                audio[0].volume = 1*posX;
                
            })
            
            .on('wz-dragmove', '.weemusic-info-seeker', function(e,posX,posY){
                
                audio[0].pause();
                
                weemusicProgress.css('width',posX * weemusicBackprogress.width());
                
                audio[0].currentTime = audio[0].duration*posX;
                
            })
        
            .on('mousedown', '.weemusic-controls-play', function(){
                
                if( win.hasClass('play') ){
                    audio[0].pause();
                }else{
                    audio[0].play();
                }
                
            })
            
            .on('mousedown', '.weemusic-volume-icon', function(){
                
                if( win.hasClass('muted') ){
                    audio[0].muted = false;
                }else{
                    audio[0].muted = true;
                }
                
            })
            
            .on('wz-dragend', '.weemusic-info-seeker', function(){
                
                audio[0].play();
                
            })
            
            .on('mousedown', '.weemusic-controls-rewind', function(){
                
                audio[0].currentTime -= 10;
                
            })
            
            .on('mousedown', '.weemusic-controls-forward', function(){
                
                audio[0].currentTime += 10;
                
            })
            
            .on('mousedown', '.weemusic-info-random', function(){
                
                if( randomize.hasClass('active') ){
                    
                    randomize.removeClass('active');
                    
                    for ( var i = 0; i < pointers.length; i++ ){
                        
                        pointers[i] = i;
                        
                        }
                        
                }else{
                        
                    randomize.addClass('active');
                            
                    var a = pointers.slice(0, pointer);
                    var b = pointers.slice(pointer, pointers.length);
                    b.sort(randomly);
                    pointers = a.concat(b);
                    
                }
                
            })
            
            .on('mousedown', '.weemusic-info-repeat', function(){
                
                if( loop.hasClass('active') ){
                    loop.removeClass('active');
                }else{
                    loop.addClass('active');
                }
                
            })
            
            .key('space', function(){
            
                if( win.hasClass('play') ){
                    audio[0].pause();
                }else{
                    audio[0].play();
                }
                
            })
            
            .key(
                'right',
                function(){ audio[0].currentTime += 10; },
                function(){ audio[0].currentTime += 10; }
            )
            
            .key(
                'left',
                function(){ audio[0].currentTime -= 10; },
                function(){ audio[0].currentTime -= 10; }
            )
            
            .key(
                'up',
                function(){
                    if((audio[0].volume + 0.1) < 1){
                        audio[0].volume += 0.1;
                    }else{
                        audio[0].volume = 1;
                    }
                },
                function(){
                    if((audio[0].volume + 0.1) < 1){
                        audio[0].volume += 0.1;
                    }else{
                        audio[0].volume = 1;
                    }
                }
            )
            
            .key(
                'down',
                function(){
                    if((audio[0].volume - 0.1) > 0){
                        audio[0].volume -= 0.1;
                    }else{
                        audio[0].volume = 0;
                    }
                },
                function(){
                    if((audio[0].volume - 0.1) > 0){
                        audio[0].volume -= 0.1;
                    }else{
                        audio[0].volume = 0;
                    }
                }
            )
            
            .key(
                'backspace',
                function(){ audio[0].currentTime = 0; },
                function(){ audio[0].currentTime = 0; }
            );
        
        audio
        
            .on('play',function(){
                win.addClass('play');
            })
            
            .on('pause',function(){
                win.removeClass('play');
            })
            
            .on('loop',function(){
                win.addClass('play');
            })
            
            .on('volumechange', function(){
                
                if( this.muted ){
                    win.addClass('muted');
                }else{
                    win.removeClass('muted');
                }
                
                
                var volumePosition = this.volume*weemusicMaxVolume.width();
                weemusicVolume.css('width',volumePosition);
                weemusicVolumeSeeker.css({x:volumePosition});
                
            })
            
            .on('timeupdate', function(e){
                
                var time      = this.duration;
                var totalHour = parseInt(time/3600, 10);
                var rem       = (time%3600);
                var totalMin  = parseInt(rem/60, 10);
                            
                time     = this.currentTime;
                var hour = parseInt(time/3600, 10);

                rem      = (time%3600);
                var min  = parseInt(rem/60, 10);
                var sec  = parseInt(rem%60, 10);
                
                if(totalHour > 9 && hour < 10){ hour = '0' + hour; }
                if(totalHour > 0 || (totalMin > 10 && min < 10)){ min  = '0' + min; }
                if(sec < 10){ sec  = '0' + sec; }
                            
                if(totalHour){
                    weemusicCurrentTime.text(hour+':'+min+':'+sec);
                }else if(totalMin){
                    weemusicCurrentTime.text(min+':'+sec);
                }else{
                    weemusicCurrentTime.text('0:'+sec);
                }
                
                var pos = weemusicBackprogress.width()*(this.currentTime/this.duration);
    
                weemusicProgress.width(pos);
    
                if( !weemusicSeeker.hasClass('wz-drag-active') ){
                    weemusicSeeker.css({x:pos});
                }
                
            })
            
            .on('progress',function(){
                
                var buffer = 0;

                try{
                    buffer = this.buffered.end( 0 );
                }catch(e){}
                
                var width = ( weemusicBackprogress.width() * ( buffer/this.duration ) );
                
                if( width > 0 ){
                    weemusicBufferprogress.transition( { width : width }, 100 );
                }
                        
            })
            
            .on('ended', function(){
                
                if( !weemusicSeeker.hasClass('wz-drag-active') ){
                    
                    var time = this.duration;
                    var hour = parseInt(time/3600, 10);
                    weemusicProgress.width(0);
                    weemusicSeeker.css('left',-6);
                    
                    if(parseInt(hour, 10)){
                        weemusicCurrentTime.text('00:00:00');
                    }else{
                        weemusicCurrentTime.text('00:00');
                    }
                    
                    this.currentTime = 0;
                    this.pause();
                    
                    if( pointer === list.length ){
                        
                        pointer = 0;
                        
                        if( loop.hasClass('active') ){
                            
                            if( randomize.hasClass('active') ){
                                pointers.sort(randomly);
                            }
                            
                            loadItem();
                            
                        }
                    
                    }else{
                        loadItem();
                    }
                    
                }
                            
            });
            
    });
    
});
