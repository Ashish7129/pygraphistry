"use strict";

var Q = require('q');
var glMatrix = require('gl-matrix');
var events = require('./SimpleEvents.js');
var _ = require('underscore');
var debug = require("debug")("graphistry:graph-viz:graph:nbody");
var util = require('./util.js');

var elementsPerPoint = 2;


/**
 * Create a new N-body graph and return a promise for the graph object
 *
 * @param simulator - the module of the simulator backend to use
 * @param renderer - the module of the rendering backend to use
 * @param document - parent document DOM
 * @param canvas - the canvas DOM element to draw the graph in
 * @param bgColor - [0--255,0--255,0--255,0--1]
 * @param [dimensions=\[1,1\]] - a two element array [width,height] used for internal posituin calculations.
 */
function create(renderer, dimensions, numSplits, simulationTime) {

    var graph = {
        renderer: renderer,
        simulator: undefined,
        stepNumber: 0,
        dimensions: dimensions,
        numSplits: numSplits,
        simulationTime: simulationTime
    };

    _.each({
        initSimulation: initSimulation,
        setPoints: setPoints,
        setVertices: setVertices,
        setSizes: setSizes,
        setColors: setColors,
        setPointTags: setPointTags,
        setEdgeTags: setEdgeTags,
        setLabels: setLabels,
        setEdges: setEdges,
        setEdgesAndColors: setEdgesAndColors,
        setEdgeColors: setEdgeColors,
        setMidEdgeColors: setMidEdgeColors,
        setLocked: setLocked,
        setColorMap: setColorMap,
        tick: tick,
        updateSettings: updateSettings
    }, function (setter, setterName) {
        graph[setterName] = setter.bind('', graph);
    });

    return graph;
}

function initSimulation(graph, simulator, layoutAlgorithms, locked) {
    debug('Creating Simulator')
    return simulator.create(graph.renderer, graph.dimensions, 
                            graph.numSplits, locked, layoutAlgorithms)
        .then(function(sim) {
            debug("Created simulator");
            graph.simulator = sim;
            return graph;
        }).fail(function (err) {
            console.error("ERROR Cannot create simulator. ", (err||{}).stack)
        });
}

function updateSettings (graph, cfg) {
    debug("Updating settings");

    graph.simulator.setPhysics(cfg);
    graph.simulator.setLocked(cfg);
    graph.renderer.setVisible(cfg);

    if (cfg.timeSubset) {
        graph.simulator.setTimeSubset(cfg.timeSubset);
    }
}



//str * TypedArrayConstructor * {'numPoints', 'numEdges'} * {'set...'} * 'a
//  -> simulator -> Q simulator
//Create default setter
function makeDefaultSetter (name, arrConstructor, dimName, passthrough, v) {
    return function (simulator) {
        debug("Using default %s", name);
        var elts = simulator[dimName];
        var arr = new arrConstructor(elts);
        if (v) {
            for (var i = 0; i < elts; i++)
                arr[i] = v;
        }
        return simulator[passthrough](arr);
    };
}

var setDefaultSizes     = makeDefaultSetter(
    'node sizes', Uint8Array,  'numPoints', 'setSizes', 4);

var setDefaultColors    = makeDefaultSetter(
    'node color', Uint32Array, 'numPoints', 'setColors', util.rgb(102, 102, 255));

var setDefaultPointTags = makeDefaultSetter(
    'node tag',   Uint8Array,  'numPoints', 'setPointTags', 0);

var setDefaultEdgeTags = makeDefaultSetter(
    'edge tag',   Uint8Array,  'numEdges', 'setEdgeTags', 0);



function makeSetter (name, defSetter, arrConstructor, dimName, passthrough) {

    return function (graph, rawArr) {

        debug('Loading %s', name);

        if (!rawArr) {
            return defSetter(graph.simulator);
        }

        var arr;
        if (rawArr.constructor == arrConstructor) {
            arr = rawArr;
        } else {
            var len = graph.simulator[dimName];
            arr = new arrConstructor(len);
            for (var i = 0; i < len; i++) {
                arr[i] = rawArr[i];
            }
        }

        graph.simulator[passthrough](arr);

    };
}

var setColors       = makeSetter(
    'pointColors',  setDefaultColors,       Uint32Array,    'numPoints',    'setColors');

var setPointTags    = makeSetter(
    'pointTags',    setDefaultPointTags,    Uint8Array,     'numPoints',    'setPointTags');


var setEdgeTags     = makeSetter(
    'edgeTags',     setDefaultEdgeTags,     Uint8Array,     'numEdges',     'setEdgeTags');





