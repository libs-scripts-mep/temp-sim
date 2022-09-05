class SimuladorTemp extends SerialPVI {

    constructor(baudRate = 9600, paridade = 2) {
        super(baudRate, paridade)
        this.Modbus = {
            RegexReadDeviceID: new RegExp("01 2B 0E 04 81 00 00 01 00 06 49 4E 4F 56 41 00 21 DB"),
            ReqReadDeviceID: "01 2B 0E 04 00 73 27",
            Function: {
                WriteMultipleRegisters: "10"
            },
            Address: {
                Slave: "01",
                HoldingRegister: {
                    TipoSensor: "00 1E",
                    ModoOperacao: "00 1F",
                    Valor: "00 20",
                    Grupo: "00 21"
                },
                InputRegister: {

                }
            },
            CRCConfig: {
                Reverse: true,
                ReturnFullString: true,
                Poly: 0xA001,
                Init: 0xFFFF
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
     * Manipula objeto de configuração de Output baseado nos parametros passados
     * 
     * Ex: SetConfig("J", "Output", 300, "A", ()=>{ })
     * 
     * @param {string} sensor 
     * @param {string} modoOp 
     * @param {number} temp 
     * @param {string} grp 
     * @param {function} callback 
     */
    SetConfig(sensor, modoOp, temp, grp, callback) {

        switch (modoOp) {

            case "Output":
                this.OutputConfig.ModoOperacao = "00 00"

                switch (sensor) {
                    case "J":

                        if (!isNaN(temp) && temp >= 10 && temp <= 750) {

                            this.OutputConfig.Valor = SerialPVI.DecimalToHex(temp)
                            this.OutputConfig.TipoSensor = "00 00"
                            callback(true, "Nova Configuração Recebida")

                        } else {
                            callback(false, "Valor fora do range")
                        }

                        break

                    case "K":
                        if (!isNaN(temp) && temp >= 10 && temp <= 750) {

                            this.OutputConfig.Valor = SerialPVI.DecimalToHex(temp)
                            this.OutputConfig.TipoSensor = "00 01"
                            callback(true, "Nova Configuração Recebida")

                        } else {
                            callback(false, "Valor fora do range")
                        }
                        break

                    case "mV":
                        if (!isNaN(temp) && temp >= 10 && temp <= 750) {

                            this.OutputConfig.Valor = SerialPVI.DecimalToHex(temp)
                            this.OutputConfig.TipoSensor = "00 02"
                            callback(true, "Nova Configuração Recebida")

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

    /**
     * Envia objeto de configuração passado como parametro ao simulador de temperatura
     * 
     * @param {function} callback 
     * @param {number} timeOut 
     * @param {object} config 
     */
    SendConfig(callback, timeOut = 500, config = this.OutputConfig) {

        let regex = new RegExp("01 10 00 1E 00 04 A1 CC")
        let nroRegisters = "00 04"
        let byteCount = "08"

        let requisicao = this.Modbus.Address.Slave + " "
            + this.Modbus.Function.WriteMultipleRegisters + " "
            + this.Modbus.Address.HoldingRegister.TipoSensor + " "
            + nroRegisters + " "
            + byteCount + " "
            + config.TipoSensor + " "
            + config.ModoOperacao + " "
            + config.Valor + " "
            + config.Grupo

        requisicao = CRC16.Calculate(requisicao, this.Modbus.CRCConfig.Reverse, this.Modbus.CRCConfig.ReturnFullString, this.Modbus.CRCConfig.Poly, this.Modbus.CRCConfig.Init)

        this.SendData(requisicao, this.COMPORT)

        setTimeout(() => {

            let byteData = this.ReadData(this.COMPORT).match(regex)

            if (byteData != null) {
                callback(true, "Sucesso ao enviar a requisição")
            } else {
                callback(false, "Falha ao enviar a requisição")
            }

        }, timeOut)
    }
}