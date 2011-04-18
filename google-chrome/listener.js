var keymazonyListener = {

  CloudPlayer: function(toggle)
  {
    // Chrome ... WTF did you made me write?
    var elem = document.createElement("script");
    elem.type = "text/javascript";
    elem.innerHTML = toggle;

    var append = document.head.appendChild(elem);
    document.head.removeChild(append);
  },

  // Init keymazonyListener object
  init: function(){

    if (window.location.href.search(/^https\:\/\/www\.amazon\.com\/gp\/dmusic\/mp3\/player/) != -1){

      chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
        var allToggles = {
          "play"      : function(){ keymazonyListener.CloudPlayer("window.Mp3PlayerInterface.currentPlayer.masterPlay();"); },
          "stop"      : function(){ keymazonyListener.CloudPlayer("window.Mp3PlayerInterface.currentPlayer.pause();"); },
          "prev"      : function(){ keymazonyListener.CloudPlayer("window.Mp3PlayerInterface.currentPlayer.playHash('previous', null, null);"); },
          "next"      : function(){ keymazonyListener.CloudPlayer("window.Mp3PlayerInterface.currentPlayer.playHash('next', null, null);"); },

          "mute"      : function(){ keymazonyListener.CloudPlayer("window.Mp3PlayerInterface.toggleMute();"); },
          "volup"     : function(){ keymazonyListener.CloudPlayer("var volCont=window.jQuery('.volumeContainer');var volNow=volCont.slider('option','value');if(volNow<=90){window.Mp3PlayerInterface.setVolume((volNow/100)+0.1);volCont.slider('option','value',volNow+10)}else{window.Mp3PlayerInterface.setVolume(1);volCont.slider('option','value',100)}") },
          "voldown"   : function(){ keymazonyListener.CloudPlayer("var volCont=window.jQuery('.volumeContainer');var volNow=volCont.slider('option','value');if(volNow>=10){window.Mp3PlayerInterface.setVolume((volNow/100)-0.1);volCont.slider('option','value',volNow-10)}else{window.Mp3PlayerInterface.setVolume(0);volCont.slider('option','value',0)}"); },
        };

        if (request.method == "CloudPlayer" && allToggles[request.action] != undefined){

          try{
            allToggles[request.action]();
            sendResponse({"result" : 200});
          }catch(e){
            sendResponse({"result" : 500});
          }

        }
      });

    }

    this.unAllowedKeys = [16, 17, 18, 91];

    // Inject in tab keyup listener, who will check for (maybe) valid keymazony combo
    window.addEventListener('keyup', function(event){

      var modifiers = new Array();
      var key = '';
      var keycode = '';

      // Get the modifiers
      if(event.metaKey) modifiers.push('meta');
      if(event.ctrlKey) modifiers.push('control');
      if(event.altKey) modifiers.push('alt');
      if(event.shiftKey) modifiers.push('shift');

      // Get keycode
      if(event.keyCode) {
        keycode = event.keyCode;
      }

      if(modifiers.length > 0 && !keymazonyListener.inArray(keymazonyListener.unAllowedKeys, keycode)) {

        var request = {
          "method" : "keyup",
          "modifiers" : modifiers,
          "keycode"   : keycode,
        };
        chrome.extension.sendRequest(request, function(response){});

      }

    }, false);

  },

  // Check if Object is Array
  inArray: function(arr, value){
    var i;
    for (i=0; i < arr.length; i++) {
      if (arr[i] === value) {
        return true;
      }
    }
    return false;
  }

}

try{

  keymazonyListener.init();

}catch(e){
  // Fail, but with dignity!
}
