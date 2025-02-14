# Simulador de Temperatura Inova

Biblioteca que controla o simulador de temperatura inova.

![Image](https://i.imgur.com/HWpENJX.png)

## Instalando

Abra o terminal, e na pasta raíz do script, execute:

```
npm i @libs-scripts-mep/temp-sim
```

## Desinstalando

Abra o terminal, e na pasta raíz do script, execute:

```
npm uninstall @libs-scripts-mep/temp-sim
```

## Atualizando

Abra o terminal, e na pasta raíz do script, execute:

```
npm update @libs-scripts-mep/temp-sim
```

## Como utilizar

Realize a importação:

```js
import SimuladorTemp from "../node_modules/@libs-scripts-mep/temp-sim/temp-sim.js"
```

As demais informações e instruções estarão disponíveis via `JSDocs`.

# Detalhes de Firmware e Hardware

## Interface Comunicacao

| Item      | Detalhe |
| --------- | ------- |
| Interface | UART    |
| Baud Rate | 9600    |
| Data Bits | 8       |
| Paridade  | None    |
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
| 0x2002    | Holding Register    | [Tipo de Sensor](#tipo-de-sensor)     | SET_SENSOR             | Somente para [Modo de Operação](#modo-de-operação) = 0                         |
| 0x2003    | Holding Register    | [Modo de Operação](#modo-de-operação) | SET_IN_OUT             | Somente para [Modo de Operação](#modo-de-operação) = 0                         |
| 0x2004    | Holding Register    | [Valor](#valor)                       | SET_VALUE              | Somente para [Modo de Operação](#modo-de-operação) = 0                         |
| 0x2005    | Holding Register    | [Compensacao](#modo-de-compensação)   | -                      | Somente para [Modo de Operação](#modo-de-operação) = 0                         |
| 0x3001    | Input Register    | [Valor Leitura](#grupo)               | LEITURA                | Valor instantâneo da entrada de termopar, convertido para o sensor selecionado |
| 0x3002    | Holding Register    | [Valor NTC](#grupo)                   | AMBIENTE               | Valor instantâneo da temperatura ambiente do ***SIMULADOR***                   |

### Tipo de Sensor

| Decimal | Hex  | Opção  |
| ------- | ---- | ------ |
| 0       | 0x00 | Tipo J |
| 1       | 0x01 | Tipo K |

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

Não tem. Sempre é "A"

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