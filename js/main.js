/* REFERENCES:
	Scatterplot: http://bl.ocks.org/mbostock/3887118 
	Zoomable treemap: http://mbostock.github.io/d3/talk/20111018/treemap.html
	Colors palette: http://colorbrewer2.org/
	CSV to flare JSON: http://www.delimited.io/blog/2013/11/2/creating-nested-json-for-d3
	HSV to RGB/HEX:  http://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
	Tooltip:  http://www.d3noob.org/2013/01/adding-tooltips-to-d3js-graph.html
*/

/*************************GLOBALS*****************************/
var first_season = 1;
var num_seasons = 13;
var last_season = first_season + num_seasons - 1;

/* Sizing of scatterplot and treemap */
var margin = {top: 40, right: 20, bottom: 30, left: 40},
	w = width = 650.0 - margin.left - margin.right,
	h = height = 500.0 - margin.top - margin.bottom,
	x = d3.scale.linear().range([0, width]),
	y = d3.scale.linear().range([0, height]);

/* Fill color for scatterplot and treemap using Colorbrewer */	
var cValue = function(d) { return d.Division;},
	color = d3.scale.ordinal().range(colorbrewer.Set3[6]);
	
/* Events and zooming */
var current_division, current_team,
	playing = false, 
	slider_hit = false,
	my_interval,
	zoomed = false,
	zoom_level = 0;

/* Season info */
var season_num = first_season;
var season = sprintf("%02d-%02d ", season_num, season_num+1);
var season_heading = sprintf("20%02d-%02d ", season_num, season_num+1);

/* General data holders */
var division_map = new Array();
var teams = new Array();

/* SCATTERPLOT SVG */
var sp_svg;

	/* Scatterplot globals */
	var small_dot = 8, big_dot = 9, old_dot, old_opacity = 1;
	// Encoding for playoffs/champion
	var border_weights = [0.5, 2, 4],
		dasharrays = ["0", "0", "3"],
		radii = [small_dot, small_dot, big_dot];
	// setup x 
	var xValue = function(d) { return d[season+"Salary"];}, 
		xScale = d3.scale.linear().range([0, width]), 
		xMap = function(d) { return xScale(xValue(d));}, 
		xAxis = d3.svg.axis().scale(xScale).orient("bottom");
	// setup y
	var yValue = function(d) { return d[season+"Win"];}, 
		yScale = d3.scale.linear().range([height, 0]), 
		yMap = function(d) { return yScale(yValue(d));}, 
		yAxis = d3.svg.axis().scale(yScale).orient("left");

/* TREEMAP DIV */
var tm_div;
		
	/* Tree map globals */	
	var x_root, x_node, zoomed_node, 
		nba_dta, nba_nodes,
		node_map = new Array();
		
	var treemap = d3.layout.treemap()
		.size([width, height])
		.sticky(true)
		.value(function(d) { return d[season+"Salary"]; });

/* Tooltip */
var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

/* Currency format */
var curr_fmt = d3.format("$,.0f");


