let partBuffer="";

function d(s) {
	let i = -1;
	let str=partBuffer+s;
	do {
		i = str.indexOf("\n");
		if (i != -1) {
			console.log(i,str.slice(0,i));
			str=str.slice(i+1);
		}
	} while (i != -1);
	partBuffer = str;

}

d("moro\nporo\njoo");

d("moro\nporo\njoo");

d("mor")
d("mor")
d("mor")

d("1\n2");