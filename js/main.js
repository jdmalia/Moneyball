<!-- Example based on http://bl.ocks.org/mbostock/3887118 -->
<!-- Tooltip example from http://www.d3noob.org/2013/01/adding-tooltips-to-d3js-graph.html -->

var margin = {top: 40, right: 20, bottom: 30, left: 40},
    w = width = 650.0 - margin.left - margin.right,
    h = height = 500.0 - margin.top - margin.bottom,
	x = d3.scale.linear().range([0, width]),
    y = d3.scale.linear().range([0, height]);
	
var x_root, x_node;
var nba_data, nba_nodes;
var division_map = new Array();
var teams = new Array();

var small_dot = 5;
var big_dot = 8;

var zoomed = false;

var season_num = 7;
var season = sprintf("%02d-%02d ", season_num, season_num+1);
var season_heading = sprintf("20%02d-%02d ", season_num, season_num+1);
$("h3").text(season_heading + " Season");

/* 
 * value accessor - returns the value to encode for a given data object.
 * scale - maps value to a visual display encoding, such as a pixel position.
 * map function - maps from data value to display value
 * axis - sets up axis
 */ 

var sliders = $(".slider");
sliders.noUiSlider({
	start: [ 7 ],
    range: {
    		'min': 1, 
    		'max': 12,
    		}
   , step: 1
});

sliders.each(function(){
    $(this).val($(this).attr("data-value"));
});

sliders.change(function(){
	season_num = parseInt(sliders.val());
	season = sprintf("%02d-%02d ", season_num, season_num+1);
	season_heading = sprintf("20%02d-%02d ", season_num, season_num+1);
	$("h3").text(season + " Season");
	update();
});


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
    color = d3.scale.ordinal().range(["#8dd3c7","#ffffb3","#bebada","#fb8072","#80b1d3","#fdb462"]);

// add the sp graph canvas to its appropriate div
var svg = d3.select("#sp_vis").append("svg")
	 .style("float", "left")
     .attr("width", width + margin.left + margin.right)
     .attr("height", height + margin.top + margin.bottom)
   .append("g")
     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
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

function update() {
	console.log(season);
	
	//Scatterplot
	dots = svg.selectAll(".dot")
	  .data(nba_data).transition(1000);
	  
	dots.attr("cx", xMap).attr("cy", yMap);
	
	$(".chart").remove();
	div2 = d3.select("#tm_vis").append("div")
    .attr("class", "chart")
    .style("width", (width + margin.left + margin.right) + "px")
    .style("height", (height + margin.top + margin.bottom) + "px")
  .append("svg:svg")
    .style("width", (width) + "px")
    .style("height", (height) + "px")
  .append("svg:g")
    .attr("transform", "translate(.5,.5)");
	
	draw_treemap();	
	
	if(zoomed) {
		teams.forEach(function (team) {
			  document.getElementById("l"+division_map[team]).setAttribute("opacity", 1);
			  document.getElementById("sp"+team).setAttribute("opacity", 1);
			  document.getElementById("sp"+team).setAttribute("r", small_dot);
	  });
	  zoomed = false;
	}
}

function details_on_demand(d) {
	  
	document.getElementById("tm"+d.Team).style.border = "1px solid black";
	document.getElementById("tm"+d.Team).style.zIndex = "40000";
	document.getElementById("sp"+d.Team).setAttribute("r", big_dot);
	document.getElementById("sp"+d.Team).style.zIndex = "100000";
	
	var dot = document.getElementById("sp"+d.Team);
	
	tooltip.transition()
	   .duration(100)
	   .style("opacity", .85)
	   .style("background", "#090909")
	   .style("border", "2px solid black")
	   .style("color", "#FFFFFF")
	   .style("max-width", "115px")
	   .style("height", "auto");
	   
	   
	tooltip.html("<b>" + d["Team"] + "<b><br/>\t  Salary: <b>" + curr_fmt(xValue(d)*1000000)
	+ "</b><br/>\t  Wins: <b>" + yValue(d) + "</b>; Losses: <b>" + d[season+"Loss"] + "</b>")
	   .style("left",  d["Team"] ? (dot.getBoundingClientRect().left + 16) + "px": null)
	   .style("top", d["Team"] ? (dot.getBoundingClientRect().top - 20) + "px": null)
	   .style("padding", "5px")
	   .style("padding-left", "10px")
	   .style("font-size", "11px");
}
	
