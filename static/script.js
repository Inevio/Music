
// setImmediate
var setImmediate = function( fn ){
  fn();
};

// Async
var asyncEach = function( list, step, callback ){

  var position = 0;
  var closed   = false;
  var checkEnd = function( error ){

    if( closed ){
      return;
    }

    position++;

    if( position === list.length || error ){

      closed = true;

      callback( error );

      // Nullify
      list = step = callback = position = checkEnd = closed = null;

    }

  };

  if( !list.length ){
    return callback();
  }

  list.forEach( function( item ){
    step( item, checkEnd );
  });

};

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
var animationEffect     = 'cubic-bezier(.4,0,.2,1)';
var animationEffect2    = 'cubic-bezier(.18,.48,.2,1)';
var transition          = false;
var musicTitle          = $('.song-title');
var musicArtist         = $('.song-artist');

var mobile = win.hasClass('wz-mobile-view');

if( mobile ){

  win.addClass('mobile');

  var musicCurrentTime    = $('.control-panel-mobile .currentTime');
  var weemusicTotalTime   = $('.control-panel-mobile .totalTime');
  var musicProgress       = $('.control-panel-mobile .music-progress');
  var musicBackprogress   = $('.control-panel-mobile .music-backprogress');
  var musicBufferprogress = $('.control-panel-mobile .music-buffer');
  var musicSeeker         = $('.control-panel-mobile .music-time-seeker');
  var musicVolume         = $('.control-panel-mobile .music-volume-current');
  var musicMaxVolume      = $('.control-panel-mobile .music-volume-max');
  var musicVolumeSeeker   = $('.control-panel-mobile .music-volume-seeker');

}else{

  var musicCurrentTime    = $('.control-panel-desktop .currentTime');
  var weemusicTotalTime   = $('.control-panel-desktop .totalTime');
  var musicProgress       = $('.control-panel-desktop .music-progress');
  var musicBackprogress   = $('.control-panel-desktop .music-backprogress');
  var musicBufferprogress = $('.control-panel-desktop .music-buffer');
  var musicSeeker         = $('.control-panel-desktop .music-time-seeker');
  var musicVolume         = $('.control-panel-desktop .music-volume-current');
  var musicMaxVolume      = $('.control-panel-desktop .music-volume-max');
  var musicVolumeSeeker   = $('.control-panel-desktop .music-volume-seeker');

}

var audio               = $('audio');

var songThumbnail       = $('.song-thumbnail');
var playListDom         = $('.playlist');
var songPrototype       = $('.playlist .song.wz-prototype');
var dropCover           = $('.playlist-section.drop-cover');
var longClick           = false;
var longKeypress        = false;
var playlist;
var indexPlaying        = -1;
var list                = [];
var clickInterval;
var keyInterval;
var appStarted          = false;
var linkMode            = false;
var newAudio            = null;
var currentVolume       = 1;
var timeFormat          = 0; //0 == m:ss, 1 == mm:ss, 2 == h:mm:ss, 3 == hh:mm:ss

/*
 * Las operaciones de cambio de tiempos por drag son muy exigentes en cuanto a procesador,
 * por lo que las emulamos con un pequeño lag.
 * Las variables que declaramos a continuación están pensadas para ello.
 * Ponemos un timer para de vez en cuando forzar que pueda cachear
 */
var emulatedSeekerTimer = 0;
var emulatedSeekerTime  = 0;
var songList = [];

musicVolume.width( musicMaxVolume.width() );
musicVolumeSeeker.css( 'x', musicMaxVolume.width() - musicVolumeSeeker.width() );

var parseDate = function( currentTime , loadingItem ){

  var time  = currentTime;
  var hour  = parseInt(time/3600, 10);
  var rem   = (time%3600);
  var min   = parseInt(rem/60, 10);
  var sec   = parseInt(rem%60, 10);

  if( hour > 0 && min < 10 ){ min = '0' + min; }
  if( sec < 10 ){ sec  = '0' + sec; }

  var result;

  if( hour > 9 ){

    if( loadingItem ){
      timeFormat = 3;
      musicCurrentTime.text('00:00:00');
    }

    result = hour+':'+min+':'+sec;

  }else if( hour > 0 ){

    if( loadingItem ){
      timeFormat = 2;
      musicCurrentTime.text('0:00:00');
    }

    result = hour+':'+min+':'+sec;

  }else if( min > 9 ){

    if( loadingItem ){timeFormat = 1;}

    result = min+':'+sec;

  }else{

    if( loadingItem ){
      timeFormat = 0;
      musicCurrentTime.text('0:00');
    }

    result = min+':'+sec;

  }

  return result;

}

