/* ═══════════════════════════════════════════════════════════
   InBarber — Auth (login / cadastro)
   Depende: api.js (window.InBarberAPI)
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var API = window.InBarberAPI;

  /* ─── Helpers DOM ─────────────────────────────────── */
  function $(id) { return document.getElementById(id); }

  function showError(id, msg) {
    var el = $(id);
    if (!el) return;
    el.textContent = msg;
    el.hidden = !msg;
  }

  function clearErrors() {
    ['err-login-email','err-login-senha','err-login-geral',
     'err-signup-nome','err-signup-sobrenome','err-signup-email','err-signup-senha','err-signup-geral']
      .forEach(function (id) { showError(id, ''); });
  }

  function setLoading(btnId, loading) {
    var btn = $(btnId);
    if (!btn) return;
    btn.disabled = loading;
    var label   = btn.querySelector('.btn-label');
    var spinner = btn.querySelector('.btn-spinner');
    if (label)   label.style.opacity  = loading ? '0' : '';
    if (spinner) spinner.hidden       = !loading;
  }

  /* ─── Sessão ──────────────────────────────────────── */
  function salvarSessao(token, usuario) {
    try {
      localStorage.setItem('inbarber_token', token);
      localStorage.setItem('inbarber_user', JSON.stringify({
        id:          usuario.id,
        nome:        usuario.primeiroNome,
        sobrenome:   usuario.sobrenome,
        nomeCompleto:usuario.nomeCompleto,
        email:       usuario.email,
        telefone:    usuario.telefone,
      }));
      /* Mantém compatibilidade com perfil.js (KEY_USER = 'inbarber.profile') */
      localStorage.setItem('inbarber.profile', JSON.stringify({
        'f-first': usuario.primeiroNome,
        'f-last':  usuario.sobrenome,
        'f-email': usuario.email,
        'f-phone': usuario.telefone || '',
        'f-birth': usuario.dataNascimento || '',
      }));
    } catch (e) {}
  }

  /* ─── Abas ────────────────────────────────────────── */
  function switchTab(tab) {
    var isLogin = tab === 'login';
    $('tab-login').classList.toggle('auth-panel--hidden', !isLogin);
    $('tab-signup').classList.toggle('auth-panel--hidden',  isLogin);
    $('tab-login-btn').classList.toggle('auth-tab--active',  isLogin);
    $('tab-signup-btn').classList.toggle('auth-tab--active', !isLogin);
    var line = $('auth-tab-line');
    if (line) line.classList.toggle('auth-tab-line--right', !isLogin);
    clearErrors();
  }

  document.querySelectorAll('.auth-tab').forEach(function (btn) {
    btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
  });
  document.querySelectorAll('.auth-link').forEach(function (btn) {
    btn.addEventListener('click', function () { switchTab(btn.dataset.switch); });
  });

  /* ─── Show / hide senha ────────────────────────────── */
  document.querySelectorAll('.js-reveal').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.dataset.target);
      if (!input) return;
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.classList.toggle('is-visible', show);
    });
  });

  /* ─── Login ───────────────────────────────────────── */
  $('btn-login').addEventListener('click', function () {
    clearErrors();
    var email = ($('login-email').value || '').trim();
    var senha = $('login-senha').value || '';
    var ok = true;

    if (!email || !email.includes('@')) {
      showError('err-login-email', 'E-mail inválido.'); ok = false;
    }
    if (!senha) {
      showError('err-login-senha', 'Informe a senha.'); ok = false;
    }
    if (!ok) return;

    setLoading('btn-login', true);
    API.login({ email: email, senha: senha })
      .then(function (res) {
        salvarSessao(res.token, res.usuario);
        window.location.href = '/index.html';
      })
      .catch(function (err) {
        showError('err-login-geral', err.message || 'Erro ao entrar. Tente novamente.');
      })
      .finally(function () {
        setLoading('btn-login', false);
      });
  });

  /* ─── Cadastro ────────────────────────────────────── */
  $('btn-signup').addEventListener('click', function () {
    clearErrors();
    var nome      = ($('signup-nome').value || '').trim();
    var sobrenome = ($('signup-sobrenome').value || '').trim();
    var email     = ($('signup-email').value || '').trim();
    var telefone  = ($('signup-telefone').value || '').trim() || null;
    var senha     = $('signup-senha').value || '';
    var ok = true;

    if (!nome)      { showError('err-signup-nome',      'Informe o nome.'); ok = false; }
    if (!sobrenome) { showError('err-signup-sobrenome', 'Informe o sobrenome.'); ok = false; }
    if (!email || !email.includes('@')) { showError('err-signup-email', 'E-mail inválido.'); ok = false; }
    if (senha.length < 8)  { showError('err-signup-senha', 'Mínimo 8 caracteres.'); ok = false; }
    if (!ok) return;

    setLoading('btn-signup', true);
    API.signup({ primeiroNome: nome, sobrenome: sobrenome, email: email, telefone: telefone, senha: senha })
      .then(function (res) {
        salvarSessao(res.token, res.usuario);
        window.location.href = '/index.html';
      })
      .catch(function (err) {
        showError('err-signup-geral', err.message || 'Erro ao criar conta. Tente novamente.');
      })
      .finally(function () {
        setLoading('btn-signup', false);
      });
  });

  /* ─── Enter nas teclas ────────────────────────────── */
  ['login-email','login-senha'].forEach(function (id) {
    var el = $(id);
    if (el) el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('btn-login').click();
    });
  });
  ['signup-nome','signup-sobrenome','signup-email','signup-telefone','signup-senha'].forEach(function (id) {
    var el = $(id);
    if (el) el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('btn-signup').click();
    });
  });

})();