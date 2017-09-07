/* eslint-env browser, node */

const marked = require('marked');
var mongo = require('mongodb').MongoClient;

let socket;
let username;
let screen="common chat"

window.onload = function () {
  initEvents();
};

function $(sel) {
  return document.querySelector(sel);
}

function initSocket() {
  const server = $('#server-url').value.trim();
  appendText(`Connecting...`);
  socket = io.connect(server);
  socket.on('connect', () => {
    appendText(`Connected to server ${server}`);
    mongo.connect('mongodb://127.0.0.1/message', function (err, db) {
          var collection = db.collection('messages')
          console.log("HereIam:");
          collection.find().sort({ _id : -1 }).limit(10).toArray(function(err,res){
                      if(err) throw err;
                      //io.sockets.emit('bulk',res);
                      if(res.length){
                        for(var x=res.length-1;x>=0;x=x-1){
                          appendText(`__${res[x].name}:__ ${res[x].message}`);
                        }
                      }
                      console.log("HereIam:",res);
                  });
                });
  });
  // socket.on('bulk', (data) => {
  //   if(data.length){
  //     for(var x=data.length-1;x>=0;x=x-1){
  //       appendText(`__${data[x].name}:__ ${data[x].message}`);
  //     }
  //   }
  // });
  socket.on('message', (data) => {
    appendText(`__${data.username}:__ ${data.text}`);
  });
  socket.on('login', (data) => {
    appendText(`${data.username} has logged in.`);
    updateUserList(data.users);
  });
  socket.on('typing', (data) => {
    setStatus(`${data.username} is typing...`);
  });
  socket.on('stop-typing', () => {
    setStatus('');
  });
  socket.on('logout', (data) => {
    appendText(`${data.username} disconnected.`);
    updateUserList(data.users);
  });
  socket.on('error', (err) => {
    appendText(`Unable to connect to server ${server}\n${JSON.stringify(err)}`);
  });
}

function initEvents() {
  let typingTimer;
  let typing = false;


  $('#text-input').addEventListener('keydown', function (e) {
    if (e.keyCode === 13) {
      sendText();
    }
  });
  $('#users').addEventListener('click',function(e){
    if(username != e.target.innerHTML && username != screen){
      screen = e.target.innerHTML;
      $('#chat-text').innerHTML = '';
    }
      console.log(e.target.innerHTML);
  });
  $('#text-input').addEventListener('input', function () {
    if (!typing) {
      typing = true;
      socket.emit('typing', { username });
    }
    if (typingTimer) {
      clearTimeout(typingTimer);
      typingTimer = null;
    }
    typingTimer = setTimeout(function () {
      typing = false;
      socket.emit('stop-typing', { username });
    }, 1000);
  });
  $('#username').addEventListener('keydown', function (e) {
    if (e.keyCode === 13) {
      const value = this.value.trim();
      if (value) {
        username = this.value;
        initSocket();
        login();
      }
    }
  });
  $('#send-btn').addEventListener('click', sendText);
  $('#username').focus();
}

function sendText() {
  const inputField = $('#text-input');
  const text = inputField.value.trim();
  if (!text) return;
  socket.emit('message', { username, text });
  inputField.value = '';
}

function appendText(text) {
  const opts = { sanitize: true };
  $('#chat-text').innerHTML += `${marked(text, opts)}\n`;
}

function setStatus(text) {
  const node = $('#chat-status-msg');
  if (text) {
    node.textContent = text;
    node.classList.remove('hidden');
  } else {
    node.classList.add('hidden');
  }
}

function updateUserList(users) {
  const opts = { sanitize: true };
  $('#users').innerHTML = Array.from(users).map(name => `<li>${marked(name, opts)}</li>`).join('');
  $('#user-stats').textContent = `${users.length} users online.`;
}

function login() {
  socket.emit('login', { username });
  $('#login-box').classList.add('hidden');
  $('#text-input').focus();
}
