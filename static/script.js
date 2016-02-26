
// Objects
var Playlist = function(){

  this._list          = [];
  this._toPlay        = [];
  this._played        = [];
  this._lastId        = -1;
  this._repeatMode    = 0; // 0 == no repeat, 1 == repeat song, 2 == repeat playlist
  this._randomEnabled = false;

};

Playlist.prototype._shuffle = function(){

  var input = this._toPlay;

  for( var i = input.length - 1; i >= 0; i-- ){

    var randomIndex = Math.floor( Math.random()*(i+1) );
    var itemAtIndex = input[randomIndex];

    input[randomIndex] = input[i];
    input[i] = itemAtIndex;

  }

  this._toPlay = input.filter( function( item ){ return item !== this._lastId; }.bind( this ) );

};

Playlist.prototype._rebuild = function( index ){

  index        = index || 0;
  this._toPlay = [];

  for( var i = index; i < this._list.length; i++ ){
    this._toPlay.push( i );
  }

  if( this._randomEnabled ){
    this._shuffle();
  }

};

Playlist.prototype.push = function( list ){

  if( !( list instanceof Array ) ){
    list = [ list ];
  }

  for( var i = 0; i < list.length; i++ ){
    this._toPlay.push( this._list.push( list[ i ] ) - 1 );
  }

  if( this._randomEnabled ){
    this._shuffle();
  }

};

Playlist.prototype.repeat = function( opt ){

  if( typeof opt === 'undefined' ){
    return this._repeatMode;
  }

  this._repeatMode = opt;

};

Playlist.prototype.random = function( opt ){

  if( typeof opt === 'undefined' ){
    return this._randomEnabled;
  }

  if( !this._randomEnabled && opt ){

    this._randomEnabled = !!opt;
    this._rebuild();

  }else if( this._randomEnabled && !opt ){

    this._randomEnabled = !!opt;
    this._rebuild( this._lastId + 1 );

  }

};

Playlist.prototype.get = function( index ){

  if( !this._list[ index ] ){
    return null;
  }

  this._rebuild( this._randomEnabled ? 0 : index + 1 );

  this._lastId = index;
  this._played.push( this._lastId );

  return this._list[ index ];

};

Playlist.prototype.next = function(){

  if( this._toPlay.length === 0 && this._repeatMode !== 2 ){
    return null;
  }else if( this._toPlay.length === 0 ){
    this._rebuild();
  }

  this._lastId = this._toPlay.shift();
  this._played.push( this._lastId );

  return this._list[ this._lastId ];

};

Playlist.prototype.prev = function(){

  if( ( this._played.length === 0 && this._repeatMode !== 2 ) || this._played.length === 0 || this._played.length === 1){
    return null;
  }

  this._toPlay.push( this._played.pop() );
  this._lastId = this._played[ this._played.length - 1 ];

  return this._list[ this._lastId ];

};

// Variables
var VALID_MIMES         = [ 'audio/mp4', 'audio/mpeg', 'audio/x-wav', 'audio/x-vorbis+ogg', 'audio/flac' ];
var win                 = $( this );
var audio               = $('audio');
var musicTitle          = $('.song-title');
var musicArtist         = $('.song-artist');
var musicCurrentTime    = $('.currentTime');
var weemusicTotalTime   = $('.totalTime');
var musicProgress       = $('.music-progress');
var musicBackprogress   = $('.music-backprogress');
var musicBufferprogress = $('.music-buffer');
var musicSeeker         = $('.music-time-seeker');
var musicVolume         = $('.music-volume-current');
var musicMaxVolume      = $('.music-volume-max');
var musicVolumeSeeker   = $('.music-volume-seeker');
var songThumbnail       = $('.song-thumbnail');
var playListDom         = $('.playlist');
var songPrototype       = $('.playlist .song.wz-prototype');
var longClick           = false;
var longKeypress        = false;
var playlist;
var indexPlaying        = -1;
var list                = [];
var clickInterval;
var keyInterval;
var appStarted          = false;

/*
 * Las operaciones de cambio de tiempos por drag son muy exigentes en cuanto a procesador,
 * por lo que las emulamos con un pequeño lag.
 * Las variables que declaramos a continuación están pensadas para ello.
 * Ponemos un timer para de vez en cuando forzar que pueda cachear
 */
 var emulatedSeekerTimer = 0;
 var emulatedSeekerTime  = 0;

 musicVolume.width( musicMaxVolume.width() );
 musicVolumeSeeker.css( 'x', musicMaxVolume.width() - musicVolumeSeeker.width() );

