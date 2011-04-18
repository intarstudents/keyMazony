var keymazonyListener = {

  CloudPlayer: function(toggle)
  {
    var elem = document.createElement("script");
    elem.type = "text/javascript";
    elem.innerHTML = toggle;
    
    var append = document.head.appendChild(elem);
    document.head.removeChild(append);
  },
  
	init: function(){
    
    if (window.location.href.search(/^https\:\/\/www\.amazon\.com\/gp\/dmusic\/mp3\/player/) != -1){
      safari.self.addEventListener("message", function(request){
      
        var allToggles = {
          "play"      : function(){ keymazonyListener.CloudPlayer("window.amznMusic.widgets.player.masterPlay();"); },
          "stop"      : function(){ keymazonyListener.CloudPlayer("window.amznMusic.widgets.player.pause();"); },
          "prev"      : function(){ keymazonyListener.CloudPlayer("window.amznMusic.widgets.player.playHash('previous', null, null);"); },
          "next"      : function(){ keymazonyListener.CloudPlayer("window.amznMusic.widgets.player.playHash('next', null, null);"); },

          "volup"     : function(){ keymazonyListener.CloudPlayer("var volCont=window.jQuery('.volumeContainer');var volNow=volCont.slider('option','value');if(volNow<=90){window.amznMusic.playerInterface.setVolume((volNow/100)+0.1);volCont.slider('option','value',volNow+10)}else{window.amznMusic.playerInterface.setVolume(1);volCont.slider('option','value',100)}") },
          "voldown"   : function(){ keymazonyListener.CloudPlayer("var volCont=window.jQuery('.volumeContainer');var volNow=volCont.slider('option','value');if(volNow>=10){window.amznMusic.playerInterface.setVolume((volNow/100)-0.1);volCont.slider('option','value',volNow-10)}else{window.amznMusic.playerInterface.setVolume(0);volCont.slider('option','value',0)}"); },
        };
        
        if (request.name == "CloudPlayer" && allToggles[request.message] != undefined){
          allToggles[request.message]();
        }
        
      }, false);
      
    }
    
    if (window.location.href.search(/^safari\-extension\:\/\/com\.intarstudents\.keymazony/) == -1){
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
          	"modifiers" : modifiers,
          	"keycode"   : keycode,
        	};
        
        	safari.self.tab.dispatchMessage("keyup", request);
        	
      	}
      	
    	}, false);
    }
    
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
};

try{

  keymazonyListener.init();
  
}catch(e){
  // Fail, but with dignity!
}