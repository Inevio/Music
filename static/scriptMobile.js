// Variables
var VALID_MIMES         = [ 'audio/mp4', 'audio/mpeg', 'audio/x-wav', 'audio/x-vorbis+ogg', 'audio/flac' ]
var win                 = $( document.body )
var musicTitle          = $('.song-title')
var musicProgress       = $('.music-progress')
var musicBackprogress   = $('.music-backprogress')
var musicBufferprogress = $('.music-buffer')
var musicSeeker         = $('.music-time-seeker')
var audio               = $('audio')
var songThumbnail       = $('.song-thumbnail')
var newAudio            = null

/*
 * Las operaciones de cambio de tiempos por drag son muy exigentes en cuanto a procesador,
 * por lo que las emulamos con un pequeño lag.
 * Las variables que declaramos a continuación están pensadas para ello.
 * Ponemos un timer para de vez en cuando forzar que pueda cachear
 */
var emulatedSeekerTimer = 0
var emulatedSeekerTime  = 0
var songList = []

win.addClass('mobile')

var startApp = function( paramsAux ){

  audio.empty()

  api.fs( paramsAux.data, function( error, structure ){

    if( error || VALID_MIMES.indexOf( structure.mime ) === -1 ) return

    structure.getFormats( function( error, formats ){

      console.log(formats)
      structure.formats = formats
      songList[0] = structure
      loadItem(0)

    })

  })

}

var loadItem = function( index ){

  var structure = songList[index]

  if( !structure ) return

  if( newAudio ){
    newAudio.stop()
    newAudio.remove()
  }

  console.log(structure)

  // onedrive song
  if (structure.onedrive) {
    newAudio = new AudioWrapper( 'https://download.horbito.com/onedrive/' + structure.account + '/' + encodeURIComponent( structure.id ) )
    songThumbnail.css( 'background-image', 'url(https://static.horbito.com/app/5/cover_big.png)' )
  // dropbox song
  }else if (structure.dropbox) {
    newAudio = new AudioWrapper( 'https://download.horbito.com/dropbox/' + structure.account + '/' + encodeURIComponent( structure.id ) )
    songThumbnail.css( 'background-image', 'url(https://static.horbito.com/app/5/cover_big.png)' )
  // gdrive song
  }else if (structure.gdrive) {
    newAudio = new AudioWrapper( 'https://download.horbito.com/gdrive/' + structure.account + '/' + encodeURIComponent( structure.id ) )
    songThumbnail.css( 'background-image', 'url(https://static.horbito.com/app/5/cover_big.png)' )
  // horbito song
  }else{
    var audioUrl = structure.formats['audio/mpeg'] ? structure.formats['audio/mpeg'].url : structure.formats.original.url
    newAudio = new AudioWrapper( audioUrl )
    songThumbnail.css( 'background-image', 'url(' + structure.thumbnails['512'] + '), url(https://static.horbito.com/app/5/cover_big.png)' )
  }

  musicTitle.text( ( structure.formats && structure.formats.original && structure.formats.original.metadata && structure.formats.original.metadata.id3 && structure.formats.original.metadata.id3.title )? structure.formats.original.metadata.id3.title : structure.name )

  //musicArtist.text( ( structure.formats && structure.formats.original && structure.formats.original.metadata && structure.formats.original.metadata.id3 && structure.formats.original.metadata.id3.artist && structure.formats.original.metadata.id3.artist )? structure.formats.original.metadata.id3.artist : lang.unknown )

  //audio.load()

  newAudio.on( 'ready' , function( duration ){

    console.log('ready',arguments)
    //console.log(currentVolume)
    musicSeeker.addClass('wz-dragger-x')
    newAudio.duration = duration
    var uiProgressBackWidth = 2
    musicBackprogress.css('width', 'calc(100% - ' + uiProgressBackWidth +'px)')
    newAudio.play( true )

  })

  newAudio.on( 'play' , function( duration ){
    console.log('playing',arguments)
    win.addClass('playing')
  })

  newAudio.on( 'pause' , function( duration ){
    console.log('paused',arguments)
    win.removeClass('playing')
  })

  newAudio.on( 'stop' , function( duration ){
    console.log('stopped',arguments)
    win.removeClass('playing')
  })

  newAudio.on( 'ended' , function( duration ){

    console.log('ended',arguments)
    if( !musicSeeker.hasClass('wz-drag-active') ){
      musicProgress.width(0)
      musicSeeker.css('left',0)
    }

  })

  newAudio.on( 'timeupdate' , function( currentTime, duration ){

    var backWidth = musicBackprogress.width()
    musicProgress.width( backWidth * ( currentTime / duration ) )

    var backWidth2 = $('.music-backprogress-mobile').width()
    $('.music-progress-mobile').width( backWidth2 * ( currentTime / duration ) )

    if( !musicSeeker.hasClass('wz-drag-active') ){
      musicSeeker.css( 'x', ( backWidth - musicSeeker.width() ) * ( currentTime / duration ) )
    }

  })

}

// Events
win
.on( 'wz-dragmove', '.music-time-seeker', function( e, posX, posY ){

  newAudio.pause()

  if( !emulatedSeekerTimer ){

    emulatedSeekerTimer = setInterval( function(){
      newAudio.seek( emulatedSeekerTime )
    }, 100 )

  }

  musicProgress.css( 'width', posX * musicBackprogress.width() )

  /*
   * Como cambiar el currentTime de un elemento es un proceso costoso
   * para el procesador, emulamos ese proceso
   */
  emulatedSeekerTime = newAudio.duration * posX
  parseDate( emulatedSeekerTime , false )

})

.on( 'click', '.play-button.play', function(){

  if( win.hasClass('playing') ){
    newAudio.pause()
  }else{
    newAudio.play( true )
  }

})

.on( 'wz-dragend', '.music-time-seeker', function(){

  clearInterval( emulatedSeekerTimer )
  emulatedSeekerTimer    = 0
  newAudio.seek( emulatedSeekerTime )
  newAudio.play()

})

.on( 'app-param', function( e, params ){

  console.log(params)
  if( params && params.command === 'openFile' ){

    if( params.list.length == 0 ){
      params.list = [params.data]
    }
    startApp( params )

  }

})

.on('ui-view-removed', function(){

  console.log('cierro')
  if( newAudio ){
    newAudio.stop()
    newAudio.remove()
  }

})

.on( 'click', '.close', function(){
  //console.log(appId)
  api.app2.closeApp(appId)
})

if( window.params ){
  startApp( window.params )
}