/*************************FUNCTIONS*****************************/
function init() {
	
	/* Slider label */
	$("h3").text(season_heading + " Season");
	
	/* Setup slider */
	slider = $(".slider");
	
	slider.noUiSlider({
		start: [ first_season ],
		range: {'min': first_season, 'max': last_season},
		step: 1
	});
	
	slider.each(function(){
		$(this).val($(this).attr("data-value"));
	});
	
	slider.change(function(){
		slider_hit = true;
		
		setTimeout(function(e) {slider_hit = false;}, 2000);  // prevents typical window click behavior (zooming out)
		season_num = parseInt(slider.val());
		season = sprintf("%02d-%02d ", season_num, season_num+1);
		season_heading = sprintf("20%02d-%02d ", season_num, season_num+1);
		$("h3").text(season_heading + " Season");
		$("h3").css("left", this.getBoundingClientRect().left -110+ (season_num - 1)*1175/(num_seasons-1));
		if(season_num == last_season) {
			playing = false;
			$("#play_button").text("Play");
			clearInterval(my_interval);
		}
		update();
	});
	
	slider.on("click", function(e) {
		playing = false;
		clearInterval(my_interval);
		$("#play_button").text("Play"); 
	});
	
	$("#play_button").on("click", play);
	
	// Zoom out if zoomed in on a division or team and click somewhere other than a node */
	d3.select(window).on("click", function(e) {
		if (zoom_level > 0  && !slider_hit) {
			zoom_level = 2;
			zoom(x_root, 450);
		}
	});
	
	// Extracting all the data
	d3.csv("../data/nba.csv", function(error, data) {
		nba_data = data;
		data.forEach(function(d) {
			teams.push(d.Team);
			division_map[d.Team] = d.Division;
			for (i = first_season; i <= last_season; ++i) {
			  salary = sprintf("%02d-%02d Salary", i, i+1);
			  win = sprintf("%02d-%02d Win", i, i+1);
			  loss = sprintf("%02d-%02d Loss", i, i+1);
			  playoff = sprintf("%02d-%02d PO", i, i+1);
			  d[salary] = (+d[salary])/1000000;
			  d[win] = +d[win];
			  d[loss] = +d[loss];	  
			  d[playoff] = +d[playoff];
			}
		});
	
	  
		<!----------------------SCATTERPLOT-------------------------->
		sp_svg = d3.select("#sp_vis").append("svg")
			.style("float", "left")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
		  .append("g")
			.attr("transform", "translate(" + margin.left + "," + (margin.top-20) + ")");
			
		draw_scatterplot();
		  
		<!------------------------TREEMAP---------------------------->
		tm_div = d3.select("#tm_vis").append("div")
			.attr("class", "chart")
			.style("width", (width + margin.left + margin.right) + "px")
			.style("height", (height + margin.top + margin.bottom) + "px")
		  .append("svg:svg")
			.style("width", (width) + "px")
			.style("height", (height) + "px")
		  .append("svg:g")
			.attr("transform", "translate(.5,.5)");
	
		draw_treemap(1);
	});
}

function draw_scatterplot() {
	
	xScale.domain([10, 130]);
	yScale.domain([0, 70]);
	
	// x-axis
	sp_svg.append("g")
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
	sp_svg.append("g")
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
	sp_svg.selectAll(".dot")
		.data(nba_data)
	  .enter().append("circle")
		.attr("id", function(d) {return "sp"+d["Team"];})
		.attr("class", "dot")
		.attr("r", function(d) {
		  return radii[d[season+"PO"]];
		})
		.attr("cx", xMap)
		.attr("cy", yMap)
		.style("fill", function(d) { return color(cValue(d));}) 
		.style("stroke-width", function(d) { 
			return border_weights[d[season+"PO"]];
		})
		.style("stroke-dasharray", function(d) {
		  return dasharrays[d[season+"PO"]]; 
		})
		.on("mouseover", function(d) { details_on_demand(d); })
		.on("mouseout", function(d) { details_off(d); })
		.on("click", function(d) { 
			var tm_node = node_map[d.Team];
			if(zoom_level == 0) {
				zoom_level = 1;
				zoomed = true;
				return zoom(tm_node.parent, 450); }
			else if (zoom_level == 1) 
				return zoom(tm_node.parent, 450);
			else
				return zoom(x_root, 450);
		});
		
	/***DOT BORDER LEGEND***/
	// Non-playoff team
	sp_svg.append("circle")
		.attr("class", "dot")
		.attr("r", small_dot)
		.attr("cx", 5)
		.attr("cy", height+40)
		.style("fill", "#BBBBBB") 
		.style("stroke-width", border_weights[0])
		.style("stroke-dasharray", dasharrays[0]);
		
	sp_svg.append("text")
	    .attr("x", 115)
		.attr("y", height+40)
		.attr("dy", ".35em")
		.style("font-size", "12px")
		.style("text-anchor", "end")
		.text("Non-playoff team");
	
	// Playoff team
	sp_svg.append("circle")
		.attr("class", "dot")
		.attr("r", small_dot)
		.attr("cx", 165)
		.attr("cy", height+40)
		.style("fill", "#BBBBBB") 
		.style("stroke-width", border_weights[1])
		.style("stroke-dasharray", dasharrays[1]);
	
	sp_svg.append("text")
	    .attr("x", 250)
		.attr("y", height+40)
		.attr("dy", ".35em")
		.style("font-size", "12px")
		.style("text-anchor", "end")
		.text("Playoff team");
	
	// Championship team
	sp_svg.append("circle")
		.attr("class", "dot")
		.attr("r", small_dot)
		.attr("cx", 305)
		.attr("cy", height+40)
		.style("fill", "#BBBBBB") 
		.style("stroke-width", border_weights[2])
		.style("stroke-dasharray", dasharrays[2]);
		
	  sp_svg.append("text")
	    .attr("x", 435)
		.attr("y", height+40)
		.attr("dy", ".35em")
		.style("font-size", "12px")
		.style("text-anchor", "end")
		.text("Championship team");
	  
	/***DIVSION COLOR LEGEND***/
	var legend = sp_svg.selectAll(".legend")
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
}

