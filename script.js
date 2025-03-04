const config = {
  ControlNode: {
    node: ["Sequence", "Selector", "WhileDoElse"],
    color: "#4A90E2",
  },
  DecoratorNode: {
    node: ["Inverter", "Timeout", "Delay", "ForceSuccess", "ForceFailure"],
    color: "#F5A623",
  },
  ActionNode: {
    node: ["Sleep", "Echo"],
    color: "#D0021B",
  },
};

function getNodeColor(nodeName) {
  for (const nodeType in config) {
    if (config[nodeType].node.includes(nodeName)) {
      return config[nodeType].color;
    }
  }
  return "#90EE90";
}

document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("xml-file");
  const xmlInput = document.getElementById("xml-input");
  const visualizeBtn = document.getElementById("visualize-btn");
  const treeContainer = document.getElementById("tree-container");

  // file input
  fileInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        xmlInput.value = e.target.result;
        // immediately visualize after upload
        visualizeXML(e.target.result);
      };
      reader.readAsText(file);
    }
  });

  // visualize button click event
  visualizeBtn.addEventListener("click", function () {
    const xmlContent = xmlInput.value.trim();
    if (xmlContent) {
      visualizeXML(xmlContent);
    } else {
      alert("Please provide XML content!");
    }
  });

  // parse XML to tree structure
  function parseXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    // check parsing error
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      throw new Error("XML parsing error: " + parserError.textContent);
    }

    return xmlToJson(xmlDoc.documentElement);
  }

  // convert XML node to JSON tree
  function xmlToJson(xmlNode) {
    const node = {
      name: xmlNode.nodeName,
      attributes: {},
      children: [],
    };

    // handle attributes
    if (xmlNode.attributes && xmlNode.attributes.length > 0) {
      for (let i = 0; i < xmlNode.attributes.length; i++) {
        const attr = xmlNode.attributes[i];
        node.attributes[attr.name] = attr.value;
      }
    }

    // handle child nodes
    xmlNode.childNodes.forEach((child) => {
      if (child.nodeType === 1) {
        // ELEMENT_NODE
        node.children.push(xmlToJson(child));
      }
    });

    return node;
  }

  // visualize XML
  function visualizeXML(xmlContent) {
    try {
      // clear container
      treeContainer.innerHTML = "";

      const treeData = parseXML(xmlContent);

      const containerWidth = treeContainer.clientWidth;
      const containerHeight = 800;

      // create SVG container - ensure enough size to contain the tree
      const svg = d3
        .select("#tree-container")
        .append("svg")
        .attr("width", "100%")
        .attr("height", containerHeight)
        .style("overflow", "visible"); // allow content overflow but still visible

      // create scalable and draggable main container group
      const g = svg.append("g");

      // create tree layout
      const treeChart = d3
        .tree()
        .nodeSize([180, 120]) // increase node size, avoid overlap
        .separation((a, b) => (a.parent === b.parent ? 1.5 : 2.5)); // increase node interval

      // create hierarchy structure
      const root = d3.hierarchy(treeData);

      // calculate node count and depth
      const nodeCount = root.descendants().length;
      const maxDepth = d3.max(root.descendants(), (d) => d.depth);

      // calculate node position
      const nodes = treeChart(root);

      // add link
      g.selectAll(".link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr(
          "d",
          d3
            .linkVertical()
            .x((d) => d.x)
            .y((d) => d.y)
        );

      // create node group
      const nodeGroup = g
        .selectAll(".node")
        .data(root.descendants())
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

      // calculate text and attributes of each node
      nodeGroup.each(function (d) {
        const group = d3.select(this);
        const nodeName = d.data.name;

        // define a constant for the maximum line length
        const maxLineLength = 30; // characters per line, adjust as needed
        const lineHeight = 20;

        // calculate attribute text
        const attributes = d.data.attributes;
        const attributeLines = Object.keys(attributes).map(
          (key) => `${key}: ${attributes[key]}`
        );

        // calculate node box size
        const textWidth = maxLineLength * 6;
        const rectWidth = Math.max(
          textWidth + 50,
          attributeLines.length > 0 ? 180 : 120
        );

        // estimate total lines of attribute text
        let estimatedTotalLines = 0;
        attributeLines.forEach((line) => {
          // estimate lines of each attribute
          const estimatedLines = Math.ceil(line.length / maxLineLength) || 1;
          estimatedTotalLines += estimatedLines;
        });

        // calculate height using estimated total lines
        const rectHeight = 30 + estimatedTotalLines * lineHeight;

        // add node box
        group
          .append("rect")
          .attr("x", -rectWidth / 2)
          .attr("y", -15)
          .attr("width", rectWidth)
          .attr("height", rectHeight)
          .attr("stroke", getNodeColor(nodeName));

        // add node name
        group
          .append("text")
          .attr("dy", 5)
          .attr("text-anchor", "middle")
          .text(nodeName);

        // add line below node name
        group
          .append("line")
          .attr("x1", -rectWidth / 2 + 10)
          .attr("y1", 10)
          .attr("x2", rectWidth / 2 - 10)
          .attr("y2", 10)
          .attr("stroke", "#444")
          .attr("stroke-width", 2);

        // add attribute text
        let totalLines = 0;

        attributeLines.forEach((line, i) => {
          // text line break processing
          const words = line.split(" ");
          let currentLine = "";
          let lineCount = 0;

          words.forEach((word) => {
            // check if adding current word will cause line too long
            const testLine = currentLine + (currentLine ? " " : "") + word;
            if (testLine.length > maxLineLength && currentLine !== "") {
              // add completed line
              group
                .append("text")
                .attr("class", "node-attributes")
                .attr("dy", 25 + totalLines * lineHeight)
                .attr("x", -rectWidth / 2 + 10)
                .attr("text-anchor", "start")
                .text(currentLine);

              // add line below attribute text
              group
                .append("line")
                .attr("x1", -rectWidth / 2 + 10)
                .attr("y1", 25 + totalLines * lineHeight + 5)
                .attr("x2", rectWidth / 2 - 10)
                .attr("y2", 25 + totalLines * lineHeight + 5)
                .attr("stroke", "#ddd")
                .attr("stroke-width", 1);

              currentLine = word;
              lineCount++;
              totalLines++;
            } else {
              currentLine = testLine;
            }
          });

          // add last line
          group
            .append("text")
            .attr("class", "node-attributes")
            .attr("dy", 25 + totalLines * lineHeight)
            .attr("x", -rectWidth / 2 + 10)
            .attr("text-anchor", "start")
            .text(currentLine);

          // add line below attribute text
          group
            .append("line")
            .attr("x1", -rectWidth / 2 + 10)
            .attr("y1", 25 + totalLines * lineHeight + 5)
            .attr("x2", rectWidth / 2 - 10)
            .attr("y2", 25 + totalLines * lineHeight + 5)
            .attr("stroke", "#ddd")
            .attr("stroke-width", 1);

          totalLines++; // increase total line count
        });
      });

      // calculate tree boundaries to center correctly
      const descendants = root.descendants();
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;

      descendants.forEach((d) => {
        const groupNode = d3.select(nodeGroup.nodes()[descendants.indexOf(d)]);
        const rect = groupNode.select("rect").node();
        if (rect) {
          const rectWidth = parseFloat(rect.getAttribute("width"));
          const rectHeight = parseFloat(rect.getAttribute("height"));

          minX = Math.min(minX, d.x - rectWidth / 2);
          maxX = Math.max(maxX, d.x + rectWidth / 2);
          minY = Math.min(minY, d.y - 15);
          maxY = Math.max(maxY, d.y + rectHeight - 15);
        }
      });

      // calculate tree size and center point
      const treeWidth = maxX - minX;
      const treeHeight = maxY - minY;
      const centerX = (maxX + minX) / 2;
      const centerY = (maxY + minY) / 2;

      // set initial transform to center the tree
      const initialScale = 0.8; // initial scale to fit the tree
      const initialTransform = d3.zoomIdentity
        .translate(
          containerWidth / 2 - centerX * initialScale,
          100 - minY * initialScale
        )
        .scale(initialScale);

      // create zoom behavior
      const zoom = d3
        .zoom()
        .scaleExtent([0.1, 3]) // allowed scale range
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });

      // apply initial transform and enable zoom
      svg.call(zoom).call(zoom.transform, initialTransform);
    } catch (error) {
      alert("Visualization failed: " + error.message);
      console.error(error);
    }
  }
});
