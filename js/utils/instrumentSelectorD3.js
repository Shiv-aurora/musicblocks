/**
 * @file instrumentSelectorD3.js
 * @overview Defines a D3.js-based Zoomable Sunburst instrument selector for Music Blocks
 * @author Music Blocks contributors
 * @copyright 2024
 * @license AGPL-3.0
 */

/* global docById, _, platformColor, Singer, PREVIEWVOLUME */

// Ensure D3.js is loaded
(function() {
    if (typeof d3 === 'undefined') {
        console.log("Loading D3.js from CDN...");
        const script = document.createElement('script');
        script.src = 'https://d3js.org/d3.v7.min.js';
        script.async = false; // Set to false to ensure it loads in order
        document.head.appendChild(script);
        
        // Wait for the script to load before continuing
        script.onload = function() {
            console.log("D3.js loaded successfully");
        }; 
    }
})();

/**
 * Creates a D3.js-based Zoomable Sunburst visualization for instrument selection
 * @param {Object} activity - The activity object
 * @param {Object} block - The block object
 * @returns {void}
 */
function instrumentSelectorD3(activity, block) {
    console.log("instrumentSelectorD3 called with", activity, block);
    
    // Ensure D3 is available
    if (typeof d3 === 'undefined') {
        console.log("D3 not loaded yet, loading it now and retrying in 500ms");
        const script = document.createElement('script');
        script.src = 'https://d3js.org/d3.v7.min.js';
        document.head.appendChild(script);
        
        script.onload = function() {
            console.log("D3 loaded successfully, retrying instrumentSelectorD3");
            setTimeout(function() {
                instrumentSelectorD3(activity, block);
            }, 100);
        };
        return;
    }
    
    // Return immediately if stage click
    if (block.blocks.stageClick) {
        return;
    }

    // Get the wheel div and prepare it
    const wheelDiv = docById("wheelDiv");
    if (!wheelDiv) {
        console.error("wheelDiv element not found");
        return;
    }
    
    // Clear any previous content
    wheelDiv.innerHTML = ""; 
    wheelDiv.className = "wheelNav";
    
    // Define instrument data structure matching the D3 sunburst data format
    const instrumentData = {
        name: "Instruments",
        children: [
          {
            name: "String",
            children: [
              { name: "Violin", value: 1 },
              { name: "Viola", value: 1 },
              { name: "Cello", value: 1 },
              { name: "Bass", value: 1 },
              { name: "Double Bass", value: 1 },
              { name: "Guitar", value: 1 },
              { name: "Acoustic Guitar", value: 1 },
              { name: "Electric Guitar", value: 1 },
              { name: "Banjo", value: 1 },
              { name: "Dulcimer", value: 1 },
              { name: "Koto", value: 1 }
            ]
          },
          {
            name: "Woodwind",
            children: [
              { name: "Flute", value: 1 },
              { name: "Clarinet", value: 1 },
              { name: "Saxophone", value: 1 },
              { name: "Oboe", value: 1 },
              { name: "Bassoon", value: 1 }
            ]
          },
          {
            name: "Brass",
            children: [
              { name: "Trumpet", value: 1 },
              { name: "Trombone", value: 1 },
              { name: "Tuba", value: 1 }
            ]
          },
          {
            name: "Keyboard",
            children: [
              { name: "Piano", value: 1 },
              { name: "Celeste", value: 1 }
            ]
          },
          {
            name: "Percussion",
            children: [
              { name: "Xylophone", value: 1 },
              { name: "Vibraphone", value: 1 },
              { name: "Triangle", value: 1 },
              { name: "Snare", value: 1 }
            ]
          },
          {
            name: "Electronic",
            children: [
              { name: "Electronic Synth", value: 1 }
            ]
          }
        ]
    };
    
    // Get the selected instrument or use default
    const selectedInstrument = (block.value === null || block.value === undefined) ? "piano" : block.value;
    
    // Make sure the wheelDiv is visible with appropriate styling
    wheelDiv.style.display = "";
    wheelDiv.style.position = "absolute";
    wheelDiv.style.zIndex = "1050";
    wheelDiv.style.backgroundColor = "white";
    wheelDiv.style.borderRadius = "50%";
    wheelDiv.style.overflow = "hidden";
    wheelDiv.style.boxShadow = "0 0 0 1000px rgba(0,0,0,0.5)";
    wheelDiv.style.width = "500px";
    wheelDiv.style.height = "500px";
    
    // Remove any background image that might interfere
    wheelDiv.style.backgroundImage = "none";
    
    // Set a timestamp to prevent immediate drag after selecting
    block._piemenuExitTime = new Date().getTime();
    
    // Position the wheel
    positionWheel();
    
    // Create the D3 sunburst visualization
    createSunburst();
    
    /**
     * Creates the D3 sunburst visualization
     */
    function createSunburst() {
        try {
            console.log("Creating D3 sunburst visualization");
            
            // Add a close button
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "×";
        closeBtn.style.position = "absolute";
            closeBtn.style.right = "15px";
            closeBtn.style.top = "15px";
        closeBtn.style.background = "white";
            closeBtn.style.border = "1px solid #e0e0e0";
            closeBtn.style.borderRadius = "4px";
            closeBtn.style.width = "26px";
            closeBtn.style.height = "26px";
            closeBtn.style.fontSize = "18px";
            closeBtn.style.lineHeight = "18px";
        closeBtn.style.cursor = "pointer";
        closeBtn.style.zIndex = "1100";
            closeBtn.style.color = "#444";
            closeBtn.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
            closeBtn.style.fontFamily = "var(--mono_fonts, 'Menlo', 'Consolas', monospace)";
        closeBtn.addEventListener("click", exitMenu);
        wheelDiv.appendChild(closeBtn);
        
            // Define dimensions for the sunburst
            const width = 500;
            const height = 500;
            const radius = width / 6;

            // More modern, vibrant color palette inspired by Observable HQ
            const color = d3.scaleOrdinal()
                .domain(instrumentData.children.map(d => d.name))
                .range([
                    "#4e79a7", // String - blue
                    "#f28e2c", // Woodwind - orange
                    "#e15759", // Brass - red
                    "#76b7b2", // Keyboard - teal
                    "#59a14f", // Percussion - green
                    "#af7aa1"  // Electronic - purple
                ]);

            // Create hierarchy from the data
            const hierarchy = d3.hierarchy(instrumentData)
                .sum(d => d.value)
                .sort((a, b) => b.value - a.value);

            // Create the partition layout
            const root = d3.partition()
                .size([2 * Math.PI, hierarchy.height + 1])
                (hierarchy);

            root.each(d => d.current = d);

            // Define the arc generator with smoother corners
            const arc = d3.arc()
                .startAngle(d => d.x0)
                .endAngle(d => d.x1)
                .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.01)) // Increased padding
                .padRadius(radius * 2)
                .innerRadius(d => d.y0 * radius)
                .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1))
                .cornerRadius(2); // Add corner radius for rounded edges

            // Create the SVG element with modern styling
            const svg = d3.create("svg")
                .attr("viewBox", [-width / 2, -height / 2, width, width])
                .style("font", "11px var(--mono_fonts, 'Menlo', 'Consolas', sans-serif)")
                .style("width", "100%")
                .style("height", "100%")
                .attr("class", "observablehq");

            // Add a faint background circle for better aesthetics
            svg.append("circle")
                .attr("r", radius * 3)
                .attr("fill", "#f8f9fa")
                .attr("opacity", 0.2);

            // Create the arc paths with improved styling
            const path = svg.append("g")
                .selectAll("path")
                .data(root.descendants().slice(1))
                .join("path")
                .attr("fill", d => { 
                    while (d.depth > 1) d = d.parent; 
                    return color(d.data.name); 
                })
                .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.9 : 0.8) : 0)
                .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
                .attr("d", d => arc(d.current))
                .style("cursor", "pointer")
                .style("stroke", "#fff")
                .style("stroke-width", "0.5px")
                .style("stroke-opacity", 0.8)
                .style("filter", "drop-shadow(0 0 2px rgba(0,0,0,0.05))")
                .on("click", clicked);

            // Add title tooltips to the arcs
            path.append("title").text(d => d.data.name);

            // Add text labels with better styling
            const label = svg.append("g")
                .attr("pointer-events", "none")
                .attr("text-anchor", "middle")
                .style("user-select", "none")
                .selectAll("text")
                .data(root.descendants().slice(1))
                .join("text")
                .attr("dy", "0.35em")
                .attr("fill-opacity", d => +labelVisible(d.current))
                .attr("transform", d => labelTransform(d.current))
                .attr("class", d => d.depth === 1 ? "observablehq--keyword" : "observablehq--string")
                .text(d => d.data.name);

            // Add the center circle for zooming out
            const parent = svg.append("circle")
                .datum(root)
                .attr("r", radius)
                .attr("fill", "white")
                .attr("stroke", "#f0f0f0")
                .attr("stroke-width", "1px")
                .attr("pointer-events", "all")
                .style("filter", "drop-shadow(0 0 3px rgba(0,0,0,0.1))")
                .on("click", clicked);
            
            // Add center label (X symbol for root view)
            const centerLabel = svg.append("text")
                .attr("text-anchor", "middle")
                .attr("dy", "0.35em")
                .attr("class", "observablehq--red")
                .style("font-size", "18px")
                .style("font-weight", "bold")
                .style("cursor", "pointer")
                .text("✕");
                
            // Add back arrow icon (initially hidden)
            const backArrow = svg.append("text")
                .attr("text-anchor", "middle")
                .attr("dy", "0.35em")
                .attr("class", "observablehq--keyword")
                .style("font-size", "22px")
                .style("font-weight", "bold")
                .style("opacity", "0")
                .style("pointer-events", "none")
                .style("fill", "#4e79a7") // Match Observable blue theme
                .text("←");
                
            // Initially the back arrow is hidden and X is visible (we're at root level)
            backArrow.style("opacity", 0);
            centerLabel.style("opacity", 1);
                
            // Append the svg to the wheelDiv
            wheelDiv.appendChild(svg.node());
            console.log("D3 sunburst appended to DOM");

            // Function to handle click events
            function clicked(event, p) {
                // Handle leaf nodes (instruments)
                if (!p.children) {
                    selectInstrument(p.data.name);
                    return;
                }
                
                // Set parent datum
                parent.datum(p.parent || root);
                
                // Check if we're going to root or into a category
                const goingToRoot = p === root || !p.parent;
                
                // Toggle center elements based on zoom state
                if (goingToRoot) {
                    // Going to root view - hide back arrow, show X
                    backArrow.transition().duration(300).style("opacity", 0);
                    centerLabel.transition().duration(300)
                        .style("opacity", 1)
                        .text("✕");
                } else {
                    // Going into a category - show back arrow, hide X
                    backArrow.transition().duration(300).style("opacity", 1);
                    centerLabel.transition().duration(300).style("opacity", 0);
                }
                
                root.each(d => d.target = {
                    x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                    x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                    y0: Math.max(0, d.y0 - p.depth),
                    y1: Math.max(0, d.y1 - p.depth)
                });
                
                // Optimized transition with perfect timing
                const duration = 600; // Shorter duration for smoother feel
                const t = svg.transition()
                    .duration(duration)
                    .ease(d3.easeCubicInOut);
                
                // Pre-compute the final colors for a smoother transition
                const colorCache = new Map();
                root.descendants().slice(1).forEach(d => {
                    let parentNode = d;
                    while (parentNode.depth > 1) parentNode = parentNode.parent;
                    colorCache.set(d, color(parentNode.data.name));
                });
                
                // Ensure color transitions happen at the same time as layout
                path.transition(t)
                    .tween("data", d => {
                        const i = d3.interpolate(d.current, d.target);
                        return t => d.current = i(t);
                    })
                    .styleTween("fill", function(d) {
                        const startColor = this.getAttribute("fill") || "#ffffff";
                        const endColor = colorCache.get(d);
                        return d3.interpolateRgb(startColor, endColor);
                    })
                    .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.9 : 0.8) : 0)
                    .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none")
                    .attrTween("d", d => () => arc(d.current));
                    
                label.transition(t)
                    .attr("fill-opacity", d => +labelVisible(d.target))
                    .attrTween("transform", d => () => labelTransform(d.current));
            }

            // Helper function to determine if an arc is visible
            function arcVisible(d) {
                return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
            }

            // Helper function to determine if a label is visible
            function labelVisible(d) {
                return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
            }

            // Helper function to transform labels
            function labelTransform(d) {
                const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
                const y = (d.y0 + d.y1) / 2 * radius;
                return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
            }
        } catch (error) {
            console.error("Error creating D3 sunburst:", error);
            alert("Error creating instrument selector: " + error.message);
        }
    }
    
    /**
     * Positions the wheel over the block
     */
    function positionWheel() {
        const x = block.container.x;
        const y = block.container.y;
        
        const canvasLeft = activity.canvas.offsetLeft + 28 * block.blocks.blockScale;
        const canvasTop = activity.canvas.offsetTop + 6 * block.blocks.blockScale;
        
        // Get the width for positioning
        const width = 500;
        
        wheelDiv.style.left =
            Math.min(
                block.blocks.turtles._canvas.width - width,
                Math.max(
                    0,
                    Math.round(
                        (x + activity.blocksContainer.x) * activity.getStageScale() + canvasLeft
                    ) - (width / 2)
                )
            ) + "px";
        wheelDiv.style.top =
            Math.min(
                block.blocks.turtles._canvas.height - width,
                Math.max(
                    0,
                    Math.round(
                        (y + activity.blocksContainer.y) * activity.getStageScale() + canvasTop
                    ) - (width / 2)
                )
            ) + "px";
    }
    
    /**
     * Handles instrument selection
     * @param {string} instrumentName - The name of the selected instrument
     */
    function selectInstrument(instrumentName) {
        console.log("Selecting instrument:", instrumentName);
        // Format instrument name to match internal names
        const formattedName = instrumentName.toLowerCase().replace(/-/g, ' ');
        
        // Set the block value
        block.value = formattedName;
        block.text.text = formattedName;
        
        // Make sure text is on top
        block.container.setChildIndex(block.text, block.container.children.length - 1);
        block.updateCache();
        
        // Preview the instrument
        instrumentPreview(formattedName);
        
        // Close the selector
        exitMenu();
    }
    
    /**
     * Plays a preview of the selected instrument
     * @param {string} instrumentName - The name of the instrument to preview
     */
    function instrumentPreview(instrumentName) {
        console.log("Previewing instrument:", instrumentName);
        const tur = activity.turtles.ithTurtle(0);
        if (
            tur.singer.instrumentNames.length === 0 ||
            !tur.singer.instrumentNames.includes(instrumentName)
        ) {
            tur.singer.instrumentNames.push(instrumentName);
            activity.logo.synth.createDefaultSynth(0);
            activity.logo.synth.loadSynth(0, instrumentName);
        }
        
        activity.logo.synth.setMasterVolume(PREVIEWVOLUME);
        Singer.setSynthVolume(activity.logo, 0, instrumentName, PREVIEWVOLUME);
        
        if (!block._triggerLock) {
            block._triggerLock = true;
            activity.logo.synth.trigger(0, ['C4'], 1/4, instrumentName, null, null);
            
            setTimeout(() => {
                block._triggerLock = false;
            }, 500);
        }
    }
    
    /**
     * Closes the menu
     */
    function exitMenu() {
        console.log("Exiting menu");
        block._piemenuExitTime = new Date().getTime();
        wheelDiv.style.display = "none";
        wheelDiv.innerHTML = "";
        
        // Remove event listener for outside clicks
        document.removeEventListener("mousedown", handleOutsideClick);
    }
    
    /**
     * Handles clicks outside the menu to close it
     * @param {Event} event - The click event
     */
    function handleOutsideClick(event) {
        if (!wheelDiv.contains(event.target) && wheelDiv.style.display !== "none") {
            console.log("Outside click detected, closing menu");
            exitMenu();
        }
    }
    
    // Add event listener to close menu when clicking outside
    document.addEventListener("mousedown", handleOutsideClick);
}

// Export the function
if (typeof window !== 'undefined') {
    window.instrumentSelectorD3 = instrumentSelectorD3;
    
    // Load D3 directly if it's not already loaded
    window.addEventListener('load', function() {
        if (typeof d3 === 'undefined') {
            console.log("Loading D3.js from CDN on window load...");
            const script = document.createElement('script');
            script.src = 'https://d3js.org/d3.v7.min.js';
            document.head.appendChild(script);
        }
    });
    
    // Helper function to check if the instrument selector is visible
    window.checkInstrumentSelectorVisibility = function() {
        console.log("Checking instrument selector visibility...");
        
        // Check for the wheel div
        const wheelDiv = docById("wheelDiv");
        if (!wheelDiv) {
            console.error("wheelDiv element not found!");
            return false;
        }
        
        console.log("wheelDiv display status:", wheelDiv.style.display);
        
        if (wheelDiv.style.display === "none") {
            console.log("wheelDiv is hidden");
            return false;
        }
        
        if (wheelDiv.childNodes.length === 0) {
            console.log("wheelDiv has no children - selector is not rendered");
            return false;
        }
        
        return true;
    };
} 