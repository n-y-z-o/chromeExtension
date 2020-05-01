class ByteBuffer {

    constructor(maximumSize) {
        this.index = 0;
        this.array = new Uint8Array(Math.max(maximumSize, 1));
    }

    putBytes(bytes) {
        for (var i = 0; i < bytes.length; i++) {
            this.array[this.index++] = bytes[i];
        }
    }

    putByte(byte) {
        this.array[this.index++] = byte;
    }

    putIntegerValue(value, length) {

        value = Math.floor(value);
        for (var i = 0; i < length; i++) {
            this.array[this.index + length - 1 - i] = value % 256;
            value = Math.floor(value / 256);
        }
        this.index += length;
    }

    putShort(value) {
        this.putIntegerValue(value, 2);
    }

    putInt(value) {
        this.putIntegerValue(value, 4);
    }

    putLong(value) {
        this.putIntegerValue(value, 8);
    }

    toArray() {
        var result = new Uint8Array(this.index);
        for (var i = 0; i < this.index; i++) {
            result[i] = this.array[i];
        }

        return result;
    }
}
