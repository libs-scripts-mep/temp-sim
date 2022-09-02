# Simulador de Temperatura Inova

## Instalando

Abra o terminal, e na pasta do script, execute:

```
npm i npm i @libs-scripts-mep/temp-sim
```

Após fianlizada a instalação da biblioteca, inclua em seu html:

```html
	<script src="node_modules/@libs-scripts-mep/temp-sim/temp-sim.js"></script>
```

# Comunicação

## Detalhes da Interface

| Item      | Detalhe |
| --------- | ------- |
| Interface | UART    |
| Baud Rate | 9600    |
| Data Bits | 8       |
| Paridade  | Par     |
| Stop Bit  | 1       |

## Mapa de Registradores

| Address | Tipo de Registrador | Descrição                             | Observação                                                         |
| ------- | ------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| 0x1E    | Holding Register    | [Tipo de Sensor](#tipo-de-sensor)     | ***default*** Tipo J                                               |
| 0x1F    | Holding Register    | [Modo de Operação](#modo-de-operação) |                                                                    |
| 0x20    | Holding Register    | [Valor](#valor)                       | Tera efeito somente para [Modo de Operação](#modo-de-operação) = 0 |
| 0x21    | Holding Register    | [Grupo](#grupo)                       |                                                                    |

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


### Cola

| Tipo de Sensor | Modo de Operação | Valor | Requisição                                         |
| -------------- | ---------------- | ----- | -------------------------------------------------- |
| Tipo J         | Output           | 10°C  | 01 10 00 1E 00 04 08 00 00 00 00 00 0A 00 00 BE 50 |
| Tipo J         | Output           | 300°C | 01 10 00 1E 00 04 08 00 00 00 00 01 2C 00 00 5E 67 |
| Tipo J         | Output           | 750°C | 01 10 00 1E 00 04 08 00 00 00 00 02 EE 00 00 FF DF |
| Tipo K         | Output           | 10°C  | 01 10 00 1E 00 04 08 00 01 00 00 00 0A 00 00 AE 90 |
| Tipo K         | Output           | 300°C | 01 10 00 1E 00 04 08 00 01 00 00 01 2C 00 00 4E A7 |
| Tipo K         | Output           | 750°C | 01 10 00 1E 00 04 08 00 01 00 00 02 EE 00 00 EF 1F |