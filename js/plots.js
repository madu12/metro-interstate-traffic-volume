// Chart dimensions and margins
const width = 1200;
const height = 400;
const margin = { top: 30, right: 30, bottom: 50, left: 60 };

const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Declare global variables for data
let csvData = null;
let jsonData = null;

// Descriptions stored in a JSON-like object
const plotDescriptions = {
  histogram: {
    default:
      "This histogram shows the distribution of the selected traffic-related variable.",
    variables: {
      traffic_volume:
        "This histogram shows the distribution of traffic volume recorded over time.",
      temp: "This histogram shows how temperature variations affect traffic volume.",
      rain_1h:
        "This histogram illustrates the impact of hourly rainfall on traffic patterns.",
      snow_1h:
        "This histogram highlights the influence of snowfall on traffic volume.",
      clouds_all:
        "This histogram displays traffic volume variations based on cloud cover percentage.",
    },
  },
  weather_scatter: {
    default:
      "This scatter plot shows the relationship between traffic volume and a selected variable.",
    variables: {
      temp: "This scatter plot shows the relationship between temperature and traffic volume.",
      rain_1h:
        "This scatter plot illustrates how hourly rainfall affects traffic volume.",
      snow_1h:
        "This scatter plot shows the impact of snowfall on traffic volume.",
      clouds_all:
        "This scatter plot demonstrates the relationship between cloud cover and traffic volume.",
    },
  },
  time_series: {
    default:
      "This time series plot shows the trend of daily traffic volume over time.",
    variables: {
      day: "This time series plot shows the trend of daily traffic volume over time.",
      month:
        "This time series plot shows the trend of monthly traffic volume over time.",
      quarter:
        "This time series plot shows the trend of quarterly traffic volume over time.",
      year: "This time series plot shows the trend of yearly traffic volume over time.",
    },
  },
  sunburst: {
    default:
      "This sunburst chart breaks down traffic volume by year, month, and day.",
  },
};

// Function to dynamically create and update descriptions
function createOrUpdateDescription(plotType, variable = null) {
  let descriptionText = "";

  if (
    plotType === "histogram" ||
    plotType === "weather_scatter" ||
    plotType === "time_series"
  ) {
    descriptionText =
      plotDescriptions[plotType].variables[variable] ||
      plotDescriptions[plotType].default;
  } else {
    descriptionText = plotDescriptions[plotType].default;
  }

  // Check if container exists
  const container = document.getElementById(`${plotType}-tab-content`);
  if (!container) {
    console.error(`Container with ID ${plotType}-tab-content not found.`);
    return;
  }

  // Check if description element already exists
  let descriptionElement = document.getElementById(`${plotType}-description`);
  if (!descriptionElement) {
    // Create the description element if it doesn't exist
    descriptionElement = document.createElement("p");
    descriptionElement.id = `${plotType}-description`;
    descriptionElement.className = "text-center text-muted";
    container.appendChild(descriptionElement);
  }

  // Update the description text
  descriptionElement.textContent = descriptionText;
}

// Function to load CSV data
function loadCSVData(callback) {
  if (csvData) {
    callback(csvData);
  } else {
    d3.csv(
      "https://raw.githubusercontent.com/madu12/metro-interstate-traffic-volume/refs/heads/main/data/output_data.csv"
    ).then((loadedData) => {
      csvData = loadedData.map((d) => ({
        traffic_volume: +d.traffic_volume,
        temp: +d.temp,
        rain_1h: +d.rain_1h,
        snow_1h: +d.snow_1h,
        clouds_all: +d.clouds_all,
        holiday_indexed: +d.holiday_indexed,
        date_time: new Date(d.date_time),
      }));
      callback(csvData);
    });
  }
}

