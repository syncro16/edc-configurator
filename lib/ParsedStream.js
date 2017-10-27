module.exports = class ParsedStream extends require('stream').Readable {
	_read() {}
	sendPacket(data) {
		this.push(data)
	}
}
