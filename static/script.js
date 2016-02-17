
var win                    = $( this );
var audio                  = $( 'audio', win );
var weemusicTitle          = $( '.weemusic-name', win);
var weemusicArtist         = $( '.weemusic-artist', win);
var weemusicCover          = $( '.weemusic-info-cover', win );
var musicCurrentTime       = $( '.currentTime', win );
var weemusicTotalTime      = $( '.totalTime', win );
var musicProgress          = $( '.music-progress', win );
var musicBackprogress      = $( '.music-backprogress', win );
var musicBufferprogress    = $( '.music-buffer', win );
var musicSeeker            = $( '.music-time-seeker', win );
var musicVolume            = $( '.music-volume-current', win );
var musicMaxVolume         = $( '.music-volume-max', win );
var musicVolumeSeeker      = $( '.music-volume-seeker', win );
var songThumbnail          = $( '.song-thumbnail', win );
var playListDom            = $( '.playlist', win );
var songPrototype          = $( '.playlist .song.wz-prototype', win );
var playlist               = [];
var indexPlaying           = -1;
var list                   = [];
var pointers               = [];
var pointer                = 0;
//var loop                   = $( '.weemusic-info-repeat', win );
//var randomize              = $( '.weemusic-info-random', win );

/*
 * Las operaciones de cambio de tiempos por drag son muy exigentes en cuanto a procesador,
 * por lo que las emulamos con un pequeño lag.
 * Las variables que declaramos a continuación están pensadas para ello.
 * Ponemos un timer para de vez en cuando forzar que pueda cachear
 */
var emulatedSeekerTimer = 0;
var emulatedSeekerTime  = 0;

win.addClass( 'wz-dragger' );
musicVolume.width( musicMaxVolume.width() );
musicVolumeSeeker.css( 'x', musicMaxVolume.width() - musicVolumeSeeker.width() );

var randomly = function(){
    return ( Math.round( Math.random() ) - 0.5 );
};

var startApp = function( list ){

  if( params && params.command === 'openFile' ){

    params.list.forEach( function(item, index){

      wz.fs( item, function( error, structure ){

        if( !error ){
          if( structure.mime.indexOf('audio/mp4"') !== -1 || structure.mime.indexOf('audio/mpeg') !== -1
              || structure.mime.indexOf('audio/x-wav') !== -1 || structure.mime.indexOf('audio/x-vorbis+ogg') !== -1 ){

            if( structure.id === params.data ){
              indexPlaying = playlist.length;
            }

            playlist.push(structure);

          }

          if( index === params.list.length - 1 ){
            loadPlaylist();
            loadItem( playlist[indexPlaying] );
          }

        }

      });

    });

  }

}

var loadPlaylist = function(){

  var toInsert = [];

  playlist.forEach( function(item, index){

    var songItem = songPrototype.clone().removeClass('wz-prototype');
		songItem.addClass('song-' + playlist[index].id);
		songItem.find('.title')
      .text( ( playlist[index].metadata && playlist[index].metadata.id3 && playlist[index].metadata.id3.title )? playlist[index].metadata.id3.title : playlist[index].name );
    songItem.find('.artist')
      .text( ( playlist[index].metadata && playlist[index].metadata.id3 && playlist[index].metadata.id3.artist && playlist[index].metadata.id3.artist[0] )? playlist[index].metadata.id3.artist[0] : lang.unknown );
    songItem.children('figure')
      .css( 'background-image', 'url(' + ( playlist[index].thumbnails['64'] ? playlist[index].thumbnails['64'] : 'https://static.inevio.com/app/5/cover.jpg' ) + ')' );
    songItem.data( playlist[index] );

    var time  = playlist[index].metadata.media.duration.seconds;
    var hour  = parseInt(time/3600, 10);
    var rem   = (time%3600);
    var min   = parseInt(rem/60, 10);
    var sec   = parseInt(rem%60, 10);

    if( hour > 0 && min < 10 ){ min = '0' + min; }
    if( sec < 10 ){ sec  = '0' + sec; }

    if( 9 < hour ){
        songItem.find('.time').text(hour+':'+min+':'+sec);
    }else if( 0 < hour && hour < 10 ){
        songItem.find('.time').text(hour+':'+min+':'+sec);
    }else if( 9 < min ){
        songItem.find('.time').text(min+':'+sec);
    }else{
        songItem.find('.time').text(min+':'+sec);
    }

    if( index === indexPlaying ){
      songItem.addClass( 'active' );
    }

		toInsert.push( songItem );

  });

  console.log( toInsert );
  playListDom.append( toInsert );

}

var loadItem = function( structure ){

  audio.empty();
  audio.append( $('<source></source>').attr('type','audio/mpeg').attr('src', structure.formats.mpeg.url) );
  audio.append( $('<source></source>').attr('type','audio/ogg').attr('src', structure.formats.ogg.url) );

  weemusicTitle.text( ( structure.metadata && structure.metadata.id3 && structure.metadata.id3.title )? structure.metadata.id3.title : structure.name );

  songThumbnail.css( 'background-image', 'url(' + ( structure.thumbnails.big ? structure.thumbnails.big : 'https://static.inevio.com/app/5/cover.jpg' ) + ')' );
  weemusicArtist.text( ( structure.metadata && structure.metadata.id3 && structure.metadata.id3.artist && structure.metadata.id3.artist[0] )? structure.metadata.id3.artist[0] : lang.unknown );

  audio.load();

  pointer++;

};