var startApp = function( paramsAux ){

  playlist = new Playlist();
  $('.playlist-title').text( lang.playlist );
  audio.empty();

  var counter = 0;

  paramsAux.list.forEach( function( item, index ){


    wz.fs( item, function( error, structure ){

      if( error ){
        return;
      }

      if( VALID_MIMES.indexOf( structure.mime ) !== -1 ){

        if( structure.id === paramsAux.data ){
          indexPlaying = playlist._list.length;
        }

        playlist.push( structure );

      }

      counter++;

      if( counter === paramsAux.list.length ){

        appStarted = true;
        displayPlaylist();
        loadItem( indexPlaying );
        $('.playlist-count').text( '(' + playlist._list.length + ')' );

      }

    });

  });

}

var addSong = function( id ){

  wz.fs( id, function( error, song ){

    if( error ){
      return;
    }

    if( VALID_MIMES.indexOf( song.mime ) !== -1 ){

      playlist.push( song );

      var songItem = songPrototype.clone().removeClass('wz-prototype');

      songItem.addClass('song-id-' + song.id);
      songItem.find('.title').text( ( song.metadata && song.metadata.id3 && song.metadata.id3.title ) ? song.metadata.id3.title : song.name );
      songItem.find('.artist').text( ( song.metadata && song.metadata.id3 && song.metadata.id3.artist && song.metadata.id3.artist[0] )? song.metadata.id3.artist[0] : lang.unknown );
      songItem.children('figure').css( 'background-image', 'url(' + ( song.thumbnails['64'] ? song.thumbnails['64'] : 'https://static.inevio.com/app/228/cover_small.png' ) + ')' );
      songItem.data( 'index' , playlist._list.length - 1 );

      var time = song.metadata.media.duration.seconds;
      var hour = parseInt(time / 3600, 10);
      var rem  = time % 3600;
      var min  = parseInt(rem / 60, 10);
      var sec  = parseInt(rem % 60, 10);

      if( hour > 0 && min < 10 ){ min = '0' + min; }
      if( sec < 10 ){ sec  = '0' + sec; }

      if( 9 < hour ){
        songItem.find('.time').text( hour + ':' + min + ':' + sec );
      }else if( 0 < hour && hour < 10 ){
        songItem.find('.time').text( hour + ':' + min + ':' + sec );
      }else if( 9 < min ){
        songItem.find('.time').text( min + ':' + sec );
      }else{
        songItem.find('.time').text( min + ':' + sec );
      }

      appStarted = true;
      $('.playlist-count').text( '(' + playlist._list.length + ')' );
      playListDom.append( songItem );

    }

  });

}

var findSong = function( songId ){

  var index = -1;
  for( var i = 0; i < playlist._list.length; i++ ){

    if( songId === playlist._list[i].id ){
      index = i;
      break;
    }

  }

  return index;

}

var displayPlaylist = function(){

  var toInsert = [];

  $('.playlist').children().not('.wz-prototype').remove();

  playlist._list.forEach( function( song, index ){

    if( song && song.metadata && song.metadata.media && song.metadata.media.duration && song.metadata.media.duration.seconds ){

      var songItem = songPrototype.clone().removeClass('wz-prototype');

      songItem.addClass('song-id-' + song.id);
      songItem.find('.title').text( ( song.metadata && song.metadata.id3 && song.metadata.id3.title ) ? song.metadata.id3.title : song.name );
      songItem.find('.artist').text( ( song.metadata && song.metadata.id3 && song.metadata.id3.artist && song.metadata.id3.artist[0] )? song.metadata.id3.artist[0] : lang.unknown );
      songItem.children('figure').css( 'background-image', 'url(' + ( song.thumbnails['64'] ? song.thumbnails['64'] : 'https://static.inevio.com/app/228/cover_small.png' ) + ')' );
      songItem.data( 'index' , index );

      var time = song.metadata.media.duration.seconds;
      var hour = parseInt(time / 3600, 10);
      var rem  = time % 3600;
      var min  = parseInt(rem / 60, 10);
      var sec  = parseInt(rem % 60, 10);

      if( hour > 0 && min < 10 ){ min = '0' + min; }
      if( sec < 10 ){ sec  = '0' + sec; }

      if( 9 < hour ){
        songItem.find('.time').text( hour + ':' + min + ':' + sec );
      }else if( 0 < hour && hour < 10 ){
        songItem.find('.time').text( hour + ':' + min + ':' + sec );
      }else if( 9 < min ){
        songItem.find('.time').text( min + ':' + sec );
      }else{
        songItem.find('.time').text( min + ':' + sec );
      }

      toInsert.push( songItem );

    }else{
      console.log(song);
    }

  });

  playListDom.append( toInsert );

}

