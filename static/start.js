
wql.getConfig( function( error, result ){

    if( result.length ){     

        if( result[0].mute ){

            win.addClass('muted');

        }

        var volumePosition = result[0].volume * $( '.weemusic-volume-max', win ).width();
        $( '.weemusic-volume-current', win ).css( 'width', volumePosition );
        $( '.weemusic-volume-seeker', win ).css({ x : volumePosition });

    }else{

        wql.insertConfig();

    }

    start();

});
