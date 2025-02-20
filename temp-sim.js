
class SimuladorTemp extends SerialReqManager {

    constructor() {
        super(9600, 0)
        this.MAX_TRIES = 10

        this.FirmwareVersion = null
        this.compensation = false
        this.Modbus = {
            RegexReadDeviceID: new RegExp("01 2B 0E 04 81 00 00 01 01 09 49 4E 56 2D 43 61 70 70 6F BE B7"),
            ReqReadDeviceID: "01 2B 0E 04 01 B2 E7",
            Function: {
                WriteMultipleRegisters: "10",
                WriteSingleRegister: "06",
                ReadHoldingRegisters: "03",
                ReadInputRegisters: "04"
            },
            Address: {
                Slave: "01",
                HoldingRegister: {
                    SensorType: "20 02",
                    Mode: "20 03",
                    Value: "20 04",
                    Compensation: "20 05",
                    InputValue: "30 01",
                    Ambient: "30 02"
                }
            }
        }
        this.OutputConfig = {
            SensorType: "00 00",
            Mode: "00 00",
            Value: "00 00",
            Compensation: "00 00"
        }
    }

    SetFirmware(version) {
        try {
            this.FirmwareVersion = Number.parseFloat(version)
            return true
        } catch (e) {
            return false
        }
    }

    GetFirmware() {
        return this.FirmwareVersion
    }

    /**
     * Requisita versao de firmware ao simulador de temperatura
     */
    async ReqFirmwareVersion() {

        const versionResponse = await this.WatchForResponse({
            request: this.Modbus.ReqReadDeviceID,
            regex: this.Modbus.RegexReadDeviceID,
            maxTries: this.MAX_TRIES, tryNumber: 1, readTimeout: 100
        }, 1000)

        let regexVersionGroup = 2

        if (versionResponse.response != null) {
            let version = SerialPVIUtil.ConvertAscii(versionResponse.response[regexVersionGroup]).replaceAll("\x00", "")
            this.SetFirmware(version)
            return {
                "version": version,
                "msg": "Sucesso ao enviar a requisição"
            }
        } else {
            return {
                "version": null,
                "msg": "Falha ao enviar a requisição - Simulador não reconheceu comando"
            }
        }
    }

    /**
     * Manipula objeto de configuração de Output baseado nos parametros passados
     * 
     * Ex: SetOutputConfig("J", 300, "A", ()=>{ })
     * 
     * @param {string} sensor Opcoes: "J", "K", "mV"
     * @param {number} value Ranges: ___ J: [-10 - 760] __ K: [0 - 1150] __ mV: [0 - 100]
     * @param {string} group Opcoes: "A", "B", "C", "D", "E", "F", "G", "H"
     */
    SetOutputConfig(sensor, value, group = "A", compensation = false) {

        let result = true
        let msg = ""
        compensation ? this.OutputConfig.Compensation = "00 01" : this.OutputConfig.Compensation = "00 00" //00 sem compensação interna, 01 com compensação interna 
        this.OutputConfig.Mode = "00 00"

        switch (group) {
            case "A":
                this.OutputConfig.Group = "00 00"
                break

            case "B":
                this.OutputConfig.Group = "00 01"
                break

            case "C":
                this.OutputConfig.Group = "00 02"
                break

            case "D":
                this.OutputConfig.Group = "00 03"
                break

            case "E":
                this.OutputConfig.Group = "00 04"
                break

            case "F":
                this.OutputConfig.Group = "00 05"
                break

            case "G":
                this.OutputConfig.Group = "00 06"
                break

            case "H":
                this.OutputConfig.Group = "00 07"
                break

            default:
                result = false
                msg += "Group Inválido"
                break
        }

        if (result) {
            switch (sensor) {
                case "J":

                    if (!isNaN(value) && value >= -10 && value <= 760) {

                        this.OutputConfig.Value = SerialPVIUtil.DecimalToHex(value)
                        this.OutputConfig.SensorType = "00 00"
                        result = true
                        msg += "Nova Configuração Recebida"

                    } else {
                        result = false
                        msg += "Não é um número, ou value fora do range [-10 - 760]"
                    }
                    break

                case "K":
                    if (!isNaN(value) && value >= 10 && value <= 1150) {

                        this.OutputConfig.Value = SerialPVIUtil.DecimalToHex(value)
                        this.OutputConfig.SensorType = "00 01"
                        result = true
                        msg += "Nova Configuração Recebida"

                    } else {
                        result = false
                        msg += "Não é um número, ou value fora do range [10 - 1150]"
                    }
                    break

                default:
                    result = false
                    msg += "Sensor Inválido"
                    break
            }
        }

        this.compensation = compensation
        return { result, msg }
    }

