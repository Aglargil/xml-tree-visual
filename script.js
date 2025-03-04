// Node type configuration with color mapping
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

// Get color for a specific node type
function getNodeColor(nodeName) {
  for (const nodeType in config) {
    if (config[nodeType].node.includes(nodeName)) {
      return config[nodeType].color;
    }
  }
  return "#90EE90"; // Default color
}

document.addEventListener("DOMContentLoaded", function () {
  // DOM elements initialization
  const fileInput = document.getElementById("xml-file");
  const xmlInput = document.getElementById("xml-input");
  const visualizeBtn = document.getElementById("visualize-btn");
  const treeContainer = document.getElementById("tree-container");
  const currentLang = localStorage.getItem("preferred-language") || "en";

  // Setup export buttons
  const exportButtonsContainer = setupExportButtons(currentLang);
  const visualizationSection = document.querySelector(".visualization-section");
  visualizationSection.insertBefore(exportButtonsContainer, treeContainer);

  // Event listeners
  setupEventListeners();

  // Create export buttons and container
  function setupExportButtons(lang) {
    // SVG export button
    const exportSvgBtn = document.createElement("button");
    exportSvgBtn.id = "export-svg-btn";
    exportSvgBtn.setAttribute("data-i18n", "exportSvgBtn");
    exportSvgBtn.textContent = translations[lang].exportSvgBtn;
    exportSvgBtn.className = "export-btn";
    exportSvgBtn.style.display = "none";

    // PNG export button
    const exportPngBtn = document.createElement("button");
    exportPngBtn.id = "export-png-btn";
    exportPngBtn.setAttribute("data-i18n", "exportPngBtn");
    exportPngBtn.textContent = translations[lang].exportPngBtn;
    exportPngBtn.className = "export-btn";
    exportPngBtn.style.display = "none";

    // Create container and add buttons
    const container = document.createElement("div");
    container.className = "export-buttons";
    container.appendChild(exportSvgBtn);
    container.appendChild(exportPngBtn);

    return container;
  }

  // Setup all event listeners
  function setupEventListeners() {
    // File input change handler
    fileInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          xmlInput.value = e.target.result;
          visualizeXML(e.target.result);
        };
        reader.readAsText(file);
      }
    });

    // Visualize button click handler
    visualizeBtn.addEventListener("click", function () {
      const xmlContent = xmlInput.value.trim();
      if (xmlContent) {
        visualizeXML(xmlContent);
        document.getElementById("export-svg-btn").style.display =
          "inline-block";
        document.getElementById("export-png-btn").style.display =
          "inline-block";
      } else {
        alert("Please provide XML content!");
      }
    });

    // Export button handlers
    document
      .getElementById("export-svg-btn")
      .addEventListener("click", exportSVG);
    document
      .getElementById("export-png-btn")
      .addEventListener("click", exportPNG);
  }

  // Parse XML to a tree structure
  function parseXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    // Check for parsing errors
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      throw new Error("XML parsing error: " + parserError.textContent);
    }

    return xmlToJson(xmlDoc.documentElement);
  }

  // Convert XML node to JSON tree structure
  function xmlToJson(xmlNode) {
    const node = {
      name: xmlNode.nodeName,
      attributes: {},
      children: [],
    };

    // Process attributes
    if (xmlNode.attributes && xmlNode.attributes.length > 0) {
      for (let i = 0; i < xmlNode.attributes.length; i++) {
        const attr = xmlNode.attributes[i];
        node.attributes[attr.name] = attr.value;
      }
    }

    // Process child nodes
    xmlNode.childNodes.forEach((child) => {
      if (child.nodeType === 1) {
        // ELEMENT_NODE
        node.children.push(xmlToJson(child));
      }
    });

    return node;
  }

  // Visualize XML as tree diagram
  function visualizeXML(xmlContent) {
    try {
      // Clear previous visualization
      treeContainer.innerHTML = "";

      const treeData = parseXML(xmlContent);
      const containerWidth = treeContainer.clientWidth;
      const containerHeight = 800;

      // Create SVG container
      const svg = d3
        .select("#tree-container")
        .append("svg")
        .attr("width", "100%")
        .attr("height", containerHeight)
        .attr("id", "tree-svg")
        .style("overflow", "visible");

      // Create main container group
      const g = svg.append("g");

      // Setup tree layout
      const treeChart = d3
        .tree()
        .nodeSize([180, 120])
        .separation((a, b) => (a.parent === b.parent ? 1.5 : 2.5));

      // Create hierarchy from data
      const root = d3.hierarchy(treeData);

      // Calculate tree dimensions
      const nodes = treeChart(root);

      // Add links between nodes
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

      // Create node groups
      const nodeGroup = g
        .selectAll(".node")
        .data(root.descendants())
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

      // Render each node
      renderNodes(nodeGroup);

      // Center and scale the visualization
      centerVisualization(svg, g, root, containerWidth);
    } catch (error) {
      alert("Visualization failed: " + error.message);
      console.error(error);
    }
  }

  // Render node elements (rectangles, text, etc.)
  function renderNodes(nodeGroup) {
    const maxLineLength = 30; // Max characters per line
    const lineHeight = 20;

    nodeGroup.each(function (d) {
      const group = d3.select(this);
      const nodeName = d.data.name;

      // Calculate attribute text
      const attributes = d.data.attributes;
      const attributeLines = Object.keys(attributes).map(
        (key) => `${key}: ${attributes[key]}`
      );

      // Calculate node box size
      const textWidth = maxLineLength * 6;
      const rectWidth = Math.max(
        textWidth + 50,
        attributeLines.length > 0 ? 180 : 120
      );

      // Estimate total text lines
      let estimatedTotalLines = 0;
      attributeLines.forEach((line) => {
        const estimatedLines = Math.ceil(line.length / maxLineLength) || 1;
        estimatedTotalLines += estimatedLines;
      });

      const rectHeight = 30 + estimatedTotalLines * lineHeight;

      // Draw node box
      group
        .append("rect")
        .attr("x", -rectWidth / 2)
        .attr("y", -15)
        .attr("width", rectWidth)
        .attr("height", rectHeight)
        .attr("stroke", getNodeColor(nodeName));

      // Add node name
      group
        .append("text")
        .attr("dy", 5)
        .attr("text-anchor", "middle")
        .text(nodeName);

      // Add divider line
      group
        .append("line")
        .attr("x1", -rectWidth / 2 + 10)
        .attr("y1", 10)
        .attr("x2", rectWidth / 2 - 10)
        .attr("y2", 10)
        .attr("stroke", "#444")
        .attr("stroke-width", 2);

      // Add attribute text with line wrapping
      renderAttributeText(
        group,
        attributeLines,
        rectWidth,
        maxLineLength,
        lineHeight
      );
    });
  }

  // Render attribute text with line wrapping
  function renderAttributeText(
    group,
    attributeLines,
    rectWidth,
    maxLineLength,
    lineHeight
  ) {
    let totalLines = 0;

    attributeLines.forEach((line) => {
      const words = line.split(" ");
      let currentLine = "";
      let lineCount = 0;

      words.forEach((word) => {
        const testLine = currentLine + (currentLine ? " " : "") + word;
        if (testLine.length > maxLineLength && currentLine !== "") {
          // Add completed line
          group
            .append("text")
            .attr("class", "node-attributes")
            .attr("dy", 25 + totalLines * lineHeight)
            .attr("x", -rectWidth / 2 + 10)
            .attr("text-anchor", "start")
            .text(currentLine);

          // Add separator line
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

      // Add last line
      group
        .append("text")
        .attr("class", "node-attributes")
        .attr("dy", 25 + totalLines * lineHeight)
        .attr("x", -rectWidth / 2 + 10)
        .attr("text-anchor", "start")
        .text(currentLine);

      // Add separator line
      group
        .append("line")
        .attr("x1", -rectWidth / 2 + 10)
        .attr("y1", 25 + totalLines * lineHeight + 5)
        .attr("x2", rectWidth / 2 - 10)
        .attr("y2", 25 + totalLines * lineHeight + 5)
        .attr("stroke", "#ddd")
        .attr("stroke-width", 1);

      totalLines++;
    });
  }

  // Center and scale the visualization
  function centerVisualization(svg, g, root, containerWidth) {
    const descendants = root.descendants();
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    // Calculate boundaries
    descendants.forEach((d, i) => {
      const groupNode = d3.select(g.selectAll(".node").nodes()[i]);
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

    // Calculate center point
    const centerX = (maxX + minX) / 2;
    const centerY = (maxY + minY) / 2;

    // Set initial transform
    const initialScale = 0.8;
    const initialTransform = d3.zoomIdentity
      .translate(
        containerWidth / 2 - centerX * initialScale,
        100 - minY * initialScale
      )
      .scale(initialScale);

    // Create zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    // Apply initial transform and enable zoom
    svg.call(zoom).call(zoom.transform, initialTransform);
  }

  // Export SVG function
  function exportSVG() {
    const svgElement = document.getElementById("tree-svg");
    if (!svgElement) {
      alert(translations[currentLang].noExportContent);
      return;
    }

    const gElement = svgElement.querySelector("g");
    if (!gElement) {
      alert(translations[currentLang].noExportContent);
      return;
    }

    // Calculate bounding box
    const bbox = gElement.getBBox();

    // Clone and prepare SVG for export
    const svgClone = prepareSvgForExport(svgElement, bbox);

    // Create download link
    downloadFile(
      new Blob([new XMLSerializer().serializeToString(svgClone)], {
        type: "image/svg+xml;charset=utf-8",
      }),
      `xml_tree_${getTimestamp()}.svg`
    );
  }

  // Export PNG function
  function exportPNG() {
    const svgElement = document.getElementById("tree-svg");
    if (!svgElement) {
      alert(translations[currentLang].noExportContent);
      return;
    }

    const gElement = svgElement.querySelector("g");
    if (!gElement) {
      alert(translations[currentLang].noExportContent);
      return;
    }

    // Calculate bounding box
    const bbox = gElement.getBBox();

    // Clone and prepare SVG for export
    const svgClone = prepareSvgForExport(svgElement, bbox);

    // Convert SVG to PNG
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = function () {
      // Create canvas
      const canvas = document.createElement("canvas");
      const width = bbox.width + bbox.x + 100;
      const height = bbox.height + bbox.y + 100;
      canvas.width = width;
      canvas.height = height;

      // Draw image to canvas
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, width, height);

      // Create PNG and download
      try {
        downloadFile(
          dataURLToBlob(canvas.toDataURL("image/png")),
          `xml_tree_${getTimestamp()}.png`
        );
      } catch (err) {
        console.error("Export PNG failed:", err);
        alert(translations[currentLang].exportPngFailed);
      }

      URL.revokeObjectURL(url);
    };

    img.onerror = function () {
      console.error("Image loading failed");
      alert(translations[currentLang].exportPngFailed);
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }

  // Prepare SVG for export (add styles, set dimensions)
  function prepareSvgForExport(svgElement, bbox) {
    const svgClone = svgElement.cloneNode(true);

    // Set attributes for export
    svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgClone.setAttribute("width", bbox.width + bbox.x + 100);
    svgClone.setAttribute("height", bbox.height + bbox.y + 100);
    svgClone.setAttribute(
      "viewBox",
      `${bbox.x - 50} ${bbox.y - 50} ${bbox.width + 100} ${bbox.height + 100}`
    );

    // Add styles
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .node rect { 
        fill: #fff; 
        stroke-width: 1px; 
      }
      .node text { 
        font: 12px sans-serif; 
      }
      .node-attributes { 
        font: 10px sans-serif; 
        fill: #666; 
      }
      .link { 
        fill: none; 
        stroke: #999; 
        stroke-width: 1px; 
      }
      line {
        stroke: #444;
        stroke-width: 2px;
      }
    `;
    svgClone.insertBefore(styleElement, svgClone.firstChild);

    // Preserve node colors
    const rects = svgClone.querySelectorAll("rect");
    rects.forEach((rect) => {
      const strokeColor = rect.getAttribute("stroke");
      if (strokeColor) {
        rect.style.stroke = strokeColor;
      }
    });

    return svgClone;
  }

  // Create timestamp for filenames
  function getTimestamp() {
    const date = new Date();
    return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}_${date.getHours().toString().padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}`;
  }

  // Download a file
  function downloadFile(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  // Convert data URL to Blob
  function dataURLToBlob(dataURL) {
    const parts = dataURL.split(";base64,");
    const contentType = parts[0].split(":")[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
  }
});
