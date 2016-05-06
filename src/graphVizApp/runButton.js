'use strict';

//var debug   = require('debug')('graphistry:StreamGL:graphVizApp:runButton');
var $       = window.$;
var Rx      = require('rxjs/Rx');
              require('../rx-jquery-stub');
var _       = require('underscore');

var util            = require('./util.js');
var api             = require('./api.js');



var INTERACTION_INTERVAL = 40;



//appState ->  ()
module.exports = function (appState, socket, urlParams, isAutoCentering) {

    var $tooltips = $('[data-toggle="tooltip"]');
    var $graph = $('#simulate');
    var $bolt = $('.fa', $graph);
    var numTicks = urlParams.play !== undefined ? urlParams.play : 5000;

    var disable = Rx.Observable.merge(
        $('#viewSelectionButton').onAsObservable('click'),
        $('#histogramBrush').onAsObservable('click'));

    // Tick stream until canceled/timed out (end with 'false'), starts after first vbo update.
    var autoLayingOut =
        Rx.Observable.merge(
            Rx.Observable.return(Rx.Observable.interval(20)),
            Rx.Observable.merge(
                $graph.onAsObservable('click')
                    .filter(function (evt) { return evt.originalEvent !== undefined; }),
                disable,
                Rx.Observable.timer(numTicks)
            ).take(1).map(_.constant(Rx.Observable.return(false))))
        .switchMap(_.identity);

    var runActions =
        appState.apiActions
            .filter(function (e) { return e.event === 'toggleLayout'; })
            .map(function (e) { return e.play || false; });

    var runLayout =
        Rx.Observable.fromEvent($graph, 'click')
            .map(function () { return $bolt.hasClass('toggle-on'); })
            .merge(disable.map(_.constant(true)))
            .merge(runActions.map(function (play) { return !play; }))
            .do(function (wasOn) {
                $bolt.toggleClass('toggle-on', !wasOn);
            })
            .switchMap(function (wasOn) {
                var isOn = !wasOn;
                appState.simulateOn.onNext(isOn);
                return isOn ? Rx.Observable.interval(INTERACTION_INTERVAL) : Rx.Observable.empty();
            });

    runLayout
        .subscribe(
            function () {
                socket.emit('interaction', {play: true, layout: true});
            },
            util.makeErrorHandler('Error stimulating graph'));

    autoLayingOut.subscribe(
        function (evt) {
            if (evt !== false) {
                var payload = {play: true, layout: true};
                socket.emit('interaction', payload);
            } else {
                api.postEvent(appState.apiEvents, undefined, {event: 'ready'});
            }
        },
        util.makeErrorHandler('autoLayingOut error'),
        function () {
            isAutoCentering.take(1).subscribe(function (v) {
                if (v !== false) {
                    $('#center').trigger('click');
                }
            });
            $tooltips.tooltip('hide');
            $bolt.removeClass('automode').removeClass('toggle-on');
            appState.simulateOn.onNext(false);
        });


};
