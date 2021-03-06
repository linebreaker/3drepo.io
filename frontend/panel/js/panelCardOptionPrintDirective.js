/**
 *	Copyright (C) 2016 3D Repo Ltd
 *
 *	This program is free software: you can redistribute it and/or modify
 *	it under the terms of the GNU Affero General Public License as
 *	published by the Free Software Foundation, either version 3 of the
 *	License, or (at your option) any later version.
 *
 *	This program is distributed in the hope that it will be useful,
 *	but WITHOUT ANY WARRANTY; without even the implied warranty of
 *	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *	GNU Affero General Public License for more details.
 *
 *	You should have received a copy of the GNU Affero General Public License
 *	along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function () {
	"use strict";

	angular.module("3drepo")
		.directive("panelCardOptionPrint", panelCardOptionPrint);

	function panelCardOptionPrint() {
		return {
			restrict: 'E',
			templateUrl: 'panelCardOptionPrint.html',
			scope: {
				account: "=",
				project: "="
			},
			controller: PanelCardOptionPrintCtrl,
			controllerAs: 'vm',
			bindToController: true
		};
	}

	PanelCardOptionPrintCtrl.$inject = ["$window", "serverConfig"];

	function PanelCardOptionPrintCtrl ($window, serverConfig) {
		var vm = this;

		vm.doPrint = function(event) {
			event.stopPropagation();
			$window.open(serverConfig.apiUrl(serverConfig.GET_API, vm.account + "/" + vm.project + "/issues.html"), "_blank");
		};
	}
}());
