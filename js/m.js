/* Sinal do Manual da Grávida.
   Dá um código a cada visitante, guarda de qual anúncio ele veio e coloca esse
   código no link do checkout da Hotmart (campo sck). Não lê as respostas do quiz. */
(function () {
  if (window.__mgSinal) return;
  window.__mgSinal = 1;

  var BASE = 'https://track.manualdagravida.com.br';
  var UM_ANO = 34560000;
  var VALIDO = /^[a-z0-9]{16,40}$/;
  var NOSSO_DOMINIO = /(^|\.)manualdagravida\.com\.br$/.test(location.hostname);

  function lerCookie(nome) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + nome + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function gravarCookie(nome, valor) {
    var c = nome + '=' + encodeURIComponent(valor) + '; Max-Age=' + UM_ANO + '; Path=/; SameSite=Lax; Secure';
    if (NOSSO_DOMINIO) c += '; Domain=.manualdagravida.com.br';
    document.cookie = c;
  }
  function ler(chave) { try { return localStorage.getItem(chave) || ''; } catch (e) { return ''; } }
  function guardar(chave, valor) { try { localStorage.setItem(chave, valor); } catch (e) {} }
  function lerSessao(chave) { try { return sessionStorage.getItem(chave) || ''; } catch (e) { return ''; } }
  function guardarSessao(chave, valor) { try { sessionStorage.setItem(chave, valor); } catch (e) {} }

  function novoCodigo() {
    var a = new Uint8Array(10);
    window.crypto.getRandomValues(a);
    var s = '';
    for (var i = 0; i < a.length; i++) s += ('0' + a[i].toString(16)).slice(-2);
    return s;
  }

  // O mesmo visitante mantém o mesmo código entre o quiz e as páginas do www.
  var vid = lerCookie('_mgv');
  if (!VALIDO.test(vid)) vid = ler('_mgv');
  if (!VALIDO.test(vid)) vid = novoCodigo();
  gravarCookie('_mgv', vid);
  guardar('_mgv', vid);

  var busca = new URLSearchParams(location.search);
  var fbclid = busca.get('fbclid');
  if (fbclid) gravarCookie('_mgfbc', 'fb.1.' + Date.now() + '.' + fbclid);
  // Guarda o endereço de entrada com as UTMs, para o clique no checkout levar a origem junto.
  if (busca.get('utm_source') || fbclid) guardarSessao('_mgl', location.href);

  function enviar(tipo, extra, etapa) {
    var corpo = JSON.stringify({
      t: tipo,
      v: vid,
      u: location.href,
      l: lerSessao('_mgl'),
      r: document.referrer || '',
      p: lerCookie('_fbp'),
      c: lerCookie('_fbc') || lerCookie('_mgfbc'),
      x: extra || '',
      e: etapa || null
    });
    try { if (navigator.sendBeacon && navigator.sendBeacon(BASE + '/e', corpo)) return; } catch (e) {}
    try { fetch(BASE + '/e', { method: 'POST', body: corpo, keepalive: true, mode: 'no-cors' }); } catch (e) {}
  }

  // Na hora do clique, o link da Hotmart ganha o código do visitante.
  // A Hotmart devolve esse código no aviso de venda, e assim a venda volta para o anúncio.
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a || a.href.indexOf('pay.hotmart.com') === -1) return;
    try {
      var destino = new URL(a.href);
      destino.searchParams.set('sck', vid);
      a.href = destino.toString();
    } catch (e) {}
    enviar('checkout', a.href);
  }, true);

  // Etapas do quiz: o quiz chama window.sinal('etapa', { n: 3, nome: 'pergunta_3' }),
  // window.sinal('resultado') e window.sinal('oferta'). Só o número e o nome da tela,
  // nunca a resposta da gestante. Chamadas feitas antes deste script carregar ficam em sinalFila.
  var TIPOS_QUIZ = { etapa: 1, resultado: 1, oferta: 1 };
  function sinal(tipo, dados) {
    if (!TIPOS_QUIZ[tipo]) return;
    var d = dados || {};
    var nome = String(d.nome || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
    var n = Number(d.n);
    enviar(tipo, '', { n: isFinite(n) ? Math.max(0, Math.min(200, Math.round(n))) : null, nome: nome || null });
  }
  var fila = window.sinalFila || [];
  window.sinal = sinal;
  window.sinalFila = { push: function (args) { sinal.apply(null, args); } };

  enviar('visita');
  for (var i = 0; i < fila.length; i++) sinal.apply(null, fila[i]);
})();