var startApp = function( paramsAux ){

  playlist = new Playlist();

  if( win.hasClass('random') ){
    playlist.random( true );
  }
  if( win.hasClass('repeat') ){
    playlist.repeat( 2 );
  }else if( win.hasClass('repeat-song') ){
    playlist.repeat( 1 );
  }

  $('.playlist-title').text( lang.playlist );
  audio.empty();

  linkMode = false;

  if( location.host.indexOf('file') !== -1 ){

    linkMode = true;

    paramsAux.list = [paramsAux.data];
    $('.wz-dragger').removeClass('wz-dragger');
    $('.ui-header-buttons').remove();

  }

  var newIndex = 0;
  songList = []

  asyncEach( paramsAux.list, function( item, callback ){

    var index = newIndex++;

    api.fs( item, function( error, structure ){

      if( error || VALID_MIMES.indexOf( structure.mime ) === -1 ){
        return callback();
      }

      structure.getFormats( function( error, formats ){

        structure.formats = formats;
        songList[ index ] = structure

        if( structure.id === paramsAux.data ){
          indexPlaying = index;
        }else if( linkMode ){
          indexPlaying = 0;
        }

        callback();

      });

    });

  }, function( error ){

    appStarted = true;

    var startSong = songList[indexPlaying];
    songList = songList.filter( function(item){ return item } );
    indexPlaying = songList.indexOf( startSong );

    playlist.push( songList );

    displayPlaylist();
    loadItem( indexPlaying );

  });

}

