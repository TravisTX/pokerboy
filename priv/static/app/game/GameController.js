'use strict';

pPoker.controller('GameController', ['$scope', '$log', 'PokerBoyService', '$state', '$stateParams',
    function ($scope, $log, PokerBoyService, $state, $stateParams) {
        var vm = this;
        vm.currentPlayer = undefined;
        vm.currentVote = undefined;
        vm.roleDecided = false;
        vm.didFireworks = false;

        vm.game = undefined;
        vm.submitJoin = submitJoin;
        vm.submitVote = submitVote;
        vm.submitReset = submitReset;
        vm.submitReveal = submitReveal;
        vm.submitPlaying = submitPlaying;
        vm.submitPromote = submitPromote;
        vm.submitLogOff = submitLogOff;

        var f = new fireworks();

        //////////////////////
        Init();

        function Init() {
            //if game was created by this client
            if (PokerBoyService.PokerBoy.games[$stateParams.gameId]) {
                vm.game = PokerBoyService.PokerBoy.games[$stateParams.gameId];
                vm.Name = vm.game.username;
                process_state(vm.game.state);

                vm.game.valid_votes();
            }

            if (localStorage['name']) {
                join($stateParams.gameId, localStorage['name']);
            }

            setupWatches();
        }

        function submitReset() {
            vm.game.reset();
        }

        function submitPromote(name) {
            vm.game.user_promote(name);
        }

        function submitReveal() {
            vm.game.reveal();
        }

        function submitPlaying(user) {
            vm.game.toggle_playing(user);
        }

        function submitJoin(form) {
            if (!form.$valid) {
                return;
            }

            join ($stateParams.gameId, vm.Name);
        }

        function submitLogOff() {
            localStorage.removeItem('name');
            location.reload(true);
        }

        function join(gameId, name) {
            PokerBoyService.Join(gameId, name)
                .then(function (game) {
                    vm.game = game;
                    vm.Name = localStorage['name'] = vm.game.username;
                    vm.game.valid_votes();

                    $scope.$apply();
                });
        }

        function submitVote(vote) {
            vm.currentVote = vote;
            vm.game.vote(vote);
        }

        function process_state(state) {
            vm.state = state;

            vm.usernames = Object.keys(vm.state.users);
            vm.users = vm.usernames
                .filter(x => vm.state.users[x].is_player)
                .map(function (user) {
                    return vm.state.users[user];
                });
            vm.users = vm.users.sort(function (a, b) {
                return a.name > b.name;
            });

            vm.spectators = vm.usernames
                .filter(x => !vm.state.users[x].is_player)
                .map(function (user) {
                    return vm.state.users[user];
                });
            vm.spectators = vm.spectators.sort(function (a, b) {
                return a.name > b.name;
            });

            //get name of client player
            var self = vm.usernames
                .filter(x => vm.state.users[x].name == vm.Name)[0];
            vm.currentPlayer = vm.state.users[self];
            if (vm.currentPlayer.vote === false) {
                vm.currentVote = null;
            }

            if (vm.state.is_showing) {
                calculateAverage(vm.users);
                findOutliers(vm.users, vm.average);
                if (!vm.didFireworks && checkForYahtzee(vm.users)) {
                    vm.didFireworks = true;
                    f.launch();
                }
            }
            else {
                vm.didFireworks = false;
            }
        }

        function calculateAverage(users) {
            // determine the mathmatical average
            // and then round that number up to 
            // the next number in the valid scale
            var voteCount = 0;
            var sum = 0;
            for (var i = 0; i < users.length; i++) {
                if (isNumeric(users[i].vote)) {
                    voteCount++;
                    sum += parseFloat(users[i].vote);
                }
            }
            var avg = sum / voteCount;
            if (isNaN(avg)) {
                return vm.average = undefined;
            }

            for (var i = 1; i < vm.valid_votes.length; i++) {
                var currentValidVote = vm.valid_votes[i];
                if (currentValidVote === null || currentValidVote === '?') {
                    continue;
                }

                if (parseFloat(currentValidVote) >= avg) {
                    return vm.average = parseFloat(currentValidVote);
                }
            }
        }

        function findOutliers(users, average) {
            for(var i = 0; i < users.length; i++) {
                users[i].outlier = false;
                if (isNumeric(users[i].vote)) {
                    if (users[i].vote > average) {
                        users[i].outlier = true;
                    }
                }
            }
        }

        function checkForYahtzee(users) {
            var voteCount = 0;
            var firstVote = undefined;
            for (var i = 0; i < users.length; i++) {
                if (users[i].vote !== users[i].original_vote) {
                    // dirty vote, get outta here
                    return false;
                }
                if (isNumeric(users[i].vote)) {
                    voteCount++;
                    if (firstVote === undefined) {
                        firstVote = users[i].vote;
                    }
                    else if (firstVote !== users[i].vote) {
                        return false;
                    }
                }
            }
            return voteCount > 1;
        }

        function isNumeric(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        }


        function setupWatches() {
            $scope.$on('update_game', function (event, state) {
                $scope.$apply(function () {
                    process_state(state);
                });
            });

            $scope.$on('valid_votes', function (event, valid_votes) {
                $scope.$apply(function () {
                    vm.valid_votes = valid_votes;
                });
            });

            $scope.$on('current_user', function (event, name) {
                $scope.$apply(function () {
                    vm.Name = name;
                });
            });
        }
    }]
);