/**
 * @file pitchSelectorD3.js
 * @overview Defines a D3.js-based Zoomable Sunburst pitch selector for Music Blocks
 * @author Music Blocks contributors
 * @copyright 2024
 * @license AGPL-3.0
 */

/* global docById, _, platformColor, Singer, NOTENAMES, SOLFEGENAMES, SHARP, FLAT, DOUBLEFLAT, DOUBLESHARP, NATURAL, PREVIEWVOLUME */

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
 * Creates a D3.js-based Zoomable Sunburst visualization for pitch selection
 * @param {Object} activity - The activity object
 * @param {Object} block - The block object
 * @returns {void}
 */
function pitchSelectorD3(activity, block) {
    console.log("pitchSelectorD3 called with block type:", block.name, "and value:", block.value);
    
    // Ensure D3 is available
    if (typeof d3 === 'undefined') {
        console.log("D3 not loaded yet, loading it now and retrying in 500ms");
        const script = document.createElement('script');
        script.src = 'https://d3js.org/d3.v7.min.js';
        document.head.appendChild(script);
        
        script.onload = function() {
            console.log("D3 loaded successfully, retrying pitchSelectorD3");
            setTimeout(function() {
                pitchSelectorD3(activity, block);
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
    
    // Define pitch data structure as a three-layer hierarchy
    const createPitchJSON = () => {
        const firstLayer = ["do", "re", "mi", "fa", "sol", "la", "ti"];
        const secondLayer = ["♮", "♯", "♭", "𝄪", "𝄫"];
        const thirdLayer = ["1", "2", "3", "4", "5", "6", "7", "8"];
        
        // Create nested structure with all three layers
        return {
            name: "pitch",
            children: firstLayer.map(note => ({
                name: note,
                children: secondLayer.map(accidental => ({
                    name: accidental,
                    children: thirdLayer.map(octave => ({
                        name: octave,
                        value: 1000
                    }))
                }))
            }))
        };
    };
    
    // Generate the pitch data
    const pitchData = createPitchJSON();
    
    console.log("Using three-layer pitch data structure");
    
    // Get the current pitch or use default
    let currentNote = "C";
    let currentAccidental = "♮";
    let currentOctave = "4";
    
    if (block.value !== null && block.value !== undefined) {
        const pitchMatch = block.value.match(/([A-G])([♮♯♭𝄪𝄫]?)(\d+)/);
        if (pitchMatch) {
            currentNote = pitchMatch[1];
            currentAccidental = pitchMatch[2] || "♮";
            currentOctave = pitchMatch[3];
        }
    }
    
    console.log("Current pitch components:", {currentNote, currentAccidental, currentOctave});
    
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
            console.log("Creating D3 sunburst visualization for pitch selector");
            
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
            
            // Verify data structure
            console.log("Pitch data:", pitchData);
            if (!pitchData || !pitchData.children || !Array.isArray(pitchData.children)) {
                throw new Error("Invalid pitch data structure");
            }
            
            // Create hierarchy from the data
            const hierarchy = d3.hierarchy(pitchData);
            if (!hierarchy) {
                throw new Error("Failed to create hierarchy from pitch data");
            }
            
            hierarchy.sum(d => d.value || 0)
                .sort((a, b) => (b.value || 0) - (a.value || 0));

            // Create the partition layout
            const root = d3.partition()
                .size([2 * Math.PI, hierarchy.height + 1])
                (hierarchy);

            if (!root || !root.descendants || root.descendants().length < 1) {
                throw new Error("Failed to create partition layout");
            }

            root.each(d => d.current = d);
            
            // Log the hierarchy structure
            console.log("Hierarchy depth:", hierarchy.height);
            console.log("Root descendants count:", root.descendants().length);

            // Color scale - rainbow gradient for notes
            const color = d3.scaleOrdinal()
                .domain(["do", "re", "mi", "fa", "sol", "la", "ti"])
                .range(d3.quantize(d3.interpolateRainbow, 7));

            // Define the arc generator with smoother corners
            const arc = d3.arc()
                .startAngle(d => d.x0)
                .endAngle(d => d.x1)
                .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
                .padRadius(radius * 1.5)
                .innerRadius(d => d.y0 * radius)
                .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));

            // Create the SVG element with modern styling
            const svg = d3.create("svg")
                .attr("viewBox", [-width / 2, -height / 2, width, width])
                .style("font", "14px var(--mono_fonts, 'Menlo', 'Consolas', sans-serif)")
                .style("width", "100%")
                .style("height", "100%");
                
            console.log("SVG element created");

            // Create the arc paths with improved styling
            const path = svg.append("g")
                .selectAll("path")
                .data(root.descendants().slice(1))
                .join("path")
                .attr("fill", d => { 
                    // For first level (notes), use the color scale
                    if (d.depth === 1) return color(d.data.name);
                    // For second level (accidentals), use lighter version of parent color
                    if (d.depth === 2) return d3.color(color(d.parent.data.name)).brighter(0.5);
                    // For third level (octaves), use even lighter version
                    return d3.color(color(d.parent.parent.data.name)).brighter(0.8);
                })
                .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
                .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
                .attr("d", d => arc(d.current))
                .style("cursor", "pointer")
                .style("stroke", "#fff")
                .style("stroke-width", "0.5px");
                
            console.log("Path elements created, count:", root.descendants().slice(1).length);

            // Add interactivity only to nodes with children
            path.filter(d => d.children)
                .style("cursor", "pointer")
                .on("click", clicked);
                
            // Add special handling for leaf nodes (final octave selection)
            path.filter(d => !d.children)
                .style("cursor", "pointer")
                .on("click", (event, p) => {
                    try {
                        // Extract the full path from ancestors
                        const noteName = p.parent.parent.data.name;
                        const accidental = p.parent.data.name;
                        const octave = p.data.name;
                        
                        console.log("Selected path:", noteName, accidental, octave);
                        
                        // Form the complete pitch
                        const newPitch = `${noteName}${accidental}${octave}`;
                        console.log("Selected full pitch:", newPitch);
                        
                        // Update the block
                        block.value = newPitch;
                        block.text.text = newPitch;
                        
                        // Make sure text is on top
                        block.container.setChildIndex(block.text, block.container.children.length - 1);
                        block.updateCache();
                        
                        // Preview the pitch
                        previewPitch(newPitch);
                        
                        // Close the menu after selection
                        setTimeout(exitMenu, 300);
                    } catch (e) {
                        console.error("Error processing leaf node click:", e);
                        alert("Error selecting pitch: " + e.message);
                    }
                });

            // Add title tooltips to the arcs
            path.append("title")
                .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}`);

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
                .text(d => d.data.name);
                
            console.log("Labels created");

            // Add the center circle for zooming out
            const parent = svg.append("circle")
                .datum(root)
                .attr("r", radius)
                .attr("fill", "white")
                .attr("stroke", "#f0f0f0")
                .attr("stroke-width", "1px")
                .attr("pointer-events", "all")
                .style("cursor", "pointer")
                .on("click", clicked);
            
            // Add center label
            const centerLabel = svg.append("text")
                .attr("text-anchor", "middle")
                .attr("dy", "0.35em")
                .style("font-size", "16px")
                .style("font-weight", "bold")
                .style("pointer-events", "none")
                .text("pitch");
                
            // Append the svg to the wheelDiv
            wheelDiv.appendChild(svg.node());
            console.log("D3 sunburst appended to DOM");

            // Function to handle click events for navigation
            function clicked(event, p) {
                console.log("Click on segment:", p.data.name, "depth:", p.depth);
                
                parent.datum(p.parent || root);

                root.each(d => d.target = {
                    x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                    x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                    y0: Math.max(0, d.y0 - p.depth),
                    y1: Math.max(0, d.y1 - p.depth)
                });
                
                // Update the center label based on current selection
                centerLabel.text(p === root ? "pitch" : p.data.name);
                
                const t = svg.transition().duration(750);

                path.transition(t)
                    .tween("data", d => {
                        const i = d3.interpolate(d.current, d.target);
                        return t => d.current = i(t);
                    })
                    .filter(function(d) {
                        return +this.getAttribute("fill-opacity") || arcVisible(d.target);
                    })
                    .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
                    .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none")
                    .attrTween("d", d => () => arc(d.current));

                label.filter(function(d) {
                    return +this.getAttribute("fill-opacity") || labelVisible(d.target);
                }).transition(t)
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
            alert("Error creating pitch selector: " + error.message);
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
     * Handles selecting a pitch component (note, accidental, or octave)
     * @param {string} value - The selected value
     * @param {string} type - The type of component (Notes, Accidentals, Octaves)
     */
    function selectPitchComponent(value, type) {
        console.log(`Selecting value: ${value} from parent: ${type}`);
        
        // Check if the value is a number (octave)
        if (!isNaN(parseInt(value))) {
            currentOctave = value;
        } 
        // Check if it's an accidental
        else if (["♮", "♯", "♭", "𝄪", "𝄫"].includes(value)) {
            currentAccidental = value;
        }
        // Otherwise it's a note
        else {
            currentNote = value;
        }
        
        // Form the complete pitch
        const newPitch = `${currentNote}${currentAccidental}${currentOctave}`;
        console.log("New pitch:", newPitch);
        
        // Update the block
        block.value = newPitch;
        block.text.text = newPitch;
        
        // Make sure text is on top
        block.container.setChildIndex(block.text, block.container.children.length - 1);
        block.updateCache();
        
        // Preview the pitch
        previewPitch(newPitch);
        
        // Update the center display but don't close the menu
        try {
            if (currentSelection) {
                currentSelection.text(newPitch);
            }
        } catch (e) {
            console.error("Error updating center text:", e);
        }
        
        // Go back to root view without closing
        const svgElement = wheelDiv.querySelector("svg");
        if (svgElement) {
            const d3Svg = d3.select(svgElement);
            const centerCircle = d3Svg.select("circle[r='" + (width / 6) + "']");
            if (!centerCircle.empty()) {
                centerCircle.dispatch("click");
            }
        }
    }
    
    /**
     * Plays a preview of the selected pitch
     * @param {string} pitchValue - The pitch to preview
     */
    function previewPitch(pitchValue) {
        console.log("Previewing pitch:", pitchValue);
        const tur = activity.turtles.ithTurtle(0);
        
        activity.logo.synth.setMasterVolume(50);
        
        if (!block._triggerLock) {
            block._triggerLock = true;
            activity.logo.synth.trigger(0, [pitchValue], 1/4, "piano", null, null);
            
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
    window.pitchSelectorD3 = pitchSelectorD3;
    
    // Load D3 directly if it's not already loaded
    window.addEventListener('load', function() {
        if (typeof d3 === 'undefined') {
            console.log("Loading D3.js from CDN on window load...");
            const script = document.createElement('script');
            script.src = 'https://d3js.org/d3.v7.min.js';
            document.head.appendChild(script);
        }
    });
} 