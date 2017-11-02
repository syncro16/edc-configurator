const {RadialGauge} = require("canvas-gauges")
let selectedItem = null
let gauge

$(document).ready(() => { 
	// build menu
	
	const menu = $("<select></select>")
	for (let name in gaugeTypes) {
		$(menu).append("<option>"+name+"</option>")
	}
	$(menu).on('change',(e) => {
		console.log(e);
		let item = $(e.target,find("option:selected"))[0].value;
		setGauge(item);
	})
	$("#menu").append(menu)

	// add gauge and it's resize handlers and event listeners
	setGauge("RPM")

	window.onresize = () => {resize()};
});

function resize() {
	if (selectedItem) {
		console.log(selectedItem);
		let cs = getComputedStyle($('#gaugeContainer')[0]);
		let w = parseInt(cs.getPropertyValue('width'),10);
		let h = parseInt(cs.getPropertyValue('height'),10)-30;
		if (typeof w == "number" && typeof h == "number") {
				let z = Math.min(w,h);                                  
				gauge.update({"width":z,"height":z});
		}
	}
}

function setGauge(type) {
	console.log("setGauge",type);
	if (selectedItem) {
//		console.log("off"+gaugeTypes[selectedItem].bindEdcValue);
		$(document).off(gaugeTypes[selectedItem].bindEdcValue)
		gauge = null
		selectedItem = null
	}
	selectedItem = type                   
	
	let settings = gaugeTypes[type];
	console.log(settings);
	if (typeof settings != "object") {
		console.log("no such gauge");
		return;
	}

	settings.init.renderTo = 'gauge';
	settings.init.value = '0';
	gauge = new RadialGauge(settings.init);;    
	gauge.update({ "width": 42,"height": 42 });
	gauge.draw();
	require('electron').ipcRenderer.on("edc-"+settings.bindEdcValue.toString(16),(e,data) => {
		gauge.update({"value":parseInt(data)});
	} 
	); 
	/*
	$(document).on("edc-"+settings.bindEdcValue.toString(16),(e) => {
		console.log("joo");
			gauge.update({"value":e.detail.value})
	} ); 
	*/
	resize();	
	return gauge;           
}