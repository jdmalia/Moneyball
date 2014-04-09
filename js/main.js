
<!-- Example based on http://bl.ocks.org/mbostock/3887118 -->
<!-- Tooltip example from http://www.d3noob.org/2013/01/adding-tooltips-to-d3js-graph.html -->

var margin = {top: 40, right: 20, bottom: 30, left: 40},
    width = 650 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

/* 
 * value accessor - returns the value to encode for a given data object.
 * scale - maps value to a visual display encoding, such as a pixel position.
 * map function - maps from data value to display value
 * axis - sets up axis
 */ 
var season = "02-03 ";

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
	//colorSP = d3.scale.ordinal().range(["#fbb4ae","#b3cde3","#ccebc5","#decbe4","#fed9a6","#ffffcc"]);

// add the sp graph canvas to its appropriate div
var svg = d3.select("#sp_vis").append("svg")
	 .style("float", "left")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	

// add tm graph canvas to its appropriate div
var div2 = d3.select("#tm_vis").append("div")
    .style("position", "relative")
	.style("float", "right")
    .style("width", (width + margin.left + margin.right) + "px")
    .style("height", (height + margin.top + margin.bottom) + "px")
    .style("left", margin.left + "px")
    .style("top", margin.top + "px");
	
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
	  d["01-02 Salary"] = (+d["01-02 Salary"])/1000000;
	  d["01-02 Win"] = +d["01-02 Win"];
	  d["01-02 Loss"] = +d["01-02 Loss"];
	  d["02-03 Salary"] = (+d["02-03 Salary"])/1000000;
	  d["02-03 Win"] = +d["02-03 Win"];
	  d["02-03 Loss"] = +d["02-03 Loss"];
	//    d.Calories = +d.Calories;
	//    d["Protein (g)"] = +d["Protein (g)"];
	//    console.log(d);
	});


	<!------------------------TREEMAP---------------------------->
  
	_.each(data, function(element, index, list){
		element[season+"Salary"] = +element[season+"Salary"];
	});

	//*************************************************
	// THE FUNCTION
	//*************************************************
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
	//*************************************************
	// CALL THE FUNCTION
	//*************************************************
	var preppedData = genJSON(data, ['Conference', 'Division'])

	//*************************************************
	// LOAD THE PREPPED DATA IN D3
	//*************************************************
	
	var node = div2.datum(preppedData).selectAll(".node")
		.data(treemap.nodes)
	.enter().append("div")
		.attr("class", "node")
		.call(position)
		.style("background", function(d) { return d.children ?  null: color(d['Division']) ; })
		.text(function(d) { return d.children ? null : d["Team"]; })
		.attr("id", function(d) { return d.children ? null : "tm"+d["Team"]; } )
		.on("mouseover", function(d) {
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
               .style("left",  d["Team"] ? (document.getElementById("sp"+d["Team"]).getBoundingClientRect().left + 16) + "px": 
			   (d3.event.pageX + 5) + "px")
               .style("top", d["Team"] ? (document.getElementById("sp"+d["Team"]).getBoundingClientRect().top - 18) + "px": (d3.event.pageY - 28) + "px")
			   .style("padding", "5px")
			   .style("padding-left", "10px")})
      .on("mouseout", function(d) {
		  document.getElementById("sp"+d.Team).setAttribute("r", 3.5);
		  document.getElementById("sp"+d.Team).style.zIndex = "30000";
		  document.getElementById("tm"+d["Team"]).style.border = "1px solid white";
		  document.getElementById("tm"+d["Team"]).style.zIndex = "20000";
          tooltip.transition()
               .duration(500)
               .style("opacity", 0);
      });
		
	d3.selectAll("input").on("change", function change() {
		var value = this.value == "count"
			? function() { return 1; }
			: function(d) { return d[season+"Salary"]; };

		node
			.data(treemap.value(value).nodes)
		 .transition()
			.duration(1500)
			.call(position);
			
	}); 
	
  
  	function position() {
  	this.style("left", function(d) { return d.x + "px"; })
      .style("top", function(d) { return d.y + "px"; })
      .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
      .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; });
	}
  
  /* ---------------------------SCATTERPLOT------------------------------ */
  xScale.domain([30, 120]);
  yScale.domain([d3.min(data, yValue), d3.max(data, yValue)]);

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
      .on("mouseover", function(d) {
		  document.getElementById("sp"+d.Team).setAttribute("r", 7);
		  document.getElementById("tm"+d["Team"]).style.border = "1px solid black";
		  document.getElementById("tm"+d["Team"]).style.zIndex = "50000";
          tooltip.transition()
               .duration(200)
               .style("opacity", 1)
			   .style("background", "#FFFFFF")
			   .style("max-width", "140px")
			   .style("height", "auto");
          tooltip.html("<b>" + d["Team"] + "</b><br/>\t  Salary: <b>" + curr_fmt(xValue(d)*1000000)
	        + "</b><br/>\t  Wins: <b>" + yValue(d) + "</b>; Losses: <b>" + d[season+"Loss"] + "</b>")
               .style("left", (d3.event.pageX + 10) + "px")
               .style("top", (d3.event.pageY - 25) + "px")
			   .style("padding", "5px")
			   .style("padding-left", "10px");
      })
      .on("mouseout", function(d) {
		 document.getElementById("sp"+d.Team).setAttribute("r", 3.5);
		 document.getElementById("tm"+d["Team"]).style.border = "1px solid white";
		 document.getElementById("tm"+d["Team"]).style.zIndex = "40000";
         tooltip.transition()
               .duration(200)
               .style("opacity", 0);
			   
      });

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
	
});
