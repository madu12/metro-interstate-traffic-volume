// Chart dimensions and margins.
const width = 800;
const height = 400;
const margin = { top: 30, right: 30, bottom: 50, left: 60 };

const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

// Load CSV data
d3.csv("https://raw.githubusercontent.com/madu12/metro-interstate-traffic-volume/refs/heads/main/output_data.csv").then(data => {
    data.forEach(d => {
        d.traffic_volume = +d.traffic_volume;
        d.temp = +d.temp;
        d.rain_1h = +d.rain_1h;
        d.snow_1h = +d.snow_1h;
        d.clouds_all = +d.clouds_all;
    });

    // Function to render the histogram.
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

    // Function to render the scatter plot.
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

    // Initial render
    renderHistogram("traffic_volume");
    renderScatter("temp");

    // Update charts on dropdown change
    d3.select("#histogram-variable-select").on("change", function () {
        renderHistogram(d3.select(this).property("value"));
    });

    d3.select("#scatter-x-select").on("change", function () {
        renderScatter(d3.select(this).property("value"));
    });
});