class SimuladorTemp extends SerialPVI {

    constructor(baudRate = 9600, paridade = 2) {
        super(baudRate, paridade)
        this.FirmwareVersion = null
        this.Modbus = {
            RegexReadDeviceID: new RegExp("(01 2B 0E 04 81 00 00 01 02 05) ([0-9|A-F]{2} [0-9|A-F]{2} [0-9|A-F]{2} [0-9|A-F]{2} [0-9|A-F]{2})"),
            ReqReadDeviceID: "01 2B 0E 04 02 F2 E6",
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
                    Compensacao: "00 22",
                    ValorLeitura: "00 23",
                    ValorAmbiente: "00 24"
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
            Grupo: "00 00",
            Compensacao: "00 00"
        }
    }

    /**
     * Requisita versao de firmware ao simulador de temperatura
     * @param {function} callback 
     * @param {number} timeOut 
     */
    ReqFirmwareVersion(callback, timeOut = 500) {

        this.SendData(this.Modbus.ReqReadDeviceID, this.COMPORT)

        setTimeout(() => {

            let regexVersionGroup = 2
            let byteData = this.ReadData(this.COMPORT).match(this.Modbus.RegexReadDeviceID)

            if (byteData != null) {
                let version = SerialPVI.ConvertAscii(byteData[regexVersionGroup]).replaceAll("\x00", "")
                callback({
                    "version": version,
                    "msg": "Sucesso ao enviar a requisição"
                })
            } else {
                callback({
                    "version": null,
                    "msg": "Falha ao enviar a requisição - Simulador não reconheceu comando"
                })
            }

        }, timeOut)
    }

    /**
     * Atribui a propriedade a versao do firmware do simulador
     * @param {number} version 
     * @returns true se conseguiu parsear, false se nao
     */
    SetFirmware(version) {
        try {
            this.FirmwareVersion = Number.parseFloat(version)
            return true
        } catch (e) {
            return false
        }
    }

    /**
     * 
     * @returns versao de firmware do simulador
     * 
     * OBS: Necessita previamente a utilizacao do metodo ReqFirmwareVersion()
     */
    GetFirmware() {
        return this.FirmwareVersion
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
    SetOutputConfig(callback, sensor, valor, grupo = "A", compensacao = false) {

        let result = true
        let msg = ""
        compensacao ? this.OutputConfig.Compensacao = "00 01" : this.OutputConfig.Compensacao = "00 00"
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

        let regex = new RegExp("01 10 00 1E 00 05 60 0C")
        let nroRegisters = "00 05"
        let byteCount = "0A"

        let requisicao = this.Modbus.Address.Slave + " "
            + this.Modbus.Function.WriteMultipleRegisters + " "
            + this.Modbus.Address.HoldingRegister.TipoSensor + " "
            + nroRegisters + " "
            + byteCount + " "
            + config.TipoSensor + " "
            + config.ModoOperacao + " "
            + config.Valor + " "
            + config.Grupo + " "
            + config.Compensacao

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

        let regex = new RegExp("01 03 0E ([0-9|A-F]{2} [0-9|A-F]{2}) ([0-9|A-F]{2} [0-9|A-F]{2}) ([0-9|A-F]{2} [0-9|A-F]{2}) ([0-9|A-F]{2} [0-9|A-F]{2}) ([0-9|A-F]{2} [0-9|A-F]{2}) ([0-9|A-F]{2} [0-9|A-F]{2}) ([0-9|A-F]{2} [0-9|A-F]{2})")
        let requisicao = "01 03 00 1E 00 07 64 0E"

        this.SendData(requisicao, this.COMPORT)

        setTimeout(() => {

            let byteData = this.ReadData(this.COMPORT).match(regex)

            if (byteData != null) {

                //indices registradores
                let matchSensorIndex = 1
                let matchInputIndex = 6
                let matchAmbienteIndex = 7

                let sensor = CRCUtils.HextoDecimal(byteData[matchSensorIndex])
                let valorInput = CRCUtils.HextoDecimal(byteData[matchInputIndex]) / 10
                let valorAmbiente = CRCUtils.HextoDecimal(byteData[matchAmbienteIndex]) / 10

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