// TODO Deprecate and remove. Left for Uber compatibitily
function setPoints(graph, points, pointSizes, pointColors) {
    // FIXME: If there is already data loaded, we should to free it before loading new data
    return setVertices(graph, points)
    .then(function (simulator) {
        return setSizes(graph, pointSizes);        
    }).then(function (simulator) {
        return setColors(graph, pointColors);
    })
    .then(function() {
        return graph;
    }).fail(function (err) {
        console.error("ERROR Failure in NBody.setPoints ", (err||{}).stack);
    });
}

function setVertices(graph, points) {
    debug("Loading Vertices")

    // This flattens out the points array
    if(!(points instanceof Float32Array)) {
        points = _toTypedArray(points, Float32Array);
    }

    graph.__pointsHostBuffer = points;

    graph.stepNumber = 0;
    return graph.simulator.setPoints(points)
}

function setSizes(graph, pointSizes) {
    if (!pointSizes)
        return setDefaultSizes(graph.simulator);

    debug("Loading pointSizes")
    var _pointSizes = new Uint8Array(graph.simulator.numPoints);
    var min = 0, max = Math.pow(2, 8) - 1;
    if (!_.all(pointSizes, function (s) {return s >= min && s <= max}))
        console.warn("WARNING Point size out of range, capping to 8 bits")
    for (var i = 0; i < graph.simulator.numPoints; i++)
        _pointSizes[i] = Math.min(max, Math.max(min, pointSizes[i]));
    return graph.simulator.setSizes(_pointSizes)
}



// TODO Deprecate and remove. Left for Uber compatibility
function setEdgesAndColors(graph, edges, edgeColors) {
    return setEdges(graph, edges)
    .then(function () {
        setMidEdgeColors(graph, edgeColors)
    });
}

var setEdges = Q.promised(function(graph, edges) {
    debug("Loading Edges")
    if (edges.length < 1)
        return Q.fcall(function() { return graph; });

    if (!(edges instanceof Uint32Array)) {
        edges = _toTypedArray(edges, Uint32Array);
    }

    debug("Number of edges: %d", edges.length / 2)

    var edgesFlipped = new Uint32Array(edges.length);
    for (var i = 0; i < edges.length; i++)
        edgesFlipped[i] = edges[edges.length - 1 - i];


    //FIXME THIS SHOULD WORK BUT CRASHES SAFARI
    var encapsulate = function (edges) {

        //[[src idx, dest idx]]
        var edgeList = new Array(edges.length / 2);
        for (var i = 0; i < edges.length/2; i++)
            edgeList[i] = [edges[2 * i], edges[2 * i + 1]];

        //sort by src idx
        edgeList.sort(function(a, b) {
            return a[0] < b[0] ? -1
                : a[0] > b[0] ? 1
                : a[1] - b[1];
        });

        //[ [first edge number from src idx, numEdges from source idx, source idx], ... ]
        var workItems = [ [0, 1, edgeList[0][0]] ];
        var sourceHasEdge = {};
        edgeList.forEach(function (edge, i) {
            sourceHasEdge[edge[0]] = true;
        });
        edgeList.forEach(function (edge, i) {
            if (i == 0) return;
            var prev = workItems[workItems.length - 1];
            if(edge[0] == prev[2]) {
                prev[1]++;
            } else {
                workItems.push([i, 1, edge[0]])
            }
        });


        //DISABLED: keeping ordered to streamline time-based filtering
        /*
        //Cheesey load balancing: sort by size
        //TODO benchmark
        workItems.sort(function (edgeList1, edgeList2) {
            return edgeList1[1] - edgeList2[1];
        });
        */

        var degreesFlattened = new Uint32Array(graph.__pointsHostBuffer.length);
        //to closeset workItem in case src has none
        var srcToWorkItem = new Int32Array(graph.__pointsHostBuffer.length);
        for (var i = 0; i < srcToWorkItem.length; i++) {
            srcToWorkItem[i] = -1;
        }
        workItems.forEach(function (edgeList, idx) {
            srcToWorkItem[edgeList[2]] = idx;
            degreesFlattened[edgeList[2]] = edgeList[1];
        });
        for (var i = 0; i < srcToWorkItem.length; i++) {
            if (srcToWorkItem[i] == -1) {
                srcToWorkItem[i] = i == 0 ? 0 : srcToWorkItem[i - 1];
            }
        }

        //Uint32Array [first edge number from src idx, number of edges from src idx]
        //fetch edge to find src and dst idx (all src same)
        //num edges > 0
        var workItemsFlattened =
            new Uint32Array(
                _.flatten(workItems.map(function (o) { return [o[0], o[1]]})));

        var edgesFlattened = new Uint32Array(_.flatten(edgeList));

        return {
            degreesTyped: degreesFlattened,
            edgesTyped: edgesFlattened,
            numWorkItems: workItemsFlattened.length,
            workItemsTyped: new Uint32Array(workItemsFlattened),
            srcToWorkItem: srcToWorkItem
        };
    }

    var forwardEdges = encapsulate(edges);
    var backwardsEdges = encapsulate(edgesFlipped);

    var nDim = graph.dimensions.length;
    var midPoints = new Float32Array((edges.length / 2) * graph.numSplits * nDim || 1);
    if (graph.numSplits) {
        for (var i = 0; i < edges.length; i+=2) {
            var src = edges[i];
            var dst = edges[i + 1];
            for (var d = 0; d < nDim; d++) {
                var start = graph.__pointsHostBuffer[src * nDim + d];
                var end = graph.__pointsHostBuffer[dst * nDim + d];
                var step = (end - start) / (graph.numSplits + 1);
                for (var q = 0; q < graph.numSplits; q++) {
                    midPoints[(i * graph.numSplits + q) * nDim + d] = start + step * (q + 1);
                }
            }
        }
    }
    debug("Number of control points, splits: %d, %d", edges.length * graph.numSplits, graph.numSplits);

    return graph.simulator.setEdges(forwardEdges, backwardsEdges, midPoints)
    .then(function() { 
        return graph; 
    }).fail(function (err) {
        console.error("ERROR Failure in NBody.setEdges ", (err||{}).stack);
    });
});

