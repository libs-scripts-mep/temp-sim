import { CRC16 } from "../crc/CRC.js"
import { SerialReqManager, SerialPVIUtil } from "../serial-pvi/serial-pvi.js"

/**
 * # Exemplos
 * 
 * ```js
 * const simTemp = new SimuladorTemp()
 * ```
 */
export default class SimuladorTemp extends SerialReqManager {

    constructor() {
        super(9600, 2)
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
                    SensorType: "00 1E",
                    Mode: "00 1F",
                    Value: "00 20",
                    Group: "00 21",
                    Compensation: "00 22",
                    InputValue: "00 23",
                    Ambient: "00 24"
                }
            }
        }
        this.OutputConfig = {
            SensorType: "00 00",
            Mode: "00 00",
            Value: "00 00",
            Group: "00 00",
            Compensation: "00 00"
        }
    }

    SetFirmware(version) {
        try { this.FirmwareVersion = Number.parseFloat(version); return true }
        catch (e) { return false }
    }

    GetFirmware() { return this.FirmwareVersion }

    /**Requisita versao de firmware ao simulador de temperatura*/
    async ReqFirmwareVersion() {

        const versionResponse = await this.WatchForResponse({
            request: this.Modbus.ReqReadDeviceID,
            regex: this.Modbus.RegexReadDeviceID,
            maxTries: 3, tryNumber: 1, readTimeout: 100
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
     * Manipula objeto de configuração de Output
     * 
     * @param {String} sensor tipo de sensor que será simulado
     * @param {Number} value Valor para simulação
     * @param {String} group Seleção de grupo do simulador
     * @param {Boolean} compensation Habilita compensação interna
     * @returns Object
     * 
     * # Exemplos
     * 
     * ```js
     * const simTemp = new SimuladorTemp()
     * simTemp.SetOutputConfig("J", 715, "A", false)
     * ```
     * 
     * ## Opções de simulação e ranges possíveis
     * 
     * `Termpoar tipo J` -10 ~ 760
     * 
     * `Termpoar tipo  K` 0 ~ 1150
     * 
     * `Tensão mV` 0 ~ 100
     * 
     * # Retorno
     * ```js
     * { result: Boolean, msg: String }
     * ```
     */
    SetOutputConfig(sensor, value, group = "A", compensation = false) {

        let result = true
        let msg = ""
        compensation ? this.OutputConfig.Compensation = "00 01" : this.OutputConfig.Compensation = "00 00"
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

                case "mV":
                    if (!isNaN(value) && value >= 0 && value <= 100) {

                        this.OutputConfig.Value = SerialPVIUtil.DecimalToHex(value)
                        this.OutputConfig.SensorType = "00 02"
                        result = true
                        msg += "Nova Configuração Recebida"

                    } else {
                        result = false
                        msg += "Não é um número, ou value fora do range [0 - 100]"
                    }
                    break

                default:
                    result = false
                    msg += "Sensor Inválido"
                    break
            }
        }

        return {
            "result": result,
            "msg": msg
        }
    }

    /**
     * Envia objeto de configuração passado como parametro ao simulador de temperatura
     * 
     * @param {Object} config 
     * @returns Object
     * 
     * # Exemplos
     * 
     * ```js
     * const simTemp = new SimuladorTemp()
     * simTemp.SetOutputConfig("J", 715, "A", false)
     * const result = await simTemp.SendOutputConfig()
     * ```
     * 
     * # Result
     * ```js
     * { result: Boolean, msg: String }
     * ```
     */
    async SendOutputConfig(config = this.OutputConfig) {

        let regex = new RegExp("01 10 00 1E 00 05 60 0C")
        let nroRegisters = "00 05"
        let byteCount = "0A"

        let request = this.Modbus.Address.Slave + " "
            + this.Modbus.Function.WriteMultipleRegisters + " "
            + this.Modbus.Address.HoldingRegister.SensorType + " "
            + nroRegisters + " "
            + byteCount + " "
            + config.SensorType + " "
            + config.Mode + " "
            + config.Value + " "
            + config.Group + " "
            + config.Compensation

        request += ` ${CRC16.Modbus(request.split(" "), "string")}`

        const sendResult = await this.WatchForResponse({
            request: request,
            regex: regex,
            maxTries: 3, tryNumber: 1, readTimeout: 100
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
     * Retorna os valores lidos nas entradas do simulador.
     * 
     * ⚠️ O valor convertido retornado estará de acrodo com o tipo de sensor configurado para leitura!
     * 
     * # Exemplos
     * 
     * ```js
     * const simTemp = new SimuladorTemp()
     * const result = await simTemp.ReqInputValue()
     * ```
     * 
     */
    async ReqInputValue() {

        let regex = new RegExp("01 03 0E ([0-9|A-F]{2} [0-9|A-F]{2}) ([0-9|A-F]{2} [0-9|A-F]{2}) ([0-9|A-F]{2} [0-9|A-F]{2}) ([0-9|A-F]{2} [0-9|A-F]{2}) ([0-9|A-F]{2} [0-9|A-F]{2}) ([0-9|A-F]{2} [0-9|A-F]{2}) ([0-9|A-F]{2} [0-9|A-F]{2})")
        let nroRegisters = "00 07"
        let startAddress = this.Modbus.Address.HoldingRegister.SensorType

        let request = this.Modbus.Address.Slave + " "
            + this.Modbus.Function.ReadHoldingRegisters + " "
            + startAddress + " "
            + nroRegisters

        request += ` ${CRC16.Modbus(request.split(" "), "string")}`

        const inputValues = await this.WatchForResponse({
            request: request,
            regex: regex,
            maxTries: 3, tryNumber: 1, readTimeout: 100
        }, 1000)

        if (inputValues.response != null) {

            let matchInputIndex = 6
            let matchSensorIndex = 1
            let matchAmbientIndex = 7

            let sensor = SerialPVIUtil.HextoDecimal(inputValues.matchResult[matchSensorIndex])
            let ambient = SerialPVIUtil.HextoDecimal(inputValues.matchResult[matchAmbientIndex]) / 10
            let inputValue = SerialPVIUtil.HextoDecimal(inputValues.matchResult[matchInputIndex]) / 10

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
                "ambient": ambient
            }

        } else {
            return {
                "result": false,
                "msg": "Falha ao obter valores"
            }
        }
    }
}

