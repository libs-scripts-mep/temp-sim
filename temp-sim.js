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
            State: 8192,//0x2000, 0=modo normal, 1=modo calibração entrada, 2=modo calibração saída
            StateN: 8193,//0x2001,
            SensorType: 8194,//0x2002, j ou k
            Mode: 8195,//0x2003, saída é 0, entrada é 1
            Value: 8196,//0x2004,
            Compensation: 8197,//0x2005, 
            InputValue: 12289,//0x3001,
            Ambient: 12290,//0x3002,
        }
    }

    static OperationMode = {
        Normal: 0x00,
        CalibrationIN: 0x01,
        CalibrationOUT: 0x02
    }

    static Etapa = {
        Inicial: 0x00,
        Um: 0x01,
        Dois: 0x02,
        Tres: 0x03,
        Quatro: 0x04,
        Cinco: 0x05
    }

    static Mode = {
        OUT: 0x00,
        IN: 0x01,
    }

    static Compensation = {
        state: false,
        OFF: 0x00, //sem compensação interna
        ON: 0x01,   //com compensação interna 
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
        this.Compensation.state = compensation

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
    static async ReqInputValue(compensation = true) {

        const sensor = await this.Modbus.ReadHoldingRegisters(this.Addr.HoldingRegister.SensorType, 1)
        if (!sensor.success) { return { success: false, msg: sensor.msg } }

        if (this.Compensation.state != compensation) {
            const config = await this.Modbus.WriteMultipleRegisters(
                this.Addr.HoldingRegister.State,
                [
                    this.OperationMode.Normal,
                    this.Etapa.Inicial,
                    sensor.msg[0],
                    this.Mode.IN,
                    this.OutputConfig.Value,
                    compensation ? this.Compensation.ON : this.Compensation.OFF
                ],
                1,
                10
            )

            if (!config.success) { return { success: false, msg: config.msg } }

            this.Compensation.state = compensation
            await this.Delay(2500)
        }

        if (sensor.msg[0] === this.Sensors.J.value) {
            sensor.msg[0] = "J"
        } else {
            sensor.msg[0] === this.Sensors.K.value
            sensor.msg[0] = "K"
        }

        const inputValue = await this.Modbus.ReadInputRegisters(this.Addr.HoldingRegister.InputValue, 2)
        if (inputValue.success) {
            return {
                result: true,
                msg: "Sucesso ao obter valores",
                sensor: sensor.msg[0],
                inputValue: inputValue.msg[0] / 10,
                ambient: inputValue.msg[1] / 10,
                inputValueNotCompensated: (inputValue.msg[0] - inputValue.msg[1]) / 10
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

    static async CalibrationInConfig() {

        await this.Modbus.WriteMultipleRegisters(this.Addr.HoldingRegister.State,
            [
                this.OperationMode.CalibrationIN,
                this.Etapa.Inicial,
                this.Sensors.J.value,
                this.Mode.IN,
                0x00,
                this.Compensation.OFF

            ], 1, 10)

        let Operation = await this.Modbus.ReadHoldingRegisters(this.Addr.HoldingRegister.State, 1)
        let Step = await this.Modbus.ReadHoldingRegisters(this.Addr.HoldingRegister.StateN, 1)
        if (!Operation.success || !Step.success) {
            return {
                success: false,
                msg: "Calibração da entrada mal sucedida"
            }
        }
        else if (Operation.msg == this.OperationMode.CalibrationIN && Step.msg == this.Etapa.Inicial) {
            await this.Modbus.WriteMultipleRegisters(this.Addr.HoldingRegister.State,
                [
                    this.OperationMode.CalibrationIN,
                    this.Etapa.Um,
                    this.Sensors.J.value,
                    this.Mode.IN,
                    0x00,
                    this.Compensation.OFF

                ], 1, 10)
            Operation = await this.Modbus.ReadHoldingRegisters(this.Addr.HoldingRegister.State, 1)
            Step = await this.Modbus.ReadHoldingRegisters(this.Addr.HoldingRegister.StateN, 1)
            if (Operation.msg == this.OperationMode.CalibrationIN && Step.msg == this.Etapa.Um) {
                UI.showText(UI.top_main_text, "Simule 10 sensor J no cappo-12 (grupo R) e pressione avança")
                if (!await UI.showAdvance(60000)) {
                    return {
                        success: false,
                        msg: "Calibração cancelada pelo operador"
                    }
                } else {
                    await this.Modbus.WriteMultipleRegisters(this.Addr.HoldingRegister.State,
                        [
                            this.OperationMode.CalibrationIN,
                            this.Etapa.Dois,
                            this.Sensors.J.value,
                            this.Mode.IN,
                            0x00,
                            this.Compensation.OFF

                        ], 1, 10)

                    Step = await this.Modbus.ReadHoldingRegisters(this.Addr.HoldingRegister.StateN, 1)
                    while (Step.msg != this.Etapa.Tres) {
                        Step = await this.Modbus.ReadHoldingRegisters(this.Addr.HoldingRegister.StateN, 1)
                    }
                    UI.showText(UI.top_main_text, "Simule 750 sensor J no cappo-12 (grupo R) e pressione avança")
                    if (!await UI.showAdvance(10000)) {
                        return {
                            success: false,
                            msg: "Calibração cancelada pelo operador"
                        }
                    }
                    await this.Modbus.WriteMultipleRegisters(this.Addr.HoldingRegister.State,
                        [
                            this.OperationMode.CalibrationIN,
                            this.Etapa.Quatro,
                            this.Sensors.J.value,
                            this.Mode.IN,
                            0x00,
                            this.Compensation.OFF

                        ], 1, 10)

                    Operation = await this.Modbus.ReadHoldingRegisters(this.Addr.HoldingRegister.State, 1)
                    Step = await this.Modbus.ReadHoldingRegisters(this.Addr.HoldingRegister.StateN, 1)
                    while (Operation.msg != this.OperationMode.Normal && Step.msg != this.Etapa.Inicial) {
                        Operation = await this.Modbus.ReadHoldingRegisters(this.Addr.HoldingRegister.State, 1)
                        Step = await this.Modbus.ReadHoldingRegisters(this.Addr.HoldingRegister.StateN, 1)
                    }
                    return {
                        success: true,
                        msg: "Calibração da entrada bem sucedida"
                    }

                }

            }

        } else {
            return {
                success: false,
                msg: "Calibração da entrada mal sucedida"
            }
        }


    }

    static async CalibrationOutConfig() {
        const steps = [
            { state: 1, message: "Coloque o cappo-12 (grupo R) em modo entrada.\n Utilice o encoder do cappinho para ajustar a saída para 0ºC.\nPressione avança" },
            { state: 2, message: "Coloque o cappo-12 Sensor J(grupo R) em modo entrada.\n Utilice o encoder do cappinho para ajustar a saída para 750ºC.\nPressione avança" },
            { state: 3, message: "Coloque o cappo-12 Sensor K (grupo S) em modo entrada.\n Utilice o encoder do cappinho para ajustar a saída para 0ºC.\nPressione avança" },
            { state: 4, message: "Coloque o cappo-12 Sensor K (grupo S) em modo entrada.\n Utilice o encoder do cappinho para ajustar a saída para 1150ºC.\nPressione avança" }
        ];

        await this.Modbus.WriteMultipleRegisters(this.Addr.HoldingRegister.State, [
            this.OperationMode.CalibrationOUT,
            this.Etapa.Inicial,
            this.Sensors.J.value,
            this.Mode.OUT,
            0x00,
            this.Compensation.OFF
        ], 1, 10);

        let Operation = await this.Modbus.ReadHoldingRegisters(this.Addr.HoldingRegister.State, 1)
        let Etapa = await this.Modbus.ReadHoldingRegisters(this.Addr.HoldingRegister.StateN, 1)
        if (!Operation.success || !Etapa.success) return { success: false, msg: "Calibração da entrada mal sucedida" };

        for (const step of steps) {
            await this.Modbus.WriteMultipleRegisters(this.Addr.HoldingRegister.State, [
                this.OperationMode.CalibrationOUT,
                step.state,
                this.Sensors.J.value,
                this.Mode.OUT,
                0x00,
                this.Compensation.OFF
            ], 1, 10);

            Operation = await this.Modbus.ReadHoldingRegisters(this.Addr.HoldingRegister.State, 1)
            Etapa = await this.Modbus.ReadHoldingRegisters(this.Addr.HoldingRegister.StateN, 1)
            if (Etapa.msg != step.state) return { success: false, msg: "Calibração da entrada mal sucedida" };

            if (step.message) {
                UI.showText(UI.top_main_text, step.message);
                if (!await UI.showAdvance(60000)) return { success: false, msg: "Calibração da entrada mal sucedida" };
            }
        }

        await this.Modbus.WriteMultipleRegisters(this.Addr.HoldingRegister.State, [
            this.OperationMode.CalibrationOUT,
            this.Etapa.Cinco,
            this.Sensors.J.value,
            this.Mode.OUT,
            0x00,
            this.Compensation.OFF
        ], 1, 10);

        while ((Etapa = await this.Modbus.ReadHoldingRegisters(this.Addr.HoldingRegister.StateN, 1)).msg != 0) {
            Etapa = await this.Modbus.ReadHoldingRegisters(this.Addr.HoldingRegister.StateN, 1)
        }

        return { success: true, msg: "Calibração da entrada bem sucedida" };
    }

    static async Delay(timeout) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve()
            }, timeout)
        })
    }


    static { window.SimuladorTemp = SimuladorTemp }
}