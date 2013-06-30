var keymazony = {

  // Init keymazony object
  init: function(){

    keymazony.acpTabID = null;
    keymazony.debug = false;

    keymazony.defaults = {
      "play"      : '{"modifiers":["control","alt","shift"],"keycode":90,"enabled":true}',
      "stop"      : '{"modifiers":["control","alt","shift"],"keycode":88,"enabled":true}',
      "prev"      : '{"modifiers":["control","alt","shift"],"keycode":65,"enabled":true}',
      "next"      : '{"modifiers":["control","alt","shift"],"keycode":68,"enabled":true}',

      "volup"     : '{"modifiers":["control","shift"],"keycode":190,"enabled":true}',
      "voldown"   : '{"modifiers":["control","shift"],"keycode":188,"enabled":true}'
    };

    // Wait for keyup in another tab
    chrome.extension.onRequest.addListener(function(request, sender, sendResponse){
      if (request.method == "keyup"){

        // Check localStorage for missing link
        for(var toggle in keymazony.defaults){
          if (!localStorage[toggle]){
            localStorage[toggle] = keymazony.defaults[toggle];
            keymazony.log("localStorage fix: " + toggle + " reset");
          }
        }

        var t = null;
        var dismatch = null;
        var action = null;

        // Is this combo valid?
        try{

          for(var toggle in localStorage){
            dismatch = false;
            t = JSON.parse(localStorage[toggle]);

            if (typeof(t["enabled"]) == "undefined"){
              t["enabled"] = true;
              localStorage[toggle] = JSON.stringify(t);
            }

            if (!t["enabled"])
              continue;

            if (t["modifiers"].length != request["modifiers"].length)
              continue;

            for(var i in t["modifiers"]){
              if (t["modifiers"][i] != request["modifiers"][i]){
                dismatch = true;
                break;
              }
            }

            if (dismatch)
              continue;

            if (t["keycode"] != request["keycode"])
              continue;

            action = toggle;
          }

        }catch(e){}

        // Yup, it is, so continue toggling
        if (action){

          keymazony.log("Toggling '" + action + "' ...");

          if (keymazony.acpTabID != null){

            keymazony.toggle(action);

          }else{

            keymazony.log("Searching for Amazon Cloud Player ...");

            chrome.windows.getCurrent(function(currentWindow){
              chrome.tabs.getAllInWindow(currentWindow.id, function(tabs){
                for (var i=0; i<tabs.length; i++){

                  if (tabs[i].url.search(/^https\:\/\/www\.amazon\.com\/gp\/dmusic\/mp3\/player/) != -1){
                    keymazony.acpTabID = tabs[i].id;
                    keymazony.log("The groove is found!");

                    keymazony.toggle(action);
                    break;
                  }
                }

                if (keymazony.acpTabID == null){
                  keymazony.log("Where is groove?!");
                }
              });
            });

          }

        }

      }

      sendResponse({});
    });

    // When tab is removed, check if it wasn't Amazon Cloud Player tab
    chrome.tabs.onRemoved.addListener(function(tabID){
      if (tabID == keymazony.acpTabID){
        keymazony.log("Amazon Cloud Player tab removed!");
        keymazony.acpTabID = null;
      }
    });

  },

  // Debugging is half of victory!
  log: function(msg){
    if (keymazony.debug && msg){
      console.log("keymazony ---> " + msg);
    }
  },

  // Send toggle to Amazon Cloud Player tab
  toggle: function(request){
    if (request){
      chrome.tabs.sendRequest(keymazony.acpTabID, {method : "CloudPlayer", action: request}, function(response){
        if (response.result == 200){
          keymazony.log("Toggled '" + request + "' !");
        }else{
          keymazony.acpTabID = null;
          keymazony.log("Couldn't toggle '" + request +"' !");
        }
      });
    }
  }

}

// keyMazony initialization
keymazony.init();