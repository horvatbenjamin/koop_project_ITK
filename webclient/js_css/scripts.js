window.onload = function () {
    document.body.onresize = function () {
       var canvasNode = document.getElementById('canvas');
       canvasNode.width = canvasNode.parentNode.clientWidth;
       canvasNode.height = canvasNode.parentNode.clientHeight;
       var scrollbarNode = document.getElementById('viewport');
       $("#viewport").css({"height" : scrollbarNode.parentNode.parentNode.clientHeight});
       
    }
    document.body.onresize();
};



$(document).ready(function() {

    $("#login_btn").click(function() {
        user = $('#username').val();
		if(user == ""){
            user = "anonymus" + Math.ceil(Math.random()*100000);
		}
        console.log("Username: " + user);
        
		window.WebSocket = window.WebSocket || window.MozWebSocket;
		if (!window.WebSocket) {
			console.log("Szar a bongeszod!");
			return;
		}

		var chat_messages=$('#chat_messages_ul');

//		var ws = new WebSocket("ws://nemgy.itk.ppke.hu:61160");
		var ws = new WebSocket("ws://horvatbenjamin.homelinux.net:8787");
		//var objects = new Array();
		var s = new state();

	//ONOPEN
    ws.onopen = function(){
        $('#login_container').hide();
        $('#scrollbar1').tinyscrollbar();

        console.log("succesfull connect");
        console.log("Sending username");
        var user_msg={
            "type":"0",
            "sender":user
        }
        ws.send(JSON.stringify(user_msg));
    }
    
    //ONCLOSE
    ws.onclose = function(){
        console.log("connection closed...");
    }
    
    //ONERROR
    ws.onerror = function(error) {
        console.log("gondolom baj van");     
    }
    
    //ONMESSAGE
    ws.onmessage = function (message) {
        console.log("Got message");
        try {
            var json = JSON.parse(message.data);
			console.log(json.type);
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', message.data);
            return;
        }
        switch(json.type){ //mivel nincs sehol ertelmesen osszefoglalva, igy ki kellett lesnem a desktop kliensbol..
            case "1":
            case 1:
                renameobj(json);
                break; //objektum modositasa
            case "2":
            case 2: //Objektum mozgatasa +mentese 
				newobj(json);
                break;
            case "3":
            case 3: //Objektum letrehozasa ...most akkor ilyen nem erkezik? ilyet csk kuldunk a szervernek? 
                break;
            case "4":
            case 4: //Objektum mozgatasa
				move(json);
                break;
            case "5":
            case 5: //Objektum torlese
				s.deleteRect(json.message.objId);
				break;
			case "6":
			case 6: //El letrehozasa
				//TODO: Implement ME!
				newEdge(json);
				break;
			case "7":
			case 7:
				s.deleteEdge(json);
				break;
            case "1000":
            case 1000: //CHAT
                handleChatMessage(json);
                break;
            default: //hiba
                console.log("Valami nagyon nem jo.. szivas..");
        }
        
        //DEBUG
        console.log(json);
    }


	var ctx=document.getElementById("canvas").getContext("2d");

	/*function create(json){
		if(objects[json.message.objId] == undefined ){
			var color = randomcolor();
			var x = parseInt(json.message.x);
			var y = parseInt(json.message.y);

			ctx.fillStyle = color;
			ctx.fillRect(x,y,json.message.data.length*10+30,30);
			ctx.fillStyle = "#000000";
			ctx.font="10px Arial";
			ctx.fillText(json.message.data,x+15,y+20);
			var obj = {"x":x,"y":y,"z":json.message.z,"size": json.message.data.length*10+30,"img":ctx.getImageData(x,y,json.message.data.length*10+30,30)};
			objects[json.message.objId]= obj;
		}
	}

	var movearray = new Array();
	function move(json,save){
		var temp = objects[json.message.objId];
		if(temp != undefined){
			var tmp = movearray[json.message.objId];
			if(tmp == undefined){
				ctx.clearRect(temp["x"],temp["y"],temp["size"],30);
			}
			else{
				ctx.clearRect(tmp["x"],tmp["y"],temp["size"],30);
			}
			ctx.putImageData(temp["img"],json.message.x,json.message.y);
			if(save){
				if(tmp != undefined){
					delete movearray[json.message.objId];
				}
				objects[json.message.objId]["x"]=json.message.x;
				objects[json.message.objId]["y"]=json.message.y;
			}
			else{
				movearray[json.message.objId]={"x":json.message.x,"y":json.message.y};
			}
		}
	}*/


	function move(json){
		if(!s.containId(json.message.objId)){ //ha uj objektumot crealt valaki akkor lesz ez...
			var tmp = {"message":{"x":json.message.x,"y":json.message.y,"z": "0","data":"newRectangle","objId":json.message.objId}}; //ez mert szar a rendszer!
			s.addRectangle(new Rectangle(tmp,randomcolor()));
		}
		else{
			s.moveRect(json);
		}
	}

	function newobj(json){
		if(!s.containId(json.message.objId)){
			s.addRectangle(new Rectangle(json,randomcolor()));
		}
		else{
		//	s.moveRect(json);
		}
	}

    function handleChatMessage(json){
        chat_messages.append("<li>"+json.sender + ": " + json.message+"</li>")
        $('#scrollbar1').tinyscrollbar_update('bottom');
    }
    
	function newEdge(json){
		s.addEdge(new Edge(json));
	}

    function renameobj(json){
        s.renameRect(json);        
    }

	$('#chat_input_field').keydown(function(e) {
        var ts = Math.round((new Date()).getTime() / 1000);
        if (e.keyCode === 13) {
            var msg = $(this).val();
            var chat_msg = {
                "sender":user,
                "message":msg,
                "type":1000,
                "timestamp":ts
            }
            
            ws.send(JSON.stringify(chat_msg));
            handleChatMessage(chat_msg);
            $(this).val('');
        }
    });
  
	//random color generalo
	function randomcolor(){
		var color = "#";
		for(var i=0;i<6;i += 1){
			var temp = Math.floor((Math.random() * 15)+1);
			if(temp>9){
				switch(temp){
					case 10: color = color + 'a';break;
					case 11: color = color + 'b';break;
					case 12: color = color + 'c';break;
					case 13: color = color + 'd';break;
					case 14: color = color + 'e';break;
					case 15: color = color + 'f';break;
				}
			}
			else{
				color = color + temp;
			}
		}
		return color;
	}

	//konstruktor egy objektumunkhoz
	function Rectangle(json, c){

		this.x = parseInt(json.message.x);
		this.y = parseInt(json.message.y);
		this.z = parseInt(json.message.z);
		this.data = json.message.data;
		this.id = json.message.objId;
		this.color = c;
	}

	//hogy rajzolja ki az objektumot
	Rectangle.prototype.draw = function() {
		ctx.fillStyle = this.color;
        if(!this.data)this.data='undef';
		ctx.fillRect(this.x, this.y, this.data.length*5+30,30);
		ctx.fillStyle = "#000000";
		ctx.fillText(this.data,this.x+13,this.y+20);
	}

	//az adott pontok az objektum hatarain belul vannak-e?
	Rectangle.prototype.contains = function(mx, my) {
		return  (this.x <= mx) && (this.x + this.data.length*5+30 >= mx) && (this.y <= my) && (this.y + 30 >= my);
	}

	function Edge(json){
		this.rectangle1Id=json.message.Rectangle1Id;
		this.rectangle2Id=json.message.Rectangle2Id; 
	};

	Edge.prototype.draw = function(objects) {
		// EDGE kirajzolasa
		var upper = null;
		var low = null;
		var counter = 0;
		var l = objects.length;
		//console.log(objects);
		//console.log(this.rectangle1Id,this.rectangle2Id);
		for (var i = l-1; i >= 0; i--) {
			if(objects[i].id == this.rectangle1Id){
				upper = objects[i];
				counter++;
			}
			else if(objects[i].id == this.rectangle2Id){
				low = objects[i];
				counter++;
			}
			if(counter>=2){
				break;
			}
		}
		//console.log(upper);
		//console.log(low);
		if(upper != null && low != null){
			ctx.fillStyle = "#000000";
			ctx.beginPath();
			//ctx.lineWidth = 10;
			if(upper.y > low.y){
				var tmp = upper;
				upper = low;
				low = tmp;
			}
			if(upper.y+31 < low.y){
				ctx.moveTo(upper.x+(upper.data.length*5+30)/2,upper.y+30);
				ctx.lineTo(low.x+(low.data.length*5+30)/2,low.y);
			}
			else if(upper.x+upper.data.length*5+31 < low.x){
				ctx.moveTo(upper.x+(upper.data.length*5+30),upper.y+15);
				if(low.y > upper.y+23){
					ctx.lineTo(low.x+(low.data.length*5+30)/2,low.y);
				}
				else{
					ctx.lineTo(low.x,low.y+15);
				}
			}
			else if(upper.x > low.x+low.data.length*5+31){
				ctx.moveTo(upper.x,upper.y+15);
				if(low.y > upper.y+23){
					ctx.lineTo(low.x+(low.data.length*5+30)/2,low.y);
				}
				else{
					ctx.lineTo(low.x+low.data.length*5+30,low.y+15);
				}
			}
			ctx.stroke();
			ctx.closePath();
		}
	};


	// lenyegeben ez az osztaly fogja kezelni a canvas allapotait
	function state(){
		this.redrawed  = false;
		this.objects = [];
		this.edges = [];
		this.moving = false;
		this.selection = null;
		this.fromx = 0;
		this.fromy = 0;

		var state = this;
		var canvas = $("#canvas");
		this.width = canvas.width;
		this.height = canvas.height;

		this.edge1=0;
		this.edge2=0;
		this.selector=0;

		//eger lenyomasra megfog egy elemet ha aarra kattintottunk
		canvas.bind('mousedown', function(e) {
            var ts = Math.round((new Date()).getTime() / 1000);
			var mouse = state.getMouse(e); //eger pozicio lekerese
			var mx = mouse.x;
			var my = mouse.y;
			var objects = state.objects;
			var l = objects.length;
			for (var i = l-1; i >= 0; i--) {
				if (objects[i].contains(mx, my)) {
					if($("#hand").attr("checked")  != "undefined" && $("#hand").attr("checked") == "checked"){
						var selected = objects[i];
						state.fromx = mx - selected.x; //hogy azon a ponton mozgassuk az objektumot ahol megfogtuk, ne pedig mondjuk mindig a sarkat
						state.fromy = my - selected.y;
						state.moving = true;
						state.selection = selected;
						//state.redrawed = false; 
					}
					else if($("#delete").attr("checked")  != "undefined" && $("#delete").attr("checked") == "checked"){
						state.redrawed = false;
						ws.send(JSON.stringify({"type": 5,"timestamp":ts,"sender":user,"message":{"objId":objects[i].id}}));
						alert("torolted az elemet aminek az idja:" + objects[i].id +" ami a kutyat se erdekelte");
						var index = state.edges.length-1;
						var count = 0;
						for(var j=0;j<state.edges.length;j++){
							if(state.edges[j].rectangle1Id == objects[i].id || state.edges[j].rectangle2Id == objects[i].id){
								var tmp = state.edges[index];
								state.edges[index] = state.edges[j];
								state.edges[j] = tmp;
								edge_delete_json={"type": 7,"timestamp":ts,"sender":user,"message":{"Rectangle1Id":state.edges[j].rectangle1Id,"Rectangle2Id":state.edges[j].rectangle2Id}};
								ws.send(JSON.stringify(edge_delete_json));
								index--;
								count++;
							}
							if(j>=index){
								break;
							}
						}
						state.edges.splice(index+1,count);
						objects.splice(i,1);
					}
					else if($("#mindegy").attr("checked")  != "undefined" && $("#mindegy").attr("checked") == "checked"){
						// Elkezeles!
					//	console.log("EDGE MODE!");
						if(state.selector==0){
							state.edge1=objects[i];
						//	console.log("Edge1:", state.edge1);
							state.selector++;
						}
						else if(state.selector==1 && objects[i].id != state.edge1.id){
							state.redrawed = false;
							state.edge2=objects[i];
							//console.log("Edge2:", state.edge2);
							edge_json={"type": 6,"timestamp":ts,"sender":user,"message":{"Rectangle1Id":state.edge1.id, "Rectangle2Id":state.edge2.id}};
							//console.log(edge_json);
							ws.send(JSON.stringify(edge_json));
							state.edges.push(new Edge(edge_json));
							state.selector++;
						};
						//state.selector++;
						state.selector%=2;
					}
					else if($("#eraser").attr("checked")  != "undefined" && $("#eraser").attr("checked") == "checked"){
						if(state.selector==0){
							state.edge1=objects[i];
							state.selector++;
						}
						else if(state.selector==1 && objects[i].id != state.edge1.id){
							state.edge2=objects[i];
							edge_delete_json={"type": 7,"timestamp":ts,"sender":user,"message":{"Rectangle1Id":state.edge1.id,"Rectangle2Id":state.edge2.id}};
							for(var j = 0;j<state.edges.length;j++){
								if((state.edges[j].rectangle1Id == state.edge1.id && state.edges[j].rectangle2Id ==state.edge2.id) || (state.edges[j].rectangle2Id == state.edge1.id && state.edges[j].rectangle1Id ==state.edge2.id)){
									state.edges.splice(j,1);
									break;
								}
							}
							state.redrawed = false;
							ws.send(JSON.stringify(edge_delete_json));
							state.selector++;
						}
					//	state.selector++;
						state.selector%=2;
					}
					return;
				}
			}
			if($("#create").attr("checked")  != "undefined" && $("#create").attr("checked") == "checked"){
				ws.send(JSON.stringify({"type": 3,"timestamp":ts,"sender": user,"message":{"data":"newRectangle","x":mx,"y":my,"z":0}}));
				state.redrawed = false;
			}
		});

		canvas.bind('selectstart', function(e) { e.preventDefault(); return false; }); //kettos kattintaskor ne legyen keveredes

		canvas.bind('mousemove', function(e) {
            var ts = Math.round((new Date()).getTime() / 1000);
			if (state.moving){ //ha van megfogva objektum akkor mozog az egerrel
				var mouse = state.getMouse(e);
      			state.selection.x = mouse.x - state.fromx;
				state.selection.y = mouse.y - state.fromy;   
				state.redrawed = false; //ki kell rajzolni a valtozast
				ws.send(JSON.stringify({"type": 4,"timestamp":ts,"sender":user,"message":{"objId":state.selection.id,"x":state.selection.x,"y":state.selection.y}})); //mozgatas mentes nelkul
			}
		});

		canvas.bind('mouseup', function(e) { 
            var ts = Math.round((new Date()).getTime() / 1000);
			state.moving = false;  //mar nem mozgatjuk tovabb az elemet, lenyegeben elengedtuk
			if(state.selection){ // de csak ha volt kivalsztva elem
				ws.send(JSON.stringify({"type": 2,"timestamp":ts,"sender":user,"message":{"objId":state.selection.id,"x":state.selection.x,"y":state.selection.y}})); //mozgatas mentessel
				state.selection = null; //elengedes
			}
		 });

		canvas.bind('dblclick', function(e) {
            var ts = Math.round((new Date()).getTime() / 1000);
			var mouse = state.getMouse(e);
			var mx = mouse.x;
			var my = mouse.y;
			var objects = state.objects;
			var l = objects.length;
			for (var i = l-1; i >= 0; i--) {
				if (objects[i].contains(mx, my)) {
					//itt kell felugrani az ablaknak
					var newdata = ""; //ebbe beolvasni az ablakbol a szoveget
                                        newdata=prompt("Add meg az objektum nevet",objects[i].data)
					objects[i].data = newdata;
					ws.send(JSON.stringify({"type":1,"timestamp":ts,"sender":user,"message":{"objId":objects[i].id,"data":newdata}})); //remelem ezt kell
                                        ws.send(JSON.stringify({"type":2,"timestamp":ts,"sender":user,"message":{"objId":objects[i].id,"x":objects[i].x,"y":objects[i].y}})); //Mert szar
                                        state.redrawed=false;
				}
			}

		});

		this.interval = 30;
		setInterval(function() { state.draw(); }, state.interval);
	}

	state.prototype.containId = function(id){ //megmondja, hogy van-e mar olyan id-ju elemunk
		var objects = this.objects;
		var le = objects.length;
		for (var i = le-1; i >= 0; i--) {
			if(objects[i].id == id){
				return true;
			}
		}
		return false;
	}

	state.prototype.addRectangle = function(Rectangle){ //uj elem hozzaadasa
		this.objects.push(Rectangle);
		this.redrawed = false;
	}

	state.prototype.addEdge = function(Edge){
		this.edges.push(Edge);
		this.redrawed = false;
	}

	state.prototype.getMouse = function(e){  //eger pozicio meghatarozasa .. rossz
		var element =document.getElementById('canvas') , offsetX = 0, offsetY = 0, mx, my;
  
		if (element.offsetParent !== undefined) {
			do {
				offsetX += element.offsetLeft;
				offsetY += element.offsetTop;
			} while ((element = element.offsetParent));
		}

		mx = e.pageX - offsetX;
		my = e.pageY - offsetY;
  
		return {x: mx, y: my};
	}

	state.prototype.draw = function() { //kirajzolas a canvasra
		if (!this.redrawed) {
			var objects = this.objects;
			var edges = this.edges;
			ctx.clearRect(0,0,canvas.width,canvas.height);
			var l = objects.length;
			for (var i = 0; i < l; i++) {
				//var obj = objects[i];
				//if (obj.x > this.width || obj.y > this.height || obj.x + obj.data.length*10+30 < 0 || shape.y + 30 < 0) continue; ha kiment volna az elem a canvasrol, nem vagyok biztos, hogy olyat tudunk, mivel ahhoz le kell huzni az egeret a canvasrol, akkor meg nincs eger move event
				objects[i].draw();
			}

			for (var i = 0; i < edges.length; i++){
				edges[i].draw(objects);
			}


			this.redrawed = true; //nem kell ujra kirajzolni amig nincs valtozas
		}
	}

	state.prototype.moveRect = function(json){
		var objects = this.objects;
		var len = objects.length
		for(var i = len-1;i>=0;i--){
			if(objects[i].id == json.message.objId){
				objects[i].x = parseInt(json.message.x);
				objects[i].y = parseInt(json.message.y);
				this.redrawed = false;
				return;
			}
		}
	}

	state.prototype.deleteRect = function(id){
		var objects = this.objects;
		var len = objects.length
		for(var i = len-1;i>=0;i--){
			if(objects[i].id == id){
				objects.splice(i,1);
				this.redrawed = false;
				return;
			}
		}
	}
        
    state.prototype.renameRect = function(json){
		var objects = this.objects;
		var len = objects.length
		for(var i = len-1;i>=0;i--){
			if(objects[i].id == json.message.objId){
				objects[i].data = json.message.data;
				this.redrawed = false;
				return;
			}
		}
	}

	state.prototype.deleteEdge = function(json){
		var edges = this.edges;
		for(var j = 0;j<edges.length;j++){
			if((edges[j].rectangle1Id == json.message.Rectangle1Id && edges[j].rectangle2Id == json.message.Rectangle2Id) || (edges[j].rectangle2Id == json.message.Rectangle1Id && edges[j].rectangle1Id == json.message.Rectangle2Id)){
				edges.splice(j,1);
				this.redrawed = false;
				return;
			}
		}
	}

	});
});

