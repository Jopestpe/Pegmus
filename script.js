let pegar_musica, mensagem, aba_atual;

const MODOS = {
  youtube: {
    url: "https://www.youtube.com/playlist?list=",
    lista: () => document.querySelector("ytd-playlist-video-list-renderer"),
    blocos: (lista) => lista.querySelectorAll("ytd-playlist-video-renderer"),
    total: () => parseInt(document.querySelector(".yt-content-metadata-view-model__metadata-row span:nth-child(5)")?.textContent.trim().split(" ")[0] ?? "0"),
    nome_playlist: () => document.querySelector("yt-page-header-renderer h1.dynamicTextViewModelH1 span")?.textContent.trim(),
    total_youtube: () => document.querySelector(".yt-content-metadata-view-model__metadata-row span:nth-child(5)")?.textContent.trim().split(" ")[0],
    extrair: (bloco) => {
      const titulo = bloco.querySelector("#video-title");
      const artista = bloco.querySelector("a.yt-simple-endpoint.style-scope.yt-formatted-string");
      return {
        nome: titulo?.textContent.trim() ?? null,
        artista: artista?.textContent.trim() ?? null,
        video: titulo?.href?.split("&list=")[0] ?? null,
      };
    },
  },
  music: {
    url: "https://music.youtube.com/playlist?list=",
    lista: () => document.querySelector("ytmusic-playlist-shelf-renderer #contents"),
    blocos: (lista) => lista.querySelectorAll("ytmusic-responsive-list-item-renderer"),
    total: () => Infinity,
    nome_playlist: () => document.querySelector("ytmusic-responsive-header-renderer h1 yt-formatted-string.title")?.textContent.trim(),
    total_youtube: () => null,
    extrair: (bloco) => {
      const titulo = bloco.querySelector(".title a");
      const artista = bloco.querySelector(".secondary-flex-columns .flex-column:first-child a");
      const album = bloco.querySelector(".secondary-flex-columns .flex-column:last-child a");
      const duracao = bloco.querySelector(".fixed-column[title]");
      return {
        nome: titulo?.textContent.trim() ?? null,
        artista: artista?.textContent.trim() ?? null,
        album: album?.textContent.trim() ?? null,
        duracao: duracao?.getAttribute("title") ?? null,
        video: titulo?.href?.split("&list=")[0] ?? null,
      };
    },
  },
};

function detectar_modo(url) {
  if (url?.startsWith(MODOS.music.url)) return "music";
  if (url?.startsWith(MODOS.youtube.url)) return "youtube";
  return null;
}

document.addEventListener("DOMContentLoaded", () => {
  pegar_musica = document.getElementById("pegar_musicas");
  mensagem = document.getElementById("mensagem");
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    aba_atual = tabs[0];
    console.log("[init] Aba atual:", aba_atual.url);
    verificar_aba();
  });
  pegar_musica.addEventListener("click", pegar_musica_clicou);
});

function verificar_aba() {
  const modo = detectar_modo(aba_atual?.url);
  console.log("[verificar_aba] Modo detectado:", modo);
  if (modo) {
    pegar_musica.disabled = false;
    mensagem.textContent = "Pronto para pegar músicas";
  } else {
    pegar_musica.disabled = true;
    mensagem.textContent = "Esta extensão só funciona em youtube.com/playlist?list= ou music.youtube.com/playlist?list=";
  }
}

