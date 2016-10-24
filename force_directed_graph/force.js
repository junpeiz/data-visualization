/*
	AnimatedGraph
	Contains the model, associated views and controllers. Responsible for updating everything.
*/

function AnimatedGraph(ts){
	this.model = new ForceGraph(ts);
	this.views = [];
	this.controllers = [];
}

AnimatedGraph.prototype.createCanvas=function(id, width = 640, height = 480){
	//Create view and subscribe it to model
	this.views[id] = new CanvasView(id,width,height);
	this.model.subscribe(this.views[id].redraw, this.views[id]);
	//Create controller of the view and connect it to the model
	this.controllers[id] = new CanvasController(this.model,this.views[id]);
	//Return the new canvas
	return this.getCanvas(id);
};

AnimatedGraph.prototype.getCanvas = function(id){
	return this.views[id].domelement;
};

AnimatedGraph.prototype.addNode=function(content){
	this.model.addNode(content);
};

AnimatedGraph.prototype.remNode=function(content){
	this.model.remNode(content);
};

AnimatedGraph.prototype.addEdge=function(c1,c2,e){
	this.model.addEdge(c1,c2,e);
};

AnimatedGraph.prototype.remEdge=function(c1,c2){
	this.model.remEdge(c1,c2);
};


/*
	CanvasController
	Controller of a given CanvasView. Associates appropriate event handlers with that view to change associated model.
*/

function CanvasController(model, view){
	//Register model and view
	this.model = model;
	this.view = view;

	//Register callbacks
	var that = this;
	this.view.domelement.addEventListener('mousedown',function(e){that.mousedown(e);},false);
	this.view.domelement.addEventListener('mousemove',function(e){that.mousemove(e);},false);
	this.view.domelement.addEventListener('DOMMouseScroll',function(e){that.mousescroll(e);},false);
	this.view.domelement.addEventListener('mousewheel',function(e){that.mousescroll(e);},false);
}

//Finds cursor position relative to the DOMElement of view, the absolute position inside the referencial of view.
CanvasController.prototype.getAbsoluteCoord=function(e){
	//Get cursor absolute location
	var cursor = {x:0, y:0};
	if (e.pageX || e.pageY) {
		cursor.x = e.pageX;
		cursor.y = e.pageY;
	}else {
		cursor.x = e.clientX +
		(document.documentElement.scrollLeft ||
		document.body.scrollLeft) -
		document.documentElement.clientLeft;
		cursor.y = e.clientY +
		(document.documentElement.scrollTop ||
		document.body.scrollTop) -
		document.documentElement.clientTop;
	}
	//Get offset of element
	var curleft = 0;
	var curtop = 0;
	var obj = this.view.domelement;
	while(obj) {
		curleft += obj.offsetLeft;
		curtop += obj.offsetTop;
		obj = obj.offsetParent;
	}
	//Find the cursor relative position to view
	cursor.x -= curleft;
	cursor.y -= curtop;

	//Return cursor position
	return new Vector(cursor.x,cursor.y,0);
};

//Using the absolute position finds the relative position inside the referencial view, the real position.
CanvasController.prototype.getRelativeCoord=function(e){
	//Get the absolute position of mouse inside the view DOM element
	var absolutecoord = this.getAbsoluteCoord(e);
	//Apply transformations of view and get real position
	return this.AbsoluteToRelativeCoord(absolutecoord);
};
CanvasController.prototype.AbsoluteToRelativeCoord=function(absolutecoord){
	//Translate coord
	var relativecoord = absolutecoord.minus(this.view.translation);
	//Scale coord
	var k = this.view.scale;
	relativecoord = new Vector(relativecoord.x/k,relativecoord.y/k,relativecoord.z/k);

	return relativecoord;
};
CanvasController.prototype.getScrollDirection=function(event){
	//Adapted from http://www.adomas.org/javascript-mouse-wheel/
	var delta = 0;
        if (!event) /* For IE. */
                event = window.event;
        if (event.wheelDelta) { /* IE/Opera. */
                delta = event.wheelDelta/120;
                /* In Opera 9, delta differs in sign as compared to IE. */
                if (window.opera)
                        delta = -delta;
        } else if (event.detail) { /* Mozilla case. */
                /* In Mozilla, sign of delta is different than in IE. Also, delta is multiple of 3. */
                delta = -event.detail/3;
        }
        /* If delta is nonzero, handle it.
         * Basically, delta is now positive if wheel was scrolled up,
         * and negative, if wheel was scrolled down.
         */
	if( delta<0 )
		return 'down';
	else if( delta>0 )
		return 'up';
	else
		return null;
};


/*
	CanvasView
	View of model using the canvas element
*/

