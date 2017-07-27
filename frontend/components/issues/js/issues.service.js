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

(function() {
	"use strict";

	angular.module("3drepo")
		.factory("IssuesService", IssuesService);

	IssuesService.$inject = ["$http", "$q", "$sanitize", "serverConfig", "EventService", "UtilsService", "TreeService"];

	function IssuesService($http, $q, $sanitize, serverConfig, EventService, UtilsService, TreeService) {
		var url = "",
			data = {},
			config = {},
			numIssues = 0,
			availableJobs = [],
			newPinId = "newPinId",
			updatedIssue = null;


		var initPromise = $q.defer();

		var service = {
			init : init,
			numIssues: numIssues,
			updatedIssue: updatedIssue,
			deselectPin: deselectPin,
			showIssue: showIssue,
			showMultiIds : showMultiIds,
			handleTree: handleTree,
			getPrettyTime: getPrettyTime,
			generateTitle: generateTitle,
			getIssue: getIssue,
			getIssues: getIssues,
			saveIssue: saveIssue,
			updateIssue: updateIssue,
			doPut : doPut,
			toggleCloseIssue: toggleCloseIssue,
			assignIssue: assignIssue,
			saveComment: saveComment,
			editComment: editComment,
			deleteComment: deleteComment,
			sealComment: sealComment,
			addPin: addPin,
			removePin: removePin,
			fixPin: fixPin,
			getJobs: getJobs,
			getUserJobFormodel: getUserJobFormodel,
			hexToRgb: hexToRgb,
			getJobColor: getJobColor,
			getStatusIcon: getStatusIcon,
			importBcf: importBcf,
			convertActionCommentToText: convertActionCommentToText,
			cleanIssue: cleanIssue,
			convertActionValueToText: convertActionValueToText
		};

		return service;

		/////////////

		function init() {
			return initPromise.promise;
		}

		function deselectPin(issue) {
			var data;
			// Issue with position means pin
			if (issue.position.length > 0) {
				data = {
					id: issue._id,
					colours: Pin.pinColours.blue
				};
				EventService.send(EventService.EVENT.VIEWER.CHANGE_PIN_COLOUR, data);
			}
		}

		function showIssue(issue) {
			var data;
				
			// Highlight pin, move camera and setup clipping plane
			data = {
				id: issue._id,
				colours: Pin.pinColours.yellow
			};
			
			EventService.send(EventService.EVENT.VIEWER.CHANGE_PIN_COLOUR, data);

			// Set the camera position
			data = {
				position : issue.viewpoint.position,
				view_dir : issue.viewpoint.view_dir,
				up: issue.viewpoint.up,
				account: issue.account,
				model: issue.model
			};

			EventService.send(EventService.EVENT.VIEWER.SET_CAMERA, data);

			// Set the clipping planes
			data = {
				clippingPlanes: issue.viewpoint.clippingPlanes,
				fromClipPanel: false,
				account: issue.account,
				model: issue.model
			};
			EventService.send(EventService.EVENT.VIEWER.UPDATE_CLIPPING_PLANES, data);

			// Remove highlight from any multi objects
			EventService.send(EventService.EVENT.VIEWER.HIGHLIGHT_OBJECTS, []);

			// clear selection
			EventService.send(EventService.EVENT.RESET_SELECTED_OBJS, []);

			// Show multi objects
			if (issue.hasOwnProperty("group_id")) {

				showMultiIds(issue);
				
			}
		}

		function showMultiIds(issue) {
			var groupUrl = issue.account + "/" + issue.model + "/groups/" + issue.group_id;

			UtilsService.doGet(groupUrl)
				.then(function (response) {

					TreeService.cachedTree
						.then(function(tree) {
							handleTree(response, tree);
						})
						.catch(function(error){
							console.error("There was a problem getting the tree: ", error);
						});
				
				})
				.catch(function(error){
					console.error("There was a problem getting the highlights: ", error);
				});
		}

		function handleTree(response, tree) {

			var ids = [];
			response.data.objects.forEach(function(obj){
				var key = obj.account + "@" +  obj.model;
				if(!ids[key]){
					ids[key] = [];
				}	

				var treeMap = TreeService.getMap(tree.nodes);
				ids[key].push(treeMap.sharedIdToUid[obj.shared_id]);

			});

			for(var key in ids) {

				var vals = key.split("@");
				var account = vals[0];
				var model = vals[1];

				data = {
					source: "tree",
					account: account,
					model: model,
					ids: ids[key],
					colour: response.data.colour,
					multi: true
				
				};
				EventService.send(EventService.EVENT.VIEWER.HIGHLIGHT_OBJECTS, data);
			}
		}

		// TODO: Internationalise and make globally accessible
		function getPrettyTime(time) {
			var date = new Date(time),
				currentDate = new Date(),
				prettyTime,
				postFix,
				hours;
			
			var	monthToText = [
				"Jan", "Feb", "Mar", "Apr", 
				"May", "Jun", "Jul", "Aug", 
				"Sep", "Oct", "Nov", "Dec"
			];

			if ((date.getFullYear() === currentDate.getFullYear()) &&
				(date.getMonth() === currentDate.getMonth()) &&
				(date.getDate() === currentDate.getDate())) {
				hours = date.getHours();
				if (hours > 11) {
					postFix = " PM";
					if (hours > 12) {
						hours -= 12;
					}
				} else {
					postFix = " AM";
					if (hours === 0) {
						hours = 12;
					}
				}

				prettyTime = hours + ":" + ("0" + date.getMinutes()).slice(-2) + postFix;
			} else if (date.getFullYear() === currentDate.getFullYear()) {
				prettyTime = date.getDate() + " " + monthToText[date.getMonth()];
			} else {
				prettyTime = monthToText[date.getMonth()] + " '" + (date.getFullYear()).toString().slice(-2);
			}

			return prettyTime;
		}

		function generateTitle(issue) {
			if (issue.modelCode){
				return issue.modelCode + "." + issue.number + " " + issue.name;
			} else if (issue.typePrefix) {
				return issue.typePrefix + "." + issue.number + " " + issue.name;
			} else {
				return issue.number + " " + issue.name;
			}
		}

		function getIssue(account, model, issueId){

			var deferred = $q.defer();
			var endpoint = account + "/" + model + "/issues/" + issueId + ".json";
			var url = serverConfig.apiUrl(serverConfig.GET_API, endpoint);

			$http.get(url).then(function(res){

				res.data = cleanIssue(res.data);

				deferred.resolve(res.data);

			}).catch(function(err){
				deferred.reject(err);
			});

			return deferred.promise;

		}

		function getIssues(account, model, revision) {

			// TODO: This is a bit hacky. We are 
			// basically saying when getIssues is called
			// we know the issues component is loaded...
			initPromise.resolve();

			var deferred = $q.defer();
			var endpoint;
			if(revision){
				endpoint = account + "/" + model + "/revision/" + revision + "/issues.json";
			} else {
				endpoint = account + "/" + model + "/issues.json";
			}

			var url = serverConfig.apiUrl(serverConfig.GET_API, endpoint);

			$http.get(url).then(
				function(data) {
					deferred.resolve(data.data);
					for (var i = 0; i < data.data.length; i ++) {
						data.data[i].timeStamp = getPrettyTime(data.data[i].created);
						data.data[i].title = generateTitle(data.data[i]);
						if (data.data[i].thumbnail) {
							data.data[i].thumbnailPath = UtilsService.getServerUrl(data.data[i].thumbnail);
						}
					}
				},
				function() {
					deferred.resolve([]);
				}
			);

			

			return deferred.promise;
		}

		function saveIssue(issue) {
			var deferred = $q.defer(),
				url;

			if (issue.rev_id){
				url = serverConfig.apiUrl(serverConfig.POST_API, issue.account + "/" + issue.model + "/revision/" + issue.rev_id + "/issues.json");
			} else {
				url = serverConfig.apiUrl(serverConfig.POST_API, issue.account + "/" + issue.model + "/issues.json");
			}

			config = {withCredentials: true};

			if (issue.pickedPos !== null) {
				issue.position = issue.pickedPos;
				issue.norm = issue.pickedNorm;
			}

			$http.post(url, issue, config)
				.then(function successCallback(response) {
					deferred.resolve(response);
				});

			return deferred.promise;
		}

		/**
		 * Update issue
		 * @param issue
		 * @param data
		 * @returns {*}
		 */
		function updateIssue(issue, data) {
			return doPut(issue, data);
		}

		/**
		 * Handle PUT requests
		 * @param issue
		 * @param data
		 * @returns {*}
		 */
		function doPut(issue, data) {
			var deferred = $q.defer();
			var url;
			var endpoint = issue.account + "/" + issue.model;

			if(issue.rev_id){
				endpoint += "/revision/" + issue.rev_id + "/issues/" +  issue._id + ".json";
				url = serverConfig.apiUrl(serverConfig.POST_API, endpoint);
			} else {
				endpoint += "/issues/" + issue._id + ".json";
				url = serverConfig.apiUrl(serverConfig.POST_API, endpoint);
			}
				
			var config = {withCredentials: true};

			$http.put(url, data, config)
				.then(function (response) {
					deferred.resolve(response);
				});
			return deferred.promise;
		}

		function toggleCloseIssue(issue) {
			var closed = true;
			if (issue.hasOwnProperty("closed")) {
				closed = !issue.closed;
			}
			return doPut(issue, {
				closed: closed,
				number: issue.number
			});
		}

		function assignIssue(issue) {
			return doPut(
				issue,
				{
					assigned_roles: issue.assigned_roles,
					number: 0 //issue.number
				}
			);
		}

		function saveComment(issue, comment, viewpoint) {
			return doPut(issue, {
				comment: comment,
				viewpoint: viewpoint
			});
		}

		function editComment(issue, comment, commentIndex) {
			return doPut(issue, {
				comment: comment,
				number: issue.number,
				edit: true,
				commentIndex: commentIndex
			});
		}

		function deleteComment(issue, index) {
			return doPut(issue, {
				comment: "",
				number: issue.number,
				delete: true,
				commentIndex: index
				// commentCreated: issue.comments[index].created
			});
		}

		function sealComment(issue, commentIndex) {
			return doPut(issue, {
				comment: "",
				number: issue.number,
				sealed: true,
				commentIndex: commentIndex
			});
		}

		function addPin(pin, colours, viewpoint) {
			EventService.send(EventService.EVENT.VIEWER.ADD_PIN, {
				id: pin.id,
				account: pin.account,
				model: pin.model,
				pickedPos: pin.position,
				pickedNorm: pin.norm,
				colours: colours,
				viewpoint: viewpoint
			});
		}

		function removePin(id) {
			EventService.send(EventService.EVENT.VIEWER.REMOVE_PIN, {
				id: id
			});
		}

		function fixPin(pin, colours) {
			removePin();
			EventService.send(EventService.EVENT.VIEWER.ADD_PIN, {
				id: newPinId,
				pickedPos: pin.position,
				pickedNorm: pin.norm,
				colours: colours
			});
		}

		function getJobs(account, model){

			var deferred = $q.defer();
			url = serverConfig.apiUrl(serverConfig.GET_API, account + "/" + model + "/jobs.json");

			$http.get(url).then(
				function(data) {
					availableJobs = data.data;
					deferred.resolve(availableJobs);
				},
				function() {
					deferred.resolve([]);
				}
			);

			return deferred.promise;
		}

		function getUserJobFormodel(account, model){
			var deferred = $q.defer();
			url = serverConfig.apiUrl(serverConfig.GET_API, account + "/" +model + "/userJobForModel.json");

			$http.get(url).then(
				function(data) {
					deferred.resolve(data.data);
				},
				function() {
					deferred.resolve();
				}
			);

			return deferred.promise;
		}


		function hexToRgb(hex) {
			// If nothing comes end, then send nothing out.
			if (!hex) {
				return undefined;
			}

			var hexColours = [];

			if (hex.charAt(0) === "#") {
				hex = hex.substr(1);
			}

			if (hex.length === 6) {
				hexColours.push(hex.substr(0, 2));
				hexColours.push(hex.substr(2, 2));
				hexColours.push(hex.substr(4, 2));
			} else if (hex.length === 3) {
				hexColours.push(hex.substr(0, 1) + hex.substr(0, 1));
				hexColours.push(hex.substr(1, 1) + hex.substr(1, 1));
				hexColours.push(hex.substr(2, 1) + hex.substr(2, 1));
			} else {
				hexColours = ["00", "00", "00"];
			}

			return [
				(parseInt(hexColours[0], 16) / 255.0), 
				(parseInt(hexColours[1], 16) / 255.0), 
				(parseInt(hexColours[2], 16) / 255.0)
			];
		}

		function getJobColor(id) {
			var i, length,
				roleColor = null;

			for (i = 0, length = availableJobs.length; i < length; i += 1) {
				if (availableJobs[i]._id === id && availableJobs[i].color) {
					roleColor = availableJobs[i].color;
					break;
				}
			}
			return roleColor;
		}

		/**
		 * Set the status icon style and colour
		 */
		function getStatusIcon(issue) {

			var statusIcon = {};

			switch (issue.priority) {
			case "none":
				statusIcon.colour = "#7777777";
				break;
			case "low":
				statusIcon.colour = "#4CAF50";
				break;
			case "medium":
				statusIcon.colour = "#FF9800";
				break;
			case "high":
				statusIcon.colour = "#F44336";
				break;
			}

			switch (issue.status) {
			case "open":
				statusIcon.icon = "panorama_fish_eye";
				break;
			case "in progress":
				statusIcon.icon = "lens";
				break;
			case "for approval":
				statusIcon.icon = "adjust";
				break;
			case "closed":
				statusIcon.icon = "check_circle";
				statusIcon.colour = "#004594";
				break;
			}

			return statusIcon;
		}

		/**
		* Import bcf
		*/
		function importBcf(account, model, revision, file){

			var deferred = $q.defer();

			var url = account + "/" + model + "/issues.bcfzip";
			if(revision){
				url = account + "/" + model + "/revision/" + revision + "/issues.bcfzip";
			}

			var formData = new FormData();
			formData.append("file", file);

			UtilsService.doPost(formData, url, {"Content-Type": undefined}).then(function(res){
				
				if(res.status === 200){
					deferred.resolve();
				} else {
					deferred.reject(res.data);
				}

			});

			return deferred.promise;
		}

		/**
		 * Convert an action comment to readable text
		 * @param comment
		 * @returns {string}
		 */
		function convertActionCommentToText(comment, topic_types) {
			var text = "";

			switch (comment.action.property) {
			case "priority":

				comment.action.propertyText = "Priority";
				comment.action.from = convertActionValueToText(comment.action.from);
				comment.action.to = convertActionValueToText(comment.action.to);
				break;

			case "status":

				comment.action.propertyText = "Status";
				comment.action.from = convertActionValueToText(comment.action.from);
				comment.action.to= convertActionValueToText(comment.action.to);

				break;

			case "assigned_roles":

				comment.action.propertyText = "Assigned";
				comment.action.from = comment.action.from.toString();
				comment.action.to= comment.action.to.toString();	
							
				break;

			case "topic_type":

				comment.action.propertyText = "Type";
				if(topic_types){

					var from = topic_types.find(function(topic_type){
						return topic_type.value === comment.action.from;
					});

					var to = topic_types.find(function(topic_type){
						return topic_type.value === comment.action.to;
					});

					if(from && from.label){
						comment.action.from = from.label;
					}

					if(to && to.label){
						comment.action.to = to.label;
					}

				}

				break;

			case "desc":

				comment.action.propertyText = "Description";

				break;
			}

			return text;
		}

		/**
		 * generate title, screenshot path and comment for an issue
		 * @param issue
		 * @returns issue
		 */
		function cleanIssue(issue){

			issue.timeStamp = getPrettyTime(issue.created);
			issue.title = generateTitle(issue);

			if (issue.hasOwnProperty("comments")) {
				for (var j = 0, numComments = issue.comments.length; j < numComments; j += 1) {
					if (issue.comments[j].hasOwnProperty("created")) {
						issue.comments[j].timeStamp = getPrettyTime(issue.comments[j].created);
					}
					// Action comment text
					if (issue.comments[j].action) {
						issue.comments[j].comment = convertActionCommentToText(issue.comments[j]);
					}
					//screen shot path
					if (issue.comments[j].viewpoint && issue.comments[j].viewpoint.screenshot) {
						issue.comments[j].viewpoint.screenshotPath = UtilsService.getServerUrl(issue.comments[j].viewpoint.screenshot);
					}
				}
			}

			return issue;
		}

		/**
		 * Convert an action value to readable text
		 * @param value
		 */
		function convertActionValueToText (value) {
			var text = "";

			switch (value) {
			case "none":
				text = "None";
				break;
			case "low":
				text = "Low";
				break;
			case "medium":
				text = "Medium";
				break;
			case "high":
				text = "High";
				break;
			case "open":
				text = "Open";
				break;
			case "in progress":
				text = "In progress";
				break;
			case "for approval":
				text = "For approval";
				break;
			case "closed":
				text = "Closed";
				break;
			}

			return text;
		}

	}
}());