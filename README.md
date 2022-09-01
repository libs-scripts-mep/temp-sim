# Simulador de Temperatura Inova

## Detalhes da Interface

| Item      | Detalhe |
| --------- | ------- |
| Interface | UART    |
| Baud Rate | 9600    |
| Data Bits | 8       |
| Paridade  | Even    |
| Stop Bit  | 1       |

## Mapa de Registradores

| Address | Descrição        | Estrutura de Dados | Observação |
| ------- | ---------------- | ------------------ | ---------- |
| 0x1E    | Tipo de Sensor   |                    |            |
| 0x1F    | Modo de Operação |                    |            |
| 0x20    | Valor            |                    |            |
| 0x21    | Grupo            |                    |            |