function draw_treemap(opacity) {
	
	// Converting the data
	var preppedData = genJSON(nba_data, ['Conference', 'Division','Team']);
	x_root = preppedData;

	var nodes = treemap.nodes(x_root).filter(function(d) { return (!d.children ); });
	  
	nba_nodes = nodes;
	
	var i=1;

	var cell = tm_div.selectAll("g")
		.data(nodes)
	  .enter().append("svg:g")
		.attr("class", "cell")
		.attr("id", function(d) {i++; node_map[d.parent.name] = d; return ("node"+d.x+i+""+d.y+i);})
		.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
		.on("click", function(d) { 
			switch(zoom_level) {
				// Conference->Division
				case 0:
					return zoom(d.parent.parent, 450); 
				// Division->Team
				case 1:
					return zoom(d.parent, 450);
				// Team->Conference
				case 2:
					return zoom(x_root, 450);
			}
		});
	  	
	cell.append("svg:rect")
		.attr("width", function(d) { return d.dx - 1; })
		.attr("height", function(d) { return d.dy - 1; })
		.style("fill", function(d) { return color(d.Division); })
		.style("opacity", opacity) 
		.style("z-index", 5)
		.attr("id", function(d) {return "tm"+d.Team;})
		.on("mouseover", function(d) { 
			this.style.opacity = 0.7;
			details_on_demand(d); })
		.on("mouseout", function(d) { 
			this.style.opacity = 1;
			details_off(d); });
	  
	// Allows for word wrap (svg doesn't)
	cell.append("foreignObject")
		.attr("x", function(d) { return 5; })
		.attr("y", function(d) { return 5; })
		.attr("dy", ".35em")
		.attr("width", function(d) { return d.dx - 1; })
		.attr("height", function(d) { return d.dy - 1; })
	  .append("xhtml:div")
		.attr("dy", ".35em")
	  .html(function(d) { return tm_label(d); })
		.style("opacity", opacity)
		.style("z-index", 6)
		.attr("class","textdiv");
	
	/***WIN LOSS LEGEND***/	
	var win_loss_legend = d3.select(".chart").append("svg")
		.attr("id", "win_loss_legend")
		.attr("width", width)
		.attr("height", 20)
		.style("float", "left")
		.style("margin-left", "40")
		.style("margin-top", "25")
		.style("opacity", 0)
	
	// Wins > Losses
	win_loss_legend.append("svg:rect")
		.attr("width", 15)
		.attr("height", 15)
		.style("fill", "#88FF88")
		.style("stroke-width", 1)
		.style("stroke", "#000")
		
	 win_loss_legend.append("foreignObject")
		.attr("x", 18)
		.attr("y", 2)
		.attr("dy", ".35em")
		.attr("width", 155)
		.attr("height", 20)
	  .append("xhtml:div")
		.attr("dy", ".35em")
	  .html("Wins > Losses (W/L Ratio)")
		
	// Wins > Losses
	win_loss_legend.append("svg:rect")
		.attr("width", 15)
		.attr("height", 15)
		.attr("x", 220)
		.attr("y", 0)
		.style("fill", "#FF8888")
		.style("stroke-width", 1)
		.style("stroke", "#000")
		
	 win_loss_legend.append("foreignObject")
		.attr("x", 238)
		.attr("y", 2)
		.attr("dy", ".35em")
		.attr("width", 155)
		.attr("height", 20)
	  .append("xhtml:div")
		.attr("dy", ".35em")
	  .html("Losses > Wins (L/W Ratio)")
}

/*	
Function called whenever user hits the play button.  Also works for stop if already playing.
It works by setting up an interval that updates and changes the slider every 2 seconds
*/
function play() {
	
	if(!playing && season_num <= last_season) {
		if (season_num == last_season) season_num = first_season-1;  // start back at first season if user clicks play at last season
		playing = true;
		slider_hit = true;
		my_interval = setInterval(function(){
			season_num++;
			$(".slider").val(""+season_num);
			$(".slider").change();
		}, 2000);
		$("#play_button").text("Stop");
	} 
	else {
		playing = false;
		clearInterval(my_interval);
		$("#play_button").text("Play");
	}
}

