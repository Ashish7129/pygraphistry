import {
    ref as $ref,
    atom as $atom,
    pathValue as $value
} from 'reaxtor-falcor-json-graph';

export function histograms(workbookId, viewId) {
    const view = `workbooksById['${workbookId}'].viewsById['${viewId}']`;
    return {
        histogramsById: {},
        histograms: {
            length: 0,
            open: false,
            id: 'histograms',
            name: 'Histograms',
            scene: $ref(`${view}.scene`),
            controls: [{
                id: 'toggle-histograms',
                name: 'Histograms',
                type: 'toggle',
                stateKey: 'right',
                state: $ref(`${view}.panels`),
                value: $atom(undefined),
                values: $atom([$ref(`${view}.histograms`), $atom(undefined)])
            }]
        }
    };
}
