// Netflix Scatterplot — Assignment 3
// Implement the sections marked TODO below.

var svg, vis;
var margin = { top: 20, right: 160, bottom: 55, left: 65 };
var width, height;
var data; // loaded once in init()

// TODO: declare your scales here (xScale, yScale, sizeScale, colorScale)
xScale = d3.scaleLinear(); // continuous → pixel position
yScale = d3.scaleLinear();
sizeScale = d3.scaleSqrt(); // area perception
colorScale = d3.scaleOrdinal(d3.schemeTableau10);

// Called once when the page loads — loads data and sets up the static SVG structure.
function init() {
  var container = document.getElementById("vis");
  width = container.clientWidth - margin.left - margin.right;
  height = container.clientHeight - margin.top - margin.bottom;

  svg = d3
    .select("#vis")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  vis = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Axis groups — updated each time the user clicks Update
  vis
    .append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${height})`);
  vis.append("g").attr("class", "axis y-axis");

  // Axis labels
  vis
    .append("text")
    .attr("class", "axis-label x-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + 45);
  vis
    .append("text")
    .attr("class", "axis-label y-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50);

  // Legend group (top-right, inside the plot margin)
  vis
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width + 10}, 0)`);

  // Load data once; draw the initial chart when ready
  d3.csv("data/netflix_votes1000.txt").then((rawdata) => {
    data = rawdata.map((d) => ({
      ...d,
      year: +d.year,
      runtime_min: +d.runtime_min,
      tmdb_vote_average: +d.tmdb_vote_average,
      tmdb_vote_count: +d.tmdb_vote_count,
      popularity: +d.popularity,
      primary_genre: d.genres.split(",")[0].trim(),
    }));
    update();
  });
}

// Called when the Update button is clicked.
function updateClicked() {
  update();
}

// Called on initial load and whenever the Update button is clicked.
function update() {
  var xField = getXSelectedOption();
  var yField = getYSelectedOption();
  var sizeField = getSizeSelectedOption();
  var colorField = getColorSelectedOption();

  // TODO: Create/update scales
  // xScale     — d3.scaleLinear(), domain from data extent, range [0, width]
  // yScale     — d3.scaleLinear(), domain from data extent, range [height, 0]
  // sizeScale  — d3.scaleSqrt(),   domain from data extent, range [2, 18]
  // colorScale — d3.scaleOrdinal(d3.schemeTableau10), domain of unique category values

  xScale.domain(d3.extent(data, (d) => d[xField])).range([0, width]);
  yScale.domain(d3.extent(data, (d) => d[yField])).range([height, 0]);
  sizeScale.domain(d3.extent(data, (d) => d[sizeField])).range([2, 18]);
  let categories;
  let colorValue = (d) => d[colorField];

  const valueCounts = d3.rollup(
    data,
    (values) => values.length,
    (d) => d[colorField]
  );
  const sortedValues = Array.from(valueCounts.entries())
    .sort((a, b) => d3.descending(a[1], b[1]))
    .map(([value]) => value);

  if (sortedValues.length > 10) {
    // Tableau10 has 10 swatches, so keep top 9 and bucket the rest.
    const topValues = sortedValues.slice(0, 9);
    const topValueSet = new Set(topValues);
    colorValue = (d) => (topValueSet.has(d[colorField]) ? d[colorField] : "Other");
    categories = [...topValues, "Other"];
  } else {
    categories = sortedValues;
  }

  colorScale.domain(categories).range(d3.schemeTableau10);
  // TODO: Update x-axis, y-axis, and axis labels
  // Hint: d3.select('.x-axis').call(d3.axisBottom(xScale))
  //       d3.select('.x-label').text(xField)
  d3.select(".x-axis").call(d3.axisBottom(xScale));
  d3.select(".y-axis").call(d3.axisLeft(yScale));
  d3.select(".x-label").text(xField);
  d3.select(".y-label").text(yField);

  // TODO: Draw circles — one per movie
  // Use vis.selectAll('circle').data(data).join('circle') then set:
  //   .attr('cx', d => xScale(d[xField]))
  //   .attr('cy', ...)
  //   .attr('r',  ...)
  //   .attr('fill', ...)
  //   .on('click', showMovie)
  vis
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", (d) => xScale(d[xField]))
    .attr("cy", (d) => yScale(d[yField]))
    .attr("r", (d) => sizeScale(d[sizeField]))
    .attr("fill", (d) => colorScale(colorValue(d)))
    .on("click", showMovie);

  // TODO: Draw a color legend inside the '.legend' group
  // Use colorScale.domain() to get the category values.
  // For each value append a colored rect and a text label.
  const legend = vis.select(".legend");

  const items = legend
    .selectAll(".legend-item")
    .data(categories, (d) => d)
    .join((enter) => {
      const g = enter.append("g").attr("class", "legend-item");
      g.append("rect").attr("width", 12).attr("height", 12);
      g.append("text").attr("x", 18);
      return g;
    });

  items.select("rect")
    .attr("y", (d, i) => i * 18)
    .attr("fill", (d) => colorScale(d));
  items.select("text")
    .attr("y", (d, i) => i * 18 + 10)
    .text((d) => d);
}

// Populates the sidebar when a circle is clicked.
// D3 v7 passes (event, d) to event handlers, so use .on('click', showMovie).
function showMovie(event, d) {
  // Highlight the selected circle
  d3.selectAll("circle").classed("selected", false);
  d3.select(event.currentTarget).classed("selected", true);

  // Show poster (requires internet access — images are served from TMDB)
  var poster = document.getElementById("movie-poster");
  if (d.poster_path) {
    poster.src = d.poster_path;
    poster.style.display = "block";
  } else {
    poster.style.display = "none";
  }

  document.getElementById("placeholder").style.display = "none";

  document.getElementById("movie-title").style.display = "block";
  document.getElementById("movie-title").textContent = `${d.title} (${d.year})`;

  document.getElementById("movie-meta").style.display = "block";
  document.getElementById("movie-meta").innerHTML =
    `<b>Director:</b> ${d.director}<br>` +
    `<b>Cast:</b> ${d.cast}<br>` +
    `<b>Genres:</b> ${d.genres}<br>` +
    `<b>Runtime:</b> ${d.runtime_min} min<br>` +
    `<b>Vote avg:</b> ${d.tmdb_vote_average.toFixed(1)} (${d.tmdb_vote_count} votes)<br>` +
    `<b>Popularity:</b> ${d.popularity.toFixed(2)}<br>` +
    `<b>Language:</b> ${d.original_language}`;

  document.getElementById("movie-overview").style.display = "block";
  document.getElementById("movie-overview").textContent = d.overview;
}

// ── Dropdown helpers ──────────────────────────────────────────────────────────

function getXSelectedOption() {
  var node = document.getElementById("xdropdown");
  return node.options[node.selectedIndex].value;
}

function getYSelectedOption() {
  var node = document.getElementById("ydropdown");
  return node.options[node.selectedIndex].value;
}

function getSizeSelectedOption() {
  var node = document.getElementById("sizedropdown");
  return node.options[node.selectedIndex].value;
}

function getColorSelectedOption() {
  var node = document.getElementById("colordropdown");
  return node.options[node.selectedIndex].value;
}
