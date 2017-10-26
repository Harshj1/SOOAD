/* eslint-env browser, node */

const marked = require('marked');
var mongo = require('mongodb').MongoClient;

let socket;
let username;
let password;
let screen="common chat"
var collection,collection1;
var flag=0;
var usersid = {};

window.onload = function () {
  initEvents();
};

function $(sel) {
  return document.querySelector(sel);
}

function initSocket() {
  const server = $('#server-url').value.trim();
  $('#chat-active').innerHTML = 'Common Channel';
  appendText(`Connecting...`);
  socket = io.connect(server);
  socket.on('connect', () => {
    appendText(`Connected to server ${server}`);
    mongo.connect('mongodb://127.0.0.1/message', function (err, db) {
          collection = db.collection('messages')
          collection1 = db.collection('profile')
          if(flag==0){
          collection1.insert({ username:username,password: password }, function (err, o) {
                if (err) { console.warn(err.message); }
                else { console.log("user inserted into db"); }
            });
          }
          // else
          // {
          //   collection1.find({"username":username,"password":password}).toArray(function(err,res){
          //     if(res.length)
          //       console.log("Success!!");
          //     else
          //       console.log("Invalid user or password!!");
          //
          //   });
          // }
          $('#hello').innerHTML = "Hello "+ username;
          console.log("HereIam:");
          collection.find( {receiver : "common chat"} ).sort({ _id : -1 }).limit(10).toArray(function(err,res){
                      if(err) throw err;
                      //io.sockets.emit('bulk',res);
                      if(res.length){
                        for(var x=res.length-1;x>=0;x=x-1){
                          appendText(`__${res[x].sender}:__ ${res[x].message}`);
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
    console.log(data);
   if(screen == data.username || screen == "common chat")
      appendText(`__${data.username}:__ ${data.text}`);
  });
  socket.on('login', (data) => {
    appendText(`${data.username} has logged in.`);
    usersid = data.usersid;
    console.log(usersid);
    updateUserList(data.users);
  });

  socket.on('typing', (data) => {
    //setStatus(`${data.username} is typing...`);
  });
  socket.on('stop-typing', () => {
    //setStatus('');
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

  console.log("username",username);

  $('#text-input').addEventListener('keydown', function (e) {
    if (e.keyCode === 13) {
      sendText();
    }
  });
  $('#users').addEventListener('click',function(e){
    if(e.target.innerHTML!= "common chat"){
      console.log(usersid[e.target.innerHTML]);
    }
    if(username != e.target.innerHTML && e.target.innerHTML != screen){
      screen = e.target.innerHTML;
      $('#chat-active').innerHTML = e.target.innerHTML;
      if(screen == 'common chat'){
        mongo.connect('mongodb://127.0.0.1/message', function (err, db) {
              collection = db.collection('messages');
              console.log("HereIam:");
              collection.find( {receiver : "common chat"} ).sort({ _id : -1 }).limit(10).toArray(function(err,res){
                    if(err) throw err;
                    //io.sockets.emit('bulk',res);
                    if(res.length){
                      for(var x=res.length-1;x>=0;x=x-1){
                        appendText(`__${res[x].sender}:__ ${res[x].message}`);
                      }
                    }
                    console.log("collection",res);
                });
              });
      }
      else{
        mongo.connect('mongodb://127.0.0.1/message', function (err, db) {
              collection = db.collection('messages')
              console.log("Current screen:",screen);
              collection.find( { $or: [{receiver:screen},{receiver:username},{sender:screen},{sender:username}]} ).sort({ _id : -1 }).limit(10).toArray(function(err,res){
                          if(err) throw err;
                          //io.sockets.emit('bulk',res);
                          if(res.length){
                            for(var x=res.length-1;x>=0;x=x-1){
                              if(res[x].receiver!='common chat')
                                appendText(`__${res[x].sender}:__ ${res[x].message}`);
                            }
                          }
                          console.log("HereIam:",res);
                      });
                    });
      }
      $('#chat-text').innerHTML = '';
      console.log(e.target.innerHTML);
    }
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

  $('#lpassword').addEventListener('keydown', function (e) {
    if (e.keyCode === 13) {
      const value1 = this.value.trim();
      const value = $('#lusername').value.trim();
      if (value && value1) {
        username = value;
        password = value1;
        flag=1;
        mongo.connect('mongodb://127.0.0.1/message', function (err, db) {
            collection = db.collection('messages')
            collection1 = db.collection('profile')
            if(flag==1)
              {
                collection1.find({"username":username,"password":password}).toArray(function(err,res){
                  if(res.length)
                  {
                    console.log("Success!!");
                    initSocket();
                    login();
                  }
                  else
                  {
                    console.log("Invalid user or password!!");
                    $('#wrongid').style.display="flex";
                    $('#wrongid').innerHTML = `Wrong password/id`;
                  }
                });
              }
        });
      }
    }
  });

  $('#password').addEventListener('keydown', function (e) {
    if (e.keyCode === 13) {
      const value1 = this.value.trim();
      const value = $('#username').value.trim();
      if (value && value1) {
        username = value;
        password = value1;
        initSocket();
        login();
      }
    }
  });

  $('#send-btn').addEventListener('click', sendText);
  $('#username').focus();
  $('#password').focus();
}

function sendText() {
  const inputField = $('#text-input');
  const text = inputField.value.trim();
  if (!text) return;
  socket.emit('message', { username, text , screen });
  if(screen!= 'common chat')
    appendText(`__${username}:__ ${text}`);
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
  $('#user-stats').textContent = `${users.length-1} users online.`;
}

function login() {
  socket.emit('login', { username });
  
  $('#signup-box').classList.add('hidden');
  $('#login-box').classList.add('hidden');
  $('#text-input').focus();
}