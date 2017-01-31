var EventBridge;
var WebChannel;

var searchTimeout = 0;

var scriptEvents = [];
var repos = [];

$(document).ready(function(){
    document.addEventListener("contextmenu", function(event) {
        event.preventDefault();
    }, false);
    if(typeof window.qt != "undefined"){
        WebChannel = new QWebChannel(qt.webChannelTransport, function (channel) {
            EventBridge = WebChannel.objects.eventBridgeWrapper.eventBridge;
            webEventBridgeCallback(EventBridge);
        });
    }
    setupInv();
    $("#searchbox").keyup(searchInv);
    document.body.onmousedown = function(e){
        if(e.buttons !== 1)return;
        //sendScriptEvent("mouseDown")
        var li = $(e.target).closest("li");
        sendWebEvent("mouseDown",{url:li.data("url"),type:li.data("type")});
        //console.log(li.data("url"));
    }
    document.body.onmouseup = function(e){
        if(e.buttons !== 1){
            sendWebEvent("mouseUp",null);
        }
    }
});

function setupInv(){
    clearInv();
    $("#inventory").jstree({
        plugins: ["search","contextmenu","sort","types","wholerow"],
        core : loadRepos(),
        contextmenu: {items: customMenu},
        search:{show_only_matches:true},
        types:{
            "default":{icon : "glyphicon glyphicon-folder-open"},
            "repo":{icon : "glyphicon glyphicon-compressed"},
            "repofail":{icon : "glyphicon glyphicon-warning-sign"},
            "fbx" :{icon : "glyphicon glyphicon-file"},
            "fst" :{icon : "glyphicon glyphicon-file"},
            "png" :{icon : "glyphicon glyphicon-picture"},
            "jpg" :{icon : "glyphicon glyphicon-picture"},
            "jpeg":{icon : "glyphicon glyphicon-picture"},
            "bmp" :{icon : "glyphicon glyphicon-picture"},
        }
    });
}

function clearInv(){
    $('div:jstree').each(function () {
        $(this).jstree('destroy');
    });
}

function cleanString(str){
    str = str.toLowerCase();
    str = str.replace(/[^0-9a-z/]/g,'');
    return str;
}

function buildInvItem(domain,did,repo,dat){
    var cln = cleanString(dat);
    var prnt = cln.split("/");
    var parent = did;
    if(prnt.length > 1){
        parent = did + "_" + prnt.slice(0,-1).join("/");
    }
    prnt = dat.split("/");
    var file = prnt[prnt.length - 1];
    var ft = file.split(".");
    var d = {url:repo + dat};
    var type = "folder";
    if(ft.length > 1){
        type = ft[ft.length - 1].toLowerCase();
    }
    return {id:did + "_" + cln,parent:parent, text:file, data: d,type:type,li_attr:{"data-url":repo + dat,"data-type":type}};
}

function loadRepos(){
    var listing = [];
    var doner = [];
    var tick = 0;
    if(typeof window.qt != "undefined"){
        for(var r in repos){
            //alert(repos[r]);
            var domain = extractDomain(repos[r]);
            var did = tick + cleanString(domain);
            ++tick;
            $.ajax({
                url: repos[r],
                async: false,
                success: function(data){
                    if(!(data instanceof Array)){
                        data = JSON.parse(data);
                    }
                    if(!(data instanceof Array))return;
                    listing.push({id:did,parent:"#",type:"repo",text:domain,data:{url:repos[r]}});
                    doner.push(repos[r]);
                    for(var i in data){
                        listing.push(buildInvItem(domain,did,repos[r],data[i]));
                    }
                },
                error: function(XMLHttpRequest, textStatus, errorThrown) {
                    console.log("Status: " + textStatus);
                    console.log("Error: " + errorThrown);
                }
            });
        }
        for(var r in repos){
            if(doner.indexOf(repos[r]) < 0){
                var domain = extractDomain(repos[r]);
                var did = tick + cleanString(domain);
                ++tick;
                listing.push({id:did,parent:"#",type:"repofail",text:domain,data:{url:repos[r]}});
            }
        }
    }
    else{
        var domain = extractDomain("http://wlf.io/assets/");
        var did = tick + cleanString(domain);
        listing.push({id:did,parent:"#",type:"repo",text:domain,data:{url:repos[r]}});
        var data = JSON.parse('["Turret","ball.fbx","collie\/collie.fbx","collie\/textures","collie","collie.fst","old\/Collie\/rig.fbx","old\/Collie\/textures","old\/Collie","old\/Collie.fst","old\/Hk45.fbx","old\/Mixamo\/Mixamo.fbx","old\/Mixamo\/textures","old\/Mixamo","old\/Mixamo.fst","old\/collie rig\/collie rig.fbx","old\/collie rig\/textures\/Collie.png","old\/collie rig\/textures","old\/collie rig","old\/collie-blank.fbx","old\/collierig.fst","old\/rig\/rig.fbx","old\/rig\/textures","old\/rig","old\/rig.fst","old"]');
        for(var i in data){
            console.log(data[i]);
            listing.push(buildInvItem(domain,did,"http://wlf.io/assets/",data[i]));
        }
    }

    return {
        data : listing,
       multiple: false
    };
}