function pegar_musica_clicou() {
  mensagem.textContent = "Processando...";
  const modo = detectar_modo(aba_atual.url);
  console.log("[pegar_musica_clicou] Iniciando com modo:", modo);
  browser.tabs.executeScript(aba_atual.id, {
    code: `(${async function (modo_str) {
      console.log("[content] Modo recebido:", modo_str);

      const MODOS_EXEC = {
        youtube: {
          lista: () => document.querySelector("ytd-playlist-video-list-renderer"),
          blocos: (lista) => lista.querySelectorAll("ytd-playlist-video-renderer"),
          total: () => parseInt(document.querySelector(".yt-content-metadata-view-model__metadata-row span:nth-child(5)")?.textContent.trim().split(" ")[0] ?? "0"),
          nome_playlist: () => document.querySelector("yt-page-header-renderer h1.dynamicTextViewModelH1 span")?.textContent.trim(),
          total_youtube: () => document.querySelector(".yt-content-metadata-view-model__metadata-row span:nth-child(5)")?.textContent.trim().split(" ")[0],
          extrair: (bloco) => {
            const titulo = bloco.querySelector("#video-title");
            const artista = bloco.querySelector("a.yt-simple-endpoint.style-scope.yt-formatted-string");
            return {
              nome: titulo?.textContent.trim() ?? null,
              artista: artista?.textContent.trim() ?? null,
              video: titulo?.href?.split("&list=")[0] ?? null,
            };
          },
        },
        music: {
          lista: () => document.querySelector("ytmusic-playlist-shelf-renderer #contents"),
          blocos: (lista) => lista.querySelectorAll("ytmusic-responsive-list-item-renderer"),
          total: () => Infinity,
          nome_playlist: () => document.querySelector("ytmusic-detail-header-renderer .title")?.textContent.trim(),
          total_youtube: () => null,
          extrair: (bloco) => {
            const titulo = bloco.querySelector(".title a");
            const artista = bloco.querySelector(".secondary-flex-columns .flex-column:first-child a");
            const album = bloco.querySelector(".secondary-flex-columns .flex-column:last-child a");
            const duracao = bloco.querySelector(".fixed-column[title]");
            return {
              nome: titulo?.textContent.trim() ?? null,
              artista: artista?.textContent.trim() ?? null,
              album: album?.textContent.trim() ?? null,
              duracao: duracao?.getAttribute("title") ?? null,
              video: titulo?.href?.split("&list=")[0] ?? null,
            };
          },
        },
      };

      const modo = MODOS_EXEC[modo_str];
      const lista = modo.lista();
      console.log("[content] Lista encontrada:", lista);
      if (!lista) { console.error("[content] Lista não encontrada, abortando."); return null; }

      let blocos = modo.blocos(lista);
      let prev = 0;
      const total = modo.total();
      console.log("[content] Total esperado:", total, "| Blocos iniciais:", blocos.length);

      while (blocos.length < total && blocos.length > prev) {
        prev = blocos.length;
        console.log("[content] Scrollando... blocos atuais:", blocos.length);
        blocos[blocos.length - 1]?.scrollIntoView({ behavior: "smooth" });
        await new Promise((resolve) => {
          const obs = new MutationObserver(() => {
            const novos = modo.blocos(lista).length;
            console.log("[content] MutationObserver: blocos agora:", novos);
            if (novos > prev) { obs.disconnect(); resolve(); }
          });
          obs.observe(lista, { childList: true, subtree: true });
          setTimeout(() => { console.log("[content] Timeout atingido, continuando."); obs.disconnect(); resolve(); }, 3000);
        });
        blocos = modo.blocos(lista);
        console.log("[content] Blocos após scroll:", blocos.length);
      }

      console.log("[content] Scroll finalizado. Total de blocos:", blocos.length);
      const musicas = Array.from(blocos, modo.extrair);
      console.log("[content] Primeira música extraída:", musicas[0]);
      console.log("[content] Última música extraída:", musicas[musicas.length - 1]);

      const resultado = {
        nome: modo.nome_playlist(),
        total_youtube: modo.total_youtube(),
        data: new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
        total: musicas.length,
        musicas,
      };
      console.log("[content] Resultado final:", resultado);
      return resultado;
    }})("${modo}")`
  }).then(([resultado]) => {
    console.log("[popup] Resultado recebido:", resultado);
    if (!resultado) { mensagem.textContent = "Erro: playlist não encontrada."; return; }

    const nome = resultado.nome ?? "lista_musicas";

    const blob = new Blob([JSON.stringify(resultado, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    browser.downloads.download({ url, filename: `${nome}.json` }).then(() => {
      URL.revokeObjectURL(url);
    }).catch((err) => {
      console.error("[popup] Erro no download JSON:", err);
    });
    
  }).catch((err) => {
    console.error("[popup] Erro ao executar script:", err);
    mensagem.textContent = "Erro ao processar a página.";
  });
}
