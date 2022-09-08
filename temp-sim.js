class SimuladorTemp extends SerialPVI {

    constructor(baudRate = 9600, paridade = 2) {
        super(baudRate, paridade)
        this.Modbus = {
            RegexReadDeviceID: new RegExp("01 2B 0E 04 81 00 00 01 00 06 49 4E 4F 56 41 00 21 DB"),
            ReqReadDeviceID: "01 2B 0E 04 00 73 27",
            Function: {
                WriteMultipleRegisters: "10",
                ReadHoldingRegisters: "03"
            },
            Address: {
                Slave: "01",
                HoldingRegister: {
                    TipoSensor: "00 1E",
                    ModoOperacao: "00 1F",
                    Valor: "00 20",
                    Grupo: "00 21",
                    ValorLeitura: "00 22",
                    ValorAmbiente: "00 23"
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
     * Ex: SetOutputConfig("J", 300, "A", ()=>{ })
     * 
     * @param {string} sensor Opcoes: "J", "K", "mV"
     * @param {number} valor Ranges: ___ J: [0 - 750] __ K: [0 - 1150] __ mV: [0 - 100]
     * @param {string} grupo Opcoes: "A", "B", "C", "D", "E", "F", "G", "H"
     * @param {function} callback
     */
    SetOutputConfig(callback, sensor, valor, grupo = "A") {

        let result = true
        let msg = ""

        this.OutputConfig.ModoOperacao = "00 00"

        switch (grupo) {
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

            case "F":
                this.OutputConfig.Grupo = "00 05"
                break

            case "G":
                this.OutputConfig.Grupo = "00 06"
                break

            case "H":
                this.OutputConfig.Grupo = "00 07"
                break

            default:
                result = false
                msg += "Grupo Inválido"
                break
        }

        if (result) {
            switch (sensor) {
                case "J":

                    if (!isNaN(valor) && valor >= 10 && valor <= 750) {

                        this.OutputConfig.Valor = SerialPVI.DecimalToHex(valor)
                        this.OutputConfig.TipoSensor = "00 00"
                        result = true
                        msg += "Nova Configuração Recebida"

                    } else {
                        result = false
                        msg += "Não é um número, ou valor fora do range [10 - 750]"
                    }

                    break

                case "K":
                    if (!isNaN(valor) && valor >= 10 && valor <= 1150) {

                        this.OutputConfig.Valor = SerialPVI.DecimalToHex(valor)
                        this.OutputConfig.TipoSensor = "00 01"
                        result = true
                        msg += "Nova Configuração Recebida"

                    } else {
                        result = false
                        msg += "Não é um número, ou valor fora do range [10 - 1150]"
                    }
                    break

                case "mV":
                    if (!isNaN(valor) && valor >= 0 && valor <= 100) {

                        this.OutputConfig.Valor = SerialPVI.DecimalToHex(valor)
                        this.OutputConfig.TipoSensor = "00 02"
                        result = true
                        msg += "Nova Configuração Recebida"

                    } else {
                        result = false
                        msg += "Não é um número, ou valor fora do range [0 - 100]"
                    }
                    break

                default:
                    result = false
                    msg += "Sensor Inválido"
                    break
            }
        }

        callback({
            "result": result,
            "msg": msg
        })
    }

    /**
     * Envia objeto de configuração passado como parametro ao simulador de temperatura
     * 
     * @param {function} callback 
     * @param {number} timeOut 
     * @param {object} config 
     */
    SendOutputConfig(callback, timeOut = 500, config = this.OutputConfig) {

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
                callback({
                    "result": true,
                    "msg": "Sucesso ao enviar a requisição"
                })
            } else {
                callback({
                    "result": false,
                    "msg": "Falha ao enviar a requisição - Simulador não reconheceu comando"
                })
            }

        }, timeOut)
    }

    /**
     * Retorna os valores lidos nas entradas do simulador [Temperatura ambiente e entrada de termopar]
     * 
     * Na leitura de termopar, é retornado também em qual tipo de sensor o valor foi traduzido [Tipo J ou Tipo K]
     * 
     * @param {function} callback 
     * @param {number} timeOut 
     */
    ReqInputValue(callback, timeOut = 500) {

        let nroRegisters = "00 06"
        let startAddress = this.Modbus.Address.HoldingRegister.TipoSensor//temporario
        let regex = new RegExp("01 03 0C [0-9|A-F]{2} [0-9|A-F]{2} [0-9|A-F]{2} [0-9|A-F]{2} [0-9|A-F]{2} [0-9|A-F]{2} [0-9|A-F]{2} [0-9|A-F]{2} [0-9|A-F]{2} [0-9|A-F]{2} [0-9|A-F]{2} [0-9|A-F]{2}")

        let requisicao = this.Modbus.Address.Slave + " "
            + this.Modbus.Function.ReadHoldingRegisters + " "
            + startAddress + " "
            + nroRegisters

        requisicao = CRC16.Calculate(requisicao, this.Modbus.CRCConfig.Reverse, this.Modbus.CRCConfig.ReturnFullString, this.Modbus.CRCConfig.Poly, this.Modbus.CRCConfig.Init)

        this.SendData(requisicao, this.COMPORT)

        setTimeout(() => {

            let byteData = this.ReadData(this.COMPORT).match(regex)

            if (byteData != null) {

                let byteArray = byteData[0].split(" ")

                //indices de bytes da resposta
                let sensorHighByte = 3
                let sensorLowByte = 4
                let valorInputHighByte = 11
                let valorInputLowByte = 12
                let valorAmbienteHighByte = 13
                let valorAmbienteLowByte = 14

                let sensor = CRCUtils.HextoDecimal(byteArray[sensorHighByte] + byteArray[sensorLowByte])
                let valorInput = CRCUtils.HextoDecimal(byteArray[valorInputHighByte] + byteArray[valorInputLowByte]) / 10
                let valorAmbiente = CRCUtils.HextoDecimal(byteArray[valorAmbienteHighByte] + byteArray[valorAmbienteLowByte]) / 10

                switch (sensor) {
                    case 0:
                        sensor = "J"
                        break
                    case 1:
                        sensor = "K"
                        break
                    default:
                        sensor = null
                        break
                }

                callback({
                    "result": true,
                    "msg": "Sucesso ao obter valores",
                    "sensor": sensor,
                    "valorInput": valorInput,
                    "valorAmbiente": valorAmbiente
                })

            } else {
                callback({
                    "result": false,
                    "msg": "Falha ao obter valores"
                })
            }

        }, timeOut)
    }
}

