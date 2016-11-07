import {
    ref as $ref,
    atom as $atom,
    pathValue as $value
} from '@graphistry/falcor-json-graph';


export function inspector(view) {
    return {
        inspector: {
            open: false,
            length: 0,
            id: 'inspector',
            name: 'Data inspector',
            openTab: 'points', // 'edges', 'events', ...
            templates: $ref(`${view}.columns`),
            currentQuery: $ref(`${view}.inspector.queries.points`),
            currentRows: $ref(`${view}.inspector.rows.points.search-.community_infomap.asc`),
            queries: {
                points: { //table
                    searchTerm: '',
                    sortKey: '', //int or string column reference
                    sortOrder: 'asc', // or 'desc'
                    rowsPerPage: 6, //fix CSS if we want to do more
                    page: 1,
                    //rows: $ref(`${view}.inspector.rows.points.search-.community_infomap.asc`)
                },
                edges: { //table
                    searchTerm: '',
                    sortKey: '', //int or string column reference
                    sortOrder: 'asc', // or 'desc'
                    rowsPerPage: 6, //fix CSS if we want to do more
                    page: 1,
                    //rows: $ref(`${view}.inspector.rows.edges.search-._title.asc`),
                }
            },
            rows: {
                points: { //table
                    'search-': {  //search term -- "search:asdf xya"
                        'sort-': { //sort column
                            'asc': {
                                count: 100, //independent of cached range
                                0: {
                                    "community_infomap": 0,
                                    "pagerank": "Mayer Leonard",
                                    "_title": "Kapowsin",
                                    "state": "Hawaii",
                                    "country": "United Kingdom",
                                    "company": "Ovolo",
                                    "favoriteNumber": 7
                                },
                                1: {
                                    "community_infomap": 10,
                                    "pagerank": "Bullwinkle",
                                    "_title": "Moscow",
                                    "stata": null,
                                    "country": "USSR",
                                    "company": "ACME",
                                    "favoriteNumber": 10
                                }
                            }
                        }
                    }
                }
            },
            controls: [{
                selected: false,
                id: 'toggle-inspector',
                name: 'Inspector',
            }]
        }
    }
}