// Function to load JSON data
function loadJSONData(callback) {
  if (jsonData) {
    callback(jsonData);
  } else {
    d3.json(
      "https://raw.githubusercontent.com/madu12/metro-interstate-traffic-volume/refs/heads/main/data/hierarchical_traffic_data.json"
    ).then((loadedData) => {
      jsonData = loadedData;
      callback(jsonData);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Initial description setup
  createOrUpdateDescription("histogram", "traffic_volume");
  createOrUpdateDescription("weather_scatter", "temp");
  createOrUpdateDescription("time_series", "day");
  createOrUpdateDescription("sunburst");

  // Initial render for the first tab (Histogram)
  loadCSVData((data) => renderHistogram("traffic_volume", data));

  // Set up tab-based loading
  document.querySelectorAll('button[data-bs-toggle="tab"]').forEach((tab) => {
    tab.addEventListener("shown.bs.tab", (event) => {
      const targetTab = event.target.id;
      if (targetTab === "histogram-tab") {
        loadCSVData((data) => renderHistogram("traffic_volume", data));
      } else if (targetTab === "weather_scatter-tab") {
        loadCSVData((data) => renderWeatherScatter("temp", data));
      } else if (targetTab === "date_scatter-tab") {
        loadCSVData((data) => renderDailyScatter(data));
      } else if (targetTab === "time_series-tab") {
        loadCSVData((data) => renderTimeSeries(data));
      } else if (targetTab === "sunburst-tab") {
        loadJSONData((data) => renderSunburst(data));
      }
    });
  });

  // Dropdown change for Histogram
  d3.select("#histogram-variable-select").on("change", function () {
    const selectedVariable = d3.select(this).property("value");
    loadCSVData((data) => renderHistogram(selectedVariable, data));
    createOrUpdateDescription("histogram", selectedVariable);
  });

  // Dropdown change for Scatter Plot
  d3.select("#weather_scatter-x-select").on("change", function () {
    const selectedVariable = d3.select(this).property("value");
    loadCSVData((data) => renderWeatherScatter(selectedVariable, data));
    createOrUpdateDescription("weather_scatter", selectedVariable);
  });

  // Dropdown change for Time Series Plot
  d3.select("#time_series-level-select").on("change", function () {
    const selectedVariable = d3.select(this).property("value");
    loadCSVData((data) => renderTimeSeries(data, selectedVariable));
    createOrUpdateDescription("time_series", selectedVariable);
  });
});

// Function to render the histogram
function renderHistogram(variable, data) {
  // Clear existing histogram content
  d3.select("#histogram").html("");

  const dropdownText = d3
    .select("#histogram-variable-select option:checked")
    .text();
  d3.select("#histogram-title").text(`Histogram of ${dropdownText}`);

  // Bin the data
  const bins = d3
    .bin()
    .thresholds(40)
    .value((d) => d[variable])(data);

  // Declare x (horizontal) scale
  const x = d3
    .scaleLinear()
    .domain([bins[0].x0, bins[bins.length - 1].x1])
    .nice()
    .range([margin.left, width - margin.right]);

  // Declare y (vertical) scale
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (d) => d.length)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  // Create the SVG container
  const svg = d3
    .select("#histogram")
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto;");

  // Add bars for each bin
  svg
    .append("g")
    .attr("fill", "steelblue")
    .selectAll("rect")
    .data(bins)
    .join("rect")
    .attr("x", (d) => x(d.x0) + 1)
    .attr("width", (d) => x(d.x1) - x(d.x0) - 1)
    .attr("y", (d) => y(d.length))
    .attr("height", (d) => y(0) - y(d.length))
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(`Bin: ${d.x0} - ${d.x1}<br>Count: ${d.length}`)
        .style("left", event.pageX + 5 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () =>
      tooltip.transition().duration(500).style("opacity", 0)
    );

  // Add the x-axis and label
  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(width / 80)
        .tickSizeOuter(0)
    )
    .call((g) =>
      g
        .append("text")
        .attr("x", width)
        .attr("y", margin.bottom - 4)
        .attr("fill", "currentColor")
        .attr("text-anchor", "end")
        .text(`${dropdownText} (bin) →`)
    );

  // Add the y-axis and label
  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(height / 40))
    .call((g) =>
      g
        .append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(`↑ Count of ${dropdownText}`)
    );
}

