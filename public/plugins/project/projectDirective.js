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
			controllerAs: "pm",
			bindToController: true			
        };
    }

	ProjectCtrl.$inject = ["$timeout", "$scope", "EventService", "ProjectService"];

	function ProjectCtrl($timeout, $scope, EventService, ProjectService) {
		var panelCard = {
			left: [],
			right: []
		};

		var i, length, pm = this;

		panelCard.left.push({
			type: "tree",
			title: "Tree",
			show: true,
			help: "Model elements shown in a tree structure",
			icon: "fa-sitemap",
			height: 820,
			fixedHeight: false,
			options: [
				"filter"
			]
		});

		panelCard.right.push({
			type: "issues",
			title: "Issues",
			show: true,
			help: "List current issues",
			icon: "fa-map-marker",
			menu: [
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
			height: 820,
			fixedHeight: false,
			options: [
				"print",
				"add",
				"filter",
				"menu"
			]
		});
		panelCard.right.push({
			type: "clip",
			title: "Clip",
			show: false,
			help: "Clipping plane",
			icon: "fa-object-group",
			height: 120,
			fixedHeight: true,
			options: [
				"visible"
			]
		});
		panelCard.right.push({
			type: "docs",
			title: "Docs",
			show: false,
			help: "Documents",
			icon: "fa-clone",
			height: 80,
			fixedHeight: false,
			options: []
		});

		$scope.$watchGroup(["pm.account","pm.project"], function()
		{
			if (angular.isDefined(pm.account) && angular.isDefined(pm.project)) {
				// Add filtering options for the Issues card menu
				ProjectService.getRoles(pm.account, pm.project).then(function (data) {
					for (i = 0, length = data.length; i < length; i += 1) {
						panelCard.right[0].menu.push(
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
				
				ProjectService.getProjectInfo(pm.account, pm.project).then(function (data) {
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
				account:  pm.account,
				project:  pm.project,
				branch:   pm.branch,
				revision: pm.revision
			});
						
			EventService.send(EventService.EVENT.PANEL_CONTENT_SETUP, panelCard);
		});
	}
}());