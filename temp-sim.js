import { SerialUtil } from "../serialport-websocket/serial.js"
import { Socket } from "../serialport-websocket/client.js"
import { Modbus } from "../serialport-websocket/modbus.js"

/**
 * # Exemplos
 * 
 * ```js
 * const simTemp = new SimuladorTemp()
 * ```
 */
export default class SimuladorTemp {
    static Modbus = new Modbus(9600, "Cappinho", undefined, 'even')
    static NodeAddress = 0x01

    static ReqReadDeviceID = "012B0E0401B2E7"
    static RegexReadDeviceID = new RegExp("012B0E0481000001010A494E562D434150504F00AA39")

    static Sensors = {
        J: { value: 0x00, min: -10, max: 760 },
        K: { value: 0x01, min: 10, max: 1150 },
        mV: { value: 0x02, min: 0, max: 100 }
    }
    static Groups = { A: 0x00, B: 0x01, C: 0x02, D: 0x03, E: 0x04, F: 0x05, G: 0x06, H: 0x07 }

    static Addr = {
        HoldingRegister: {
            SensorType: 30,//0x1E,
            Mode: 31,//0x1F,
            Value: 32,//0x20,
            Group: 33,//0x21,
            Compensation: 34,//0x22,
            InputValue: 35,//0x23,
            Ambient: 36,//0x2,
        }
    }

    static OutputConfig = {
        SensorType: 0x00,
        Mode: 0x00,
        Value: 0x00,
        Group: 0x00,
        Compensation: 0x0,
    }

    static async Connect() {
        while (!Socket.IO.connected) { await SerialUtil.Delay(1000); console.log(`SimuladorTemp: Aguardando conexão com server...`) }

        const discover = await this.Modbus.portDiscover({ request: this.ReqReadDeviceID, regex: this.RegexReadDeviceID }, { manufacturer: "FTDI" })
        if (!discover.success) { return { success: false, msg: discover.msg } }

        const create = await this.Modbus.create()
        if (!create.success) { return { success: false, msg: create.msg } }

        const setAddr = await this.Modbus.setNodeAddress(this.NodeAddress)
        if (!setAddr.success) { return { success: false, msg: setAddr.msg } }

        return { success: true, msg: `SimuladorTemp: Conexão bem sucedida` }
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
     * SimuladorTemp.SetOutputConfig("J", 715, "A", false)
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
     * { success: Boolean, msg: String }
     * ```
     */
    static SetOutputConfig(sensor, value, group = "A", compensation = false) {

        if (isNaN(value)) { return { success: false, msg: `Valor de temperatura não é um número: ${value}` } }
        if (!this.Groups.hasOwnProperty(group)) { return { success: false, msg: `Valor de grupo é inválido: ${group}` } }
        if (!this.Sensors.hasOwnProperty(sensor)) { return { success: false, msg: `Valor de sensor é inválido: ${sensor}` } }
        if (!(value >= this.Sensors[sensor].min && value <= this.Sensors[sensor].max)) { return { success: false, msg: `Valor de temperatura fora do range: [ ${this.Sensors[sensor].min} : ${this.Sensors[sensor].max} ]` } }

        this.OutputConfig.Mode = 0x00
        this.OutputConfig.Value = value
        this.OutputConfig.Group = this.Groups[group]
        this.OutputConfig.SensorType = this.Sensors[sensor].value
        compensation ? this.OutputConfig.Compensation = 0x01 : this.OutputConfig.Compensation = 0x00

        return { success: true, msg: `Nova configuração recebida` }
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
     * SimuladorTemp.SetOutputConfig("J", 715, "A", false)
     * const result = await SimuladorTemp.SendOutputConfig()
     * ```
     * 
     * # Result
     * ```js
     * { result: Boolean, msg: String }
     * ```
     */
    static async SendOutputConfig() {
        return await this.Modbus.WriteMultipleRegisters(this.Addr.HoldingRegister.SensorType,
            [
                this.OutputConfig.SensorType,
                this.OutputConfig.Mode,
                this.OutputConfig.Value,
                this.OutputConfig.Group,
                this.OutputConfig.Compensation
            ])
    }

    /**
     * Retorna os valores lidos nas entradas do simulador.
     * 
     * ⚠️ O valor convertido retornado estará de acrodo com o tipo de sensor configurado para leitura!
     * 
     * # Exemplos
     * 
     * ```js
     * const result = await SimuladorTemp.ReqInputValue()
     * ```
     * 
     */
    static async ReqInputValue() {

        const result = await this.Modbus.ReadHoldingRegisters(30, 7)

        if (result.success) {

            const sensor = result.msg[0]
            const inputValue = result.msg[5] / 10
            const ambient = result.msg[6] / 10

            let sensorName = ""
            Object.entries(this.Sensors).forEach((props) => {
                if (props[1].value == sensor) { sensorName = props[0] }
            })

            return {
                result: true,
                msg: "Sucesso ao obter valores",
                sensor: sensorName,
                inputValue: inputValue,
                ambient: ambient
            }

        } else {
            return {
                result: false,
                msg: "Falha ao obter valores",
                sensor: null,
                inputValue: null,
                ambient: null
            }
        }
    }

    static {
        window.SimuladorTemp = SimuladorTemp
    }
}

