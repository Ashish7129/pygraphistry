'use strict';

import $ from 'jquery'


/**
 * Caption-related functionality. Currently we just summarize node and edge count.
 * This might describe how the graph was built, and change dynamically during analysis (per vbo_update).
 */
module.exports = {
    /**
     * Takes the vbo_update data argument and updates the DOM directly to summarize.
     * TODO: make this an Rx-dependent model/view component.
     */
    renderCaptionFromData: function renderGraphCaption(data)
    {

        const numNodes = data.elements.pointculled || data.elements.uberpointculled || 0,
              numEdges = (data.elements.edgeculled || data.elements.edgeculledindexed ||
                data.elements.edgeculledindexedclient || data.bufferByteLengths.logicalEdges / 4 || 0) / 2;
        $('#graph-node-count').text(numNodes);
        $('#graph-edge-count').text(numEdges);
    }
};