function setEdgeColors(graph, edgeColors) {
    debug("Loading edgeColors");
    var nedges = graph.simulator.numEdges;

    if (edgeColors.length != nedges)
       console.error("ERROR: setEdgeColors expects one color per edge.");
    
    // Internaly we have two colors, one per endpoint.
    var ec = new Uint32Array(nedges * 2);
    for (var i = 0; i < nedges; i++) {
        ec[2*i] = edgeColors[i];
        ec[2*i + 1] = edgeColors[i];
    }

    return graph.simulator.setEdgeColors(ec);
}

function setMidEdgeColors(graph, midEdgeColors) {
    debug("Loading midEdgeColors");

    var numMidEdges = graph.simulator.numMidEdges;

    if (midEdgeColors.length != numMidEdges)
       console.error("ERROR: setMidEdgeColors expects one color per midEdge.");
    
    // Internaly we have two colors, one per endpoint.
    var ec = new Uint32Array(numMidEdges * 2);
    for (var i = 0; i < numMidEdges; i++) {
        ec[2*i] = midEdgeColors[i];
        ec[2*i + 1] = midEdgeColors[i];
    }

    return graph.simulator.setMidEdgeColors(ec);
}

function setLabels(graph, pointLabels) {
    debug('setLabels', pointLabels ? pointLabels.length : 'none');
    return graph.simulator.setLabels(pointLabels);
}

function setLocked(graph, opts) {
    //TODO reset step number?
    graph.simulator.setLocked(opts);
}


function setColorMap(graph, imageURL, maybeClusters) {
    return graph.renderer.setColorMap(imageURL, maybeClusters)
        .then(_.constant(graph));
}


// Turns an array of vec3's into a Float32Array with elementsPerPoint values for each element in
// the input array.
function _toTypedArray(array, cons) {
    var floats = new cons(array.length * elementsPerPoint);

    for(var i = 0; i < array.length; i++) {
        var ii = i * elementsPerPoint;
        floats[ii + 0] = array[i][0];
        floats[ii + 1] = array[i][1];
    }

    return floats;
}


//graph * {play: bool, layout: bool} -> ()
function tick(graph, cfg) {
    events.fire("tickBegin");
    events.fire("simulateBegin");

    return graph.simulator.tick(graph.stepNumber++, cfg)
    .then(function() {
        events.fire("simulateEnd");
        events.fire("renderBegin");

        return graph.renderer.render();
    })
    .then(function() {
        events.fire("renderEnd");
        events.fire("tickEnd");

        return graph;
    });
}


module.exports = {
    "elementsPerPoint": elementsPerPoint,
    "create": create,
    "setPoints": setPoints,
    "setEdges": setEdges,
    "setColorMap": setColorMap,
    "tick": tick
};
