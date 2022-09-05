# Simulador de Temperatura Inova

## Instalando

Abra o terminal, e na pasta do script, execute:

```
npm i @libs-scripts-mep/temp-sim
```

Após fianlizada a instalação da biblioteca, inclua em seu html:

```html
<script src="node_modules/@libs-scripts-mep/temp-sim/temp-sim.js"></script>
```

> ⚠️ Se seu projeto não utiliza a [serial-pvi](https://www.npmjs.com/package/@libs-scripts-mep/serial-pvi) ou [crc](https://www.npmjs.com/package/@libs-scripts-mep/crc), será necessário incluir também em seu html:

```html
<script src="node_modules/@libs-scripts-mep/temp-sim/node_modules/@libs-scripts-mep/crc/CRC.js"></script>
<script src="node_modules/@libs-scripts-mep/temp-sim/node_modules/@libs-scripts-mep/serial-pvi/serial-pvi.js"></script>
```
## Resumo da Classe

```js 
//temp-sim.js

class SimuladorTemp extends SerialPVI {

    constructor(baudRate = 9600, paridade = 2) {
        super(baudRate, paridade)
        this.Modbus = { } //Objeto contendo configurações gerais do protocolo 
        this.OutputConfig = { } //Objeto contendo configuração atual em modo de operação Output [0]
    }

    SetConfig(sensor, modoOp, temp, grp, callback) {
        switch (modoOp) {
            case "Output":
                this.OutputConfig.ModoOperacao = "00 00"
				this.OutputConfig.Valor = "00 00"
				this.OutputConfig.TipoSensor = "00 00"
				this.OutputConfig.Grupo = "00 00"
				callback(true, "Configuracao bem sucedida")
            case "Input":
                //não implementado
                break
            default:
                callback(false, "Modo Inválido")
                break
        }
    }

    SendConfig(callback, timeOut = 500, config = this.OutputConfig) {

        let nroRegisters = "00 04"
        let byteCount = "08"
		let regex = new RegExp("")

        let requisicao = this.Modbus.Address.Slave + " "
            + this.Modbus.Function.WriteMultipleRegisters + " "
            + this.Modbus.Address.HoldingRegister.TipoSensor + " "
            + nroRegisters + " "
            + byteCount + " "
            + config.TipoSensor + " "
            + config.ModoOperacao + " "
            + config.Valor + " "
            + config.Grupo

        this.SendData(requisicao)
		let byteData = this.ReadData(this.COMPORT).match(regex)
		if (byteData != null) {
			callback(true, "Sucesso no envio da configuração")
		} else {
			callback(false, "Falha no envio da configuração")
		}
    }
}
```

## Exemplo de Utilização

> ⚠️ O exemplo abaixo é apenas uma sugestão de utilização.

```js
//Main.js

class Main {
    constructor() {
        this.SimTemp = new SimuladorTemp()
    }

	MaquinaDeEstados(estado) {
		switch (estado) {

			case "EncontraCOMSimTemp":

				//Executa código interno do if, apenas se não encontrou a COM anteriormente
				if (sessionStorage.getItem("PortaCOM_SimuladorTemp") == null) {

					//Procura porta COM que o simulador está conectado
					this.SimTemp.getConnectedPortCom(this.SimTemp.ReqID, this.SimTemp.RegexID, (result, port) => {

						//se encontrou a porta COM:
						if (result) {
							sessionStorage.setItem("PortaCOM_SimuladorTemp", port)
							//segue o teste...
						} else {
							//seta devidas falhas, e segue o teste...
						}

					}, 500)
				} else {
					this.SimTemp.setPortCom(sessionStorage.getItem("PortaCOM_SimuladorTemp"))
					//segue o teste...
				}
				break

			case "Calibra10TipoJ":

				//Manipula objeto de configuração de Output baseado nos parametros passados
				this.SimTemp.SetConfig("J", "Output", 10, "A", (configSucess, msg) => {

					//Se configuracao bem sucedida:
					if (configSucess) {

						//Tenta enviar configuracoes ao simulador
						this.SimTemp.SendConfig((sendSucess, msg) => {

							//se envio bem sucedido:
							if (sendSucess) {
								//segue o teste...
							} else {
								//seta devidas falhas, e segue o teste...
							}

						})

					} else {
						console.error(msg)
					}
				})
				break

			case "Calibra750TipoJ":

				//Manipula objeto de configuração de Output baseado nos parametros passados
				this.SimTemp.SetConfig("J", "Output", 750, "A", (configSucess, msg) => {

					//Se configuracao bem sucedida:
					if (configSucess) {

						//Tenta enviar configuracoes ao simulador
						this.SimTemp.SendConfig((sendSucess, msg) => {

							//se envio bem sucedido:
							if (sendSucess) {
								//segue o teste...
							} else {
								//seta devidas falhas, e segue o teste...
							}

						})

					} else {
						console.error(msg)
					}
				})
				break
		}
	}
}
```
# Detalhes Comunicação

## Interface

| Item      | Detalhe |
| --------- | ------- |
| Interface | UART    |
| Baud Rate | 9600    |
| Data Bits | 8       |
| Paridade  | Par     |
| Stop Bit  | 1       |

## Funções Modbus

| Função                     | Código | Implementada |
| -------------------------- | :----: | :----------: |
| Read Device Identification |  0x2B  |      ✔️       |
| Read Holding Registers     |  0x03  |      ✔️       |
| Read Input Registers       |  0x04  |      ❌       |
| Write Single Register      |  0x06  |      ❌       |
| Write Multiple Registers   |  0x10  |      ✔️       |

## Mapa de Registradores

| Slave Address |
| ------------- |
| 0x01          |

| Address | Tipo de Registrador | Descrição                             | Referência em Firmware | Observação                                             |
| ------- | ------------------- | ------------------------------------- | ---------------------- | ------------------------------------------------------ |
| 0x1E    | Holding Register    | [Tipo de Sensor](#tipo-de-sensor)     | SET_SENSOR             | Somente para [Modo de Operação](#modo-de-operação) = 0 |
| 0x1F    | Holding Register    | [Modo de Operação](#modo-de-operação) | SET_IN_OUT             | Somente para [Modo de Operação](#modo-de-operação) = 0 |
| 0x20    | Holding Register    | [Valor](#valor)                       | SET_VALUE              | Somente para [Modo de Operação](#modo-de-operação) = 0 |
| 0x21    | Holding Register    | [Grupo](#grupo)                       | SET_GROUP              |                                                        |
| 0x22    | Holding Register    | [Valor Leitura](#grupo)               | LEITURA                |                                                        |
| 0x23    | Holding Register    | [Valor NTC](#grupo)                   | AMBIENTE               | Temperatura Ambiente                                   |

### Tipo de Sensor

| Decimal | Hex  | Opção  |
| ------- | ---- | ------ |
| 0       | 0x00 | Tipo J |
| 1       | 0x01 | Tipo K |
| 2       | 0x02 | mV     |

### Modo de Operação

| Decimal | Hex  | Opção                     |
| ------- | ---- | ------------------------- |
| 0       | 0x00 | Output (Geração de Sinal) |
| 1       | 0x01 | Input (Leitura de Sinal)  |

### Valor

| Decimal | Hex    | Opção                                                                                          |
| ------- | ------ | ---------------------------------------------------------------------------------------------- |
| 10      | 0x000A | Seta a temperatura em 10 graus, de acordo com o [Tipo de Sensor](#tipo-de-sensor) configurado  |
| 300     | 0x012C | Seta a temperatura em 300 graus, de acordo com o [Tipo de Sensor](#tipo-de-sensor) configurado |
| 750     | 0x02EE | Seta a temperatura em 750 graus, de acordo com o [Tipo de Sensor](#tipo-de-sensor) configurado |

### Grupo

| Decimal | Hex  | Opção     |
| ------- | ---- | --------- |
| 0       | 0x00 | Grupo A   |
| 1       | 0x01 | Grupo B   |
| 2       | 0x02 | Grupo C   |
| 3       | 0x03 | Grupo D   |
| 4       | 0x04 | Grupo E   |
| ...     | 0x01 | Grupo ... |

## Desmembrando a Requisição

Tomando como exemplo a requisição:

```01 10 00 1E 00 04 08 00 01 00 00 02 EE 00 00 EF 1F```

Confira a estrutura do frame:

| Byte | Significado                   | Descrição do Valor                                                |
| ---- | ----------------------------- | ----------------------------------------------------------------- |
| 0x01 | Node Address                  | Endereço na rede modbus                                           |
| 0x10 | Modbus Function               | Write Multiple Registers                                          |
| 0x00 | Start Address (High Byte)     | Endereço do primeiro registrador a ser lido                       |
| 0x1E | Start Address (Low Byte)      | -                                                                 |
| 0x00 | Nro os Registers (Hight Byte) | Quantidade de registradores para ler a partir do endereço inicial |
| 0x04 | Nro os Registers (Low Byte)   | -                                                                 |
| 0x08 | Byte Count                    | Indica número de bytes subsequentes desta requisição              |
| 0x00 | Tipo de Sensor (High Byte)    | [Tipo de Sensor](#tipo-de-sensor)                                 |
| 0x01 | Tipo de Sensor (Low Byte)     | -                                                                 |
| 0x00 | Modo de Operação (High Byte)  | [Modo de Operação](#modo-de-operação)                             |
| 0x00 | Modo de Operação (Low Byte)   | -                                                                 |
| 0x02 | Valor (High Byte)             | [Valor](#valor)                                                   |
| 0xEE | Valor (Low Byte)              | -                                                                 |
| 0x00 | Grupo (High Byte)             | [Grupo](#grupo)                                                   |
| 0x00 | Grupo (Low Byte)              | -                                                                 |
| 0xEF | CRC (High Byte)               | Ciclic Redundancy Check                                           |
| 0x1F | CRC (Low Byte)                | -                                                                 |