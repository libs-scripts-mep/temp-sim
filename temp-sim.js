class CappoInova {

    constructor(context) {
        this.context = context



    }

    send(sensor = 0, valor = 350, entSai = 0, grupo = 1, callback, out = 5) {
        setTimeout(() => {
            let Send = new Map()
            Send.set("node", "01")
            Send.set("command", "10")
            Send.set("RegistrInicial", "00 1E")
            Send.set("NumRegist", "00 04")
            Send.set("NumBytes", "08")
            Send.set("TipoSensor", this.context.serial.DecimalToHex(sensor))
            Send.set("ModoOP", this.context.serial.DecimalToHex(entSai))
            Send.set("Valor", this.context.serial.DecimalToHex(valor))
            Send.set("Grupo", this.context.serial.DecimalToHex(grupo))
            var strReq = this.context.serial.geraStringReq(Send)

            let serialData = ""
            let retries = 0
            var ItCappo = setInterval(() => {
                this.context.serial.SendData(strReq)
                setTimeout(() => {
                    serialData += this.context.serial.ReadData()
                    console.log("data cappo resp ", serialData)
                    if (retries <= out) {
                        if (serialData.includes("01 10 00 1E 00 04 A1 CC")) {
                            clearInterval(ItCappo)
                            callback(true)
                        } else {
                            retries++
                        }
                    } else {
                        clearInterval(ItCappo)
                        callback(false)
                    }
                }, 500)
            }, 2000)

        }, 500)

    }
}

class SimuladorTemp {
    constructor() {
        this.Serial = new Serial()
    }
}