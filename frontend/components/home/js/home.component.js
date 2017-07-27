/**
 *  Copyright (C) 2014 3D Repo Ltd
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as
 *  published by the Free Software Foundation, either version 3 of the
 *  License, or (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function () {
	"use strict";

	angular.module("3drepo")
		.component("home", {
			restrict: "E",
			templateUrl: "home.html",
			bindings: {
				account: "@",
				password: "@",
				loggedInUrl: "@",
				loggedOutUrl: "@"
			},
			controller: HomeCtrl,
			controllerAs: "vm"
		});

	HomeCtrl.$inject = ["$scope", "$element", "$interval", "$timeout", "$compile", "$mdDialog", "$window", "AuthService", "StateManager", "EventService", "UtilsService", "serverConfig", "$location"];

	function HomeCtrl($scope, $element, $interval, $timeout, $compile, $mdDialog, $window, AuthService, StateManager, EventService, UtilsService, serverConfig, $location) {
		var vm = this,
			homeLoggedOut,
			func, i,
			elementRef, elementScope;

		/*
		 * Init
		 */
		vm.$onInit = function() {

			// TODO: this is a bit of a hack, it would be nice to 
			// include this in the StateManager
			if (hasTrailingSlash()) {
				removeTrailingSlash();
			}

			//console.log($location.absUrl());
	
			vm.state = StateManager.state;
			vm.query = StateManager.query;
			vm.functions = StateManager.functions;
			vm.pointerEvents = "inherit";
			vm.goToAccount = false;
			vm.goToUserPage = false;
			vm.keysDown = [];

			vm.legalDisplays = [];
			if (angular.isDefined(serverConfig.legal)) {
				vm.legalDisplays = serverConfig.legal;
			}
			vm.legalDisplays.push({title: "Pricing", page: "http://3drepo.org/pricing"});
			vm.legalDisplays.push({title: "Contact", page: "http://3drepo.org/contact/"});

			// Pages to not attempt a interval triggered logout from
			vm.doNotLogout = [
				"/terms", 
				"/privacy",
				"/signUp", 
				"/passwordForgot", 
				"/registerRequest", 
				"/registerVerify"
			];

			vm.loginRedirects = [
				"sign-up",
				"password-forgot",
				"register-request",
				"register-verify"
			];

			$timeout(function () {

				homeLoggedOut = angular.element($element[0].querySelector("#homeLoggedOut"));

				/*
				* Watch the state to handle moving to and from the login page
				*/
				$scope.$watch("vm.state", function (newState, oldState) {
					
					var changedState = newState !== oldState;

					if (changedState && !vm.state.changing && vm.state.authInitialized) {
						handleStateChange();
					}
					
				}, true);

			});

			if (angular.isDefined(vm.account) && angular.isDefined(vm.password)) {
				AuthService.login(vm.account, vm.password);
			}

		};

		function handleStateChange() {
			var loginMarkup = "<login></login>";
			clearDirective();
			var functionToInsert = getFunctionToInsert();

			if (functionToInsert != null) {
				var needsRedirect = vm.loginRedirects.indexOf(functionToInsert) !== -1;
				if (AuthService.loggedIn && needsRedirect) {
					$location.path(AuthService.username);
				} else {
					insertFunctionDirective(functionToInsert);
				}
				
			} else {
				// If you are not logged in
				if (!AuthService.loggedIn) {
					insertDirective(loginMarkup);
				} 
			}
		}

		function hasTrailingSlash() {
			// Check if we have a trailing slash in our URL
			var absUrl = $location.absUrl();
			var trailingCheck = absUrl.substr(-1);
			if (trailingCheck === "/") {
				return true;
			}
			return false;
		}

		function removeTrailingSlash() {
			// Remove the trailing slash from the URL
			var currentPath = $location.path();
			var minusSlash = currentPath.slice(0, -1);
			$location.path(minusSlash);
		}

		vm.isLoggedIn = function(){
			if (!AuthService) {
				return false;
			}
			return AuthService.loggedIn;
		};


		function clearDirective() {
			if (elementRef) {
				elementRef.remove();
				elementScope.$destroy();
			}
		}

		function insertDirective(markup) {
			var directiveElement = angular.element(markup);
			homeLoggedOut.append(directiveElement);
			elementScope = $scope.$new();
			elementRef = $compile(directiveElement)(elementScope);
		}

		function getFunctionToInsert() {
			// Check for static(function) pages to see if we need
			// render one of them
			for (i = 0; i < vm.functions.length; i++) {
				func = vm.functions[i];

				if (vm.state[func]) {
					return func;
				}
			}

			return null;
		}

		function insertFunctionDirective(func) {

			// Create element related to function func
			var directiveMarkup = "<" + func +
				" username='vm.query.username'" +
				" token='vm.query.token'" +
				" query='vm.query'>" +
				"</" + func + ">";

			insertDirective(directiveMarkup);
		}

		vm.logout = function () {
			AuthService.logout();
		};

		vm.home = function () {
			EventService.send(EventService.EVENT.GO_HOME);
		};

		/**
		 * Display legal text
		 *
		 * @param event
		 * @param display
		 */
		vm.legalDisplay = function (event, display) {
			$window.open("/" + display.value);
		};

		$scope.$watch(EventService.currentEvent, function(event) {
			if (angular.isDefined(event) && angular.isDefined(event.type)) {
				if (event.type === EventService.EVENT.USER_LOGGED_IN) {
					if (!event.value.error) {
						if(!event.value.initialiser) {
							StateManager.setStateVar("loggedIn", true);
							EventService.send(EventService.EVENT.UPDATE_STATE);

							if(!StateManager.state.account){
								EventService.send(EventService.EVENT.SET_STATE, { account: AuthService.username });
							}
						}
					} else {

						EventService.send(EventService.EVENT.USER_LOGGED_OUT);
					
					}
				} else if (event.type === EventService.EVENT.USER_LOGGED_OUT) {
					
					// TODO: Use state manager
					// Only fire the Logout Event if we're on the home page
					var currentPage = $location.path();

					if (vm.doNotLogout.indexOf(currentPage) === -1) {
						//EventService.send(EventService.EVENT.CLEAR_STATE);
						EventService.send(EventService.EVENT.SET_STATE, { loggedIn: false, account: null });
					}

				} else if (event.type === EventService.EVENT.SHOW_TEAMSPACES) {
					//EventService.send(EventService.EVENT.CLEAR_STATE);
					$location.path(AuthService.username);
				} else if (event.type === EventService.EVENT.GO_HOME) {

					//EventService.send(EventService.EVENT.CLEAR_STATE);

					// TODO: Do this properly using state manager
					
					if (AuthService.loggedIn) {
						$location.path(AuthService.username);
						//EventService.send(EventService.EVENT.SET_STATE, { account: AuthService.username });
					} else {
						$location.path("");
					}
				} else if (event.type === EventService.EVENT.TOGGLE_ISSUE_AREA_DRAWING) {
					vm.pointerEvents = event.value.on ? "none" : "inherit";
				}
			}
		});


		/**
		 * Keep a list of keys held down
		 * For changes to be registered by directives and especially components the list needs to be recreated
		 *
		 * @param event
		 */
		vm.keyAction = function (event) {
			var i, tmp;
			// Update list, but avoid repeat
			if (event.type === "keydown") {
				if (vm.keysDown.indexOf(event.which) === -1) {
					// Recreate list so that it changes are registered in components
					tmp = vm.keysDown;
					delete vm.keysDown;
					
					vm.keysDown = angular.copy(tmp);
					vm.keysDown.push(event.which);

				}
			} else if (event.type === "keyup") {
				// Remove all instances of the key (multiple instances can happen if key up wasn't registered)
				for (i = (vm.keysDown.length - 1); i >= 0; i -= 1) {
					if (vm.keysDown[i] === event.which) {
						vm.keysDown.splice(i, 1);
					}
				}
				// Recreate list so that it changes are registered in components
				tmp = vm.keysDown;
				delete vm.keysDown;
				vm.keysDown = angular.copy(tmp);
			}
		};


		/**
		 * Close the dialog
		 */
		$scope.closeDialog = function() {
			$mdDialog.cancel();
		};

	}
}());