    /**
     * Envia objeto de configuração passado como parametro ao simulador de temperatura
     * 
     * @param {function} callback 
     * @param {number} timeOut 
     * @param {object} config 
     */
    async SendOutputConfig(config = this.OutputConfig) {

        let regex = new RegExp("01 10 20 02 00 04 6B CA")
        let nroRegisters = "00 04"
        let byteCount = "08"

        let request = this.Modbus.Address.Slave + " "
            + this.Modbus.Function.WriteMultipleRegisters + " "
            + this.Modbus.Address.HoldingRegister.SensorType + " "
            + nroRegisters + " "
            + byteCount + " "
            + config.SensorType + " "
            + config.Mode + " "
            + config.Value + " "
            + config.Compensation

        request += ` ${CRC16.Modbus(request.split(" "), "string")}`

        const sendResult = await this.WatchForResponse({
            request: request,
            regex: regex,
            maxTries: this.MAX_TRIES, tryNumber: 1, readTimeout: 100
        }, 1000)


        if (sendResult.response != null) {
            return {
                "result": true,
                "msg": "Sucesso ao enviar a requisição"
            }
        } else {
            return {
                "result": false,
                "msg": "Falha ao enviar a requisição - Simulador não reconheceu comando"
            }
        }
    }

    /**
     * Retorna os valores lidos nas entradas do simulador [Temperatura ambiente e entrada de termopar]
     * 
     * Na leitura de termopar, é retornado também em qual tipo de sensor o value foi traduzido [Tipo J ou Tipo K]
     * 
     */
    async ReqInputValue(compensation = true) {


        //para conhecer o tipo de sensor

        let regexSensor = new RegExp("01 03 02 ([0-9|A-F]{2} [0-9|A-F]{2}) ([0-9|A-F]{2} [0-9|A-F]{2})")
        let nroRegistersSensor = "00 01"
        let addresSensor = this.Modbus.Address.HoldingRegister.SensorType

        let requestSensor = this.Modbus.Address.Slave + " "
            + this.Modbus.Function.ReadHoldingRegisters + " "
            + addresSensor + " "
            + nroRegistersSensor

        requestSensor += ` ${CRC16.Modbus(requestSensor.split(" "), "string")}`


        const inputValuesSensor = await this.WatchForResponse({
            request: requestSensor,
            regex: regexSensor,
            maxTries: this.MAX_TRIES, tryNumber: 1, readTimeout: 100
        }, 1000)

        let matchSensorIndex = 1
        let sensor = SerialPVIUtil.HextoDecimal(inputValuesSensor.response[matchSensorIndex])

        if (this.compensation != compensation) {
            this.compensation = compensation
            this.SetOutputConfig(sensor, "10", "A", compensation)
            this.SendOutputConfig()
            await this.Delay(3000)
        }

        // para conhecer o value

        let regex = new RegExp("01 04 04 ([0-9|A-F]{2} [0-9|A-F]{2}) ([0-9|A-F]{2} [0-9|A-F]{2})")
        let nroRegisters = "00 02"
        let startAddress = this.Modbus.Address.HoldingRegister.InputValue

        let request = this.Modbus.Address.Slave + " "
            + this.Modbus.Function.ReadInputRegisters + " "
            + startAddress + " "
            + nroRegisters

        request += ` ${CRC16.Modbus(request.split(" "), "string")}`

        const inputValues = await this.WatchForResponse({
            request: request,
            regex: regex,
            maxTries: this.MAX_TRIES, tryNumber: 1, readTimeout: 100
        }, 1000)


        if (inputValues.response != null && inputValuesSensor.response != null) {

            let matchInputIndex = 1
            let matchAmbientIndex = 2


            let ambient = SerialPVIUtil.HextoDecimal(inputValues.response[matchAmbientIndex]) / 10
            let inputValue = SerialPVIUtil.HextoDecimal(inputValues.response[matchInputIndex]) / 10

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

            return {
                "result": true,
                "msg": "Sucesso ao obter valores",
                "sensor": sensor,
                "inputValue": inputValue,
                "ambient": ambient,
                "inputNotCompesationValue": inputValue - ambient
            }

        } else {
            return {
                "result": false,
                "msg": "Falha ao obter valores"
            }
        }
    }

    Delay(timeout) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve()
            }, timeout)
        })
    }

}

