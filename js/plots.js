// Chart dimensions and margins
const width = 800;
const height = 400;
const margin = { top: 30, right: 30, bottom: 50, left: 60 };

const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

// Declare a global variable for data
let data;

// Load CSV data
d3.csv("https://raw.githubusercontent.com/madu12/metro-interstate-traffic-volume/refs/heads/main/output_data.csv").then(loadedData => {
    // Parse the data
    data = loadedData.map(d => ({
        traffic_volume: +d.traffic_volume,
        temp: +d.temp,
        rain_1h: +d.rain_1h,
        snow_1h: +d.snow_1h,
        clouds_all: +d.clouds_all,
        date_time: new Date(d.date_time)
    }));

    // Initial render
    renderHistogram("traffic_volume");
    renderScatter("temp");
    renderTimeSeries();


    // Update charts on dropdown change
    d3.select("#histogram-variable-select").on("change", function () {
        renderHistogram(d3.select(this).property("value"));
    });

    d3.select("#scatter-x-select").on("change", function () {
        renderScatter(d3.select(this).property("value"));
    });
});

// Function to render the histogram
function renderHistogram(variable) {
    d3.select("#histogram").html("");
    const dropdownText = d3.select("#histogram-variable-select option:checked").text();
    d3.select("#histogram-title").text(`Histogram of ${dropdownText}`);

    const svg = d3.select("#histogram").append("svg")
        .attr("width", width)
        .attr("height", height);

    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d[variable]))
        .range([margin.left, width - margin.right]);

    const bins = d3.histogram()
        .value(d => d[variable])
        .domain(x.domain())
        .thresholds(30)(data);

    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([height - margin.bottom, margin.top]);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    svg.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x", d => x(d.x0))
        .attr("y", d => y(d.length))
        .attr("width", d => x(d.x1) - x(d.x0) - 1)
        .attr("height", d => height - margin.bottom - y(d.length))
        .attr("fill", "steelblue")
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`Count: ${d.length}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
}

// Function to render the scatter plot
function renderScatter(xVariable) {
    d3.select("#scatter").html("");
    const dropdownText = d3.select("#scatter-x-select option:checked").text();
    d3.select("#scatter-title").text(`Scatter Plot: ${dropdownText} vs Traffic Volume`);

    const svg = d3.select("#scatter").append("svg")
        .attr("width", width)
        .attr("height", height);

    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d[xVariable]))
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain(d3.extent(data, d => d.traffic_volume))
        .range([height - margin.bottom, margin.top]);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d[xVariable]))
        .attr("cy", d => y(d.traffic_volume))
        .attr("r", 5)
        .attr("fill", "orange")
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`${dropdownText}: ${d[xVariable]}<br>Traffic Volume: ${d.traffic_volume}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
}

// Function to render the time series plot
function renderTimeSeries() {
  // Aggregate data by day
  const aggregatedData = d3.rollup(
      data,
      v => d3.sum(v, d => d.traffic_volume), // Sum traffic volume
      d => d3.timeDay(d.date_time) // Group by day
  );

  // Convert the map to an array of objects for plotting
  const dailyData = Array.from(aggregatedData, ([key, value]) => ({
      date: key,
      traffic_volume: value
  }));

  // Clear the previous plot
  d3.select("#time-series").html("");

  // Set up scales
  const x = d3.scaleUtc()
      .domain(d3.extent(dailyData, d => d.date)) // X-axis: date range
      .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
      .domain([0, d3.max(dailyData, d => d.traffic_volume)]) // Y-axis: traffic volume
      .nice()
      .range([height - margin.bottom, margin.top]);

  // Line generator
  const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.traffic_volume));

  // Create the SVG container
  const svg = d3.select("#time-series")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

  // Add x-axis
  svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

  // Add y-axis
  svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(height / 40))
      .call(g => g.select(".domain").remove());

  // Add the line path
  svg.append("path")
      .datum(dailyData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", line);

  // Tooltip container
  const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

  // Add mouse events for tooltips
  svg.selectAll("circle")
      .data(dailyData)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.traffic_volume))
      .attr("r", 5)
      .attr("fill", "orange")
      .attr("opacity", 0) // Initially hidden
      .on("mouseover", (event, d) => {
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip.html(`Date: ${d3.timeFormat("%Y-%m-%d")(d.date)}<br>Traffic Volume: ${d.traffic_volume}`)
              .style("left", (event.pageX + 5) + "px")
              .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0))
      .on("mousemove", (event) => {
          tooltip.style("left", (event.pageX + 5) + "px")
                 .style("top", (event.pageY - 28) + "px");
      });
}




