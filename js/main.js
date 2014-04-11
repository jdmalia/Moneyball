
<!-- Example based on http://bl.ocks.org/mbostock/3887118 -->
<!-- Tooltip example from http://www.d3noob.org/2013/01/adding-tooltips-to-d3js-graph.html -->

var margin = {top: 40, right: 20, bottom: 30, left: 40},
    w = width = 650.0 - margin.left - margin.right,
    h = height = 500.0 - margin.top - margin.bottom,
	x = d3.scale.linear().range([0, width]),
    y = d3.scale.linear().range([0, height]);
	
var x_root, x_node;

var zoomed = false;

/* 
 * value accessor - returns the value to encode for a given data object.
 * scale - maps value to a visual display encoding, such as a pixel position.
 * map function - maps from data value to display value
 * axis - sets up axis
 */ 
var season = "05-06 ";

// setup x 
var xValue = function(d) { return d[season+"Salary"];}, // data -> value
    xScale = d3.scale.linear().range([0, width]), // value -> display
    xMap = function(d) { return xScale(xValue(d));}, // data -> display
    xAxis = d3.svg.axis().scale(xScale).orient("bottom");

// setup y
var yValue = function(d) { return d[season+"Win"];}, // data -> value
    yScale = d3.scale.linear().range([height, 0]), // value -> display
    yMap = function(d) { return yScale(yValue(d));}, // data -> display
    yAxis = d3.svg.axis().scale(yScale).orient("left");


// setup fill color
var cValue = function(d) { return d.Division;},
    color = d3.scale.ordinal().range(["#fbb4ae","#b3cde3","#ccebc5","#decbe4","#fed9a6","#ffffcc"]);

// add the sp graph canvas to its appropriate div
var svg = d3.select("#sp_vis").append("svg")
	 .style("float", "left")
     .attr("width", width + margin.left + margin.right)
     .attr("height", height + margin.top + margin.bottom)
   .append("g")
     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	

// add tm graph canvas to its appropriate div
/*var div2 = d3.select("#tm_vis").append("div")
    .style("position", "relative")
	.style("float", "right")
    .style("width", (width + margin.left + margin.right) + "px")
    .style("height", (height + margin.top + margin.bottom) + "px")
    .style("left", margin.left + "px")
    .style("top", margin.top + "px");
	*/
var div2 = d3.select("#tm_vis").append("div")
    .attr("class", "chart")
    .style("width", (width + margin.left + margin.right) + "px")
    .style("height", (height + margin.top + margin.bottom) + "px")
  .append("svg:svg")
    .style("width", (width) + "px")
    .style("height", (height) + "px")
  .append("svg:g")
    .attr("transform", "translate(.5,.5)");
	
var treemap = d3.layout.treemap()
    .size([width, height])
    .sticky(true)
    .value(function(d) { return d[season+"Salary"]; });

// add the tooltip area to the webpage
var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

var curr_fmt = d3.format("$,.0f");