function webEventBridgeCallback(eb){
    if (EventBridge !== undefined) {
        EventBridge.scriptEventReceived.connect(scriptEvent);
        scriptEvents["getRepos"] = getRepos;
        sendWebEvent("getRepos",null);
    }
}

function sendWebEvent(type,val){
    if(EventBridge !== undefined){
        EventBridge.emitWebEvent(JSON.stringify({type:type,value:val}));
    }
}

function getRepos(data){
    if(!(data instanceof Array))return;
    repos = [];
    for(var r in data){
        if(typeof data[r] == "string"){
            repos.push(data[r]);
        }
    }
    //if(repos.length < 1)repos = ["https://wlf.io/assets/"];
    //console.log(JSON.stringify(repos));
    setupInv();
}

function addRepo(url){
    var i = repos.indexOf(url);
    if(i >= 0)return;
    repos.push(url);
    sendWebEvent("setRepos",repos);
    setupInv();
}

function removeRepo(url){
    var i = repos.indexOf(url);
    if(i < 0)return;
    delete repos[i];
    sendWebEvent("setRepos",repos);
    setupInv();
}

function scriptEvent(scriptEventData){
    scriptEventData = JSON.parse(scriptEventData);
    if(!(scriptEventData instanceof Array))scriptEventData = [scriptEventData];
    var data;
    for(var i in scriptEventData){
        data = scriptEventData[i];
        if(!data.hasOwnProperty("type") || !data.hasOwnProperty("value"))continue;
        if(scriptEvents.hasOwnProperty(data.type)){
            scriptEvents[data.type](data.value);
        }
    }
}

function searchInv(){
    if(searchTimeout)window.clearTimeout(searchTimeout);
    searchTimeout = window.setTimeout(function(){
        var v = $("#searchbox").val();
        $("#inventory").jstree(true).search(v);
    },250);
}

function extractDomain(url) {
    var domain;
    //find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf("://") > -1) {
        domain = url.split('/')[2];
    }
    else {
        domain = url.split('/')[0];
    }
    //find & remove port number
    domain = domain.split(':')[0];
    return domain;
}

function customMenu(node){
    var items = {};
    if(node.type == "fbx" || node.type == "json"){
        items["rez"] = {
            "separator_before"	: false,
            "separator_after"	: false,
            "_disabled"			: false,
            "label"				: "Rez",
            "action"			: function (data) {
                var inst = $.jstree.reference(data.reference),
                    obj = inst.get_node(data.reference);
                    //console.log(obj);
                    sendWebEvent("rez",{url:obj.data.url,local:false});
            }
        };
    }
    items["copy_adr"] = {
        "separator_before"	: false,
        "separator_after"	: false,
        "_disabled"			: false,
        "label"				: "Copy Address",
        "action"			: function (data) {
            var inst = $.jstree.reference(data.reference),
                obj = inst.get_node(data.reference);
                //console.log(obj);
                copyTextToClipboard(obj.data.url);
        }
    };
    if(node.type == "fst" || node.type == "fbx"){
        items["attach"] = {
            "separator_before"	: true,
            "separator_after"	: false,
            "_disabled"			: false,
            "label"				: "Attach",
            "action"			: function (data) {
                var inst = $.jstree.reference(data.reference),
                    obj = inst.get_node(data.reference);
                    //console.log(obj);
                    //
                    sendWebEvent("attach",{url:obj.data.url,local:false});
            }
        };
    }
    if(node.type == "repo" || node.type == "repofail"){
        items["remrepo"] = {
            "separator_before"	: true,
            "separator_after"	: false,
            "_disabled"			: false,
            "label"				: "Remove Repo",
            "action"			: function (data) {
                var inst = $.jstree.reference(data.reference),
                    obj = inst.get_node(data.reference);
                    //console.log(obj);
                    removeRepo(obj.data.url);
            }
        };
    }
    return items;
}

function copyTextToClipboard(text) {
  var textArea = document.createElement("textarea");

  //
  // *** This styling is an extra step which is likely not required. ***
  //
  // Why is it here? To ensure:
  // 1. the element is able to have focus and selection.
  // 2. if element was to flash render it has minimal visual impact.
  // 3. less flakyness with selection and copying which **might** occur if
  //    the textarea element is not visible.
  //
  // The likelihood is the element won't even render, not even a flash,
  // so some of these are just precautions. However in IE the element
  // is visible whilst the popup box asking the user for permission for
  // the web page to copy to the clipboard.
  //

  // Place in top-left corner of screen regardless of scroll position.
  textArea.style.position = 'fixed';
  textArea.style.top = 0;
  textArea.style.left = 0;

  // Ensure it has a small width and height. Setting to 1px / 1em
  // doesn't work as this gives a negative w/h on some browsers.
  textArea.style.width = '2em';
  textArea.style.height = '2em';

  // We don't need padding, reducing the size if it does flash render.
  textArea.style.padding = 0;

  // Clean up any borders.
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';

  // Avoid flash of white box if rendered for any reason.
  textArea.style.background = 'transparent';


  textArea.value = text;

  document.body.appendChild(textArea);

  textArea.select();

  try {
    var successful = document.execCommand('copy');
    var msg = successful ? 'successful' : 'unsuccessful';
    //console.log('Copying text command was ' + msg);
  } catch (err) {
    //console.log('Oops, unable to copy');
    prompt("Ctrl + C to copy.", text);
  }

  document.body.removeChild(textArea);
}
