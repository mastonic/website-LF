;(function () {
  'use strict'

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script')
    return scripts[scripts.length - 1]
  })()

  var API_KEY = script.getAttribute('data-key') || ''
  var COLOR = script.getAttribute('data-color') || '#2563EB'
  // APP_URL n'est pas configurable via data-url pour des raisons de sécurité
  var APP_URL = 'https://immoai.fr'

  // ── Session persistante via sessionStorage ──────────────────────────────────
  var SESSION_STORAGE_KEY = 'immoai_session_' + API_KEY.slice(0, 8)
  var MESSAGES_STORAGE_KEY = 'immoai_msgs_' + API_KEY.slice(0, 8)

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
  }

  function getSessionId() {
    try {
      var stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (stored) return stored
      var id = generateUUID()
      sessionStorage.setItem(SESSION_STORAGE_KEY, id)
      return id
    } catch (_) {
      return generateUUID()
    }
  }

  function loadMessages() {
    try {
      var raw = sessionStorage.getItem(MESSAGES_STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch (_) {
      return []
    }
  }

  function saveMessages(msgs) {
    try {
      sessionStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(msgs))
    } catch (_) {}
  }

  var SESSION_ID = getSessionId()
  var messages = loadMessages()
  var isOpen = false

  function createWidget() {
    var style = document.createElement('style')
    style.textContent = [
      '#immoai-widget *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '#immoai-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:' + COLOR + ';border:none;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;z-index:9999;transition:transform .2s}',
      '#immoai-btn:hover{transform:scale(1.08)}',
      '#immoai-btn svg{width:28px;height:28px;fill:white}',
      '#immoai-chat{position:fixed;bottom:96px;right:24px;width:360px;max-height:520px;background:white;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.15);display:none;flex-direction:column;z-index:9999;overflow:hidden}',
      '@media(max-width:420px){#immoai-chat{width:calc(100vw - 16px);right:8px;bottom:80px}}',
      '#immoai-chat.open{display:flex}',
      '#immoai-header{background:' + COLOR + ';color:white;padding:16px;font-weight:600;font-size:14px;display:flex;align-items:center;gap:8px}',
      '#immoai-header-dot{width:8px;height:8px;background:#4ade80;border-radius:50%;flex-shrink:0}',
      '#immoai-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}',
      '.immoai-msg{max-width:80%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5}',
      '.immoai-msg.bot{background:#f3f4f6;color:#111;align-self:flex-start;border-bottom-left-radius:4px}',
      '.immoai-msg.user{background:' + COLOR + ';color:white;align-self:flex-end;border-bottom-right-radius:4px}',
      '#immoai-footer{padding:12px;border-top:1px solid #e5e7eb;display:flex;gap:8px}',
      '#immoai-input{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px;font-size:13px;outline:none}',
      '#immoai-input:focus{border-color:' + COLOR + '}',
      '#immoai-send{background:' + COLOR + ';color:white;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:500}',
      '#immoai-send:disabled{opacity:.5;cursor:not-allowed}',
      '.immoai-typing{font-size:12px;color:#9ca3af;align-self:flex-start;padding:4px 0}',
    ].join('')
    document.head.appendChild(style)

    var wrapper = document.createElement('div')
    wrapper.id = 'immoai-widget'
    wrapper.setAttribute('role', 'complementary')
    wrapper.setAttribute('aria-label', 'Assistant immobilier')
    wrapper.innerHTML = [
      '<button id="immoai-btn" aria-label="Ouvrir le chat immobilier" aria-expanded="false">',
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',
      '</button>',
      '<div id="immoai-chat" role="dialog" aria-modal="true" aria-label="Chat avec l\'assistant immobilier">',
        '<div id="immoai-header"><div id="immoai-header-dot" aria-hidden="true"></div>Assistant immobilier</div>',
        '<div id="immoai-messages" role="log" aria-live="polite" aria-label="Messages"></div>',
        '<div id="immoai-footer">',
          '<input id="immoai-input" type="text" placeholder="Votre message..." autocomplete="off" aria-label="Votre message"/>',
          '<button id="immoai-send">Envoyer</button>',
        '</div>',
      '</div>',
    ].join('')
    document.body.appendChild(wrapper)

    var btn = document.getElementById('immoai-btn')
    var sendBtn = document.getElementById('immoai-send')
    var inputEl = document.getElementById('immoai-input')

    btn.addEventListener('click', toggleChat)
    sendBtn.addEventListener('click', sendMessage)
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    })

    // Restaure les messages de la session précédente
    if (messages.length > 0) {
      messages.forEach(function (m) {
        if (m.role === 'assistant') addBotMessage(m.content, false)
        else addUserMessage(m.content, false)
      })
    } else {
      addBotMessage('Bonjour ! Je suis votre assistant immobilier. Comment puis-je vous aider aujourd\'hui ?', true)
    }
  }

  function toggleChat() {
    isOpen = !isOpen
    var chat = document.getElementById('immoai-chat')
    var btn = document.getElementById('immoai-btn')
    chat.className = isOpen ? 'open' : ''
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false')
    if (isOpen) {
      setTimeout(function () {
        var input = document.getElementById('immoai-input')
        if (input) input.focus()
      }, 100)
    }
  }

  function addBotMessage(text, save) {
    var el = document.createElement('div')
    el.className = 'immoai-msg bot'
    el.textContent = text
    var container = document.getElementById('immoai-messages')
    container.appendChild(el)
    container.scrollTop = container.scrollHeight
    if (save) {
      messages.push({ role: 'assistant', content: text })
      saveMessages(messages)
    }
  }

  function addUserMessage(text, save) {
    var el = document.createElement('div')
    el.className = 'immoai-msg user'
    el.textContent = text
    var container = document.getElementById('immoai-messages')
    container.appendChild(el)
    container.scrollTop = container.scrollHeight
    if (save) {
      messages.push({ role: 'user', content: text })
      saveMessages(messages)
    }
  }

  function addTyping() {
    var el = document.createElement('div')
    el.className = 'immoai-typing'
    el.id = 'immoai-typing'
    el.textContent = 'Assistant écrit...'
    document.getElementById('immoai-messages').appendChild(el)
    document.getElementById('immoai-messages').scrollTop = 99999
    return el
  }

  function setInputDisabled(disabled) {
    var input = document.getElementById('immoai-input')
    var btn = document.getElementById('immoai-send')
    if (input) input.disabled = disabled
    if (btn) btn.disabled = disabled
  }

  function sendMessage() {
    var input = document.getElementById('immoai-input')
    var text = (input.value || '').trim()
    if (!text) return
    input.value = ''
    addUserMessage(text, true)
    setInputDisabled(true)

    var typing = addTyping()

    // Envoie l'API key en Authorization header (pas dans le body)
    fetch(APP_URL + '/api/widget/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
      },
      body: JSON.stringify({
        messages: messages,
        session_id: SESSION_ID,
      }),
    })
      .then(function (r) { return r.json() })
      .then(function (data) {
        typing.remove()
        if (data.message) {
          addBotMessage(data.message, true)
        }
      })
      .catch(function () {
        typing.remove()
        addBotMessage('Désolé, une erreur s\'est produite. Veuillez réessayer.', false)
      })
      .finally(function () {
        setInputDisabled(false)
        var inputEl = document.getElementById('immoai-input')
        if (inputEl) inputEl.focus()
      })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget)
  } else {
    createWidget()
  }
})()
