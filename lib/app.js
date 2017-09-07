const express = require('express');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
var mongo = require('mongodb').MongoClient;

exports.app = {
  run(port) {
    server.listen(port, () => {
      console.log('Server listening at port %d', port);
    });
  },
};

const users = new Set();

io.on('connection', function onConnection(socket) {
  let username;
  console.log('a user connected');

  // mongo.connect('mongodb://127.0.0.1/message', function (err, db) {
  //       var collection = db.collection('messages')
  //       console.log("HereIam:");
  //       collection.find().sort({ _id : -1 }).limit(10).toArray(function(err,res){
  //                   if(err) throw err;
  //                   io.sockets.emit('bulk',res);
  //                   console.log("HereIam:",res);
  //               });
  //             });

  socket.on('message', function onMessage(data) {
    const text = data.text;
    mongo.connect('mongodb://127.0.0.1/message', function (err, db) {
            var collection = db.collection('messages');
            collection.insert({ name:username,message: text }, function (err, o) {
                if (err) { console.warn(err.message); }
                else { console.log("chat message inserted into db: " + text); }
            });
        });
    io.sockets.emit('message', { username, text });
  });

  // TODO: validate login!
  // TODO: check if user is already logged in!
  socket.on('login', function onLogin(data) {
    username = data.username;
    users.add("common chat");
    users.add(username);
    io.sockets.emit('login', { username, users: Array.from(users) });
  });

  socket.on('typing', function onTyping() {
    socket.broadcast.emit('typing', { username });
  });

  socket.on('stop-typing', function onStopTyping() {
    socket.broadcast.emit('stop-typing', { username });
  });

  socket.on('disconnect', function onDisconnect() {
    console.log('user disconnected');
    users.delete(username);
    socket.broadcast.emit('logout', { username, users: Array.from(users) });
  });
});
