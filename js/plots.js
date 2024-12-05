// Chart dimensions and margins
const width = 800;
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
      default: "This histogram shows the distribution of the selected traffic-related variable.",
      variables: {
          traffic_volume: "This histogram shows the distribution of traffic volume recorded over time.",
          temp: "This histogram shows how temperature variations affect traffic volume.",
          rain_1h: "This histogram illustrates the impact of hourly rainfall on traffic patterns.",
          snow_1h: "This histogram highlights the influence of snowfall on traffic volume.",
          clouds_all: "This histogram displays traffic volume variations based on cloud cover percentage."
      }
  },
  scatter: {
      default: "This scatter plot shows the relationship between traffic volume and a selected variable.",
      variables: {
          temp: "This scatter plot shows the relationship between temperature and traffic volume.",
          rain_1h: "This scatter plot illustrates how hourly rainfall affects traffic volume.",
          snow_1h: "This scatter plot shows the impact of snowfall on traffic volume.",
          clouds_all: "This scatter plot demonstrates the relationship between cloud cover and traffic volume."
      }
  },
  time_series: {
      default: "This time series plot shows the trend of daily traffic volume over time."
  },
  sunburst: {
      default: "This sunburst chart breaks down traffic volume by year, month, and day."
  }
};

// Function to dynamically create and update descriptions
function createOrUpdateDescription(plotType, variable = null) {
  let descriptionText = "";

  if (plotType === "histogram" || plotType === "scatter") {
      descriptionText = plotDescriptions[plotType].variables[variable] || plotDescriptions[plotType].default;
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
      "https://raw.githubusercontent.com/madu12/metro-interstate-traffic-volume/refs/heads/main/output_data.csv"
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
      "https://raw.githubusercontent.com/madu12/metro-interstate-traffic-volume/refs/heads/main/hierarchical_traffic_data.json"
    ).then((loadedData) => {
      jsonData = loadedData;
      callback(jsonData);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {

  // Initial description setup
  createOrUpdateDescription("histogram", "traffic_volume");
  createOrUpdateDescription("scatter", "temp");
  createOrUpdateDescription("time_series");
  createOrUpdateDescription("sunburst");

  // Initial render for the first tab (Histogram)
  loadCSVData((data) => renderHistogram("traffic_volume", data));

  // Set up tab-based loading
  document.querySelectorAll('button[data-bs-toggle="tab"]').forEach((tab) => {
    tab.addEventListener("shown.bs.tab", (event) => {
      const targetTab = event.target.id;
      if (targetTab === "histogram-tab") {
        loadCSVData((data) => renderHistogram("traffic_volume", data));
      } else if (targetTab === "scatter-tab") {
        loadCSVData((data) => renderScatter("temp", data));
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
  d3.select("#scatter-x-select").on("change", function () {
    const selectedVariable = d3.select(this).property("value");
    loadCSVData((data) => renderScatter(selectedVariable, data));
    createOrUpdateDescription("scatter", selectedVariable);
  });
});

// Function to render the histogram
function renderHistogram(variable, data) {
  d3.select("#histogram").html("");
  const dropdownText = d3
    .select("#histogram-variable-select option:checked")
    .text();
  d3.select("#histogram-title").text(`Histogram of ${dropdownText}`);

  const svg = d3
    .select("#histogram")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d[variable]))
    .range([margin.left, width - margin.right]);

  const bins = d3
    .histogram()
    .value((d) => d[variable])
    .domain(x.domain())
    .thresholds(30)(data);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (d) => d.length)])
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg
    .selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.x0))
    .attr("y", (d) => y(d.length))
    .attr("width", (d) => x(d.x1) - x(d.x0) - 1)
    .attr("height", (d) => height - margin.bottom - y(d.length))
    .attr("fill", "steelblue")
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(`Count: ${d.length}`)
        .style("left", event.pageX + 5 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () =>
      tooltip.transition().duration(500).style("opacity", 0)
    );
}

// Function to render the scatter plot
function renderScatter(xVariable, data) {
  d3.select("#scatter").html("");
  const dropdownText = d3.select("#scatter-x-select option:checked").text();
  d3.select("#scatter-title").text(
    `Scatter Plot: ${dropdownText} vs Traffic Volume`
  );

  const svg = d3
    .select("#scatter")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d[xVariable]))
    .range([margin.left, width - margin.right]);
  const y = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.traffic_volume))
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));
  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d[xVariable]))
    .attr("cy", (d) => y(d.traffic_volume))
    .attr("r", 5)
    .attr("fill", "orange")
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

// Function to render the time series plot
function renderTimeSeries(data) {
  const aggregatedData = d3.rollup(
    data,
    (v) => d3.sum(v, (d) => d.traffic_volume),
    (d) => d3.timeDay(d.date_time)
  );

  const dailyData = Array.from(aggregatedData, ([key, value]) => ({
    date: key,
    traffic_volume: value,
  }));

  d3.select("#time_series").html("");

  const x = d3
    .scaleUtc()
    .domain(d3.extent(dailyData, (d) => d.date))
    .range([margin.left, width - margin.right]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(dailyData, (d) => d.traffic_volume)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const line = d3
    .line()
    .x((d) => x(d.date))
    .y((d) => y(d.traffic_volume));

  const svg = d3
    .select("#time_series")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(width / 80)
        .tickSizeOuter(0)
    );

  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(height / 40))
    .call((g) => g.select(".domain").remove());

  svg
    .append("path")
    .datum(dailyData)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("d", line);

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
          `Date: ${d3.timeFormat("%Y-%m-%d")(d.date)}<br>Traffic Volume: ${
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
  const radius = width / 10;

  const arc = d3
    .arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius((d) => d.y0 * radius)
    .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

  const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, 10));

  const format = d3.format(",d");

  const partition = (data) => {
    const root = d3
      .hierarchy(data)
      .sum((d) => d.size)
      .sort((a, b) => b.value - a.value);
    return d3.partition().size([2 * Math.PI, root.height + 1])(root);
  };

  const root = partition(data);
  root.each((d) => (d.current = d));

  const svg = d3
    .select("#sunburst")
    .append("svg")
    .attr("viewBox", [0, 0, width, width * 0.7])
    .style("font", "8px sans-serif");

  const g = svg.append("g").attr("transform", `translate(${width / 2},300)`);

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

  path
    .filter((d) => d.children)
    .style("cursor", "pointer")
    .on("click", clicked);

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

  const parent = g
    .append("circle")
    .datum(root)
    .attr("r", radius)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("click", clicked);

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

  function mouseleave() {
    tooltip.style("opacity", 0);
    d3.selectAll("path").style("opacity", 1);
  }

  function arcVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  }

  function labelVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }

  function labelTransform(d) {
    const x = ((d.x0 + d.x1) / 2) * (180 / Math.PI);
    const y = ((d.y0 + d.y1) / 2) * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }
}
