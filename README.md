# Monitor oficial de passagens — FLR / PSA → GRU

Configuração inicial criada para:

- 2 adultos e 1 criança;
- classe econômica e apenas mala de mão;
- saídas de 10/01/2027 a 10/02/2027;
- permanência de 40 a 55 dias;
- no máximo 2 escalas;
- Iberia, Air Europa, Air France, KLM, TAP, LATAM, Lufthansa e ITA Airways.

## Executar

Use Node.js 22 ou superior.

```bash
npm install
npx playwright install chromium
npm run plan
```

O comando `npm run plan` só mostra as 12 datas combinadas que serão consultadas por companhia. Ele espalha as origens, as durações e as saídas por toda a janela, evitando uma sequência excessiva de consultas.

Para abrir os sites oficiais, use:

```bash
npm run run:headed
```

Para testar apenas duas consultas de cada companhia:

```bash
node src/index.js --run --headed --limit 2
```

## Próxima etapa: validar TAP uma vez

Antes de automatizar o preenchimento da TAP, registre uma pesquisa real no site oficial. O comando abaixo abre o navegador com a primeira consulta planejada. Faça a busca manualmente e, já na página de resultados, pressione Enter no terminal.

```bash
npm run tap:validate
```

Ele salva um JSON e uma imagem na pasta `output/`. Eles registram apenas a página de busca/resultados e permitem fixar os seletores reais do formulário e dos cartões de tarifa. Não faça login nem informe dados de pagamento. Caso a TAP apresente CAPTCHA, resolva-o apenas no navegador; o projeto não tenta contorná-lo.

O arquivo `config/search.json` concentra tudo o que você poderá alterar depois: datas, passageiros, escalas, companhias e intervalo entre as consultas.

## Situação desta entrega

O projeto já gera e limita as consultas, abre exclusivamente os sites oficiais e grava o resultado de cada tentativa em `output/`.

Cada companhia precisa de um conector próprio para preencher o formulário e interpretar preço, trechos, duração e escalas. Isso deve ser validado no site ao vivo, pois os elementos de reserva e consentimento de cookies mudam entre companhias. O projeto não tenta burlar CAPTCHA, login ou outros mecanismos de proteção: se algum aparecer, a consulta deve parar e ser marcada para intervenção manual.

Depois que os conectores forem incluídos, cada resultado deverá seguir este formato:

```json
{
  "airline": "TAP Air Portugal",
  "origin": "PSA",
  "destination": "GRU",
  "departureDate": "2027-01-15",
  "returnDate": "2027-03-03",
  "price": 548.2,
  "currency": "EUR",
  "outboundStops": 1,
  "returnStops": 1,
  "outboundDurationMinutes": 935,
  "returnDurationMinutes": 905,
  "bookingUrl": "https://www.flytap.com/"
}
```

## TAP: interpretar uma captura validada

Depois de gerar uma captura na página de resultados, extraia as opções econômicas da ida com até duas escalas:

```bash
npm run tap:parse -- output/tap-validation-AAAA-MM-DDTHH-MM-SS.json
```

O relatório é gravado em `output/`, ordenado pelo menor preço. A TAP solicita primeiro a escolha da ida; por isso o valor lido nessa tela é da seleção de ida e nunca é apresentado como preço final de ida e volta. Se a captura for feita em `Review your trip`, o mesmo comando registra o total final exibido antes de dados de passageiros e pagamento.