function CanvasView(id,width,height){
	this.domelement = document.createElement('canvas');
	this.domelement.setAttribute('id',id);

	//Fit initial view to model size
	this.domelement.setAttribute('width',width);
	this.domelement.setAttribute('height',height);
	this.translation = new Vector(width/2.0,height/2.0,0);
	this.scale = 2;

	//Callbacks when resizing view
	var that = this;
	this.oldwidth = width;
	this.oldheight = height;
	var resize = function(e){
		var width = that.domelement.clientWidth;
		var height = that.domelement.clientHeight;
		that.domelement.setAttribute('width',width);
		that.domelement.setAttribute('height',height);

		//Add difference of new and old to translation
		that.translation = that.translation.add(new Vector(width-that.oldwidth,height-that.oldheight,0).division(2));
		//Scale by a factor of new area / old area
		that.scale *= Math.min(width,height) / Math.min(that.oldwidth,that.oldheight);

		//Save the new size
		that.oldwidth = width;
		that.oldheight = height;
	};
	window.addEventListener('load', resize, false);
	window.addEventListener('resize', resize, false);
	window.addEventListener('orientationchange', resize, false);
}

//Callback for drawing model
CanvasView.prototype.redraw=function(model){
	var width = this.domelement.getAttribute('width');
	var height = this.domelement.getAttribute('height');

	var cxt = this.domelement.getContext('2d');
	cxt.save();
	cxt.clearRect(0,0,width,height);
	cxt.translate(this.translation.x,this.translation.y);
	cxt.scale(this.scale,this.scale);

	cxt.textAlign="center";
	cxt.textBaseline="middle";
	cxt.strokeStyle="rgb(186,180,163)";

	cxt.font=".5em Arial";
	cxt.fillStyle="rgb(0,0,0)";
	for(var edge in model.edges){
		var e = model.edges[edge];
		cxt.beginPath();
		cxt.moveTo(e.origin.position.x, e.origin.position.y);
		cxt.lineTo(e.destination.position.x, e.destination.position.y);
		cxt.stroke();
		if(typeof e.content !== 'undefined' && e.content !== null){
			var midpos = e.origin.position.plus(e.destination.position.minus(e.origin.position).division(2));
			cxt.fillText(e.content, midpos.x, midpos.y);
		}
	}

	cxt.font=".7em Arial";
	for(var node in model.nodes){
		var n = model.nodes[node];
		cxt.beginPath();
		cxt.arc(n.position.x, n.position.y, n.radius, 0, Math.PI*2, true);
		cxt.fillStyle="rgb(217,147,61)";
		cxt.stroke();
		cxt.fill();
		cxt.fillStyle="rgb(0,0,0)";
		cxt.fillText(n, n.position.x, n.position.y);
	}
	cxt.restore();
};



/*
	ForceNode
	Representation of a physical spheric object subject to external forces
*/

function ForceNode(content){
	//A sphere positioned in the origin with 0 velocity with 1Kg mass, 2E-6 Coulombs and 8cm radius
	this.content=content;
	this.position = new Vector(0,0,0);
	this.velocity = new Vector(0,0,0);
	this.mass = 1;
	this.charge = 0.000002;
	this.radius = 8.0;
	this.enabled = true;
}

ForceNode.prototype.toString=function(){
	return this.content.toString();
};



/*
	ForceGraph
	Subclass of Graph. Force directed graph model
*/

function ForceGraph(ts){
	Graph.call(this);

	//Extend functionality from Publisher class
	var from = Publisher.prototype;
	var to = ForceGraph.prototype;
	for( var f in from )
		if( f != "constructor" && typeof from[f] == "function" && to[f] === undefined)
			to[f] = from[f];

	//Start running the simulation
	this.run(ts);
}

ForceGraph.prototype = new Graph();
ForceGraph.prototype.constructor=ForceGraph;

ForceGraph.springrest=25;
ForceGraph.springconstant=0.0001;
ForceGraph.damping=0.005;

//Start simulation
ForceGraph.prototype.run = function(ts){
	this.stop();
	var that=this;
	ts = ts || 25;
	function dotimestep(){that.timestep(ts);}
	this.isrunning = setInterval(dotimestep,ts);
};

//Stop simulation
ForceGraph.prototype.stop = function(){
	if(this.isrunning)
		clearInterval(this.isrunning);
};

//update node position based on force directed algorithm
ForceGraph.prototype.timestep = function(dt){
	//update each node position
	for(var key in this.nodes){
		var that=this;
		var node=this.nodes[key];
		if(!node.enabled)
			continue;
		//function defining the net acceleration for the current node "that" at a given position and velocity
		function netAcceleration(p,v,dt){
			var netforce=new Vector(0,0,0);
			//calculate net force
			for(var key in that.edges){
				var origin = that.edges[key].origin;
				var destination = that.edges[key].destination;
				if(origin!=destination && (origin==node || destination==node)){
					//add force caused by edge
					var n2=(origin==node)?destination:origin;
					var distance = (p.minus(n2.position)).norm();
					var unitv = p.minus(n2.position).division(distance);
					var springdisplacement = (distance-ForceGraph.springrest)/2.0;
					var fr = Physics.hooke(ForceGraph.springconstant,springdisplacement);
					netforce = netforce.add(unitv.product(fr));
				}
			}
			for(var key in that.nodes){
				if(key!=node){
					//add force caused by node
					var n2 = that.nodes[key];
					var distance = p.minus(n2.position).norm();
					var unitv = p.minus(n2.position).division(distance);
					var fa = Physics.coulomb(node.charge,n2.charge,distance);
					netforce = netforce.add(unitv.product(fa));
				}
			}
			//obtain and return net acceleration of the node by divind the net force with its mass minus a dampening factor
			return netforce.division(node.mass).minus(node.velocity.product(ForceGraph.damping))
		};

		//calculate approximate final position and velocity with rungekutta method
		var aprox = Physics.rk4o_3d(node.position,node.velocity,netAcceleration,dt);

		//update final position and velocity
		node.position = aprox.position;
		node.velocity = aprox.velocity;
	}

	//Notice all subscribers of update
	this.publish();
};