// Function to render the weather scatter plot
function renderWeatherScatter(xVariable, data) {
  // Clear existing scatterplot content
  d3.select("#weather_scatter").html("");

  const dropdownText = d3
    .select("#weather_scatter-x-select option:checked")
    .text();
  d3.select("#weather_scatter-title").text(
    `Weather Scatter Plot: ${dropdownText} vs Traffic Volume`
  );

  // Declare x (horizontal) scale
  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d[xVariable]))
    .nice()
    .range([margin.left, width - margin.right]);

  // Declare y (vertical) scale
  const y = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.traffic_volume))
    .nice()
    .range([height - margin.bottom, margin.top]);

  // Create the SVG container
  const svg = d3
    .select("#weather_scatter")
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto;");

  // Add the x-axis and label
  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(width / 80)
        .tickSizeOuter(0)
    )
    .call((g) =>
      g
        .append("text")
        .attr("x", width)
        .attr("y", margin.bottom - 4)
        .attr("fill", "currentColor")
        .attr("text-anchor", "end")
        .text(`${dropdownText} →`)
    );

  // Add the y-axis and label
  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(height / 40))
    .call((g) =>
      g
        .append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(`↑ Traffic Volume`)
    );

  // Add grid lines
  svg
    .append("g")
    .attr("stroke", "currentColor")
    .attr("stroke-opacity", 0.1)
    .call((g) =>
      g
        .append("g")
        .selectAll("line")
        .data(x.ticks())
        .join("line")
        .attr("x1", (d) => 0.5 + x(d))
        .attr("x2", (d) => 0.5 + x(d))
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
    )
    .call((g) =>
      g
        .append("g")
        .selectAll("line")
        .data(y.ticks())
        .join("line")
        .attr("y1", (d) => 0.5 + y(d))
        .attr("y2", (d) => 0.5 + y(d))
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
    );

  // Add dots for the scatterplot
  svg
    .append("g")
    .attr("fill", "orange")
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", (d) => x(d[xVariable]))
    .attr("cy", (d) => y(d.traffic_volume))
    .attr("r", 3)
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(
          `${dropdownText}: ${d[xVariable]}<br>Traffic Volume: ${d.traffic_volume}`
        )
        .style("left", event.pageX + 5 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () =>
      tooltip.transition().duration(500).style("opacity", 0)
    );
}