win.on( 'app-param', function( e, params ){

  startApp();

  /*if( params && params.length ){

      list.push( params[ 0 ] );
      pointers.push( pointers.length );

      loadItem();

  }*/

});

audio.on('durationchange', function(){

    var time  = this.duration;
    var hour  = parseInt(time/3600, 10);
    var rem   = (time%3600);
    var min   = parseInt(rem/60, 10);
    var sec   = parseInt(rem%60, 10);

    if( hour > 0 && min < 10 ){ min = '0' + min; }
    if( sec < 10 ){ sec  = '0' + sec; }

    //musicBackprogress.transition({'opacity':'1'},250);

    if( 9 < hour ){

        musicCurrentTime/*.transition({'opacity':'1'},250)*/.text('00:00:00');
        weemusicTotalTime/*.transition({'opacity':'1'},250)*/.text(hour+':'+min+':'+sec);

    }else if( 0 < hour && hour < 10 ){

        musicCurrentTime/*.transition({'opacity':'1'},250)*/.text('0:00:00');
        weemusicTotalTime/*.transition({'opacity':'1'},250)*/.text(hour+':'+min+':'+sec);

    }else if( 9 < min ){

        musicCurrentTime/*.transition({'opacity':'1'},250)*/.text('00:00');
        weemusicTotalTime/*.transition({'opacity':'1'},250)*/.text(min+':'+sec);

    }else{

        musicCurrentTime/*.transition({'opacity':'1'},250)*/.text('0:00');
        weemusicTotalTime/*.transition({'opacity':'1'},250)*/.text(min+':'+sec);

    }

    musicVolumeSeeker.addClass('wz-dragger-x');
    musicSeeker.addClass('wz-dragger-x');

    audio[ 0 ].play();

    $( win )

    .on( 'click', '.song', function(){

      loadItem( $(this).data() );
      $('.song.active').removeClass('active');
      $(this).addClass('active');

    })

    .on( 'wz-dragmove', '.music-volume-seeker', function( e, posX, posY ){

        if( win.hasClass('muted') ){
            audio[ 0 ].muted = false;
        }

        musicVolume.css( 'width', posX * musicMaxVolume.width() );

        audio[ 0 ].volume = 1 * posX;

    })

    .on( 'wz-dragmove', '.music-time-seeker', function( e, posX, posY ){

        audio[ 0 ].pause();

        if( !emulatedSeekerTimer ){

            emulatedSeekerTimer = setInterval( function(){
                audio[ 0 ].currentTime = emulatedSeekerTime;
            }, 100 );

        }

        musicProgress.css( 'width', posX * musicBackprogress.width() );

        /*
         * Como cambiar el currentTime de un elemento es un proceso costoso
         * para el procesador, emulamos ese proceso
         */
        emulatedSeekerTime = audio[ 0 ].duration * posX;

        var time      = audio[ 0 ].duration;
        var totalHour = parseInt( time / 3600, 10 );
        var rem       = time % 3600;
        var totalMin  = parseInt( rem / 60, 10 );

        time     = emulatedSeekerTime;
        var hour = parseInt( time / 3600, 10 );

        rem     = ( time % 3600 );
        var min = parseInt( rem / 60, 10 );
        var sec = parseInt( rem % 60, 10 );

        if( totalHour > 9 && hour < 10 ){ hour = '0' + hour; }
        if( totalHour > 0 || ( totalMin > 10 && min < 10 ) ){ min = '0' + min; }
        if( sec < 10 ){ sec  = '0' + sec; }

        if( totalHour ){
            musicCurrentTime.text( hour + ':' + min + ':' + sec );
        }else if( totalMin ){
            musicCurrentTime.text( min + ':' + sec );
        }else{
            musicCurrentTime.text( '0:' + sec );
        }

    })

    .on( 'mousedown', '.play-button.play', function(){

        if( win.hasClass('playing') ){
            audio[0].pause();
        }else{
            audio[0].play();
        }

    })

    .on( 'mousedown', '.volume-icon', function(){

        if( win.hasClass('muted') ){
            audio[ 0 ].muted = false;
        }else{
            audio[ 0 ].muted = true;
        }

    })

    .on( 'wz-dragend', '.music-time-seeker', function(){

        clearInterval( emulatedSeekerTimer );

        emulatedSeekerTimer    = 0;
        audio[ 0 ].currentTime = emulatedSeekerTime;

        audio[ 0 ].play();

    })

    .on( 'mousedown', '.play-button.rewind', function(){

        audio[0].currentTime -= 10;

    })

    .on( 'mousedown', '.play-button.forward', function(){

        audio[0].currentTime += 10;

    })

    /*
    .on('mousedown', '.weemusic-info-random', function(){

        if( randomize.hasClass('active') ){

            randomize.removeClass('active');

            for( var i = 0; i < pointers.length; i++ ){
                pointers[ i ] = i;
            }

        }else{

            randomize.addClass('active');

            var a = pointers.slice(0, pointer);
            var b = pointers.slice(pointer, pointers.length);
            b.sort(randomly);
            pointers = a.concat(b);

        }

    })
    */

    .on( 'mousedown', '.weemusic-controls-repeat', function(){
        win.toggleClass('repeat');
    })

    .key('space', function(){

        if( win.hasClass('playing') ){
            audio[ 0 ].pause();
        }else{
            audio[ 0 ].play();
        }

    })

    .key(

        'right',
        function(){ audio[ 0 ].currentTime += 10; }, // To Do -> Comprobar exceso
        function(){ audio[ 0 ].currentTime += 10; }  // To Do -> Comprobar exceso

    )

    .key(

        'left',
        function(){ audio[ 0 ].currentTime -= 10; },
        function(){ audio[ 0 ].currentTime -= 10; }

    )

    .key(

        'up',
        function(){

            if( ( audio[ 0 ].volume + 0.1 ) < 1){
                audio[ 0 ].volume += 0.1;
            }else{
                audio[ 0 ].volume = 1;
            }

        },
        function(){

            if( ( audio[ 0 ].volume + 0.1 ) < 1){
                audio[ 0 ].volume += 0.1;
            }else{
                audio[ 0 ].volume = 1;
            }

        }

    )

    .key(

        'down',
        function(){

            if( ( audio[ 0 ].volume - 0.1 ) > 0){
                audio[ 0 ].volume -= 0.1;
            }else{
                audio[ 0 ].volume = 0;
            }

        },
        function(){

            if( ( audio[ 0 ].volume - 0.1 ) > 0){
                audio[ 0 ].volume -= 0.1;
            }else{
                audio[ 0 ].volume = 0;
            }

        }

    )

    .key(

        'backspace',
        function(){ audio[ 0 ].currentTime = 0; },
        function(){ audio[ 0 ].currentTime = 0; }

    );

    audio
    .on('play',function(){
        win.addClass('playing');
    })

    .on('pause',function(){
        win.removeClass('playing');
    })

    .on('loop',function(){
        win.addClass('playing');
    })

    .on( 'volumechange', function(){

        if( this.muted ){
            win.addClass('muted');
        }else{
            win.removeClass('muted');
        }

        if( !musicVolumeSeeker.hasClass('wz-drag-active') ){

            musicVolume.css( 'width', this.volume * musicMaxVolume.width() );
            musicVolumeSeeker.css( 'x', Math.floor( this.volume * ( musicMaxVolume.width() - musicVolumeSeeker.width() ) ) );

        }

    })

    .on( 'timeupdate', function( e ){

        var time      = this.duration;
        var totalHour = parseInt( time / 3600, 10 );
        var rem       = time % 3600;
        var totalMin  = parseInt( rem / 60, 10 );

        time     = this.currentTime;
        var hour = parseInt( time / 3600, 10 );

        rem      = time % 3600;
        var min  = parseInt( rem / 60, 10 );
        var sec  = parseInt( rem % 60, 10 );

        if( totalHour > 9 && hour < 10 ){ hour = '0' + hour; }
        if( totalHour > 0 || ( totalMin > 10 && min < 10 ) ){ min  = '0' + min; }
        if (sec < 10 ){ sec  = '0' + sec; }

        if( totalHour ){
            musicCurrentTime.text( hour + ':' + min + ':' + sec );
        }else if( totalMin ){
            musicCurrentTime.text( min + ':' + sec );
        }else{
            musicCurrentTime.text( '0:' + sec );
        }

        var backWidth = musicBackprogress.width();

        musicProgress.width( backWidth * ( this.currentTime / this.duration ) );

        if( !musicSeeker.hasClass('wz-drag-active') ){
            musicSeeker.css( 'x', ( backWidth - musicSeeker.width() ) * ( this.currentTime / this.duration ) );
        }

    })

    .on('progress',function(){

        var buffer = 0;

        try{
            buffer = this.buffered.end( 0 );
        }catch(e){}

        var width = ( musicBackprogress.width() * ( buffer/this.duration ) );

        if( width > 0 ){
            musicBufferprogress.stop().clearQueue().transition( { width : width }, 100 );
        }

    })

    .on('ended', function(){

        if( !musicSeeker.hasClass('wz-drag-active') ){

            var time = this.duration;
            var hour = parseInt(time/3600, 10);
            musicProgress.width(0);
            musicSeeker.css('left',-6);

            if(parseInt(hour, 10)){
                musicCurrentTime.text('00:00:00');
            }else{
                musicCurrentTime.text('00:00');
            }

            this.currentTime = 0;

            if( win.hasClass('repeat') ){
                this.play();
            }

            /*if( pointer === list.length ){

                pointer = 0;

                if( loop.hasClass('active') ){

                    if( randomize.hasClass('active') ){
                        pointers.sort(randomly);
                    }

                    loadItem();

                }

            }else{
                loadItem();
            }*/

        }

    });

});
