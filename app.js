const form = document.querySelector('#chatForm');
const input = document.querySelector('#messageInput');
const messagesEl = document.querySelector('#messages');
const welcome = document.querySelector('#welcome');
const sendButton = document.querySelector('#sendButton');
const historyList = document.querySelector('#historyList');
const toast = document.querySelector('#toast');
const conversation = document.querySelector('#conversation');
const STORAGE_KEY = 'forma-conversations-v1';
let conversations = loadConversations();
let activeId = null;
let busy = false;

function loadConversations() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)); }
function current() { return conversations.find(item => item.id === activeId); }
function escapeHtml(value) { return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function formatText(value) {
  const safe = escapeHtml(value.trim());
  return safe.split(/\n\s*\n/).map(block => `<p>${block.replace(/\n/g, '<br>')}</p>`).join('');
}
function renderMessages() {
  const chat = current();
  messagesEl.innerHTML = chat ? chat.messages.map(message => `<article class="message ${message.role}"><div class="message-avatar">${message.role === 'user' ? 'Y' : '✳'}</div><div class="message-content">${formatText(message.content)}</div></article>`).join('') : '';
  welcome.hidden = Boolean(chat?.messages.length);
  messagesEl.scrollIntoView({block:'end',behavior:'smooth'});
  renderHistory();
}
function renderHistory() {
  historyList.innerHTML = conversations.slice(0, 10).map(chat => `<button class="history-entry ${chat.id === activeId ? 'current' : ''}" data-id="${chat.id}" title="${escapeHtml(chat.title)}">◦ &nbsp;${escapeHtml(chat.title)}</button>`).join('');
}
function newConversation() { activeId = null; renderMessages(); input.focus(); }
function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2500); }
function addMessage(role, content) {
  const chat = current();
  chat.messages.push({role, content});
  if (role === 'user' && chat.title === 'New conversation') chat.title = content.slice(0, 32) + (content.length > 32 ? '…' : '');
  persist(); renderMessages();
}
function scrollDown() { conversation.scrollTo({top:conversation.scrollHeight,behavior:'smooth'}); }
async function submitMessage(value = input.value) {
  const content = value.trim();
  if (!content || busy) return;
  input.value = ''; input.style.height = 'auto';
  if (!current()) { activeId = crypto.randomUUID(); conversations.unshift({id:activeId,title:'New conversation',messages:[]}); }
  addMessage('user', content);
  busy = true; sendButton.disabled = true;
  const typing = document.createElement('article');
  typing.className = 'message assistant'; typing.id = 'typingIndicator';
  typing.innerHTML = '<div class="message-avatar">✳</div><div class="typing"><span></span><span></span><span></span></div>';
  messagesEl.append(typing); scrollDown();
  try {
    const response = await fetch('/api/chat', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:current().messages})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    addMessage('assistant', data.reply);
  } catch (error) {
    addMessage('assistant', error.message || 'I couldn’t connect just now. Check that the server is running and try again.');
  } finally {
    document.querySelector('#typingIndicator')?.remove(); busy = false; sendButton.disabled = false; input.focus();
  }
}
form.addEventListener('submit', event => { event.preventDefault(); submitMessage(); });
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 150)}px`; });
input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
document.querySelectorAll('.suggestion').forEach(button => button.addEventListener('click', () => submitMessage(button.dataset.prompt)));
document.querySelector('#newChat').addEventListener('click', newConversation);
document.querySelector('#clearChat').addEventListener('click', () => { if (activeId) { conversations = conversations.filter(item => item.id !== activeId); activeId = null; persist(); renderMessages(); } else showToast('This conversation is already clear'); });
historyList.addEventListener('click', event => { const button = event.target.closest('[data-id]'); if (button) { activeId = button.dataset.id; renderMessages(); document.querySelector('#sidebar').classList.remove('open'); } });
document.querySelector('#themeToggle').addEventListener('click', () => { document.body.classList.toggle('dark'); localStorage.setItem('forma-dark', document.body.classList.contains('dark')); });
if (localStorage.getItem('forma-dark') === 'true') document.body.classList.add('dark');
document.querySelector('#mobileMenu').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
document.querySelector('#savedNav').addEventListener('click', () => showToast('Prompt library is coming soon'));
document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); newConversation(); } });
renderMessages();
