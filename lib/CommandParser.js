module.exports = class CommandParser extends require('stream').Transform {
	constructor(options) {
		super(options);
		const pStream = require('./ParsedStream');
		this.commandStream = new pStream();
		console.log("init");
		this.textStream = new pStream();
		this.stx = 0x02;
		this.etx = 0x03;
		this.mode = 0;	
	}

	_transform(chunk, encoding, cb) {
		let lastFlush=0;
		for (let i=0;i<chunk.length;i++) {
			let v=chunk.readUInt8(i);			
			if (v == this.stx) {
				if (i>0)
					this.textStream.push(chunk.slice(lastFlush,(i)));
				lastFlush=i+1;
				this.mode=1;
				continue;
			}
			if (v == this.etx) {
				if (i>0)
					this.commandStream.push(chunk.slice(lastFlush,(i)));
				
				this.commandStream.push("\n");
				lastFlush=i+1;				
				this.mode=0;
				continue;
			}
		}
		// flush remaining buffers
		if (this.mode == 0) {
			this.textStream.push(chunk.slice(lastFlush));
		} else {
			this.commandStream.push(chunk.slice(lastFlush));
		}
		cb();		
	}	
	_flush(cb) {
		// nothing should be left for flushing
		cb();
	}	
}
