# Bolão Brasil x Haiti - HTML puro

Versão local para teste, sem Supabase e sem banco externo.

## Recursos

- Cadastro com Nome, CPF e WhatsApp
- Validação de CPF
- Bloqueio de 1 palpite por CPF no mesmo navegador
- Jogo Brasil x Haiti pré-configurado
- Valor da aposta: R$ 10,00
- Chave Pix: 05605646192
- Lista pública de palpites
- Painel administrativo local
- Marcação manual de pagamento
- Total arrecadado confirmado
- Exportação para Excel
- Impressão de comprovante
- Responsivo para celular

## Como testar

1. Extraia o ZIP.
2. Abra o arquivo `index.html` no navegador.
3. Faça uma aposta.
4. Acesse o painel administrativo.

Senha admin de teste:

```txt
admin123
```

## Limitação importante

Esta versão salva os dados no `localStorage`.

Isso significa:

- Os dados ficam apenas no navegador usado.
- Se limpar o navegador, os dados somem.
- Em outro celular/computador, a lista não aparece.
- O bloqueio por CPF não é global.

Para uso real, o próximo passo correto é migrar para Supabase.