// Function to render the daily scatter plot
function renderDailyScatter(data) {
  // Aggregate data to calculate total traffic volume per day
  const aggregatedData = d3
    .rollups(
      data,
      (v) => d3.sum(v, (d) => d.traffic_volume),
      (d) => d3.timeDay(d.date_time)
    )
    .map(([date, traffic_volume]) => ({ date, traffic_volume }));

  // Clear existing scatterplot content
  d3.select("#date_scatter").html("");

  // Adjusted margins to fit rotated text
  const newMargin = { ...margin, bottom: 70 };

  // Set up the x (time) and y (traffic volume) scales
  const x = d3
    .scaleTime()
    .domain(d3.extent(aggregatedData, (d) => d.date))
    .nice()
    .range([newMargin.left, width - newMargin.right]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(aggregatedData, (d) => d.traffic_volume)])
    .nice()
    .range([height - newMargin.bottom, newMargin.top]);

  // Create the SVG container
  const svg = d3
    .select("#date_scatter")
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; overflow: visible;");

  // Add the x-axis with rotated labels
  svg
    .append("g")
    .attr("transform", `translate(0,${height - newMargin.bottom})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(d3.timeMonth.every(2))
        .tickFormat(d3.timeFormat("%b %Y"))
    )
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end")
    .attr("dx", "-0.8em")
    .attr("dy", "0.15em");

  // Add x-axis label
  svg
    .append("text")
    .attr("x", width)
    .attr("y", height - 10)
    .attr("fill", "currentColor")
    .attr("text-anchor", "end")
    .style("font-size", 10)
    .text("Date →");

  // Add the y-axis and label
  svg
    .append("g")
    .attr("transform", `translate(${newMargin.left},0)`)
    .call(d3.axisLeft(y))
    .call((g) =>
      g
        .append("text")
        .attr("x", -newMargin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(`↑ Traffic Volume`)
    );

  // Add grid lines
  svg
    .append("g")
    .attr("stroke", "currentColor")
    .attr("stroke-opacity", 0.1)
    .call((g) =>
      g
        .append("g")
        .selectAll("line")
        .data(x.ticks())
        .join("line")
        .attr("x1", (d) => 0.5 + x(d))
        .attr("x2", (d) => 0.5 + x(d))
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
    )
    .call((g) =>
      g
        .append("g")
        .selectAll("line")
        .data(y.ticks())
        .join("line")
        .attr("y1", (d) => 0.5 + y(d))
        .attr("y2", (d) => 0.5 + y(d))
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
    );

  // Add dots for the scatterplot
  svg
    .append("g")
    .attr("fill", "orange")
    .selectAll("circle")
    .data(aggregatedData)
    .join("circle")
    .attr("cx", (d) => x(d.date))
    .attr("cy", (d) => y(d.traffic_volume))
    .attr("r", 3)
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(
          `Date: ${d3.timeFormat("%Y-%m-%d")(d.date)}<br>Traffic Volume: ${
            d.traffic_volume
          }`
        )
        .style("left", event.pageX + 5 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () =>
      tooltip.transition().duration(500).style("opacity", 0)
    );
}

// Function to render the time series plot
function renderTimeSeries(data, level = "day") {
  const dropdownText = d3
    .select("#time_series-level-select option:checked")
    .text();

  d3.select("#time_series-title").text(
    `Time Series Plot: ${dropdownText} Traffic Volume`
  );

  // Aggregate data based on the selected level
  let aggregatedData;
  let tooltipFormat;
  let xTickFormat = null;
  let tickInterval = null;

  if (level === "day") {
    aggregatedData = d3.rollup(
      data,
      (v) => d3.sum(v, (d) => d.traffic_volume),
      (d) => d3.timeDay(d.date_time)
    );
    tooltipFormat = "%Y-%m-%d";
  } else if (level === "month") {
    aggregatedData = d3.rollup(
      data,
      (v) => d3.sum(v, (d) => d.traffic_volume),
      (d) => d3.timeMonth(d.date_time)
    );
    tooltipFormat = "%Y-%m";
  } else if (level === "quarter") {
    aggregatedData = d3.rollup(
      data,
      (v) => d3.sum(v, (d) => d.traffic_volume),
      (d) => {
        const date = d.date_time;
        const quarterStart = new Date(
          date.getFullYear(),
          Math.floor(date.getMonth() / 3) * 3,
          1
        );
        return quarterStart;
      }
    );
    tooltipFormat = "%Y-Q%q";
    xTickFormat = d3.timeFormat("Q%q %Y");
    tickInterval = d3.timeMonth.every(3);
  } else if (level === "year") {
    aggregatedData = d3.rollup(
      data,
      (v) => d3.sum(v, (d) => d.traffic_volume),
      (d) => d3.timeYear(d.date_time)
    );
    tooltipFormat = "%Y";
    xTickFormat = d3.timeFormat("%Y");
    tickInterval = d3.timeYear.every(1);
  }
  const dailyData = Array.from(aggregatedData, ([key, value]) => ({
    date: key,
    traffic_volume: value,
  }));

  // Clear existing content
  d3.select("#time_series").html("");

  // Declare the x (horizontal position) scale
  const x = d3
    .scaleUtc(
      d3.extent(dailyData, (d) => d.date),
      [margin.left, width - margin.right]
    )
    .nice();

  // Declare the y (vertical position) scale
  const y = d3
    .scaleLinear()
    .domain(d3.extent(dailyData, (d) => d.traffic_volume))
    .nice()
    .range([height - margin.bottom, margin.top]);

  // Declare the line generator
  const line = d3
    .line()
    .x((d) => x(d.date))
    .y((d) => y(d.traffic_volume));

  // Create the SVG container
  const svg = d3
    .select("#time_series")
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto;");

  // Add the x-axis
  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3
        .axisBottom(x)
        .tickFormat(xTickFormat)
        .ticks(tickInterval ? d3.timeDay.every(tickInterval) : width / 80)
        .tickSizeOuter(0)
    )
    .call((g) =>
      g
        .append("text")
        .attr("x", width)
        .attr("y", margin.bottom - 4)
        .attr("fill", "currentColor")
        .attr("text-anchor", "end")
        .text(`${dropdownText} →`)
    );

  // Add the y-axis and label
  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(height / 40))
    .call((g) =>
      g
        .append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(`↑ ${dropdownText} Traffic Volume`)
    );

  // Append a path for the line
  svg
    .append("path")
    .datum(dailyData)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("d", line);

  // Add grid lines
  svg
    .append("g")
    .attr("stroke", "currentColor")
    .attr("stroke-opacity", 0.1)
    .call((g) =>
      g
        .append("g")
        .selectAll("line")
        .data(x.ticks())
        .join("line")
        .attr("x1", (d) => 0.5 + x(d))
        .attr("x2", (d) => 0.5 + x(d))
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
    )
    .call((g) =>
      g
        .append("g")
        .selectAll("line")
        .data(y.ticks())
        .join("line")
        .attr("y1", (d) => 0.5 + y(d))
        .attr("y2", (d) => 0.5 + y(d))
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
    );

  // Add a layer of points for tooltip interaction.
  svg
    .selectAll("circle")
    .data(dailyData)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d.date))
    .attr("cy", (d) => y(d.traffic_volume))
    .attr("r", 5)
    .attr("fill", "orange")
    .attr("opacity", 0)
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(
          `Date: ${d3.timeFormat(tooltipFormat)(d.date)}<br>Traffic Volume: ${
            d.traffic_volume
          }`
        )
        .style("left", event.pageX + 5 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () =>
      tooltip.transition().duration(500).style("opacity", 0)
    )
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 5 + "px")
        .style("top", event.pageY - 28 + "px");
    });
}

// Function to render the Sunburst plot
function renderSunburst(data) {
  // Defines the radius scale for the sunburst
  const radius = width / 12;

  // Create the arc generator to calculate path shapes
  const arc = d3
    .arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius((d) => d.y0 * radius)
    .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

  // Define a color scale for the chart
  const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, 10));

  // Format numbers for tooltips
  const format = d3.format(",d");

  // Function to compute the hierarchical partition
  const partition = (data) => {
    const root = d3
      .hierarchy(data)
      .sum((d) => d.size)
      .sort((a, b) => b.value - a.value);
    return d3.partition().size([2 * Math.PI, root.height + 1])(root);
  };

  const root = partition(data);
  root.each((d) => (d.current = d));

  // Create the SVG container
  const svg = d3
    .select("#sunburst")
    .append("svg")
    .attr("viewBox", [0, 0, width, width * 0.7])
    .style("margin-top", "50px")
    .style("font", "12px sans-serif");

  const g = svg.append("g").attr("transform", `translate(${width / 2},300)`);

  // Create the paths for each node in the hierarchy
  const path = g
    .append("g")
    .selectAll("path")
    .data(root.descendants().slice(1))
    .join("path")
    .attr("fill", (d) => {
      while (d.depth > 1) d = d.parent;
      return color(d.data.name);
    })
    .attr("fill-opacity", (d) =>
      arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0
    )
    .attr("d", (d) => arc(d.current))
    .on("mouseover", mouseover)
    .on("mouseout", mouseleave);

  // Enable click interaction for nodes with children
  path
    .filter((d) => d.children)
    .style("cursor", "pointer")
    .on("click", clicked);

  // Add labels for nodes
  const label = g
    .append("g")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .style("user-select", "none")
    .selectAll("text")
    .data(root.descendants().slice(1))
    .join("text")
    .attr("dy", "0.35em")
    .attr("fill-opacity", (d) => +labelVisible(d.current))
    .attr("transform", (d) => labelTransform(d.current))
    .text((d) => d.data.name);

  // Add a central circle for navigation to parent
  const parent = g
    .append("circle")
    .datum(root)
    .attr("r", radius)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("click", clicked);

  // Click handler for zooming into a node
  function clicked(event, p) {
    parent.datum(p.parent || root);

    root.each(
      (d) =>
        (d.target = {
          x0:
            Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) *
            2 *
            Math.PI,
          x1:
            Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) *
            2 *
            Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth),
        })
    );

    // Smooth transition for zooming
    const t = g.transition().duration(750);

    path
      .transition(t)
      .tween("data", (d) => {
        const i = d3.interpolate(d.current, d.target);
        return (t) => (d.current = i(t));
      })
      .filter(function (d) {
        return +this.getAttribute("fill-opacity") || arcVisible(d.target);
      })
      .attr("fill-opacity", (d) =>
        arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0
      )
      .attrTween("d", (d) => () => arc(d.current));

    label
      .filter(function (d) {
        return +this.getAttribute("fill-opacity") || labelVisible(d.target);
      })
      .transition(t)
      .attr("fill-opacity", (d) => +labelVisible(d.target))
      .attrTween("transform", (d) => () => labelTransform(d.current));
  }

  // Mouseover handler for tooltips and highlighting
  function mouseover(event, d) {
    if (
      (d.depth === 1 && arcVisible(d.current)) ||
      (d.depth === 2 && arcVisible(d.current)) ||
      (d.depth === 3 && arcVisible(d.current))
    ) {
      tooltip
        .style("opacity", 1)
        .style("top", `${event.pageY}px`)
        .style("left", `${event.pageX}px`)
        .html(`<strong>${d.data.name}</strong><br>Value: ${format(d.value)}`);

      const sequenceArray = d.ancestors().reverse();
      sequenceArray.shift();

      d3.selectAll("path").style("opacity", 0.3);
      g.selectAll("path")
        .filter((node) => sequenceArray.indexOf(node) >= 0)
        .style("opacity", 1);
    }
  }

  // Mouseleave handler to reset styles
  function mouseleave() {
    tooltip.style("opacity", 0);
    d3.selectAll("path").style("opacity", 1);
  }

  // Helper to determine if an arc is visible
  function arcVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  }

  // Helper to determine if a label is visible
  function labelVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }

  // Helper to calculate label positions
  function labelTransform(d) {
    const x = ((d.x0 + d.x1) / 2) * (180 / Math.PI);
    const y = ((d.y0 + d.y1) / 2) * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }
}
