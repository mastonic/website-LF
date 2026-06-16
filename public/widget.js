;(function () {
  'use strict'

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script')
    return scripts[scripts.length - 1]
  })()

  var API_KEY = script.getAttribute('data-key') || ''
  var COLOR = script.getAttribute('data-color') || '#2563EB'
  var APP_URL = script.getAttribute('data-url') || 'https://immoai.fr'
  var SESSION_ID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })

  var messages = []
  var isOpen = false

  function createWidget() {
    var style = document.createElement('style')
    style.textContent = [
      '#immoai-widget *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '#immoai-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:' + COLOR + ';border:none;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;z-index:9999;transition:transform .2s}',
      '#immoai-btn:hover{transform:scale(1.08)}',
      '#immoai-btn svg{width:28px;height:28px;fill:white}',
      '#immoai-chat{position:fixed;bottom:96px;right:24px;width:360px;max-height:520px;background:white;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.15);display:none;flex-direction:column;z-index:9999;overflow:hidden}',
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
      '.immoai-typing{font-size:12px;color:#9ca3af;align-self:flex-start;padding:4px 0}',
    ].join('')
    document.head.appendChild(style)

    var wrapper = document.createElement('div')
    wrapper.id = 'immoai-widget'
    wrapper.innerHTML = [
      '<button id="immoai-btn" aria-label="Chat immobilier">',
        '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',
      '</button>',
      '<div id="immoai-chat">',
        '<div id="immoai-header"><div id="immoai-header-dot"></div>Assistant immobilier</div>',
        '<div id="immoai-messages"></div>',
        '<div id="immoai-footer">',
          '<input id="immoai-input" type="text" placeholder="Votre message..." autocomplete="off"/>',
          '<button id="immoai-send">Envoyer</button>',
        '</div>',
      '</div>',
    ].join('')
    document.body.appendChild(wrapper)

    document.getElementById('immoai-btn').addEventListener('click', toggleChat)
    document.getElementById('immoai-send').addEventListener('click', sendMessage)
    document.getElementById('immoai-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') sendMessage()
    })

    addBotMessage('Bonjour ! Je suis votre assistant immobilier. Comment puis-je vous aider aujourd\'hui ?')
  }

  function toggleChat() {
    isOpen = !isOpen
    document.getElementById('immoai-chat').className = isOpen ? 'open' : ''
  }

  function addBotMessage(text) {
    var el = document.createElement('div')
    el.className = 'immoai-msg bot'
    el.textContent = text
    var container = document.getElementById('immoai-messages')
    container.appendChild(el)
    container.scrollTop = container.scrollHeight
  }

  function addUserMessage(text) {
    var el = document.createElement('div')
    el.className = 'immoai-msg user'
    el.textContent = text
    var container = document.getElementById('immoai-messages')
    container.appendChild(el)
    container.scrollTop = container.scrollHeight
  }

  function addTyping() {
    var el = document.createElement('div')
    el.className = 'immoai-typing'
    el.id = 'immoai-typing'
    el.textContent = 'Assistant écrit...'
    document.getElementById('immoai-messages').appendChild(el)
    return el
  }

  function sendMessage() {
    var input = document.getElementById('immoai-input')
    var text = input.value.trim()
    if (!text) return
    input.value = ''
    addUserMessage(text)
    messages.push({ role: 'user', content: text })

    var typing = addTyping()

    fetch(APP_URL + '/api/widget/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: API_KEY, messages: messages, session_id: SESSION_ID }),
    })
      .then(function (r) { return r.json() })
      .then(function (data) {
        typing.remove()
        if (data.message) {
          messages.push({ role: 'assistant', content: data.message })
          addBotMessage(data.message)
        }
      })
      .catch(function () {
        typing.remove()
        addBotMessage('Désolé, une erreur s\'est produite. Veuillez réessayer.')
      })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget)
  } else {
    createWidget()
  }
})()
