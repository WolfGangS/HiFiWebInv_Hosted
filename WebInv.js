var MENU_NAME = "Edit";
var MENU_ITEM = "Web Inventory";

var REPO_KEY = "io.wlf.webinv.repos";

var webOverlay = null;
var webOpen = true;

var webEvents = [];

var uiHtml = Script.resolvePath("html/WebInv.html");

var mouseUpObject = null;
var mouseUpObjectType = null;

function setup(){
    setupWebEvents();
    addMenu();
    createWebOverlay();
    Script.scriptEnding.connect(scriptEnd);
    Controller.mouseReleaseEvent.connect(mouseUp);
}

function scriptEnd(){
    removeMenu();
}

// <editor-fold> MENU
function addMenu(){
    if(Menu.menuExists(MENU_NAME)){
        if(!Menu.menuItemExists(MENU_NAME,MENU_ITEM)){
            Menu.addMenuItem({
                menuName:       MENU_NAME,
                menuItemName:   MENU_ITEM,
            });
        }
    }
    Menu.menuItemEvent.connect(menuItemEvent);
}

function menuItemEvent(menuItem){
    if(menuItem == MENU_ITEM){
        openWebOverlay();
    }
}

function removeMenu(){
    if(Menu.menuExists(MENU_NAME)){
        if(Menu.menuItemExists(MENU_NAME,MENU_ITEM)){
            Menu.removeMenuItem(MENU_NAME,MENU_ITEM);
        }
    }
}
// </editor-fold>
// <editor-fold> WEB
function createWebOverlay(){
    if(webOverlay == null){
        webOverlay = new OverlayWebWindow({
            title: MENU_ITEM,
            source: uiHtml,
            width: 300,
            height: 600,
            visible: webOpen
        });
        webOverlay.webEventReceived.connect(webEvent);
        webOverlay.closed.connect(webClosed);
        webOverlay.moved.connect(webMoved);
    }
}

function webMoved(){
    mouseUpObject = null;
}

function webClosed(){
    webOpen = false;
    mouseUpObject = null;
}

function openWebOverlay(){
    createWebOverlay();
    webOverlay.setVisible(true);
}
//</editor-fold>

var rezUpInterval = null;
var rezUpID = null;
function rezURLUp(url,pos,local){
    rezUpID = rezURL(url,pos,local);
    var props = Entities.getEntityProperties(rezUpID);
    if(rezUpInterval !== null){
        Script.clearInterval(rezUpInterval);
    }
    rezUpInterval = Script.setInterval(function(){
        var props = Entities.getEntityProperties(rezUpID);
        if(props.hasOwnProperty("id")){
            if(props.dimensions.x != 0.10000000149011612){
                var pos = props.position;
                pos.y += props.dimensions.y * 0.5;
                Entities.editEntity(rezUpID,{position:pos});
                Script.clearInterval(rezUpInterval);
                rezUpInterval = null;
            }
        }
    },10);
}

function rezURL(url,pos,local){
    return Entities.addEntity({type: "Model",modelURL:url,position:pos},local);
}

function setupWebEvents(){
    webEvents["rez"] = rezItem;
    webEvents["getRepos"] = getRepos;
    webEvents["setRepos"] = setRepos;
    webEvents["mouseDown"] = webMouseDown;
    webEvents["mouseUp"] = webMouseUp;
}

function applyTexture(id,url){
    var props = Entities.getEntityProperties(id);
    var tex = JSON.parse(props.originalTextures);
    var ks = Object.keys(tex);
    if(ks.length == 1){
        if(url == tex[ks[0]]){
            Entities.editEntity(id,{textures:""});
        }else{
            tex[ks[0]] = url;
            Entities.editEntity(id,{textures:JSON.stringify(tex)});
        }
    }
}

function mouseUp(event){
    if(!event.isLeftButton){
        mouseUpObject = null;
        return;
    }
    if(mouseUpObject !== null){
        var hit = mouseRay(event);
        if(hit !== false){
            if(mouseUpObjectType == "fbx"){
                rezURLUp(mouseUpObject,hit.intersection,false);
            }
            else if(mouseUpObjectType == "png"){
                applyTexture(hit.entityID,mouseUpObject);
            }
        }
        if(!event.isShifted)mouseUpObject = null;
    }
}

function mouseRay(event){
    var pickRay = Camera.computePickRay(event.x, event.y);
    var result = Entities.findRayIntersection(pickRay, true);
    if(result.intersects)return result;
    return false;
}

function webMouseDown(data){
    if(!data.hasOwnProperty("url") || !data.hasOwnProperty("type"))return;
    mouseUpObject = data.url;
    mouseUpObjectType = data.type;
}

function webMouseUp(data){
    mouseUpObject = null;
}

function rezItem(data){
    print(JSON.stringify(data));
    if(data.hasOwnProperty("url") && data.hasOwnProperty("local")){
        print("REZZING");
        var fw = {x:3,y:0,z:0};
        var off = Vec3.multiplyQbyV(Quat.fromPitchYawRollDegrees(0,MyAvatar.yaw,0),fw);
        rezURL(data.url,Vec3.sum(MyAvatar.position,off),data.local);
    }
}

function setRepos(data){
    Settings.setValue(REPO_KEY,JSON.stringify(data));
}

function getRepos(data){
    var repos = Settings.getValue(REPO_KEY,"[]");
    sendScriptEvent("getRepos",JSON.parse(repos));
}

function sendScriptEvent(type,value){
    webOverlay.emitScriptEvent(JSON.stringify({type:type,value:value}));
}

function webEvent(webEventData){
    webEventData = JSON.parse(webEventData);
    if(!(webEventData instanceof Array))webEventData = [webEventData];
    var data;
    for(var i in webEventData){
        data = webEventData[i];
        if(!data.hasOwnProperty("type") || !data.hasOwnProperty("value"))continue;
        if(webEvents.hasOwnProperty(data.type)){
            webEvents[data.type](data.value);
        }else {
            print(JSON.stringify(data));
        }
    }
}

setup();