var loadItem = function( index ){

  var structure;

  if( typeof index === 'undefined' ){
    structure = playlist.next();
  }else if( index === -1 ){
    structure = playlist.prev();
  }else{
    structure = playlist.get( index );
  }

  if( !structure ){
    return;
  }

  audio.empty();
  audio.append( $('<source></source>').attr('type','audio/mpeg').attr('src', structure.formats.mpeg.url) );
  audio.append( $('<source></source>').attr('type','audio/ogg').attr('src', structure.formats.ogg.url) );

  musicTitle.text( ( structure.metadata && structure.metadata.id3 && structure.metadata.id3.title )? structure.metadata.id3.title : structure.name );

  songThumbnail.css( 'background-image', 'url(' + ( structure.thumbnails['512'] ? structure.thumbnails['512'] : 'https://static.inevio.com/app/228/cover_big.png' ) + ')' );
  musicArtist.text( ( structure.metadata && structure.metadata.id3 && structure.metadata.id3.artist && structure.metadata.id3.artist[0] )? structure.metadata.id3.artist[0] : lang.unknown );

  audio.load();

  $('.song.active').removeClass('active');

  var song = $('.song-id-' + structure.id).addClass('active');

  /*if( song[ 0 ].offsetTop + song.outerHeight( true ) > playListDom.height() ){
    playListDom.scrollTop( song[ 0 ].offsetTop + song.outerHeight( true ) - playListDom.height() );
  }*/

  playListDom.animate( { scrollTop : song[0].offsetTop }, 400  );

  indexPlaying = index;

};

// Events
win
.on( 'click', '.song', function(){
  loadItem( $(this).data('index') );
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
     if( totalHour > 0 && min < 10 ){ min = '0' + min; }
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

.on( 'click', '.more-options .random', function(){

  if( win.hasClass('random') ){

    win.removeClass('random');
    playlist.random( false );

  }else{

    win.addClass('random');
    playlist.random( true );

  }

})

.on( 'wz-dragend', '.music-time-seeker', function(){

  clearInterval( emulatedSeekerTimer );

  emulatedSeekerTimer    = 0;
  audio[ 0 ].currentTime = emulatedSeekerTime;

  audio[ 0 ].play();

})

.on( 'mousedown', '.play-button.rewind', function(e){

  clickInterval = setInterval( function(){
    audio[0].currentTime -= 10;
    longClick = true;
  } ,400)

})

.on( 'mouseup', '.play-button.rewind', function(e){

  if( !longClick ){
    loadItem( -1 );
  }

  longClick = false;

  clearInterval( clickInterval );


})

.on( 'mousedown', '.play-button.forward', function(e){

  clickInterval = setInterval( function(){
    audio[0].currentTime += 10;
    longClick = true;
  } ,400)

})

.on( 'mouseup', '.play-button.forward', function(e){

  if( !longClick ){
    loadItem();
  }

  longClick = false;

  clearInterval( clickInterval );

})

.on( 'mousedown', '.more-options .repeat', function(){

  if( win.hasClass('repeat') ){

    win.removeClass('repeat');
    playlist.repeat( 0 );

  }else if( win.hasClass('repeat-song') ){

    win.removeClass('repeat-song');
    win.addClass('repeat');
    playlist.repeat( 2 );

  }else{

    win.removeClass('repeat');
    win.addClass('repeat-song');
    playlist.repeat( 1 );

  }

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
    function(){

      //audio[ 0 ].currentTime += 10;
      keyInterval = setInterval( function(){
        audio[0].currentTime += 10;
        longKeypress = true;
      } ,300);

    },
    null,
    function(){
      if( !longKeypress ){
        loadItem();
      }

      longKeypress = false;
      clearInterval( keyInterval );
    }

)

.key(

  'left',
    function(){

      //audio[ 0 ].currentTime += 10;
      keyInterval = setInterval( function(){
        audio[0].currentTime -= 10;
        longKeypress = true;
      } ,300);

    },
    null,
    function(){
      if( !longKeypress ){
        loadItem( -1 );
      }

      longKeypress = false;
      clearInterval( keyInterval );
    }

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
.on('durationchange', function(){

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

  })

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
  if( totalHour > 0 && min < 10 ){ min = '0' + min; }
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

    if( playlist._repeatMode == 1 ){
      loadItem( playlist._lastId );
    }else{
      loadItem();
    }

  }

});

win.on( 'app-param', function( e, params ){

  if( params && params.command === 'openFile' && !appStarted ){

    startApp( params );

  }else if( params && params.command === 'openFile' && appStarted ){

    var index = findSong( params.data );
    if( index !== -1 ){
      loadItem( index );
    }else{
      startApp( params );
    }

  }

})

.on( 'wz-drop', '.wz-drop-area', function( e,item ){

  item.siblings('.active').add( item ).each( function(){

    var songId = $(this).data()['file-id'];

    if( findSong( songId ) == -1 ){
      addSong( songId );
    }

  });

});