function details_off(d) {
  
  if(!zoomed) document.getElementById("sp"+d.Team).setAttribute("r",small_dot);
  document.getElementById("sp"+d.Team).style.zIndex = "30000";
  document.getElementById("tm"+d["Team"]).style.border = "1px solid white";
  document.getElementById("tm"+d["Team"]).style.zIndex = "20000";
  
  tooltip.transition()
	   .duration(100)
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
		return hsv_to_hex(120, d[season+"Win"]/d[season+"Loss"]*15, 100);
	
	return hsv_to_hex(0, d[season+"Loss"]/d[season+"Win"]*15, 100);
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
	return sprintf("#%02x%02x%02x", Math.min(0xFF, rgb.r), Math.min(0xFF, rgb.g), Math.min(0xFF, rgb.b));
	
}

function tm_label(d) {
	var res = "";
	var words = d.Team.split(" ");
	words.forEach(function(w) {
		res += w + "\n";
	});
	return res;
}

function size(d) {
	return d[season+"Salary"];
}

function count(d) {
  return 1;
}
	  
function zoom(d) {
	
  if (!d.dx) {
	  d.dx = 590;
	  d.dy = 430;
	  d.x = 0;
	  d.y = 0;
  }
  
  var kx = width / d.dx, ky = height / d.dy;
  
  x.domain([d.x, d.x + d.dx]);
  y.domain([d.y, d.y + d.dy]);

  var t = div2.selectAll("g.cell").transition()
	  .duration(450)
	  .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

  t.select("rect")
	  .attr("width", function(d) { return kx * d.dx - 1; })
	  .attr("height", function(d) { return ky * d.dy - 1; })
	  .style("fill", function(d) { return ( zoomed ?  color(d.Division) : wl_color(d) ) });
	  

  t.select("text")
	  .attr("x", function(d) { return 5 })
	  .attr("y", function(d) { return 10; })
	  .style("opacity", 1);
	  
  if(!zoomed) {
	  
	  teams.forEach(function (team) {
		  if(division_map[team] != d.name) {
			  document.getElementById("sp"+team).setAttribute("opacity", .2);
			  document.getElementById("l"+division_map[team]).setAttribute("opacity", .2);
		  } else {
			  document.getElementById("sp"+team).setAttribute("r", big_dot);
		  }
	  });
  } 
  else {
	  teams.forEach(function (team) {
			  document.getElementById("l"+division_map[team]).setAttribute("opacity", 1);
			  document.getElementById("sp"+team).setAttribute("opacity", 1);
			  document.getElementById("sp"+team).setAttribute("r", small_dot);
	  });
  }

  x_node = d;
  d3.event.stopPropagation();
  
  zoomed = !zoomed;
}

function draw_treemap() {
	// Converting the data
	var preppedData = genJSON(nba_data, ['Conference', 'Division']);
	x_root = preppedData;

	var nodes = treemap.nodes(x_root)
      .filter(function(d) { return !d.children; });
	  
	nba_nodes = nodes;

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
	  .append("tspan")
	  .text(function(d) { return tm_label(d); })
	  .style("opacity", .99)
}

// load data
d3.csv("../data/nba.csv", function(error, data) {
	
	nba_data = data;
   // getting data for scatterplot
	data.forEach(function(d) {
	  teams.push(d.Team);
	  division_map[d.Team] = d.Division;
	  for (i = 1; i < 13; ++i) {
		  salary = sprintf("%02d-%02d Salary", i, i+1);
		  win = sprintf("%02d-%02d Win", i, i+1);
		  loss = sprintf("%02d-%02d Loss", i, i+1);
		  d[salary] = (+d[salary])/1000000;
		  d[win] = +d[win];
		  d[loss] = +d[loss];	  
	  }
	});

  
	/* ---------------------------SCATTERPLOT------------------------------ */
	xScale.domain([10, 130]);
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
	  .data(nba_data)
	.enter().append("circle")
	  .attr("id", function(d) {return "sp"+d["Team"];})
	  .attr("class", "dot")
	  .attr("r", small_dot)
	  .attr("cx", xMap)
	  .attr("cy", yMap)
	  .style("fill", function(d) { return color(cValue(d));}) 
	  .on("mouseover", function(d) { details_on_demand(d); })
	  .on("mouseout", function(d) { details_off(d); });
	  
	// draw legend
	var legend = svg.selectAll(".legend")
	  .data(color.domain())
	.enter().append("g")
	  .attr("id", function(d) {return "l"+d})
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
	  
	  <!------------------------TREEMAP---------------------------->

	draw_treemap();
  	
});
