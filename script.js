let pegar_musica, mensagem, aba_atual;

document.addEventListener("DOMContentLoaded", () => {
  pegar_musica = document.getElementById("pegar_musicas");
  mensagem = document.getElementById("mensagem");

  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    aba_atual = tabs[0];
    verificar_aba();
  });
  pegar_musica.addEventListener("click", pegar_musica_clicou);
});

function verificar_aba() {
  console.log("Verificando ", aba_atual.url)
  if (aba_atual && aba_atual.url && aba_atual.url.startsWith("https://www.youtube.com/playlist?list=")) {
    pegar_musica.disabled = false;
    mensagem.textContent = "Pronto para pegar músicas";
  } else {
    mensagem.textContent = "Esta extensão só funciona em youtube.com/playlist?list=";
    pegar_musica.disabled = true;
  }
}

function pegar_musica_clicou() {
  mensagem.textContent = "Processando...";
  browser.tabs.executeScript(aba_atual.id, { code: `(${async function() {
    await carregar_todos_videos();
    return extrair_musicas();
  }})()` }).then((resultados) => {
    extrair_resultado(resultados[0]);
  });
}

async function carregar_todos_videos() {
  const lista_videos = document.querySelectorAll("ytd-playlist-video-list-renderer")[0];
  const total_videos_texto = document.querySelector(
    ".yt-content-metadata-view-model__metadata-row span:nth-child(5)"
  )?.textContent.trim();
  const total_videos = parseInt(total_videos_texto.split(" ")[0]);

  let blocos_videos = lista_videos.querySelectorAll("ytd-playlist-video-renderer");
  let ultimo_tamanho = 0;

  while (blocos_videos.length < total_videos && blocos_videos.length > ultimo_tamanho) {
    ultimo_tamanho = blocos_videos.length;

    const ultima = blocos_videos[blocos_videos.length - 1];
    ultima.scrollIntoView({ behavior: "smooth" });

    await new Promise(resolve => {
      const obs = new MutationObserver((mutations, observer) => {
        const novos_blocos = lista_videos.querySelectorAll("ytd-playlist-video-renderer");
        if (novos_blocos.length > ultimo_tamanho) {
          observer.disconnect();
          resolve();
        }
      });
      obs.observe(lista_videos, { childList: true, subtree: true });

      setTimeout(() => {
        obs.disconnect();
        resolve();
      }, 3000);
    });

    blocos_videos = lista_videos.querySelectorAll("ytd-playlist-video-renderer");
  }

  return Array.from(blocos_videos, bloco_video => {
    const nome_video = bloco_video.querySelector("#video-title");
    const artista_video = bloco_video.querySelector("a.yt-simple-endpoint.style-scope.yt-formatted-string");

    return {
      nome: nome_video?.textContent.trim() || null,
      artista: artista_video?.textContent.trim() || null,
      video: nome_video?.href?.split("&list=")[0] || null
    };
  });
}

function extrair_resultado(resultado) {
  const { nome_playlist, total_youtube, musicas } = resultado;
  const dataAtual = new Date();
  
  const metadados = {
    nome: nome_playlist,
    total_youtube: total_youtube,
    data: dataAtual.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
    total: musicas.length,
    musicas: musicas
  };

  const blob = new Blob([JSON.stringify(metadados, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  browser.downloads.download({
    url: url,
    filename: "lista_musicas.json"
  }).then(() => {
    mensagem.textContent = "Músicas salvas com sucesso!";
    URL.revokeObjectURL(url);
  });
}

function extrair_musicas() {
  const nome_playlist = document.querySelector(
    "yt-page-header-renderer h1.dynamicTextViewModelH1 span"
  )?.textContent.trim();

  const numero_videos_texto = document.querySelector(
    ".yt-content-metadata-view-model__metadata-row span:nth-child(5)"
  )?.textContent.trim();
  const total_youtube = numero_videos_texto?.split(" ")[0];

  const lista_videos = document.querySelectorAll("ytd-playlist-video-list-renderer");
  const blocos_videos = lista_videos[0].querySelectorAll("ytd-playlist-video-renderer");
  
  const musicas = Array.from(blocos_videos, bloco_video => {
    const nome_video = bloco_video.querySelector("#video-title");
    const artista_video = bloco_video.querySelector("a.yt-simple-endpoint.style-scope.yt-formatted-string");

    return {
      nome: nome_video?.textContent.trim() || null,
      artista: artista_video?.textContent.trim() || null,
      video: nome_video?.href?.split("&list=")[0] || null
    };
  });

  return { nome_playlist, total_youtube, musicas };
}

