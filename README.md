# Simulador de Temperatura Inova

Biblioteca que controla o simulador de temperatura inova.

![Image](https://i.imgur.com/HWpENJX.png)

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

## Exemplo de Utilização

```js
class TestScript {
    constructor(eventMap, event) {
        this.SimTemp = new SimuladorTemp()

        this.Run()
            .then(async () => {
                //se tudo OK
            })
            .catch((error) => {
                //se algo NOK
            })
    }

    async Run() {

        const portDiscoverResult = await this.SimTemp.portDiscover({
            request: this.SimTemp.Modbus.ReqReadDeviceID,
            regex: this.SimTemp.Modbus.RegexReadDeviceID,
            readTimeout: 100, tryNumber: 1, maxTries: 5
        }, 1000)

        if (!portDiscoverResult.sucess) { throw "Impossível comunicar com o simulador" }

        if (!this.SimTemp.SetOutputConfig("J", 300, "A", true)) { throw "Falha ao configurar saída do simulador" }
        const send300J = await this.SimTemp.SendOutputConfig()

        if (!send300J.result) { throw "Falha ao enviar configuração ao simulador" }

        if (!this.SimTemp.SetOutputConfig("J", 10, "A", true)) { throw "Falha ao configurar saída do simulador" }
        const send10J = await this.SimTemp.SendOutputConfig()

        if (!send10J.result) { throw "Falha ao enviar configuração ao simulador" }

        const inputValues = await this.SimTemp.ReqInputValue()
        console.log(inputValues)

        throw "termino"

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
| 0x22    | Holding Register    | [Compensacao](#modo-de-compensação)   | -                      | Somente para [Modo de Operação](#modo-de-operação) = 0                         |
| 0x23    | Holding Register    | [Valor Leitura](#grupo)               | LEITURA                | Valor instantâneo da entrada de termopar, convertido para o sensor selecionado |
| 0x24    | Holding Register    | [Valor NTC](#grupo)                   | AMBIENTE               | Valor instantâneo da temperatura ambiente do ***SIMULADOR***                   |

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

### Modo de Compensação

| Decimal | Hex  | Opção               |
| ------- | ---- | ------------------- |
| 0       | 0x00 | Compensação Externa |
| 1       | 0x01 | Compensação Interna |

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