/*  
Main update function used indirectly in play() and in the sliders change function.
Works by animating the transition of the scatterplot and redrawing the treemap at the
appropriate zoom level (League, Division, Team). 
*/
function update() {
	
	// SCATTERPLOT
	dots = sp_svg.selectAll(".dot")
		.data(nba_data).transition(400)
		.attr("cx", xMap)
		.attr("cy", yMap)
		.attr("r", function(d) { return radii[d[season+"PO"]];})
		.style("stroke-width", function(d) { return border_weights[d[season+"PO"]];})
		.style("stroke-dasharray", function(d) { return dasharrays[d[season+"PO"]];});
	
	// TREEMAP
	// Delete the old treemap.
	$(".chart").remove();
	
	// Create the spot for the new treemap.
	tm_div = d3.select("#tm_vis").append("div")
		.attr("class", "chart")
		.style("width", (width + margin.left + margin.right) + "px")
		.style("height", (height + margin.top + margin.bottom) + "px")
	  .append("svg:svg")
		.style("width", (width) + "px")
		.style("height", (height) + "px")
	  .append("svg:g")
		.attr("transform", "translate(.5,.5)");
	
	// Draw an invisible map (opacity=0)
	draw_treemap(0);	
	
	// Zoom in on the appropriate region and make it visible
	if(zoomed) {
		zoom_level--;
		if(zoom_level == 0) zoomed = false;
		zoom(zoomed_node, 0);
	} else {
		zoomed = true;
		zoom_level = 2;
		zoom(x_root, 0);
	}
}

/* 
Function called on mouseover of SP dot or TM node.  
Makes the team's dot bigger, it's node brighter and provides details about the team via a tooltip.
Specifically shows team name, logo, salary, wins and losses.
*/
function details_on_demand(d) {
	
	var sp_dot = document.getElementById("sp"+d.Team);
	var tm_node = document.getElementById("tm"+d.Team);
	
	// Save old state of dot
	old_dot = sp_dot.getAttribute("r");
	old_opacity = sp_dot.getAttribute("opacity");
	
	// Make team's dot bigger 
	sp_dot.setAttribute("r", big_dot); 
	// Make team's node "brighter"
	tm_node.style.opacity = ".7";
	
	
	teams.forEach(function(team) {
		document.getElementById("sp"+team).setAttribute("opacity", .1);
	});
	sp_dot.setAttribute("opacity", 1);
	
	tooltip.transition()
	   .duration(100)
	   .style("opacity", .85)
	   .style("background", "#0b0b0d")
	   .style("border", "2px solid black")
	   .style("color", "#FFFFFF")
	   .style("max-width", "auto")
	   .style("height", "auto");
	   
	   
	tooltip.html(
	      "<img src='" + logos[d.Team] + "' width='50' height='50' style='float: left; padding-right: 10px; vertical-align: middle'>" +
		  "<b>" + d["Team"] + "<b><br/><br/>\t  Salary: <b>" + curr_fmt(xValue(d)*1000000) + "</b><br/>\t  Wins: <b>" + yValue(d) + 
		  "</b>; Losses: <b>" + d[season+"Loss"] + "</b>")
	   .style("left",  d["Team"] ? (d3.event.x - 90) + "px": null)
	   .style("top", d["Team"] ? (d3.event.y - 70) + "px": null)
	   .style("padding", "5px")
	   .style("padding-left", "10px")
	   .style("font-size", "11px");
}

/* 
Function called on mouseoff of SP dot or TM node.  
Resets what details_on_demand() did. 
*/
function details_off(d) {
	
	var sp_dot = document.getElementById("sp"+d.Team);
	var tm_node = document.getElementById("tm"+d.Team);

   switch(zoom_level) {
	   // Conference - make everyone visible
	   case 0: 
			teams.forEach(function(team) {
				document.getElementById("sp"+team).setAttribute("opacity", 1);
			});
			break;
			
	   // Division - make division's teams visible
	   case 1: 
			teams.forEach(function(team) {
				if(division_map[team] == current_division) 
					document.getElementById("sp"+team).setAttribute("opacity", 1);
			});
			break;
			
	   // Team - make focused team visible
	   case 2:
			teams.forEach(function(team) {
				document.getElementById("sp"+team).setAttribute("opacity", .1);
			});
			document.getElementById("sp"+current_team).setAttribute("opacity", 1);
			break;
	}
	
	// Reset dot
	sp_dot.setAttribute("r", old_dot);
	sp_dot.setAttribute("opacity", old_opacity);
	
	// Reset node
	tm_node.style.opacity = "1";
	
	//Disappear tooltip
	tooltip.transition()
		.duration(100)
		.style("opacity", 0);  
}

