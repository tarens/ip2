var io = require('socket.io').listen(81);
var fs = require('fs');
var AloneRoom;

function Log(data)
{
    console.log(data);
	fs.appendFile('message.txt', data + "\r\n", function (err) {
	  if (err) throw err;
	});
}

io.sockets.on('connection', function (socket) {
	socket.emit("connected");
	socket.gameStatus = "connected";
	Log(socket.id + " connected.\r\n");
	var inroom = undefined;
	socket.on('readyToPlay', function() {		
		if (socket.gameStatus != "connected")
			return;

		if (AloneRoom)
		{
		    inroom = AloneRoom;
		    socket.join(inroom);
		    Log("Room #" + inroom + " is full.");
			io.sockets.in(inroom).emit("gameStarted");

			for (var socketId in io.sockets.clients(inroom)) {
			    io.sockets.clients(inroom)[socketId].gameStatus = "gameStarted";
			    Log(io.sockets.clients(inroom)[socketId].gameStatus);
			    Log(socketId + " game started.");
			}
			AloneRoom = undefined;
		}
		else
		{
		    AloneRoom = socket.id;
		    inroom = AloneRoom;
		    socket.join(inroom);
		    Log("Room #" + inroom + " has been created.");
			socket.emit("waitingForPlayers");
			socket.gameStatus = "waitingForPlayers";
		}
		
	});
	socket.on("makeMove", function (data) {
	    Log("Make move called on socket " + socket.id);
		if (socket.gameStatus != "gameStarted")
		    return;

		Log("Make move valid on socket " + socket.id);

		if (data.xfrom == undefined && data.yfrom == undefined && data.xto == undefined && data.yto == undefined) {
		    this.disconnect();
		    Log("Wrong coordinates from socket " + socket.id);
		    return;
		}

		socket.broadcast.to(inroom).emit("makeMove", data);
		Log(socket.id + " maked move from " + data.xfrom + " " + data.yfrom + " to " + data.xto + " " + data.yto);
	    
	});
	socket.on("gameOver", function (data) {
	        this.disconnect();
	        Log("Room" + inroom + " closing. game over.");
	});
	socket.once("disconnect", function (data) {
	    console.log("Disconnected started " + socket.id);

	    var roomClients = io.sockets.clients(inroom);
	    if (roomClients[0].lastClient == true)
	        return;

	    Log(socket.id + " In handler (call 1) " + roomClients.length);
	    if (roomClients.length <= 1)
		{
			if (AloneRoom == socket.id)
				AloneRoom = undefined;
	        return;
		}
	    Log(socket.id + " In handler (call 2) " + roomClients.length);

	    roomClients[0].lastClient = true;
	    if (roomClients[0] == socket)
	        roomClients[1].disconnect();
	    else
	        roomClients[0].disconnect();

	    Log("Disconnected finished " + socket.id);
	});
});