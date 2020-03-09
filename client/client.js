"use strict";

$(() => {
    let current_user = {};
    let socket = io();

    const createMessage = (sender, text) => ({
        user: sender,
        text: text
    });

    const formatMessageText = (msg) => {
        let message = $('<li>').addClass('list-group-item');
        message.append($('<div>').addClass("message d-flex flex-col")
            .append($('<h3>').addClass("name").text(msg.sender.name + ": ").css({
                'color': msg.sender.color
            }))
            .append($('<p>').addClass("timestamp").text(msg.date + ":"))
        );
        message.append($('<p>').addClass("text").text(msg.text));
        if(msg.sender.id === current_user.id) {
            message.css({'font-weight': 'bold'});
            message.find('.name').css({'font-weight': 'bold'});
        }
        return message;
    };
    const handleCommand = (socket, text) => {
        if(text.startsWith("/nick ")) {
            let new_name = text.slice(6, text.length);
            socket.emit('change nickname', current_user, new_name);
        }
        else if(text.startsWith("/nickcolor ")) {
            let new_color = text.slice(11, text.length);
            socket.emit('change color', current_user, new_color);
        }
        else {
            console.error("Invalid command. Ignoring text...");
            $('#messages').append($('<li>')
                .text("Invalid command. Available commands are: " +
                    "/nick {new name}  " +
                    "/nickcolor {new color}"
                ).css({opacity: '50%'})
            );
        }
    };

    $('form').submit((event) => {
        event.preventDefault(); // prevents page reloading
        if($('#m').val().startsWith("/"))
            handleCommand(socket, $('#m').val());
        else
            socket.emit('chat message', createMessage(current_user, $('#m').val()));
        $('#m').val('');
        return false;
    });

    socket.on('login', (new_user, data) => {
        for(let user of data.users)
            $('#users').append($('<li>').text(user.name).css({ color: user.color }));
        for(let msg of data.messages)
            $('#messages').append(formatMessageText(msg));
        $('#messages').append($('<li>').text("You are " + new_user.name + "."));
       current_user = new_user;
    });
    socket.on('new connection', (user) => {
        $('#users').append($('<li>').text(user.name).css({ color: user.color }));
    });
    socket.on('chat message', (msg) => {
        console.log("User '" + msg.sender.name + "' sent the message '" + msg.text +"'");
        $('#messages').append(formatMessageText(msg));
    });
    socket.on('trim messages', () => {
        $('#messages li').first().remove();
    });
    socket.on('change nickname success', (user) => {
        console.log("Successfully changed name to '" + user.name + "'");
        current_user = user;
    });
    socket.on('change nickname failure', (new_name) => {
        console.warn("An existing user already has the name '" + new_name + "'");
        $('#messages').append($('<li>')
            .text("/nick failed. An existing user already has that name.")
            .css({opacity: '50%'})
        );
    });
    socket.on('change color success', (user) => {
        console.log("Successfully changed color to '" + user.color + "'");
        current_user = user;
    });
    socket.on('change color failure', (new_color) => {
        console.warn("Invalid color code '" + new_color + "'");
        $('#messages').append($('<li>')
            .text("/nickcolor failed. Only hexadecimal RGB codes are allowed")
            .css({opacity: '50%'})
        );
    });
    socket.on('name change', (user, old_name) => {
        $('#users li:contains("' + old_name + '")').each(function() {
            let text = $(this).text();
            $(this).text(text.replace(old_name, user.name));
        });
        $('#messages li:contains("' + old_name + '")').each(function() {
            let text = $(this).find('.name').text();
            $(this).find('.name').text(text.replace(old_name, user.name));
        });
    });
    socket.on('color change', (user) => {
       $('#users li:contains("' + user.name + '")').each(function() {
            $(this).css({'color': user.color});
       });
        $('#messages li:contains("' + user.name + '")').each(function() {
            $(this).find('.name').css({'color': user.color});
        });
    });
    socket.on('client disconnect', (user) => {
        $('#users li:contains("' + user.name + '")').remove();
    });
});