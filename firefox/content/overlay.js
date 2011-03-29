var keymazony = {

  // Init keymazony object
  init: function() {
    this.allToggles = {
      "play"      : function(){ keymazony.player.currentPlayer.masterPlay(); },
      "stop"      : function(){ keymazony.player.currentPlayer.pause(); },
      "previous"  : function(){ keymazony.player.currentPlayer.playHash("previous", null, null); },
      "next"      : function(){ keymazony.player.currentPlayer.playHash("next", null, null); },

      "mute"      : function(){ keymazony.player.toggleMute() },
      "volup"     : function(){

        var volCont = keymazony.acpTab.contentWindow.wrappedJSObject.jQuery(".volumeContainer");
        var volNow  = volCont.slider("option","value");

        if (volNow <=90){
          keymazony.player.setVolume((volNow / 100) + 0.1);
          volCont.slider("option","value", volNow + 10);
        }else{
          keymazony.player.setVolume(1);
          volCont.slider("option","value", 100);
        }

      },
      "voldown"   : function(){

        var volCont = keymazony.acpTab.contentWindow.wrappedJSObject.jQuery(".volumeContainer");
        var volNow  = volCont.slider("option","value");

        if (volNow >=10){
          keymazony.player.setVolume((volNow / 100) - 0.1);
          volCont.slider("option","value", volNow - 10);
        }else{
          keymazony.player.setVolume(0);
          volCont.slider("option","value", 0);
        }

      }
    };

    this.defaults = {
      "play"        :  '{"modifiers":["control","alt","shift"],"key":"Z","keycode":"","enabled":true}',
      "stop"        :  '{"modifiers":["control","alt","shift"],"key":"X","keycode":"","enabled":true}',
      "previous"    :  '{"modifiers":["control","alt","shift"],"key":"A","keycode":"","enabled":true}',
      "next"        :  '{"modifiers":["control","alt","shift"],"key":"D","keycode":"","enabled":true}',

      "mute"        :  '{"modifiers":["control","shift"],"key":"M","keycode":"","enabled":true}',
      "volup"       :  '{"modifiers":["control","shift"],"key":">","keycode":"","enabled":true}',
      "voldown"     :  '{"modifiers":["control","shift"],"key":"<","keycode":"","enabled":true}',

      "server_port" : 8800
    }

    this.consoleObject = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
    this.environment = typeof(WebRunner) != "undefined" ? "prism" : "firefox";

    this.player     = undefined;
    this.acpAPI     = undefined;
    this.acpTab     = null;
    this.debug      = false;
    this.readme_url = "http://www.mozilla.org/access/keyboard/";

    this.loadJSON();

    // No need of keyboard shortcuts in Prism
    if (this.enviroment != "prism")
      setTimeout(function(){
        // This timeout here is because keySharky and keyMazony likes to mess up eatch others combo commits.
        keymazony.loadCombos();
      }, 1000);

    if (this.get_server_autostart())
      this.startServer();

    this.log("ready to groove");
  },

  // What must happen when unload accrue
  unload: function(){
    this.stopServer();
  },

  // Start acpAPI server (on users selected port) and register all handlers for it
  startServer: function(){
    try{

      this.acpAPI = Components.classes["@mozilla.org/server/jshttp;1"].
                  createInstance(Components.interfaces.nsIHttpServer);
      var port = this.get_server_port();

      this.acpAPI.registerErrorHandler(404, this.serverErrorParser);
      this.acpAPI.registerPathHandler("/", this.serverErrorParser);

      for(var toggle in this.allToggles){
        this.acpAPI.registerPathHandler("/" + toggle, this.serverParser);
      }

      this.acpAPI.start(port);
      this.log("acpAPI server started (@ http://localhost:" + port + ")");

      return true;

    }catch(e){

      this.log("failed to start acpAPI server");
      return false;

    }
  },

  // Stop acpAPI server and unset acpAPI object
  stopServer: function(){
    try{ this.acpAPI.stop(function(){}); }catch(e){}

    this.acpAPI = undefined;
    this.log("acpAPI server stopped");

    return true;
  },

  // Parse and execute successful methods of acpAPI
  serverParser: function(request, response){
    var toggle = /\/(\w+)/i.exec(request.path);
    response.setHeader("Cache-Control", "no-cache", false);

    if (keymazony.toggle(toggle[1])){
      response.setStatusLine("1.1", 200, "OK");
      response.write("TOGGLING (" + toggle[1] + ") OK");
    }else{
      response.setStatusLine("1.1", 500, "FAILED");
      response.write("TOGGLING (" + toggle[1] + ") FAILED");
    }
  },

  // Not implemented message (or an error)
  serverErrorParser: function(request, response){
    response.setStatusLine("1.1", 501, "Not implemented");
    response.write((<r><![CDATA[
<html>
  <head>
    <title>keyMazony &quot;Hi there!&quot;</title>
  </head>
  <body>
    <div style="width: 450px; margin: 20px auto auto;">
      <h2>Hi there!</h2>

      <p style="font-family: courier, monospace;">
        I'm sad to tell you this, but your requested method doesn't exicst in API (yet?).
        If you are lost, it's possible to find some help by visiting
        <a href="http://wiki.github.com/intarstudents/keymazony/api-server">API server</a> documentation page.
      </p>

      <p style="font-family: courier, monospace;">
         <b>K THX BYE</b>
      </p>

      <hr />

      <p style="font-family: courier, monospace; font-size: 70%;">
        Intars Students<br />
        <a href="mailto:intars@tldr.lv">intars@tldr.lv</a>
      </p>
    </div>
  </body>
</html>
    ]]></r>).toString());
  },

  get_server_autostart: function(){
    var pref = Components.classes["@mozilla.org/preferences-service;1"]
               .getService(Components.interfaces.nsIPrefBranch);
    return pref.getBoolPref("extensions.keymazony.server_autostart");
  },

  set_server_autostart: function(s){
    var pref = Components.classes["@mozilla.org/preferences-service;1"]
               .getService(Components.interfaces.nsIPrefBranch);
    pref.setBoolPref("extensions.keymazony.server_autostart", (s ? true : false));
  },

  get_server_port: function(){
    var pref = Components.classes["@mozilla.org/preferences-service;1"]
               .getService(Components.interfaces.nsIPrefBranch);
    var port = pref.getIntPref("extensions.keymazony.server_port");

    if (port >= 1024 && port <= 65535){
      return port;
    }else{
      return this.defaults["server_port"];
    }
  },

  set_server_port: function(s){
    var pref = Components.classes["@mozilla.org/preferences-service;1"]
               .getService(Components.interfaces.nsIPrefBranch);
    var port = parseInt(s);

    pref.setIntPref("extensions.keymazony.server_port", (port >= 1024 && port <= 65535 ? port : this.defaults["server_port"]));
  },

  // Start or Stop acpAPI server with one click
  toggleServer: function(){
    var toggleButton = this.optionsDoc.getElementById("keymazony-toggleServer");
    var toggleServerPort = this.optionsDoc.getElementById("keymazony-toggleServerPort");

    toggleButton.setAttribute("disabled", true);

    if (toggleButton.getAttribute("label") == "Start"){
      if (this.startServer()){
        toggleButton.setAttribute("label", "Stop");

        toggleButton.setAttribute("disabled", false);
        toggleServerPort.setAttribute("disabled", true);
      }else{
        toggleButton.setAttribute("label", "Couldn't start server!");

        setTimeout(function(){
          var toggleButton = keymazony.optionsDoc.getElementById("keymazony-toggleServer");
          toggleButton.setAttribute("label", "Start");

          toggleButton.setAttribute("disabled", false);
          toggleServerPort.removeAttribute("disabled");
        }, 3000);
      }

    }else{
      if (!this.stopServer())
        this.acpAPI = undefined;

      toggleButton.setAttribute("label", "Start");

      toggleButton.setAttribute("disabled", false);
      toggleServerPort.removeAttribute("disabled");
    }
  },

  // Change acpAPI server autostart option
  toggleServerStartup: function(){
    var toggleServerStartup = this.optionsDoc.getElementById("keymazony-toggleServerStartup");
    this.set_server_autostart(toggleServerStartup.getAttribute("checked"));
  },

  // Change acpAPI server port
  toggleServerPort: function(){
    this.set_server_port(this.optionsDoc.getElementById("keymazony-toggleServerPort").value);
  },

  // Debugging is half of victory!
  log: function(msg){
    if (this.debug && msg){
      this.consoleObject.logStringMessage("keymazony ---> " + msg);
    }
  },

  // Check if Object is Array
  isArray: function(obj){
    return obj.constructor.toString().indexOf("Array") == -1 ? false : true;
  },

  // Fix JSON on Firefox 3.0
  loadJSON: function(){
    try{
      this.JSON = {
        JSON: null,
        parse: function(jsonString) { return this.JSON.fromString(jsonString) },
        stringify: function(jsObject) { return this.JSON.toString(jsObject) }
      }

      Components.utils.import("resource://gre/modules/JSON.jsm", this.JSON);
      this.log("loaded JSON module");
    }catch(e){

      this.JSON = JSON;
      this.log("build-in JSON object linked with keymazony.JSON");

    }
  },

  // Check if JSON object is well build
	checkJSON: function(json){
	  try{
	    if (this.isArray(json["modifiers"]) && json["modifiers"].length && (json["key"] || json["keycode"])){
	      return true;
	    }
	  }catch(e){}

	  return false;
	},

	// Open readme page in new tab
	readme: function(){
	   var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
     var mainWindow = wm.getMostRecentWindow("navigator:browser");

     var newTab = mainWindow.gBrowser.addTab(this.readme_url);
	   mainWindow.gBrowser.selectedTab = newTab;
	},

  // Calling player object build-in external functions
  toggle: function(s){
    this.log("test!@");
    if (this.allToggles[s] != undefined){
      this.log("toggling '" + s + "' ...");

      try{
        this.allToggles[s]();
        this.log("toggled '" + s + "'");

        return true;
      }catch(e){
        this.log(e);
        this.findAmazonCloundPlayer();

        try{
          this.allToggles[s]();
          this.log("toggled '" + s + "'");

          return true;
        }catch(e){
          this.log("couldn't toggle '" + s + "'");
          return false;
        }
      }
    }
  },

  // Searching for Amazon Cloud Player tab
  findAmazonCloundPlayer: function(){

    var mTabs = Array();
    this.log("searching for Amazon Cloud Player tab ...");

    if (this.environment == "prism"){
      mTabs[0] = WebRunner._getBrowser();
    }else{
      mTabs = gBrowser.mTabs;
    }

    try{

      delete this.player;

      for (var i=0; i<mTabs.length; i++){
        var browser = typeof(mTabs[i].loadURI) == "function" ? mTabs[i] : gBrowser.getBrowserForTab(mTabs[i]);

        /*
          Search for tab with URL like:
            https://www.amazon.com/gp/dmusic/mp3/player
        */
        if (browser.currentURI["spec"].search(/^https\:\/\/www\.amazon\.com\/gp\/dmusic\/mp3\/player/) != -1){
          if (browser.contentWindow.wrappedJSObject.Mp3PlayerInterface != undefined){

            this.log("found Amazon Cloud Player");
            this.player = browser.contentWindow.wrappedJSObject.Mp3PlayerInterface;
            this.acpTab = browser;

            break;
          }
        }
      }

    }catch(e){}
  },

  // Reload all available keyboard shortcuts
  loadCombos: function(){
    var id_arr    = Array();
    var json_arr  = Array();
    var i         = 0;

    for(var toggle in this.allToggles){
      id_arr[i]   = toggle;
      json_arr[i] = this.getPref(toggle);
      i++;
    }

    this.setCombos(id_arr, json_arr);
    this.log("combos loaded");
  },

  // Update Options UI
  uiOptions: function(){
    if (this.environment == "firefox"){

      var id_arr    = Array();
      var json_arr  = Array();
      var i         = 0;

      for(var toggle in this.allToggles){
        id_arr[i]   = toggle;
        json_arr[i] = this.getPref(toggle);

        i++;
      }

      this.uiChangeCombos(id_arr, json_arr);

    }else if (this.environment == "prism"){

      this.optionsDoc.getElementById("keymazony-group-playback").style.display = "none";
      this.optionsDoc.getElementById("keymazony-group-sound").style.display = "none";
      this.optionsDoc.getElementById("keymazony-group-readme").style.display = "none";

    }

    this.optionsDoc.getElementById("keymazony-toggleServer").setAttribute("label", (this.acpAPI == undefined ? "Start" : "Stop"));
    this.optionsDoc.getElementById("keymazony-toggleServerStartup").setAttribute("label", "Start with " + (this.environment == "prism" ? "Prism" : "Firefox"))
    this.optionsDoc.getElementById("keymazony-toggleServerStartup").setAttribute("checked", this.get_server_autostart());


    var toggleServerPort = this.optionsDoc.getElementById("keymazony-toggleServerPort");
    toggleServerPort.value = this.get_server_port();

    if (this.acpAPI != undefined)
      toggleServerPort.setAttribute("disabled", true);

    this.log("options UI updated");
  },

  // Update input fields inside Options window
  uiChangeCombos: function(id, json){
    var id_arr    = Array();
    var json_arr  = Array();
    var str       = "";

    // Check for array arguments
    if (!this.isArray(id) && !this.isArray(json)){
      id_arr[0]   = id;
      json_arr[0] = json;
    }else if (this.isArray(id) && this.isArray(json) && id.length == json.length){
      id_arr    = id;
      json_arr  = json;
    }

    // If count on each array is not equal, stop
    if (!id_arr.length || !json_arr.length)
      return;

    for(var i in id_arr){
      str = "";

      for(var modifier in json_arr[i]["modifiers"]){
        str += (str.length ? " + " : "") + (json_arr[i]["modifiers"][modifier] == "control" ? "CTRL" : json_arr[i]["modifiers"][modifier].toUpperCase());
      }

      if (json_arr[i]["keycode"]){
        str += " + " + json_arr[i]["keycode"].replace("VK_", "");
      }else{
        str += " + " + (json_arr[i]["key"] == " " ? "SPACE" : json_arr[i]["key"]);
      }

      if (keymazony.optionsDoc.getElementById("keymazony-toggle-" + id_arr[i] + "-shortcut")){
        keymazony.optionsDoc.getElementById("keymazony-toggle-" + id_arr[i] + "-shortcut").value = str;
      }

      if (keymazony.optionsDoc.getElementById("keymazony-enabler-" + id_arr[i]) && json_arr[i]["enabled"]){
        keymazony.optionsDoc.getElementById("keymazony-enabler-" + id_arr[i]).setAttribute("checked", json_arr[i]["enabled"]);
      }
    }
  },

	// Apply just selected keyboard shortcut, so user can test it out
  applyCombo: function(event, id){
    if (id){
      var old_combo = this.getPref(id);
      var combo = this.recognizeKeys(event);

      // If bad combo, let user try new cambo
      if (!this.checkJSON(combo))
        return;

      combo["enabled"] = old_combo["enabled"];

      this.uiChangeCombos(id, combo);
      this.setPref(id, combo);
      this.setCombos(id, combo);
    }
  },

  // Checkbox toogling action
  toggleCombo: function(id){
    if (this.allToggles[id] != undefined){
      var checkbox = keymazony.optionsDoc.getElementById("keymazony-enabler-" + id);
      var checked = checkbox.getAttribute("checked") ? false : true;

      var json = this.getPref(id);
      json["enabled"] = checked;

      this.setPref(id, json);
      this.setCombos(id, json);
    }
  },

  // Append key object inside mainKeyset
  setCombos: function(id, json){
    var id_arr    = Array();
    var json_arr  = Array();
    var str       = "";

    // Check for array arguments
    if (!this.isArray(id) && !this.isArray(json)){
      id_arr[0]   = id;
      json_arr[0] = json;
    }else if (this.isArray(id) && this.isArray(json) && id.length == json.length){
      id_arr    = id;
      json_arr  = json;
    }

    // If count on each array is not equal - stop
    if (!id_arr.length || !json_arr.length)
      return;

    // Find browser window (or windows)
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    var enumerator = wm.getEnumerator("navigator:browser");

    while(enumerator.hasMoreElements()) {
      var win = enumerator.getNext();

      try{
        // Look for fake key-bind, if it is there, we are in right place
        var keySet = win.document.getElementById("keymazony_key_fake").parentNode.cloneNode(true);
        var keyParent = win.document.getElementById("keymazony_key_fake").parentNode.parentNode;

      }catch(e){
        // Else try next window
        continue;
      }

      for(var i in id_arr){

        if (!this.allToggles[id_arr[i]])
          continue;

        if (json_arr[i]["enabled"]){
          // Create new key element
          var newKey = win.document.createElement("key");
          newKey.setAttribute("id", "keymazony_key_" + id_arr[i]);
          newKey.setAttribute("command", "keymazony_cmd_" + id_arr[i]);
          newKey.setAttribute("modifiers", json_arr[i]["modifiers"].join(" "));
          newKey.setAttribute(
            (json_arr[i]["keycode"] ? "keycode" : "key"),
            (json_arr[i]["keycode"] ? json_arr[i]["keycode"] : json_arr[i]["key"])
          );
        }

        // Delete exciting key for this ID
        for(var x=0; x<keySet.childNodes.length; x++){
          if (keySet.childNodes[x].getAttribute("id") == "keymazony_key_" + id_arr[i]){
            try{
              keySet.removeChild(keySet.childNodes[x]);
            }catch(e){}
            break;
          }
        }

        if (json_arr[i]["enabled"]){
          // And at last append it to cloned object
          keySet.appendChild(newKey);
        }
      }

      // When every key is appended, refresh mainKeyset (by deleting it and appending from clone (yes, it's strange))
      keyParent.removeChild(win.document.getElementById("keymazony_key_fake").parentNode);
      keyParent.appendChild(keySet);

      this.log("mainKeyset updated");
    }
  },

  // Get the list of keycodes from the KeyEvent object
  getKeyCodes: function() {
		var keycodes = new Array();

		for(var property in KeyEvent) {
			keycodes[KeyEvent[property]] = property.replace('DOM_','');
		}

		// VK_BACK_SPACE (index 8) must be VK_BACK
		keycodes[8] = 'VK_BACK';
		return keycodes;
	},

  // Parse keypress event, to get user pressed combo
  recognizeKeys: function(event) {
		var modifiers = new Array();
		var key = '';
		var keycode = '';

		// Get the modifiers:
		if(event.metaKey) modifiers.push('meta');
		if(event.ctrlKey) modifiers.push('control');
		if(event.altKey) modifiers.push('alt');
		if(event.shiftKey) modifiers.push('shift');

		// Get the key or keycode:
		if(event.charCode) {
			key = String.fromCharCode(event.charCode).toUpperCase();
		} else {
			// Get the keycode from the keycodes list:
			keycode = this.getKeyCodes()[event.keyCode];
			if(!keycode) {
				return null;
			}
		}

		if(modifiers.length > 0) {

		  return {
		    "modifiers" : modifiers,
		    "key"       : key,
		    "keycode"   : keycode,
		  };

		}
		return null;
	},

	// Fetch preference for ID
	getPref: function(id){
	  if (this.allToggles[id]){
	    try{

	      var pref = Components.classes["@mozilla.org/preferences-service;1"]
                   .getService(Components.interfaces.nsIPrefBranch);
        var json = this.JSON.parse(pref.getCharPref("extensions.keymazony." + id));

	      if (this.checkJSON(json)){

	        // Backward compatibility
	        if (json["enabled"] == undefined){
	          json["enabled"] = true;
	        }

	        return json;
	      }

	    }catch(e){
	      this.setPref(id, this.JSON.parse(this.defaults[id]));
	    }


	    return this.JSON.parse(this.defaults[id]);
	  }else{
	    return null;
	  }
	},

	// Set preference for ID
	setPref: function(id, json){
	  if (this.allToggles[id]){

	    try{
	      var pref = Components.classes["@mozilla.org/preferences-service;1"]
                   .getService(Components.interfaces.nsIPrefBranch);
        if (this.checkJSON(json)){
          pref.setCharPref("extensions.keymazony." + id, this.JSON.stringify(json));
          return true;
        }else{
          return false;
        }

	    }catch(e){
	      return false;
	    }

	  }else{
	    return false;
	  }
	}

};

window.addEventListener("load", function(e) { keymazony.init(e); }, false);
window.addEventListener("unload", function(e) { keymazony.unload(e); }, false);