//Overloading of methods using appropriate forcenodes objects
ForceGraph.prototype.addNode=function(content){
	var node = new ForceNode(content);
	node.position = this.newPosition();
	return Graph.prototype.addNode.call(this,node);
};

//Overloading of methods using appropriate forcenodes objects
ForceGraph.prototype.addEdge=function(c1,c2,e){
	var n1 = this.addNode(c1);
	var n2 = this.addNode(c2);
	return Graph.prototype.addEdge.call(this,n1,n2,e);
};

//Returns a "birth" position. Used when creating a new node in the graph.
ForceGraph.prototype.newPosition=function(){
	//calculate centroid
	var centroid = new Vector(0,0,0);
	for(var node in this.nodes)
		centroid = centroid.add(this.nodes[node].position);
	centroid = centroid.division(this.nodes.length);

	//calculate biggest distance to centroid
	var maxnorm = 50;
	for(var node in this.nodes){
		var norm = centroid.minus(this.nodes[node].position).norm();
		if(norm>maxnorm)
			maxnorm=norm;
	}

	//new position will be somewhere in a circumference that contains all the nodes
	return new Vector(maxnorm*Math.cos(Math.random()*Math.PI*2),maxnorm*Math.sin(Math.random()*Math.PI*2),0);
};

//Get node at position
ForceGraph.prototype.getNodeAt=function(pos){
	for(var node in this.nodes)
		if(this.nodes[node].position.minus(pos).norm()<(this.nodes[node].radius+5))
			return this.nodes[node];
	return null;
};


/*
	Graph
	Directed Graph Class.
	Nodes must be objects that are uniquely identifiable by the toString method.
*/

function Graph(){
	this.nodes = {};
	this.edges = [];
}

Graph.prototype.getEdge=function(on,dn,c){
	for(var i in this.edges)
		if(this.edges[i].origin == on && this.edges[i].destination == dn && this.edges[i].content==c)
			return this.edges[i];
	return undefined;
};

Graph.prototype.getEdges=function(on,dn){
	var edges = [];
	for(var i in this.edges)
		if(this.edges[i].origin == on && this.edges[i].destination == dn)
			edges.push(this.edges[i]);
	return edges;
};

Graph.prototype.addEdge=function(on,dn,c){
	on = this.addNode(on);
	dn = this.addNode(dn);

	var e = this.getEdge(on,dn,c);
	if(!e){
		e = {origin:on,destination:dn,content:c};
		this.edges.push(e);
	}
	return e;
};

Graph.prototype.remEdge=function(on,dn,c){
	for(var i in this.edges)
		if(this.edges[i].origin == on && this.edges[i].destination == dn && this.edges[i].content==c){
			delete this.edges[i];
			return;
		}
};

Graph.prototype.getNode=function(n){
	if(n in this.nodes)
		return this.nodes[n];
	return undefined;
};

Graph.prototype.addNode=function(n){
	if(!n)
		return;

	var localn = this.getNode(n);
	if(localn)
		return localn;

	this.nodes[n]=n;
	return n;
};

Graph.prototype.remNode=function(n){
	if(!n)
		return;
	n = this.getNode(n);
	if(!n)
		return;
	for(var edge in this.edges)
		if(this.edges[edge].origin==n || this.edges[edge].destination==n)
			delete this.edges[edge];
	delete this.nodes[n];
};

Graph.prototype.toString=function(m){
	var text = "Directed Weighted Graph object.";
	for(var node in this.nodes){
		text+="\n"+node+" --> ";
		for(var edge in this.edges){
			if(this.edges[edge].origin==node)
				text+=this.edges[edge].destination+", ";
		}
	}
	return text;
};


/*
	Publisher.js
	Publisher class from publisher/subscriber pattern
	Registers callbacks from subscribers, and publishes notifications to callbacks when appropriate.
*/

function Publisher(){}

Publisher.prototype.subscribe = function(callback, context){
	if( !this.subscribers )
		this.subscribers = [];
	this.subscribers.push({cb:callback,ct:context});
};

Publisher.prototype.unsubscribe = function(callback){
	if( !this.subscribers )
		this.subscribers = [];
	for(var i in this.subscribers)
		if(this.subscribers[i]==callback){
			delete this.subscribers[i];
			return;
		}
};

Publisher.prototype.publish = function(){
	if( !this.subscribers )
		this.subscribers = [];
	for(var i in this.subscribers){
		var callback = this.subscribers[i].cb;
		var context = this.subscribers[i].ct;
		callback.call(context,this);
	}
};
