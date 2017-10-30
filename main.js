const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')

const serialport = require('serialport');
const {ipcMain} = require('electron')
const CommandParser = require('./lib/CommandParser');
const parser = new CommandParser();
const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('latin1');

const windows = {
	instrumentation:{
		file:"view/instrumentation.html",
		x:600,
		y:64,
		width:640,
		height:420,
		count:0,
		instances:[],
	},
	mapEditor:{
		file:"view/mapEditor.html",		
		x:64,
		y:64,
		width:320,
		height:200,
		count:0,
		instances:[],		
	},
	pidEditor:{
		file:"view/pidEditor.html",				
		x:64,
		y:64,
		width:320,
		height:200,
		count:0,
		instances:[],		
	},
	paramsEditor:{
		file:"view/paramsEditor.html",				
		x:64,
		y:64,
		width:320,
		height:200,
		count:0,
		instances:[],		
	}	
}


let serial = null;
let serialKnownPorts = null;
let serialSelectedName = null;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let consolewindow

function createConsoleWindow () {
	// Create the browser window.
	consoleWindow = new BrowserWindow({width: 400, height: 130})
	consoleWindow.setPosition(8,32);

	// and load the index.html of the app.
	consoleWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'console.html'),
		protocol: 'file:',
		slashes: true
	}))
	
	// Emitted when the window is closed.
	consoleWindow.on('closed', function () {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		consoleWindow = null
		app.quit();		
	})
	appMenuBuild();
	
	consoleWindow.webContents.on('did-finish-load', () => {
		/* wait until console is loaded */
		updateSerial();
	})
	/* pääikkunaksi konsoli	 */
}

function createWindow(type) {
	let s = windows[type]
//	console.log(s)
	let w = new BrowserWindow({width: s.width, height: s.height,  webPreferences: { webSecurity: false }})
	w.setPosition(s.x+s.count*22,s.y+s.count*22)
	s.count++
	// and load the index.html of the app.
	w.loadURL(url.format({
		pathname: path.join(__dirname, s.file),
		protocol: 'file:',
		slashes: true
	}))	
	s.instances.push(w)
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
	let partBuffer="";
	parser.textStream.on('data',(e)=>{
		consoleMessage(decoder.write(e));
	});
	parser.commandStream.on('data',(e)=>{	
		// parse incoming stream to events, each command frame is "type:string\n"
		let i = -1;
		let str=partBuffer+decoder.write(e);
		do {
			i = str.indexOf("\n");
			if (i != -1) {
				let e=str.slice(0,i);
				const cmd = e.slice(0,e.indexOf(":"));
				const data = e.slice(e.indexOf(":")+1);
				receiveSystemEvent(cmd,data);
				str=str.slice(i+1);
			}
		} while (i != -1);
		partBuffer = str;
		
	});
	
	createConsoleWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', function () {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (consoleWindow === null) {
		createConsoleWindow()
	}
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

