/**
 *	Copyright (C) 2014 3D Repo Ltd
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
	.directive("project", project);

    function project() {
        return {
            restrict: "E",
            scope: {
				account:  "=",
				project:  "=",
				branch:   "=",
				revision: "=",
				state:    "="
			},
			templateUrl: "project.html",
            controller: ProjectCtrl,
			controllerAs: "vm",
			bindToController: true
        };
    }

	ProjectCtrl.$inject = ["$timeout", "$scope", "$element", "$compile", "EventService", "ProjectService"];

	function ProjectCtrl($timeout, $scope, $element, $compile, EventService, ProjectService) {
		var vm = this, i, length,
			panelCard = {
				left: [],
				right: []
			},
			projectUI,
			issueArea;

		vm.pointerEvents = "auto";

		/*
		 * Get the project element
		 */
		$timeout(function () {
			projectUI = angular.element($element[0].querySelector('#projectUI'));
		});

		panelCard.left.push({
			type: "tree",
			title: "Tree",
			show: true,
			help: "Model elements shown in a tree structure",
			icon: "device_hub",
			minHeight: 80,
			fixedHeight: false,
			options: [
				{type: "filter", visible: true}
			]
		});

		panelCard.left.push({
			type: "issues",
			title: "Issues",
			show: true,
			help: "List current issues",
			icon: "place",
			menu: [
				{
					value: "print",
					label: "Print",
					selected: false,
					noToggle: true,
					icon: "fa-print",
					divider: true
				},
				{
					value: "sortByDate",
					label: "Sort by Date",
					firstSelectedIcon: "fa-sort-amount-desc",
					secondSelectedIcon: "fa-sort-amount-asc",
					toggle: false,
					selected: true,
					firstSelected: true,
					secondSelected: false
				},
				{
					value: "showClosed",
					label: "Show closed issues",
					toggle: true,
					selected: false,
					firstSelected: false,
					secondSelected: false
				}
			],
			minHeight: 80,
			fixedHeight: false,
			options: [
				{type: "menu", visible: true},
				{type: "filter", visible: true},
				{type: "pin", visible: false},
				{type: "erase", visible: false},
				{type: "scribble", visible: false}
			],
			add: true
		});

		panelCard.left.push({
			type: "groups",
			title: "Groups",
			show: true,
			help: "groups of objects",
			icon: "view_comfy",
			minHeight: 80,
			fixedHeight: false,
			options: [
				{type: "menu", visible: true}
			],
			menu: [
				{
					value: "hideAll",
					label: "Hide Groups",
					selected: false,
					toggle: true
				}
			],
			add: true
		});

		panelCard.left.push({
			type: "clip",
			title: "Clip",
			show: false,
			help: "Clipping plane",
			icon: "crop_original",
			fixedHeight: true,
			options: [
				{type: "visible", visible: true}
			]
		});

		/*
		panelCard.left.push({
			type: "docs",
			title: "Docs",
			show: false,
			help: "Documents",
			icon: "fa-clone",
			minHeight: 80,
			fixedHeight: false,
			options: []
		});
		*/

		$scope.$watchGroup(["vm.account","vm.project"], function()
		{
			if (angular.isDefined(vm.account) && angular.isDefined(vm.project)) {
				// Add filtering options for the Issues card menu
				ProjectService.getRoles(vm.account, vm.project).then(function (data) {
					for (i = 0, length = data.length; i < length; i += 1) {
						panelCard.left[1].menu.push(
							{
								value: "filterRole_" + data[i].role,
								label: data[i].role,
								toggle: true,
								selected: true,
								firstSelected: false,
								secondSelected: false
							}
						);
					}
				});

				ProjectService.getProjectInfo(vm.account, vm.project).then(function (data) {
					EventService.send(EventService.EVENT.PROJECT_SETTINGS_READY, {
						account: data.account,
						project: data.project,
						settings: data.settings
					});
				});
			}
		});

		$timeout(function () {
			EventService.send(EventService.EVENT.CREATE_VIEWER, {
				name: "default",
				account:  vm.account,
				project:  vm.project,
				branch:   vm.branch,
				revision: vm.revision
			});

			EventService.send(EventService.EVENT.PANEL_CONTENT_SETUP, panelCard);
		});

		/*
		 * Watch for events
		 */
		$scope.$watch(EventService.currentEvent, function (event) {
			if (event.type === EventService.EVENT.TOGGLE_ISSUE_AREA) {
				if (event.value.on) {
					if (event.value.hasOwnProperty("issue")) {
						vm.issue = event.value.issue;
						issueArea = angular.element("<issue-area data='vm.issue'></issue-area>");
					}
					else {
						issueArea = angular.element("<issue-area></issue-area>");
					}
					projectUI.prepend(issueArea);
					$compile(issueArea)($scope);
				}
				else {
					issueArea.remove();
				}
			}
			else if (event.type === EventService.EVENT.TOGGLE_SCRIBBLE) {
				vm.pointerEvents = event.value.on ? "none" : "auto";
			}
		})
	}
}());