var addSong = function( song ){

  if( VALID_MIMES.indexOf( song.mime ) !== -1 ){

    console.log(song);
    var metadata = song.formats.original.metadata;

    if( metadata && metadata.media && metadata.media.duration && metadata.media.duration.seconds ){

      var songItem = songPrototype.clone().removeClass('wz-prototype');

      playlist.push( song );
      songItem.addClass('song-id-' + song.id);
      songItem.find('.title').text( ( metadata && metadata.id3 && metadata.id3.title ) ? metadata.id3.title : song.name );
      songItem.find('.artist').text( ( metadata && metadata.id3 && metadata.id3.artist && metadata.id3.artist[0] )? metadata.id3.artist[0] : lang.unknown );
      songItem.children('figure').css( 'background-image', 'url(' + song.thumbnails['64'] + '), url(https://static.inevio.com/app/5/cover_small.png)' );
      songItem.data( 'index' , playlist._list.length - 1 );
      var time = metadata.media.duration.seconds;
      songItem.find('.time').text( parseDate( time , false ) );
      playListDom.append( songItem );
      $('.playlist-count').text( '(' + playlist._list.length + ' ' + ( (playlist._list.length === 1) ? lang.song : lang.songs ) + ')'  );

    }else{

      var songItem = songPrototype.clone().removeClass('wz-prototype');

      playlist.push( song );
      songItem.addClass('song-id-' + song.id);
      songItem.find('.title').text( ( metadata && metadata.id3 && metadata.id3.title ) ? metadata.id3.title : song.name );
      songItem.children('figure').css( 'background-image', 'url(' + song.thumbnails['64'] + '), url(https://static.inevio.com/app/5/cover_small.png)' );
      songItem.data( 'index' , playlist._list.length - 1 );
      playListDom.append( songItem );
      $('.playlist-count').text( '(' + playlist._list.length + ' ' + ( (playlist._list.length === 1) ? lang.song : lang.songs ) + ')'  );

    }

  }

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

  $('.playlist-count').text( '(' + playlist._list.length + ' ' + ( (playlist._list.length === 1) ? lang.song : lang.songs ) + ')'  );
  dropCover.find('.drop-text').text( lang.dropText );
  dropCover.find('.drop-text-description').text( lang.dropTextDescription );

  var toInsert = [];

  $('.playlist').children().not('.wz-prototype').remove();

  playlist._list.forEach( function( song, index ){

    var metadata = song.formats.original.metadata;

    if( metadata && metadata.media && metadata.media.duration && metadata.media.duration.seconds ){

      var songItem = songPrototype.clone().removeClass('wz-prototype');

      songItem.addClass('song-id-' + song.id);
      songItem.find('.title').text( ( metadata && metadata.id3 && metadata.id3.title ) ? metadata.id3.title : song.name );
      songItem.find('.artist').text( ( metadata && metadata.id3 && metadata.id3.artist && metadata.id3.artist[0] )? metadata.id3.artist[0] : lang.unknown );
      songItem.children('figure').css( 'background-image', 'url(' + song.thumbnails['64'] + '), url(https://static.inevio.com/app/5/cover_small.png)' );
      songItem.data( 'index' , index );

      var time = metadata.media.duration.seconds;

      songItem.find('.time').text( parseDate( time , false ) );
      toInsert.push( songItem );

    }else{

      var songItem = songPrototype.clone().removeClass('wz-prototype');
      songItem.addClass('song-id-' + song.id);
      songItem.find('.title').text( ( metadata && metadata.id3 && metadata.id3.title ) ? metadata.id3.title : song.name );
      songItem.children('figure').css( 'background-image', 'url(' + song.thumbnails['64'] + '), url(https://static.inevio.com/app/5/cover_small.png)' );
      songItem.data( 'index' , index );
      toInsert.push( songItem );
      //console.log('IGNORED',song);

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

  //audio.empty();
  /*audio.append( $('<source></source>').attr('type','audio/mpeg').attr('src', structure.formats['audio/mpeg'].url) );
  audio.append( $('<source></source>').attr('type','audio/ogg').attr('src', structure.formats['audio/ogg'].url) );*/

  if( newAudio ){
    newAudio.stop();
    newAudio.remove();
  }

  newAudio = new AudioWrapper( structure.formats['audio/mpeg'].url );

  musicTitle.text( ( structure.formats && structure.formats.original && structure.formats.original.metadata && structure.formats.original.metadata.id3 && structure.formats.original.metadata.id3.title )? structure.formats.original.metadata.id3.title : structure.name );

  songThumbnail.css( 'background-image', 'url(' + structure.thumbnails['512'] + '), url(https://static.inevio.com/app/5/cover_big.png)' );
  musicArtist.text( ( structure.formats && structure.formats.original && structure.formats.original.metadata && structure.formats.original.metadata.id3 && structure.formats.original.metadata.id3.artist && structure.formats.original.metadata.id3.artist[ 0 ] )? structure.formats.original.metadata.id3.artist[ 0 ] : lang.unknown );

  //audio.load();

  $('.song.active').removeClass('active');

  var song = $('.song-id-' + structure.id).addClass('active');

  /*if( song[ 0 ].offsetTop + song.outerHeight( true ) > playListDom.height() ){
    playListDom.scrollTop( song[ 0 ].offsetTop + song.outerHeight( true ) - playListDom.height() );
  }*/

  if( song[ 0 ] ){

    var offset = 0;
    if( mobile ){

      offset = parseInt( $('.playlist-section .ui-header').outerHeight() , 10 );

    }

    playListDom.stop().clearQueue().animate( { scrollTop : song[ 0 ].offsetTop - offset }, 400 );
  }else{
    console.log('error');
  }

  indexPlaying = index;

  newAudio.on( 'ready' , function( duration ){

    console.log('ready',arguments);
    console.log(currentVolume);
    if( currentVolume < 1 ){
      newAudio.volume( currentVolume );
    }

    weemusicTotalTime.text( parseDate(duration,true) );
    musicVolumeSeeker.addClass('wz-dragger-x');
    musicSeeker.addClass('wz-dragger-x');
    newAudio.duration = duration;

    if( mobile ){

      var uiProgressBackWidth = 2 * parseInt( weemusicTotalTime.css('margin-left') ) + 2 * ( parseInt( musicCurrentTime.outerWidth(true) ) + 1 );
      musicBackprogress.css('width', 'calc(100% - ' + uiProgressBackWidth +'px)');

    }

    newAudio.play( true );

  });

  newAudio.on( 'play' , function( duration ){
    console.log('playing',arguments);
    win.addClass('playing');
  });

  newAudio.on( 'pause' , function( duration ){
    console.log('paused',arguments);
    win.removeClass('playing');
  });

  newAudio.on( 'stop' , function( duration ){
    console.log(Date.now());
    console.log('stopped',arguments);
    win.removeClass('playing');
  });

  newAudio.on( 'ended' , function( duration ){

    console.log(Date.now());
    console.log('ended',arguments);
    if( !musicSeeker.hasClass('wz-drag-active') ){

      musicProgress.width(0);
      musicSeeker.css('left',0);

      if( playlist._repeatMode == 1 ){
        loadItem( playlist._lastId );
      }else{
        loadItem();
      }

    }

  });

  newAudio.on( 'timeupdate' , function( currentTime, duration ){

    musicCurrentTime.text( parseDate(currentTime,false) );
    var backWidth = musicBackprogress.width();
    musicProgress.width( backWidth * ( currentTime / duration ) );

    if( mobile ){
      var backWidth2 = $('.music-backprogress-mobile').width();
      $('.music-progress-mobile').width( backWidth2 * ( currentTime / duration ) );
    }

    if( !musicSeeker.hasClass('wz-drag-active') ){
      musicSeeker.css( 'x', ( backWidth - musicSeeker.width() ) * ( currentTime / duration ) );
    }

  });

};

// Events
win
.on( 'click', '.song', function(){

  if( !$(this).hasClass('active') ){
    loadItem( $(this).data('index') );
  }

})

//TODO
.on( 'wz-dragmove', '.music-volume-seeker', function( e, posX, posY ){

  /*if( win.hasClass('muted') ){
    audio[ 0 ].muted = false;
  }*/

  musicVolume.css( 'width', posX * musicMaxVolume.width() );
  currentVolume = 1 * posX;
  newAudio.volume( 1 * posX );

})

.on( 'wz-dragmove', '.music-time-seeker', function( e, posX, posY ){

  newAudio.pause();

  if( !emulatedSeekerTimer ){

    emulatedSeekerTimer = setInterval( function(){
      newAudio.seek( emulatedSeekerTime );
    }, 100 );

  }

  musicProgress.css( 'width', posX * musicBackprogress.width() );

  /*
   * Como cambiar el currentTime de un elemento es un proceso costoso
   * para el procesador, emulamos ese proceso
   */
  emulatedSeekerTime = newAudio.duration * posX;
  parseDate( emulatedSeekerTime , false );

})

.on( 'click', '.play-button.play', function(){

  if( win.hasClass('playing') ){
    newAudio.pause();
  }else{
    newAudio.play( true );
  }

})

//TODO
.on( typeof cordova === 'undefined' ? 'mousedown' : 'touchstart', '.volume-icon', function(){

  if( win.hasClass('muted') ){
    audio[ 0 ].muted = false;
  }else{
    audio[ 0 ].muted = true;
  }

})

.on( 'click', '.random', function(){

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
  newAudio.seek( emulatedSeekerTime );
  newAudio.play();

})

//TODO
.on( typeof cordova === 'undefined' ? 'mousedown' : 'touchstart', '.play-button.rewind', function(e){

  clickInterval = setInterval( function(){
    audio[0].currentTime -= 10;
    longClick = true;
  } ,400)

})

.on( typeof cordova === 'undefined' ? 'mouseup' : 'touchend', '.play-button.rewind', function(e){

  if( !longClick ){
    loadItem( -1 );
  }

  longClick = false;
  clearInterval( clickInterval );

})

//TODO
.on( typeof cordova === 'undefined' ? 'mousedown' : 'touchstart', '.play-button.forward', function(e){

  clickInterval = setInterval( function(){
    audio[0].currentTime += 10;
    longClick = true;
  } ,400)

})

.on( typeof cordova === 'undefined' ? 'mouseup' : 'touchend', '.play-button.forward', function(e){

  if( !longClick ){
    loadItem();
  }

  longClick = false;
  clearInterval( clickInterval );

})

.on( 'click', '.repeat', function(){

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
    newAudio.pause();
  }else{
    newAudio.play( true );
  }

})

//TODO
.key('right',  
  function(){

    clearInterval( keyInterval );
    keyInterval = setInterval( function(){
      audio[0].currentTime += 10;
      longKeypress = true;
    } ,500);

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

//TODO
.key('left',
    function(){

    clearInterval( keyInterval );
    keyInterval = setInterval( function(){
      audio[0].currentTime -= 10;
      longKeypress = true;
    } ,500);

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

.key('up',
  function(){

    if( ( currentVolume + 0.1 ) < 1){
      currentVolume += 0.1;
      newAudio.volume( currentVolume );
    }else{
      newAudio.volume( 1 );
    }

  },
  function(){

    if( ( currentVolume + 0.1 ) < 1){
      currentVolume += 0.1;
      newAudio.volume( currentVolume );
    }else{
      newAudio.volume( 1 );
    }
  }

)

.key('down',
  function(){

    if( ( currentVolume - 0.1 ) > 0){
      currentVolume -= 0.1;
      newAudio.volume( currentVolume );
    }else{
      currentVolume = 0;
      newAudio.volume( 0 );
    }

  },
  function(){

    if( ( currentVolume - 0.1 ) > 0){
      currentVolume -= 0.1;
      newAudio.volume( currentVolume );
    }else{
      currentVolume = 0;
      newAudio.volume( 0 );
    }

  }

  )


.key('backspace',
  function(){ newAudio.seek(0) },
  function(){ newAudio.seek(0) }

)

.on( 'app-param', function( e, params ){

  //console.log(params);
  if( params && params.command === 'openFile' && !appStarted ){

    if( params.list.length == 0 ){
      params.list = [params.data];
    }
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

.on( 'wz-dropenter', '.wz-drop-area', function(){

  //dropCover.addClass('active').stop().clearQueue().transition( {'transform': 'scale(1)', 'opacity':'1'}, 200 );
  dropCover.addClass('active');

})

.on( 'wz-dropleave', '.wz-drop-area', function(){

  dropCover.removeClass('active')
  //dropCover.stop().clearQueue().transition( {'transform': 'scale(0.8)', 'opacity':'0'}, 200,function(){ dropCover.removeClass('active') } );

})

.on( 'wz-drop', '.wz-drop-area', function( e,item, list ){

  if( list.length ){

    list.forEach( function(song){

      var songApi = song.fsnode;

      songApi.getFormats( function( error, formats ){

        songApi.formats = formats;

        if( findSong( songApi.id ) == -1 ){
          addSong( songApi );
        }

      });

    });

  }

})

.on('click', '.show-playlist , .show-playlist-down', function(){

  if( !transition ){

    transition = true;
    $('.playlist-section').show();

    $('.show-playlist , .show-playlist-down').transition({
      'opacity' : 0
    }, 500, function(){

      $('.playlist-mode').show().transition({
        'opacity' : 1
      },500);

    });

    var scaleX = 60 / parseInt( $('.song-thumbnail').css('width') );
    var scaleY = 60 / parseInt( $('.song-thumbnail').css('height') );
    var newY = parseInt( win.css('height') ) - 60;
    var newBorderRadius = '0px 0px 0px ' + parseInt(6 / scaleX) + 'px';

    $('.song-info').transition({
      'border-radius' : newBorderRadius,
      'transform' : 'translate3d(0, ' + newY + 'px, 0) scale(' + scaleX + ',' + scaleY + ')'
    }, 1000, animationEffect, function(){
      $(this).addClass('in-playlist');
      transition = false;
    });

    $('.song-thumbnail').transition({
      'border-radius' : newBorderRadius
    },1000);

    $('.control-panel-mobile').transition({
      'y' : '166px',
      'background-color' : '#272d33'
    }, 1000, animationEffect, function(){
      $(this).hide();
    });

    $('.control-panel-mobile section').transition({
      'opacity' : 0
    }, 1000);

  }

})

.on('click', '.playlist-mode .song-details, .song-info.in-playlist', function(){

  if( !transition ){

    transition = true;
    $('.show-playlist , .show-playlist-down').transition({
      'opacity' : 1
    }, 500);

    $('.playlist-mode').transition({
      'opacity' : 0
    },500, function(){
      $(this).hide();
    });

    $('.song-thumbnail').transition({
      'border-radius' : '0px'
    },1000);

    $('.song-info').transition({
      'transform' : 'translate3d(0, 0, 0) scale(1)'
    }, 1000, animationEffect, function(){
      $(this).removeClass('in-playlist');
    });

    $('.control-panel-mobile').show().transition({
      'y' : '0',
      'background-color' : '#3f4750'
    }, 1000, animationEffect, function(){
      $('.playlist-section').hide();
    });

    $('.control-panel-mobile section').transition({
      'opacity' : 1
    }, 1000, function(){
      transition = false;
    });

  }

})

.on('ui-view-removed', function(){

  console.log('cierro');
  if( newAudio ){
    newAudio.stop();
    newAudio.remove();
  }

});

/*newaudio.on( 'volumechange', function(){

  if( this.muted ){
    win.addClass('muted');
  }else{
    win.removeClass('muted');
  }

  if( !musicVolumeSeeker.hasClass('wz-drag-active') ){

    musicVolume.css( 'width', currentVolume * musicMaxVolume.width() );
    musicVolumeSeeker.css( 'x', Math.floor( currentVolume * ( musicMaxVolume.width() - musicVolumeSeeker.width() ) ) );

  }
});*/
api.system.on( 'connect' ,function(){
  console.log(Date.now());
  console.log('connect');
})

api.system.on( 'disconnect' ,function(){
  console.log(Date.now());
  console.log('disconnect');
});

