class CRC16 {
    static Calculate(str, inv = true, fullStr = false, poly = 0xA001, init = 0xFFFF) {

        if (typeof (str) == "object") {

            let arrToStr = ""

            str.forEach((byte) => {
                arrToStr += `${byte} `
            })

            str = arrToStr.trim()
        }

        let crcDecimal = CRC16.CRC16Modbus(CRC16.CleanString(str), init, poly)
        let crcHex = crcDecimal.toString(16).toUpperCase()

        while (crcHex.length < 4) {
            crcHex += "0"
            crcHex.split("").reverse().join("")
        }

        let crc = crcHex.substr(0, 2) + " " + crcHex.substr(2, 3)

        if (inv) {
            crc = CRCUtils.Invert(crc, " ")
        }

        if (fullStr) {
            return str + " " + crc
        } else {
            return crc
        }

    }

    static CRC16Modbus(str, init, poly) {

        let crc = init

        for (let pos = 0; pos < str.length; pos++) {
            crc ^= str.charCodeAt(pos)
            for (let i = 8; i !== 0; i--) {
                if ((crc & 0x0001) !== 0) {
                    crc >>= 1
                    crc ^= poly
                } else
                    crc >>= 1
            }
        }
        return crc
    }

    static CleanString(str) {
        if (str.match(/^[0-9A-F \t]+$/gi) !== null) {
            return this._hexStringToString(str.toUpperCase().replace(/[\t ]/g, '').substr())
        } else {
            return false
        }
    }

    static _hexStringToString(inputstr) {
        let hex = inputstr.toString()
        let str = ''
        for (let i = 0; i < hex.length; i += 2)
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16))
        return str
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

