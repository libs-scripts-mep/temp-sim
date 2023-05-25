class CRC16 {
    static Modbus(buffer, outType = "number") {

        let crc = 0xFFFF
        let odd

        if (typeof buffer[0] == "string") {
            for (let i = 0; i < buffer.length; i++) {
                buffer[i] = parseInt(buffer[i], 16)
            }
        }

        for (let i = 0; i < buffer.length; i++) {
            crc = crc ^ buffer[i]

            for (let j = 0; j < 8; j++) {
                odd = crc & 0x0001
                crc = crc >> 1
                if (odd) {
                    crc = crc ^ 0xA001
                }
            }
        }

        if (outType == "string") {
            crc = CRCUtils.HexToString(crc)
        }

        return crc
    }
}

class CRC8 {
    static Calculate(buffer, inv = false, fullStr = false, poly = 0x07, init = 0xFF) {

        let crc = 0
        let prevCrc = init
        let crc8Table = [256]
        let newArray = []

        if (typeof (buffer) == "string") {
            buffer = buffer.split(" ")
        }

        for (let i = 0; i < 256; i++) {
            crc = i
            for (let j = 0; j < 8; j++) {
                crc = (crc << 1) ^ (((crc & 0x80) > 0) ? poly : 0)
            }
            crc8Table[i] = crc & 0xFF
        }

        buffer.forEach(element => {
            if (element == undefined) {
                newArray.push(255)
            } else {
                newArray.push(CRCUtils.HextoDecimal(element))
            }
        })

        for (let i = 0; i < newArray.length; i++) {
            prevCrc = crc8Table[(prevCrc) ^ (newArray[i])]
        }

        let crcHex = CRCUtils.DecimalToHex(prevCrc)

        if (inv) {
            crcHex = CRCUtils.Invert(crcHex, "")
        }

        if (fullStr) {

            let bufferString = ""

            buffer.forEach((byte) => {
                bufferString += `${byte} `
            })

            return bufferString + crcHex

        } else {
            return crcHex
        }
    }

}

class CRCUtils {

    static HexToString(crc) {
        let high = (crc & 0xFF00).toString(16).toUpperCase()
        high = high.slice(0, high.length - 2)
        while (high.length < 2) high = "0" + high

        let low = (crc & 0xFF).toString(16).toUpperCase()
        while (low.length < 2) low = "0" + low

        return crc = `${low} ${high}`
    }

    static HextoDecimal(d) {
        return Number.parseInt("0x" + d.replace(/[\t ]/g, ''))
    }

    static DecimalToHex(d) {
        let hex = Number(parseInt(d)).toString(16)
        hex = hex.toUpperCase()
        return hex
    }

    static Invert(crc, splitChar) {
        return crc.split(splitChar).reverse().join(splitChar)
    }
}

