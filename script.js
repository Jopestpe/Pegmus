document.addEventListener("DOMContentLoaded", () => {
  const pegarMusicasButton = document.getElementById("pegar_musicas");
  const statusSpan = document.getElementById("status");

  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const currentUrl = tabs[0].url;
    if (!currentUrl.startsWith("https://www.youtube.com/playlist?list=")) {
      pegarMusicasButton.disabled = true;
      statusSpan.textContent = "Esta extensão só funciona em playlists do YouTube!";
    } else {
      pegarMusicasButton.disabled = false;
    }
  });

  pegarMusicasButton.addEventListener("click", () => {
    statusSpan.textContent = "Processando...";

    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      browser.tabs.executeScript(tabs[0].id, { code: `(${extrairMusicas.toString()})()` })
        .then((results) => {
          let musicas = results[0];
          musicas = musicas.filter(musica => Object.keys(musica).filter(k => musica[k]).length >= 2);

          const dataAtual = new Date();
          const metadados = {
            data_criacao: dataAtual.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
            total_musicas: musicas.length,
            musicas
          };

          const blob = new Blob([JSON.stringify(metadados, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);

          browser.downloads.download({
            url: url,
            filename: "lista_musicas.json"
          }).then(() => {
            statusSpan.textContent = "Músicas salvas com sucesso!";
          });
        }).catch((error) => {
          console.error("Erro ao obter músicas:", error);
          statusSpan.textContent = "Erro ao obter músicas!";
        });
    }).catch((error) => {
      console.error("Erro ao acessar aba ativa:", error);
      statusSpan.textContent = "Erro ao acessar aba ativa!";
    });
  });
});

function extrairMusicas() {
  const containers = document.querySelectorAll("#contents #container");
  return Array.from(containers).map(container => {
    const nome = container.querySelector("#video-title")?.textContent.trim() || null;
    const artista = container.querySelector("a.yt-simple-endpoint.style-scope.yt-formatted-string")?.textContent.trim() || null;
    let video = container.querySelector("#video-title")?.href || null;
    if (video) {
      video = video.split('&list=')[0];
    }
    return { nome, artista, video };
  });
}