// load data
d3.csv("../data/nba.csv", function(error, data) {
	
   // getting data for scatterplot
	data.forEach(function(d) {
	  for (i = 1; i < 13; ++i) {
		  salary = sprintf("%02d-%02d Salary", i, i+1);
		  win = sprintf("%02d-%02d Win", i, i+1);
		  loss = sprintf("%02d-%02d Loss", i, i+1);
		  d[salary] = (+d[salary])/1000000;
		  d[win] = +d[win];
		  d[loss] = +d[loss];	  
	  }
	});


	<!------------------------TREEMAP---------------------------->

	// Converting the data
	var preppedData = genJSON(data, ['Conference', 'Division']);
	x_node = x_root = preppedData;

	var nodes = treemap.nodes(x_root)
      .filter(function(d) { return !d.children; });

/*	  
	var node = div2.selectAll(".node")
		.data(nodes)
	.enter().append("div")
		.attr("class", "node")
		.call(position)
		.style("background", function(d) { return d.children ?  null: color(d['Division']) ; })
		.text(function(d) { return d.children ? null : d["Team"]; })
		.attr("id", function(d) { return d.children ? null : "tm"+d["Team"]; } )
		.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      	.on("click", function(d) { return zoom(x_node == d.parent ? x_root : d.parent); })
		.on("mouseover", function(d) { details_on_demand(d); } )
		.on("mouseout", function(d) { details_off(d); } );
	*/

  

  var cell = div2.selectAll("g")
      .data(nodes)
    .enter().append("svg:g")
      .attr("class", "cell")
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .on("click", function(d) { return zoom(x_node == d.parent ? x_root : d.parent); })

  cell.append("svg:rect")
      .attr("width", function(d) { return d.dx - 1; })
      .attr("height", function(d) { return d.dy - 1; })
      .style("fill", function(d) { return color(d.Division); })
	  .attr("id", function(d) {return "tm"+d.Team;})
	  .on("mouseover", function(d) { details_on_demand(d); })
	  .on("mouseout", function(d) { details_off(d); });
	  

 cell.append("svg:text")
      .attr("x", function(d) { return 5; })
      .attr("y", function(d) { return 10; })
     .attr("dy", ".35em")
      .text(function(d) { return d["Team"]; })
      .style("opacity", .99)
	  

		
/*	d3.selectAll("input").on("change", function change() {
		var value = this.value == "count"
			? function() { return 1; }
			: function(d) { return d[season+"Salary"]; };

		node
			.data(treemap.value(value).nodes)
		 .transition()
			.duration(1500)
			.call(position);
			
	}); 
*/
	
	 d3.select(window).on("click", function() { zoom(x_root); });

	  d3.select("select").on("change", function(d) {
		treemap.value(this.value == d[season+"Salary"] ? size(d) : count).nodes(x_root);
		zoom(x_node);
  });

  
	function position() {
		this.style("left", function(d) { return d.x + "px"; })
		  .style("top", function(d) { return d.y + "px"; })
		  .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
		  .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; });
	}
  
	/* ---------------------------SCATTERPLOT------------------------------ */
	xScale.domain([30, 130]);
	yScale.domain([0, 70]);
	
	// x-axis
	svg.append("g")
	  .attr("class", "x axis")
	  .attr("transform", "translate(0," + height + ")")
	  .call(xAxis)
	.append("text")
	  .attr("class", "label")
	  .attr("x", width)
	  .attr("y", -6)
	  .style("text-anchor", "end")
	  .text("Team Salary ($ Million)");
	
	// y-axis
	svg.append("g")
	  .attr("class", "y axis")
	  .call(yAxis)
	.append("text")
	  .attr("class", "label")
	  .attr("transform", "rotate(-90)")
	  .attr("y", 6)
	  .attr("dy", ".71em")
	  .style("text-anchor", "end")
	  .text("Wins");
	
	// draw dots
	svg.selectAll(".dot")
	  .data(data)
	.enter().append("circle")
	  .attr("id", function(d) {return "sp"+d["Team"];})
	  .attr("class", "dot")
	  .attr("r", 3.5)
	  .attr("cx", xMap)
	  .attr("cy", yMap)
	  .style("fill", function(d) { return color(cValue(d));}) 
	  .on("mouseover", function(d) { details_on_demand(d); })
	  .on("mouseout", function(d) { details_off(d); });
	  
	// draw legend
	var legend = svg.selectAll(".legend")
	  .data(color.domain())
	.enter().append("g")
	  .attr("class", "legend")
	  .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
	
	// draw legend colored rectangles
	legend.append("rect")
	  .attr("x", width - 18)
	  .attr("width", 18)
	  .attr("height", 18)
	  .style("fill", color);
	
	// draw legend text
	legend.append("text")
	  .attr("x", width - 24)
	  .attr("y", 9)
	  .attr("dy", ".35em")
	  .style("text-anchor", "end")
	  .text(function(d) { return d;})

	function size(d) {
	  return d[season+"Salary"];
	}
	
	function count(d) {
	  return 1;
	}
	  
	function zoom(d) {
	
	  zoomed = !zoomed;
	  
	  var kx = width / d.dx, ky = height / d.dy;
	  x.domain([d.x, d.x + d.dx]);
	  y.domain([d.y, d.y + d.dy]);
	
	  var t = div2.selectAll("g.cell").transition()
		  .duration(d3.event.altKey ? 450 : 450)
		  .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });
	
	  t.select("rect")
		  .attr("width", function(d) { return kx * d.dx - 1; })
		  .attr("height", function(d) { return ky * d.dy - 1; })
		  .style("fill", function(d) { return ( zoomed ? wl_color(d) : color(d.Division)) });
		  
		  console.log(d);
	
	  t.select("text")
		  .attr("x", function(d) { return 5 })
		  .attr("y", function(d) { return 10; })
		  .style("opacity", 1);
	
	  x_node = d;
	  d3.event.stopPropagation();
	}
	
	function details_on_demand(d) {
	  
	document.getElementById("tm"+d.Team).style.border = "1px solid black";
	document.getElementById("tm"+d.Team).style.zIndex = "40000";
	document.getElementById("sp"+d.Team).setAttribute("r", 7);
	document.getElementById("sp"+d.Team).style.zIndex = "100000";
	
	tooltip.transition()
	   .duration(200)
	   .style("opacity", 1)
	   .style("background", "#FFFFFF")
	   .style("max-width", "140px")
	   .style("height", "auto");
	   
	tooltip.html("<b>" + d["Team"] + "</b><br/>\t  Salary: <b>" + curr_fmt(xValue(d)*1000000)
	+ "</b><br/>\t  Wins: <b>" + yValue(d) + "</b>; Losses: <b>" + d[season+"Loss"] + "</b>")
	   .style("left",  d["Team"] ? (document.getElementById("sp"+d["Team"]).getBoundingClientRect().left + 16) + "px": null)
	   .style("top", d["Team"] ? (document.getElementById("sp"+d["Team"]).getBoundingClientRect().top - 18) + "px": null)
	   .style("padding", "5px")
	   .style("padding-left", "10px");
	}
	
	function details_off(d) {
	  
	  document.getElementById("sp"+d.Team).setAttribute("r", 3.5);
	  document.getElementById("sp"+d.Team).style.zIndex = "30000";
	  document.getElementById("tm"+d["Team"]).style.border = "1px solid white";
	  document.getElementById("tm"+d["Team"]).style.zIndex = "20000";
	  
	  tooltip.transition()
		   .duration(500)
		   .style("opacity", 0);
	}
  
	// Convert .csv data to json format for tree map
	function genJSON(csvData, groups) {
	
	  var genGroups = function(data) {
		return _.map(data, function(element, index) {
		  return { name : index, children : element };
		});
	  };
	
	  var nest = function(node, curIndex) {
		if (curIndex === 0) {
		  node.children = genGroups(_.groupBy(csvData, groups[0]));
		  _.each(node.children, function (child) {
			nest(child, curIndex + 1);
		  });
		}
		else {
		  if (curIndex < groups.length) {
			node.children = genGroups(
			  _.groupBy(node.children, groups[curIndex])
			);
			_.each(node.children, function (child) {
			  nest(child, curIndex + 1);
			});
		  }
		}
		return node;
	  };
	  return nest({}, 0);
	}
	
	function wl_color(d) {
		if (d[season+"Win"] > d[season+"Loss"]) 
			return hsv_to_hex(120, 100, d[season+"Win"]/70.0*100);
		
		return hsv_to_hex(0, 100, 100*d[season+"Loss"]/70);
	}
	
	function hsv_to_hex(hue, sat, val) {
		var rgb = {};
		var h = Math.round(hue);
		var s = Math.round(sat * 255 / 100);
		var v = Math.round(val * 255 / 100);
		if (s == 0) {
			rgb.r = rgb.g = rgb.b = v;
		} else {
			var t1 = v;
			var t2 = (255 - s) * v / 255;
			var t3 = (t1 - t2) * (h % 60) / 60;
			if (h == 360) h = 0;
			if (h < 60) { rgb.r = t1; rgb.b = t2; rgb.g = t2 + t3 }
			else if (h < 120) { rgb.g = t1; rgb.b = t2; rgb.r = t1 - t3 }
			else if (h < 180) { rgb.g = t1; rgb.r = t2; rgb.b = t2 + t3 }
			else if (h < 240) { rgb.b = t1; rgb.r = t2; rgb.g = t1 - t3 }
			else if (h < 300) { rgb.b = t1; rgb.g = t2; rgb.r = t2 + t3 }
			else if (h < 360) { rgb.r = t1; rgb.g = t2; rgb.b = t1 - t3 }
			else { rgb.r = 0; rgb.g = 0; rgb.b = 0 }
		}
		return sprintf("#%02x%02x%02x", rgb.r, rgb.g, rgb.b);
		
	}
	
  	
});
