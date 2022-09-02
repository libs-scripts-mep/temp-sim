class SimuladorTemp {

    constructor(baudRate = 9600, paridade = 2) {

        this.Serial = new SerialPVI(baudRate, paridade) //temporario
        this.RegexID = new RegExp("[0][1][ ][1][0][ ][0][0][ ][1][E][ ][0][0][ ][0][4][ ][A][1][ ][C][C]") //temporario
        this.ReqID = "01 10 00 1E 00 04 08 00 01 00 00 01 2C 00 00 4E A7"
        this.StatusCom = false

        this.Modbus = {
            Address: {
                HoldingRegister: {
                    TipoSensor: "00 1E",
                    ModoOperacao: "00 1F",
                    Valor: "00 20",
                    Grupo: "00 21"
                },
                InputRegister: {

                }
            }
        }
        this.OutputConfig = {
            TipoSensor: "00 00",
            ModoOperacao: "00 00",
            Valor: "00 00",
            Grupo: "00 00"
        }

    }

    /**
     * 
     * @param {function} callback 
     */
    FindComPort(callback) {

        SerialPVI.closeAllPorts()

        this.Serial.getConnectedPortCom(this.ReqID, this.RegexID, (result, COMPort) => {

            if (result) {
                this.StatusCom = true
            }

            callback(result, COMPort)

        }, 500)
    }

    /**
     * 
     * @param {number} timeOut 
     */
    ComCheck(timeOut = 300) {

        this.Serial.SendData(this.ReqID, this.Serial.COMPORT)

        setTimeout(() => {

            let byteData = this.Serial.ReadData(this.Serial.COMPORT).match(this.RegexID)

            if (byteData != null) {

                this.StatusCom = true
                return true

            } else {

                this.StatusCom = false
                return false

            }
        }, timeOut)
    }


    SetConfig(sensor, modoOp, temp, grp, callback) {

        switch (modoOp) {

            case "Output":
                this.OutputConfig.ModoOperacao = "00 00"

                switch (sensor) {
                    case "J":

                        if (!isNaN(temp) && temp >= 10 && temp <= 750) {

                            this.OutputConfig.Valor = SerialPVI.DecimalToHex(temp)
                            this.OutputConfig.TipoSensor = "00 00"
                            callback(false, "Nova Configuração Recebida")

                        } else {
                            callback(false, "Valor fora do range")
                        }

                        break

                    case "K":
                        if (!isNaN(temp) && temp >= 10 && temp <= 750) {

                            this.OutputConfig.Valor = SerialPVI.DecimalToHex(temp)
                            this.OutputConfig.TipoSensor = "00 01"
                            callback(false, "Nova Configuração Recebida")

                        } else {
                            callback(false, "Valor fora do range")
                        }
                        break

                    case "mV":
                        if (!isNaN(temp) && temp >= 10 && temp <= 750) {

                            this.OutputConfig.Valor = SerialPVI.DecimalToHex(temp)
                            this.OutputConfig.TipoSensor = "00 02"
                            callback(false, "Nova Configuração Recebida")

                        } else {
                            callback(false, "Valor fora do range")
                        }
                        break

                    default:
                        callback(false, "Sensor Inválido")
                        break
                }

                switch (grp) {
                    case "A":
                        this.OutputConfig.Grupo = "00 00"
                        break

                    case "B":
                        this.OutputConfig.Grupo = "00 01"
                        break

                    case "C":
                        this.OutputConfig.Grupo = "00 02"
                        break

                    case "D":
                        this.OutputConfig.Grupo = "00 03"
                        break

                    case "E":
                        this.OutputConfig.Grupo = "00 04"
                        break

                    default:
                        this.OutputConfig.Grupo = "00 00"
                        break
                }
                break

            case "Input":
                this.OutputConfig.ModoOperacao = "00 01"
                break

            default:
                callback(false, "Modo Inválido")
                break
        }
    }

    SendConfig(config = this.OutputConfig) {

    }
}