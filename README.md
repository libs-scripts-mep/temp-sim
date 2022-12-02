# Simulador de Temperatura Inova

Biblioteca que controla o simulador de temperatura inova.

![Image](https://i.imgur.com/EwsKvjj.png)

## Tabela de Compatibilidade

| Firmware |       |
| -------- | :---: |
| v2.21    |   ✔️   |

| PCI       |       |
| --------- | :---: |
| M1PL2_2.0 |   ✔️   |

## Instalando

Abra o terminal, e na pasta do script, execute:

```
npm i @libs-scripts-mep/temp-sim
```

Após fianlizada a instalação da biblioteca, inclua em seu html:

```html
<script src="node_modules/@libs-scripts-mep/temp-sim/temp-sim.js"></script>
```

<br>

> ⚠️ Se seu projeto não utiliza a [serial-pvi](https://www.npmjs.com/package/@libs-scripts-mep/serial-pvi) ou [crc](https://www.npmjs.com/package/@libs-scripts-mep/crc), será necessário incluir também em seu html:

```html
<!-- DEPENDENCIAS -->
<script src="node_modules/@libs-scripts-mep/crc/CRC.js"></script>
<script src="node_modules/@libs-scripts-mep/serial-pvi/serial-pvi.js"></script>
<!-- BIBLIOTECA -->
<script src="node_modules/@libs-scripts-mep/temp-sim/temp-sim.js"></script>
```

> ⚠️Fique atento à ordem de carregamento dos arquivos, as dependências devem ser carregadas **ANTES** da biblioteca, como no trecho acima.
## Resumo da Classe

```js 
//temp-sim.js

class SimuladorTemp extends SerialPVI {

    constructor(baudRate = 9600, paridade = 2) {
        super(baudRate, paridade) //cria uma instancia e herda metodos da classe SerialPVI
        this.Modbus = { } //Objeto de parametros configuraveis do protocolo
        this.OutputConfig = { } //Objeto de parametros configuraveis que serao enviados ao simulador
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
        switch (grupo) {
            case "A":
                this.OutputConfig.Grupo = "00 00"
                break
            case "...":
                //...
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
                    if (valorValido) {
                        result = true
                        msg += "Nova Configuração Recebida"
                    } else {
                        result = false
                        msg += "Não é um número, ou valor fora do range [10 - 750]"
                    }
                    break
                case "K":
                    if (valorValido) {
                        result = true
                        msg += "Nova Configuração Recebida"
                    } else {
                        result = false
                        msg += "Não é um número, ou valor fora do range [10 - 1150]"
                    }
                    break
                case "mV":
                    if (valorValido) {
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
     * Requisita versao de firmware ao simulador de temperatura
     * @param {function} callback 
     * @param {number} timeOut 
     */
    ReqFirmwareVersion(callback) {

        this.SendData(req, this.COMPORT)
        let byteData = this.ReadData(this.COMPORT).match(regex)

        if (byteData != null) {
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
     * Envia objeto de configuração passado como parametro ao simulador de temperatura
     * 
     * @param {function} callback 
     * @param {number} timeOut 
     * @param {object} config 
     */
    SendOutputConfig(callback, timeOut = 500, config = this.OutputConfig) {

        let requisicao
        requisicao = CRC16.Calculate(requisicao)

        this.SendData(requisicao)

		let byteData = this.ReadData()

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

        requisicao = CRC16.Calculate(requisicao)
        this.SendData(requisicao, this.COMPORT)

		let byteArray = this.ReadData()

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
    }
}
```

## Exemplo de Utilização

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
				this.SimTemp.SetOutputConfig((setRes) => {

					//Se configuracao bem sucedida:
					if (setRes.result) {

						//Tenta enviar configuracoes ao simulador
						this.SimTemp.SendOutputConfig((sendRes) => {

							//se envio bem sucedido:
							if (sendRes.result) {
								//segue o teste...
							} else {
								console.error(sendRes.msg)
								//seta devidas falhas, e segue o teste...
							}

						})

					} else {
						console.error(setRes.msg)
						//seta devidas falhas, e segue o teste...
					}
				}, "J", 10, "A")
				break

			case "Calibra750TipoJ":

				//Manipula objeto de configuração de Output baseado nos parametros passados
				this.SimTemp.SetOutputConfig((setRes) => {

					//Se configuracao bem sucedida:
					if (setRes.result) {

						//Tenta enviar configuracoes ao simulador
						this.SimTemp.SendOutputConfig((sendRes) => {

							//se envio bem sucedido:
							if (sendRes.result) {
								//segue o teste...
							} else {
								console.error(sendRes.msg)
								//seta devidas falhas, e segue o teste...
							}

						})

					} else {
						console.error(setRes.msg)
						//seta devidas falhas, e segue o teste...
					}
				}, "J", 750, "A")
				break
		}
	}
}
```
# Detalhes de Firmware e Hardware

## Interface Comunicacao

| Item      | Detalhe |
| --------- | ------- |
| Interface | UART    |
| Baud Rate | 9600    |
| Data Bits | 8       |
| Paridade  | Par     |
| Stop Bit  | 1       |

## Funções Modbus Implementadas

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

| Address | Tipo de Registrador | Descrição                             | Referência em Firmware | Observação                                                                     |
| ------- | ------------------- | ------------------------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| 0x1E    | Holding Register    | [Tipo de Sensor](#tipo-de-sensor)     | SET_SENSOR             | Somente para [Modo de Operação](#modo-de-operação) = 0                         |
| 0x1F    | Holding Register    | [Modo de Operação](#modo-de-operação) | SET_IN_OUT             | Somente para [Modo de Operação](#modo-de-operação) = 0                         |
| 0x20    | Holding Register    | [Valor](#valor)                       | SET_VALUE              | Somente para [Modo de Operação](#modo-de-operação) = 0                         |
| 0x21    | Holding Register    | [Grupo](#grupo)                       | SET_GROUP              | Somente para [Modo de Operação](#modo-de-operação) = 0                         |
| 0x22    | Holding Register    | [Valor Leitura](#grupo)               | LEITURA                | Valor instantâneo da entrada de termopar, convertido para o sensor selecionado |
| 0x23    | Holding Register    | [Valor NTC](#grupo)                   | AMBIENTE               | Valor instantâneo da temperatura ambiente do ***SIMULADOR***                   |

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

> ⚠️ Modo de operação só impacta apresentação no display.

### Valor

| Decimal | Hex    | Opção                                                                                      |
| ------- | ------ | ------------------------------------------------------------------------------------------ |
| 10      | 0x000A | Seta a saida em 10 graus convertidos para o [Tipo de Sensor](#tipo-de-sensor) configurado  |
| 300     | 0x012C | Seta a saida em 300 graus convertidos para o [Tipo de Sensor](#tipo-de-sensor) configurado |
| 750     | 0x02EE | Seta a saida em 750 graus convertidos para o [Tipo de Sensor](#tipo-de-sensor) configurado |

### Grupo

| Decimal | Hex  | Opção     |
| ------- | ---- | --------- |
| 0       | 0x00 | Grupo A   |
| 1       | 0x01 | Grupo B   |
| 2       | 0x02 | Grupo C   |
| 3       | 0x03 | Grupo D   |
| 4       | 0x04 | Grupo E   |
| ...     | 0x01 | Grupo ... |

> ⚠️ Grupo só impacta seleção de preset das teclas A, B e C.

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