function appMenuBuild() {
	const {app, Menu} = require('electron')
	
	const template = [
		{
			label: "File",
			submenu: [
				{label:"New Instrumentation window",accelerator: 'CmdOrCtrl+N', click() {createWindow("instrumentation") }},
				{label:"New Parameter editor window", click() {createParamEditorWindow() }},
				{label:"New Map editor window", click() {createMapEditorWindow() }},
				{label:"New PID editor window", click() {createPIDEditorWindow() }},
				{type: 'separator'},
				{label:"Open …", click() {console.log("moro")}},
				{label:"Save As …", click() {console.log("moro")}},
				{type: 'separator'},
				{role: 'quit'},		
			]
		},	 
		{
			label: 'Edit',
			submenu: [
				{role: 'undo'},
				{role: 'redo'},
				{type: 'separator'},
				{role: 'cut'},
				{role: 'copy'},
				{role: 'paste'},
				{role: 'pasteandmatchstyle'},
				{role: 'delete'},
				{role: 'selectall'}
			]
		},
		{
			label: 'Device',
			submenu: [
				{label:(serial?"Disconnect":"Connect"), click(a) { if (a.label == "Connect") {serialSetConnectState(true)} else {serialSetConnectState(false);} }},	
				{label:"Show Diagnostic Trouble Codes", enabled:(serial?true:false),click() {console.log("moro")}},										
				{label:"Save settings to flash", enabled:(serial?true:false),click() {console.log("moro")}},						
				{type: 'separator'},	
				{label:"Device Port",enabled:false},
/*				{type: 'separator'},	
				{label:"Show Console window", click() {console.log("moro")}},*/			
			]
		},		
		{
			label: 'View',
			submenu: [
				{role: 'reload'},
				{role: 'forcereload'},
				{role: 'toggledevtools'},
				{type: 'separator'},
				{role: 'resetzoom'},
				{role: 'zoomin'},
				{role: 'zoomout'},
				{type: 'separator'},
				{role: 'togglefullscreen'}
			]
		},
		{
			role: 'window',
			submenu: [
				{role: 'minimize'},
				{role: 'close'}
			]
		},
		{
			role: 'help',
			submenu: [
				{
					label: 'Project homepage',
					click () { require('electron').shell.openExternal('http://dmn.kuulalaakeri.org/') }
				}
			]
		}
	]
	if (serialKnownPorts == null || serialKnownPorts.length == 0) {
		template[2]['submenu'].push({label:"No ports found",enabled:false});		
	} else {
		for (let i in serialKnownPorts) {
			template[2]['submenu'].push({"type":"radio",
			label:serialKnownPorts[i].comName,checked:(serialKnownPorts[i].comName==serialSelectedName?true:false),
			click(a){menuSelectDevice(a)} });
		}
	}
	if (process.platform === 'darwin') {
		template.unshift({
			label: app.getName(),
			submenu: [
				{role: 'about'},
				{type: 'separator'},
				{role: 'services', submenu: []},
				{type: 'separator'},
				{role: 'hide'},
				{role: 'hideothers'},
				{role: 'unhide'},
				{type: 'separator'},
				{role: 'quit'}
			]
		})
		/*
		// Edit menu
		template[1].submenu.push(
			{type: 'separator'},
			{
				label: 'Speech',
				submenu: [
					{role: 'startspeaking'},
					{role: 'stopspeaking'}
				]
			}
		)
		*/
		// Window menu
		template[5].submenu = [
			{role: 'close'},
			{role: 'minimize'},
			{role: 'zoom'},
			{type: 'separator'},
			{role: 'front'}
		]
	}
	
	const menu = Menu.buildFromTemplate(template)
	Menu.setApplicationMenu(menu)
}

function menuSelectDevice(a,aa) {
	if (serial) {
		consoleMessage("Disconnect");		
		serial.close();
	}
	serial = null;
	serialSelectedName = a.label;
	appMenuBuild();
}
function updateSerial() {
	serialport.list().then((a)=>{
		if (JSON.stringify(serialKnownPorts) != JSON.stringify(a)) {
			console.log("updateMenu");
			serialKnownPorts = a;
			for (let i in serialKnownPorts) {
				if (serialSelectedName == null && serialKnownPorts[i].manufacturer == "STMicroelectronics") {
					serialSelectedName = serialKnownPorts[i].comName;
					consoleMessage("Board found at: "+serialSelectedName+"\n",true);
					serialSetConnectState(true);
				}
			}
			appMenuBuild();
		}
		setTimeout(updateSerial,1000);					
	}).catch((e)=>{
		consoleMessage("error:"+e+"\n");
		console.log(e);
		setTimeout(updateSerial,1000);	
	});		 
}

let serialConnectionCheckTimeout = null;
let serialConnectionCheckOk = false;

function serialSetConnectState(state) {
	console.log("setConn",state);
	if (state) {
		serial = new serialport(serialSelectedName,{baudRate:115200});
		consoleMessage("Connected: "+serialSelectedName+"\n");
		serialConnectionCheckOk = false;
		sendSystemEvent("PING","test42");

		clearTimeout(serialConnectionCheckTimeout);
		serialConnectionCheckTimeout = setTimeout(function() {
			if (!serialConnectionCheckOk) {
				consoleMessage("No reply from controller.\n")
				serialSetConnectState(false);
			}
		},2400);
		
		serial.on('error',(err) => {
			consoleMessage("error:"+err.message);
			serial.close();
			serial=null;
			appMenuBuild();			
			});
		serial.pipe(parser); 
	} else {
		consoleMessage("Disconnnected.\n");
		serial.close();
		serial = null;
	}
	appMenuBuild();
}

function consoleMessage(str,clearAll) {
	consoleWindow.webContents.send('consoleMessage', {"msg":str,"clearAll":clearAll});
}

function receiveSystemEvent(eventName,data) {
	/* forward event from the edc to application */
	console.log("receiveSystemEvent:",eventName,"data:", data);
	switch(eventName) {
		case "PONG":
			serialConnectionCheckOk=true;
			consoleMessage(data+"\n");
		break;
	}
}

function sendSystemEvent(eventName,data) {
	if (typeof eventName != "string")
		throw(new Error("eventName is not string"));
	serial.write([0x02]);
	serial.write(eventName);
	serial.write(':')
	if (typeof data != "undefined")
		serial.write(data);
	serial.write([0x03]);	
}