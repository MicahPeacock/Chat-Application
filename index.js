"use strict";

const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const moment = require('moment');
const port = 3000;

let data = {
    users: [],
    messages: []
};

const createNewUser = () => {
    const newUsername = () => {
        return "User" + Math.floor((Math.random() * 9999) + 1).toString();
    };
    const newUserID = () => {
        return Math.floor((Math.random() * 10**32) + 1).toString();
    };
    const newColor = () => {
        const defaults = [
            "#ff0000",
            "#ff7700",
            "#ffff00",
            "#77ff00",
            "#00ff00",
            "#00ff77",
            "#00ffff",
            "#0077ff",
            "#0000ff",
            "#7700ff",
            "#ff00ff",
            "#ff0077",
        ];
        return defaults[Math.floor(Math.random() * 12)];
    };

    return {
        id: newUserID(),
        name: newUsername(),
        color: newColor()
    };
};

const createMessage = (sender, msg, receiver) => {
    const getTimeStamp = () => {
        return moment().format('MM/DD/YYYY, h:mm a');
    };
    const message = {
        sender: sender,
        receiver:receiver,
        date: getTimeStamp(),
        text: msg
    };
    if(data.messages.length === 200)
        data.messages.shift();
    data.messages.push(message);
    return message;
};

const checkNickname = (name) => {
    return !data.users.find(user => user.name === name);
};

const checkColorCode = (color) => {
    const colorRegex = /[\da-fA-F]{6}/;
    return colorRegex.test(color);
};

const changeNickname = (user, new_name) => {
    user.name = new_name;
    data.users.find(u => u.id === user.id).name = new_name;
    return user;
};

const changeColor = (user, new_color) => {
    user.color = "#" + new_color;
    data.users.find(u => u.id === user.id).color = "#" + new_color;
    return user;
};

app.use(express.static(__dirname));
app.use(cookieParser());
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    const user = createNewUser();
    socket.id = user.id;
    socket.emit('login', user, data);
    data.users.push(user);
    io.emit('new connection', user);
    console.log("A user '" + user.name + "' has connected");

    socket.on('chat message', (msg) => {
        io.emit('chat message', createMessage(msg.user, msg.text));
        if(data.messages.length >= 200)
            io.emit('trim messages');
        console.log("User '" + msg.user.name + "' sent the message '" + msg.text +"'");
    });
    socket.on('change nickname', (user, new_name) => {
        if(checkNickname(new_name)) {
            const old_name = user.name;
            socket.emit('change nickname success', changeNickname(user, new_name));
            io.emit('name change', user, old_name);
        }
        else {
            socket.emit('change nickname failure', new_name);
        }
    });
    socket.on('change color', (user, new_color) => {
        if(checkColorCode(new_color)) {
            socket.emit('change color success', changeColor(user, new_color));
            io.emit('color change', user);
        }
        else {
            socket.emit('change color failure', new_color);
        }
    });
    socket.on('disconnect', () => {
        const user = data.users.find(user => user.id === socket.id);
        io.emit('client disconnect', user);
        data.users = data.users.filter(u => u.id !== user.id);
        console.log("A user '" + user.name + "' has disconnected");
    });
});

http.listen(port, () => {
    console.log('listening on *:' + port);
});