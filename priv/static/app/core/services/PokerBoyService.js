﻿'use strict';

pPoker.factory('PokerBoyService',
    ['$timeout', '$rootScope',
        function ($timeout, $rootScope) {
            var PokerBoy = (function () {
                var socket,
                game_uuid,
                game;
                var gamesMap = {};
                
                return {
                    init: init,
                    create_game: create_game,
                    join_game: join_game,
                    games: gamesMap
                };

                function init(){
                    socket = new Phoenix.Socket(window.location.pathname + 'socket');
                    socket.logger = (kind, msg, data) => { console.log(`${kind}: ${msg}`, data) };
                    socket.connect();
                }

                function create_game(game_name, user_name){
                    return new Promise(function(resolve, reject){
                    var channel = socket.channel("game:lobby")
                    channel.join()
                        .receive("error", reason => reject(reason) );

                    channel.push('create', {name: game_name});
                    channel.on('created', game => {
                        game_uuid = game.uuid;
                        channel.leave();
                        resolve();
                    });
                    })
                    .then(function(){
                    return new Game(game_uuid, user_name);
                    })
                    .then(function(game){
                    gamesMap[game.id] = game;
                    return game;
                    });
                }

                function join_game(game_uuid, user_name){    
                    return new Game(game_uuid, user_name);
                }

                function Game(game_uuid, username){
                    var self = this, game_state = {};

                    this.toggle_playing = toggle_playing;
                    this.valid_votes = valid_votes;
                    this.reveal = reveal;
                    this.reset = reset;
                    this.vote = vote;
                    this.state = game_state;
                    this.id = game_uuid;
                    this.username = username;

                    //runs on new to return promise which resovles with game object
                    return new Promise(function(resolve, reject){
                        game = socket.channel("game:"+game_uuid, {name: username});

                        game.join()
                            .receive("error", reason => reject(reason) );

                        game.on("game_update", state => update(state.state) );
                        game.on("current_user", message => $rootScope.$broadcast('current_user', message.name) );

                        var intervalCount = 0;
                        var interval = setInterval(function(){
                            if(game.state == "joined"){
                                clearInterval(interval);
                                resolve(self);
                            }
                            else if(intervalCount++ > 100){
                                clearInterval(interval);
                                reject("failed to connect to game");
                            }
                        }, 10);
                    });

                    function vote(vote){
                        game.push('user_vote', {vote: vote});
                    }

                    function toggle_playing(user_name){
                        game.push('toggle_playing', {user: user_name});
                    }

                    function reveal(){
                        game.push('reveal', {});
                    }

                    function valid_votes(){
                        game.push('valid_votes', {});
                        game.on("valid_votes", reason => $rootScope.$broadcast('valid_votes', reason.valid_votes) );
                    }

                    function reset(){
                        game.push('reset', {});
                    }

                    function update(state){
                        $rootScope.$apply(function(){
                            mergeObject(game_state, state);
                        });
                        $rootScope.$broadcast('update_game', game_state);
                    }

                    function mergeObject(obj1, obj2) {
                        for (var attrname in obj2) {
                            if (obj2.hasOwnProperty(attrname)) {
                            obj1[attrname] = obj2[attrname];
                            }
                        }
                        return obj1;
                    }
                }
                })();

            PokerBoy.init();
            
            return {
                PokerBoy: PokerBoy,
                Create: PokerBoy.create_game,
                Join: PokerBoy.join_game
            };
        }]
);