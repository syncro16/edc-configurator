document.addEventListener("DOMContentLoaded", function(event) { 
	//do work
	const menu = $("<select></select>")
	for (let name in gaugeTypes) {
		$(menu).append("<option>"+name+"</option>")
	}
	$("#menu").append(menu)
	addGauge($("#gauge"),gaugeTypes["RPM"])
});

function addGauge(container,settings) {
	var e = $("<div class='componentGauge'><canvas></canvas></div>");
	e.find('canvas').attr('id','gauge');
	$(container).append(e);


	settings.init.renderTo = 'gauge';
	settings.init.value = '0';
	var gauge = new RadialGauge(settings.init);;    
	settings.instance = gauge;
	gauge.update({ "width": 42,"height": 42 });
	gauge.draw();
	$(document).on('0x4242',(e) => {
			if (typeof conf == "undefined") return;
			if (conf.getTick() % settings.priority == 0)
					gauge.update({"value":e.detail.value})
	} );                    
	return gauge;           
}