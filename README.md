# Padel 3D — Prancheta do Professor

Quadra de padel em 3D para professores montarem e explicarem jogadas nas aulas: posicionar jogadores, traçar a trajetória da bola (com quiques no chão e batidas no vidro), dividir a jogada em passos e reproduzir tudo animado.

## Rodando

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal. O servidor também aparece na rede local (`Network: http://192.168.x.x:5173`), então dá para abrir no **tablet ou celular** na quadra, conectado ao mesmo Wi-Fi.

Para gerar a versão de produção (pasta `dist/`, pode ser hospedada em qualquer serviço estático como Netlify, Vercel ou GitHub Pages):

```bash
npm run build
```

## O que dá para fazer

- **Girar, aproximar e mover a quadra**: mouse (esquerdo gira, direito arrasta, roda dá zoom) ou toque (1 dedo gira, 2 dedos zoom). Atalhos de câmera: visão 3D, de cima, lateral e atrás de cada time.
- **Ver pelos olhos do jogador**: o ícone de olho na lista de jogadores coloca a câmera na altura dos olhos daquele aluno.
- **Jogadores**: adicione jogadores dos times A e B, dê nome aos alunos, troque as cores dos times e use as formações prontas (Saque, Rede × Fundo, Fundo × Fundo, Rede × Rede).
- **Trajetória da bola**: com a ferramenta Bola, clique no chão (quique), no vidro ou alambrado (batida na parede) ou num jogador (golpe). Ajuste a altura do arco de cada trecho (Reta, Normal, Bandeja, Globo…) e arraste os pontos.
- **Checagem da rede**: o app avisa se algum trecho bate na rede e mostra a folga quando passa.
- **Passos**: divida a jogada em passos. Cada passo tem as posições dos jogadores, a trajetória da bola e uma anotação. Setas mostram o deslocamento de cada jogador desde o passo anterior.
- **Reprodução animada**: jogadores se movem e a bola percorre a trajetória. Dá para controlar a velocidade (0,25× a 2×), repetir em loop e navegar pela linha do tempo.
- **Cones e alvos** para exercícios de precisão.
- **Salvar e compartilhar**: as jogadas ficam salvas no navegador ("Minhas jogadas"). Também é possível exportar e importar arquivo `.padel.json` (para levar a outro aparelho ou mandar para outro professor) e salvar imagem PNG com a anotação do passo.
- **Tela cheia**, para usar em TV ou projetor.
- Desfazer/refazer em tudo.

## Atalhos

| Tecla | Ação |
| --- | --- |
| `V` / `B` / `M` | Ferramenta Mover / Bola / Cones |
| `Espaço` | Reproduzir / pausar |
| `←` `→` | Passo anterior / próximo |
| `1`–`5` | Ângulos de câmera |
| `+` / `-` | Zoom |
| `Delete` | Remover item selecionado |
| `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` | Desfazer / refazer |
| `F` | Tela cheia |
| `Esc` | Limpar seleção |

## Tecnologia

React + TypeScript + Vite, com [Three.js](https://threejs.org) via `@react-three/fiber` e `@react-three/drei`, e estado em `zustand`.

```
src/
  lib/        medidas oficiais da quadra, matemática da trajetória, câmera, armazenamento
  scene/      objetos 3D (quadra, jogadores, bola, marcadores)
  ui/         barra superior, ferramentas, painel lateral, linha do tempo
  store.ts    estado da jogada, histórico (desfazer) e reprodução
```

A quadra segue as medidas oficiais da FIP: 20 × 10 m, linha de saque a 6,95 m da rede, rede com 0,88 m no centro e 0,92 m nos postes, vidros de fundo com 3 m e laterais escalonadas.
