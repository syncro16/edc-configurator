const {ipcRenderer} = require('electron')
let lines=0;

ipcRenderer.on('consoleMessage', (event, arg) => {
	if (arg.clearAll)  {
		$('body').empty();	
		lines=0;
	}
	if (lines>1000) {
		$('body').empty();	
/*		
		let text = $('body').html();
		if (text.indexOf("<br>") != -1) {
			text = text.slice(text.indexOf("<br>")+4);
			lines--;
			$('body').html(text);
		}*/
		lines=0;
	}
	$('body').append(arg.msg.replace(/\n/g,"<br>"));
	window.scrollTo(0,document.body.scrollHeight);
	lines++;
})
