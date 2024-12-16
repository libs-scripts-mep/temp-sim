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
    static Modbus = new Modbus(9600, "Cappinho", undefined, 'none')
    static NodeAddress = 0x01

    static ReqReadDeviceID = "012B0E0401B2E7"
    static RegexReadDeviceID = new RegExp("012B0E04810000010109494E562D436170706FBEB7")

    static Sensors = {
        J: { value: 0x00, min: -10, max: 760 },
        K: { value: 0x01, min: 10, max: 1150 }
    }

    static Addr = {
        HoldingRegister: {
            SensorType: 8194,//0x2002, j ou k
            Mode: 8195,//0x2003, saída é 0, entrada é 1
            Value: 8196,//0x2004,
            Compensation: 8197,//0x2005, 
            InputValue: 12289,//0x3001,
            Ambient: 12290,//0x3002,
        }
    }

    static OutputConfig = {
        SensorType: 0x00,
        Mode: 0x00,
        Value: 0x00,
        Compensation: 0x00,
    }

    static async Connect() {
        while (!Socket.IO.connected) { await SerialUtil.Delay(1000); console.log(`SimuladorTemp: Aguardando conexão com server...`) }

        const discover = await this.Modbus.portDiscover({ request: this.ReqReadDeviceID, regex: this.RegexReadDeviceID }, { manufacturer: "FTDI" })
        if (!discover.success) { return { success: false, msg: discover.msg } }

        const create = await this.Modbus.create()
        if (!create.success) { return { success: false, msg: create.msg } }

        const setAddr = await this.Modbus.setNodeAddress(this.NodeAddress)
        if (!setAddr.success) { return { success: false, msg: setAddr.msg } }

        const test = await this.ReqInputValue()
        if (!test.result) { return { success: false, msg: `SimuladorTemp: Falha ao estabelecer conexão` } }

        console.log(`SimuladorTemp: Conexão bem sucedida`)

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
        if (!this.Sensors.hasOwnProperty(sensor)) { return { success: false, msg: `Valor de sensor é inválido: ${sensor}` } }
        if (!(value >= this.Sensors[sensor].min && value <= this.Sensors[sensor].max)) { return { success: false, msg: `Valor de temperatura fora do range: [ ${this.Sensors[sensor].min} : ${this.Sensors[sensor].max} ]` } }

        this.OutputConfig.Mode = 0x00
        this.OutputConfig.Value = value
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
                this.OutputConfig.Compensation

            ], 1, 10)

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

        const resultado = await this.Modbus.ReadInputRegisters(12289, 2)
        console.log(resultado)
        const result = await this.Modbus.ReadHoldingRegisters(8194,1)
        console.log(result)
    
        if (resultado.success&&result.success) {

            const sensor = result.msg[0]
            console.log(sensor)
            let sensorName = ""
            if (sensor == 0x00) { sensorName = "J" } else { sensorName = "K" }
            console.log(sensorName)
            
            const inputValue = resultado.msg[0]
            console.log(inputValue)
            const ambient = resultado.msg[1]/10
            console.log(ambient)


            return {
                result: true,
                msg: "Sucesso ao obter valores",
                sensor: sensorName,
                inputValue: inputValue,
                ambient: ambient,
                inputValueNotCompensated: inputValue - ambient
            }

        } else {
            return {
                result: false,
                msg: "Falha ao obter valores",
                sensor: null,
                inputValue: null,
                ambient: null,
                inputValueNotCompensated: null
            }
        }


    }


    static { window.SimuladorTemp = SimuladorTemp }
}