/* Converts CSV data to JSON format for treemap */
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

/* 
Encodes win/loss color:
-  Green = more wins than losses
-  Red = more losses than wins
-  Saturation = W/L (green) or L/W (red) ratio (the more lopsided the ratio,
   the more saturated the node  
*/
function wl_color(d) {
	var encoding;
	if (d[season+"Win"] > d[season+"Loss"]) {
		encoding = d[season+"Win"]/d[season+"Loss"]*15;
		if (encoding > 100) encoding = 100;
		return hsv_to_hex(120, encoding, 100);
	}
	else {
		encoding = d[season+"Loss"]/d[season+"Win"]*15;
		if (encoding > 100) encoding = 100;
		return hsv_to_hex(0, encoding, 100);
	}
}

/* Converts and HSV value to RGB so we can easily manipulate saturation for wl_color */
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

/* Generates the label for the treemap nodes */
function tm_label(d) {
	var res = "";
	var words = d.Team.split(" ");
	words.forEach(function(w) {
		res += w + "\n";
	});
	return res;
}

/* 
Zoom function of treemap.
The function cycles through three levels of zoom:
   0 - League
   1 - Division
   2 - Team
At the league level, it colors nodes (teams) by division.
At the division and team level, it colors nodes by their win loss ratio (see wl_color()).
 */
function zoom(d, duration) {

	// Cycle through the levels
	zoom_level++;
	zoom_level %= 3;
	
	// Set flag to determine coloring behavior
	if(zoom_level == 0 || zoom_level == 1) zoomed = !zoomed;
	
	// Keep track of zoomed node in case the season is changed while zoomed in, so we can zoom back 
	// in on the appropriate node;
	zoomed_node = d; 
	
	// Fixes an error caused by changing season while zooming in.
	if (!d.dx) {
		d.dx = 590;
		d.dy = 430;
		d.x = 0;
		d.y = 0;
	}
	
	var kx = width / d.dx, ky = height / d.dy;
	
	x.domain([d.x, d.x + d.dx]);
	y.domain([d.y, d.y + d.dy]);
	
	var t = tm_div.selectAll("g.cell").transition()
		.duration(duration)
		.attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });
	
	t.select("rect")
		.attr("width", function(d) { return kx * d.dx - 1; })
		.attr("height", function(d) { return ky * d.dy - 1; })
		.style("opacity", 1)
		.style("fill", function(d) { return ( zoomed ?   wl_color(d) : color(d.Division) ) });
	  
	t.select("text")
		.attr("x", function(d) { return 5 })
		.attr("y", function(d) { return 10; });
			
	t.select(".textdiv")
		.style("opacity", 1);
		
	switch(zoom_level) {
		
		// League
		case 0:
			d3.select("#win_loss_legend").style("opacity", 0);
			teams.forEach(function (team) {
				  document.getElementById("l"+division_map[team]).setAttribute("opacity", 1);
				  document.getElementById("sp"+team).setAttribute("opacity", 1);
				  document.getElementById("sp"+team).setAttribute("r", small_dot);
			});
			break;
		  
		// Division
		case 1:
			d3.select("#win_loss_legend").style("opacity", 1);
			current_division = d.name;
			teams.forEach(function (team) {
			  if(division_map[team] != d.name) {
				  document.getElementById("sp"+team).setAttribute("opacity", .1);
				  document.getElementById("l"+division_map[team]).setAttribute("opacity", .1);
			  } else {
				  document.getElementById("sp"+team).setAttribute("r",small_dot);
				  document.getElementById("sp"+team).setAttribute("opacity", 1);
			  }
			});
			break;
		
		// Team
		case 2:
			d3.select("#win_loss_legend").style("opacity", 1);
			current_team = d.name;
			teams.forEach(function (team) {
				document.getElementById("sp"+team).setAttribute("r", small_dot); 
				document.getElementById("sp"+team).setAttribute("opacity", .1);
				document.getElementById("l"+division_map[team]).setAttribute("opacity", .1);
				if(team == d.name){
					 document.getElementById("sp"+team).setAttribute("r", small_dot); 
					 document.getElementById("sp"+team).setAttribute("opacity", 1);
				} 
			});
			break;
	
	}
	
	x_node = d;
	d3.event.stopPropagation();
  
}

// BOOM!!!
init();