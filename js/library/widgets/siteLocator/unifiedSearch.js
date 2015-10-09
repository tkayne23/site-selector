/*global define,dojo,dojoConfig,esri,esriConfig,alert,handle:true,dijit,appGlobals */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4 */
/** @license
 | Copyright 2013 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */
//============================================================================================================================//
define([
    "dojo/_base/declare",
    "dojo/_base/html",
    "dojo/_base/lang",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/dom-attr",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "dojo/on",
    "dojo/query",
    "dojo/string",
    "dojo/topic",
    "dojo/keys",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "esri/geometry/Point",
    "esri/graphic",
    "esri/request",
    "esri/symbols/PictureMarkerSymbol",
    "esri/tasks/locator",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "../siteLocator/featureQuery"
], function (declare, html, lang, Deferred, all, domAttr, domClass, domConstruct, domStyle, sharedNls, on, query, string, topic, keys, _TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, Point, Graphic, esriRequest, PictureMarkerSymbol, Locator, Query, QueryTask, featureQuery) {
    //========================================================================================================================//

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, featureQuery], {
        /**
        * attach locator events
        * @param {object} nodes and other variable for all workflows
        * @memberOf widgets/siteLocator/unifiedSearch
        */
        _attachLocatorEvents: function (obj) {
            this.own(on(obj.divSearch, "click", lang.hitch(this, function () {
                if (!domClass.contains(obj.divAddressResults, "esriCTDisableSearch")) {
                    this._locateAddress(obj, true);
                }
            })));
            this.own(on(obj.txtAddress, "keyup", lang.hitch(this, function (evt) {
                this._submitAddress(evt, obj);
            })));
            this.own(on(obj.txtAddress, "paste", lang.hitch(this, function (evt) {
                this._submitAddress(evt, obj);
            })));
            this.own(on(obj.txtAddress, "cut", lang.hitch(this, function (evt) {
                this._submitAddress(evt, obj);
            })));
            this.own(on(obj.txtAddress, "dblclick", lang.hitch(this, function (evt) {
                this._clearDefaultText(evt, obj);
            })));
            this.own(on(obj.txtAddress, "blur", lang.hitch(this, function (evt) {
                this._replaceDefaultText(evt, obj);
            })));
            this.own(on(obj.txtAddress, "focus", lang.hitch(this, function () {
                domClass.add(obj.txtAddress, "esriCTColorChange");
            })));
            this.own(on(obj.close, "click", lang.hitch(this, function () {
                if (!domClass.contains(obj.close, "esriCTDisabledAddressColorChange")) {
                    this._hideText(obj);
                }
            })));

            topic.subscribe("geoLocation-Complete", lang.hitch(this, function (mapPoint) {
                if (this.workflowCount === obj.addressWorkflowCount) {
                    if (this.workflowCount === 0) {
                        this._getBackToTab(query(".esriCTAttachmentOuterDiv")[this.workflowCount], query(".esriCTMainDivBuilding")[0]);
                    } else if (this.workflowCount === 1) {
                        this._getBackToTab(query(".esriCTAttachmentOuterDiv")[this.workflowCount], query(".esriCTMainDivSites")[0]);
                    } else if (this.workflowCount === 3) {
                        this.rdoCommunitiesAddressSearch.checked = true;
                        this._communitiesSearchRadioButtonHandler(this.rdoCommunitiesAddressSearch);
                    }
                    // when user clicks on geolocation icon in header panel, close the search panel if it is open and perform geolocation operation.
                    if (html.coords(this.applicationHeaderSearchContainer).h > 0) {
                        appGlobals.shareOptions.arrAddressMapPoint[this.workflowCount] = mapPoint.x + "," + mapPoint.y;
                        appGlobals.shareOptions.strGeoLocationMapPoint = null;
                    } else {
                        topic.publish("hideProgressIndicator");
                        appGlobals.shareOptions.strGeoLocationMapPoint = mapPoint.x + "," + mapPoint.y;
                    }
                    this._geoLocationQuery(obj, mapPoint);
                }
            }));
        },

        /**
        * perform query on GeoLocation
        * @param {object} Nodes and other variable for all workflows
        * @param {object} Geolocation MapPoint
        * @memberOf widgets/SiteLocator/UnifiedSearch
        */
        _geoLocationQuery: function (obj, mapPoint) {
            var locator;
            locator = new Locator(appGlobals.configData.LocatorSettings.LocatorURL);
            locator.locationToAddress(mapPoint, 100);
            locator.on("location-to-address-complete", lang.hitch(this, function (evt) {
                // if address found then add the pushpin and create buffer
                if (evt.address.address) {
                    domAttr.set(obj.txtAddress, "defaultAddress", evt.address.address.Address);
                    domAttr.set(obj.txtAddress, "value", evt.address.address.Address);
                    domConstruct.empty(obj.divAddressResults);
                    domStyle.set(obj.divAddressScrollContainer, "display", "none");
                    domStyle.set(obj.divAddressScrollContent, "display", "none");
                    this.featureGeometry[this.workflowCount] = mapPoint;
                    this.addPushPin(this.featureGeometry[this.workflowCount]);
                    // check workflow is communities and  perform geoenrichment.
                    if (this.workflowCount === 3) {
                        topic.publish("showProgressIndicator");
                        this._enrichData([mapPoint], this.workflowCount, null);
                    } else {
                        // in building, sites and business workflow, create buffer.
                        this._createBuffer(mapPoint, null, true);
                    }
                    appGlobals.shareOptions.arrStrAdderss[this.workflowCount] = evt.address.address.Address;
                }
            }));
            locator.on("error", function (error) {
                alert(error.error.details[0]);
                topic.publish("hideProgressIndicator");
            });
        },

        /**
        * perform search by address if search type is address search
        * @param {object} Nodes and other variable for all workflows
        * @memberOf widgets/SiteLocator/UnifiedSearch
        */
        _searchLocation: function (obj, searchText, thisSearchTime) {
            var nameArray = {}, searchFields, addressFieldValues, s, deferredArray, resultLength, index;
            // discard searches made obsolete by new typing from user
            if (thisSearchTime < this.lastSearchTime) {
                return;
            }
            if (searchText === "") {
                // clear results if the search string is empty and display error message
                domStyle.set(obj.imgSearchLoader, "display", "none");
                domStyle.set(obj.close, "display", "block");
                this.mapPoint = null;
                this._locatorErrBack(obj, false);
                domStyle.set(obj.divAddressScrollContainer, "display", "none");
                domStyle.set(obj.divAddressScrollContent, "display", "none");
            } else {
                nameArray[appGlobals.configData.LocatorSettings.DisplayText] = [];
                domAttr.set(obj.txtAddress, "defaultAddress", searchText);
                domStyle.set(obj.imgSearchLoader, "display", "block");
                domStyle.set(obj.close, "display", "none");
                // discard searches made obsolete by new typing from user
                if (thisSearchTime < this.lastSearchTime) {
                    return;
                }
                searchFields = [];
                // pass config setting based on tab selection
                addressFieldValues = appGlobals.configData.LocatorSettings.LocatorFilterFieldValues;

                for (s in addressFieldValues) {
                    if (addressFieldValues.hasOwnProperty(s)) {
                        searchFields.push(addressFieldValues[s]);
                    }
                }
                deferredArray = [];

                if (appGlobals.configData.Workflows[this.workflowCount].SearchSettings) {
                    // get deferred for searching for search term in each feature layer in workflow in order
                    for (index = 0; index < appGlobals.configData.Workflows[this.workflowCount].SearchSettings.length; index++) {
                        this._layerSearchResults(deferredArray, appGlobals.configData.Workflows[this.workflowCount].SearchSettings[index], obj, searchText);
                    }
                }
                this._getAddressSearchResults(deferredArray, searchText, obj);
                // when deferred all complete, process the list in workflow order followed by the geocoding
                all(deferredArray).then(lang.hitch(this, function (result) {
                    var num, i, key, order, resultAttributes;
                    domStyle.set(obj.divAddressScrollContainer, "display", "block");
                    // discard searches made obsolete by new typing from user
                    if (thisSearchTime < this.lastSearchTime) {
                        return;
                    }
                    // check the result having the data or not
                    if (result) {
                        if (result.length > 0) {
                            for (num = 0; num < result.length; num++) {
                                if (result[num]) {
                                    if (result[num].layerSearchSettings && appGlobals.configData.Workflows[this.workflowCount].SearchSettings && appGlobals.configData.Workflows[this.workflowCount].SearchSettings[num]) {
                                        key = appGlobals.configData.Workflows[this.workflowCount].SearchSettings[num].SearchDisplayTitle;
                                        nameArray[key] = [];
                                        if (result[num].featureSet && result[num].featureSet.features) {
                                            for (order = 0; order < result[num].featureSet.features.length; order++) {
                                                resultAttributes = result[num].featureSet.features[order].attributes;
                                                //set default value for fields if its value is null or undefined
                                                for (i in resultAttributes) {
                                                    if (resultAttributes.hasOwnProperty(i)) {
                                                        if (!resultAttributes[i]) {
                                                            resultAttributes[i] = appGlobals.configData.ShowNullValueAs;
                                                        }
                                                    }
                                                }
                                                //add feature data into nameArray
                                                if (nameArray[key].length < appGlobals.configData.LocatorSettings.MaxResults) {
                                                    nameArray[key].push({
                                                        name: string.substitute(appGlobals.configData.Workflows[this.workflowCount].SearchSettings[num].SearchDisplayFields, result[num].featureSet.features[order].attributes),
                                                        attributes: resultAttributes,
                                                        fields: result[num].fields,
                                                        layer: appGlobals.configData.Workflows[this.workflowCount].SearchSettings[num],
                                                        geometry: result[num].featureSet.features[order].geometry
                                                    });
                                                }
                                            }
                                        }
                                    } else if (result[num].length) {
                                        this._addressResult(result[num], nameArray, searchFields);
                                    }
                                    //result length in case of address
                                    if (result[num].length) {
                                        resultLength = result[num].length;
                                    } else if (result[num].featureSet && result[num].featureSet.features.length > 0) {
                                        //result length in case of features
                                        resultLength = result[num].featureSet.features.length;
                                    }
                                }
                            }
                            this._showLocatedAddress(nameArray, resultLength, obj, searchText);
                        }
                    } else {
                        this.mapPoint = null;
                        this._locatorErrBack(obj, true);
                    }
                }));
            }
        },

        /**
        * get results from locator service
        * @param {object} deferredArray
        * @param {object} searchText
        * @memberOf widgets/SiteLocator/UnifiedSearch
        */
        _getAddressSearchResults: function (deferredArray, searchText, obj) {
            var addressField = {}, options, searchFieldName, baseMapExtent, locator, locatorDef, deferred, basemapId, selectedBasemap = appGlobals.configData.BaseMapLayers[appGlobals.shareOptions.selectedBasemapIndex];
            // call locator service specified in configuration file
            locator = new Locator(appGlobals.configData.LocatorSettings.LocatorURL);
            searchFieldName = appGlobals.configData.LocatorSettings.LocatorParameters.SearchField;
            addressField[searchFieldName] = searchText;
            //get full extent of selected basemap
            if (selectedBasemap.length) {
                basemapId = selectedBasemap[0].BasemapId;
            } else {
                basemapId = selectedBasemap.BasemapId;
            }
            if (this.map.getLayer(basemapId)) {
                baseMapExtent = this.map.getLayer(basemapId).fullExtent;
            }
            // options contains address, outFields and basemap extent for locator service
            options = {};
            options.address = addressField;
            options.outFields = appGlobals.configData.LocatorSettings.LocatorOutFields;
            options[appGlobals.configData.LocatorSettings.LocatorParameters.SearchBoundaryField] = baseMapExtent;
            locator.outSpatialReference = this.map.spatialReference;

            locatorDef = locator.addressToLocations(options);
            // candidates contains results from locator service
            locator.on("address-to-locations-complete", lang.hitch(this, function (candidates) {
                deferred = new Deferred();
                deferred.resolve(candidates);
                return deferred.promise;
            }), function () {
                domStyle.set(obj.imgSearchLoader, "display", "none");
                domStyle.set(obj.close, "display", "block");
                this._locatorErrBack(obj, true);
            });
            deferredArray.push(locatorDef);
        },
        /**
        * query layer for searched result
        * @param {array} deferred array to push query result
        * @param {object} an instance of services
        * @param {object} obj
        * @param {string} searchText
        * @memberOf widgets/SiteLocator/UnifiedSearch
        */
        _layerSearchResults: function (deferredArray, layerobject, obj, searchText) {
            var queryTask, queryLayer, deferred;
            domStyle.set(obj.imgSearchLoader, "display", "block");
            domStyle.set(obj.close, "display", "none");
            deferred = new Deferred();
            // if QueryURL is present for the configured layer
            if (layerobject.QueryURL) {
                queryTask = new QueryTask(layerobject.QueryURL);
                queryLayer = new Query();
                queryLayer.where = string.substitute(layerobject.SearchExpression, [searchText]);
                queryLayer.outSpatialReference = this.map.spatialReference;
                // set return geometry true if object id field  is not available in layer
                queryLayer.returnGeometry = layerobject.objectIDField ? false : true;
                queryLayer.maxAllowableOffset = 100;
                queryLayer.outFields = ["*"];
                queryTask.execute(queryLayer, lang.hitch(this, function (featureSet) {
                    var featureObject = {
                        "featureSet": featureSet,
                        "layerSearchSettings": layerobject
                    };
                    deferred.resolve(featureObject);
                }), function (err) {
                    deferred.resolve();
                    alert(err.message);
                });
                deferredArray.push(deferred);
            }
        },

        /**
        * filter valid results from results returned by locator service
        * @param {object} candidates Contains results from locator service
        * @memberOf widgets/SiteLocator/UnifiedSearch
        */
        _showLocatedAddress: function (candidates, resultLength, obj) {
            var addrListCount = 0, noResultCount = 0, candidatesCount = 0, addrList = [], divAddressSearchCell, divAddressCounty, candidate, listContainer, i, candidateName;
            domConstruct.empty(obj.divAddressResults);
            if (lang.trim(obj.txtAddress.value) === "") {
                obj.txtAddress.focus();
                domConstruct.empty(obj.divAddressResults);
                domStyle.set(obj.imgSearchLoader, "display", "none");
                domStyle.set(obj.close, "display", "block");
                return;
            }

            /**
            * display all the located address in the address container
            * 'this.divAddressResults' div dom element contains located addresses, created in widget template
            */
            domStyle.set(obj.divAddressScrollContainer, "display", "block");
            domStyle.set(obj.divAddressScrollContent, "display", "block");
            if (resultLength > 0) {
                for (candidateName in candidates) {
                    if (candidates.hasOwnProperty(candidateName)) {
                        candidatesCount++;
                        if (candidates[candidateName].length > 0) {
                            divAddressCounty = domConstruct.create("div", { "class": "esriCTSearchGroupRow esriCTBottomBorder esriCTResultColor esriCTCursorPointer esriCTAddressCounty" }, obj.divAddressResults);
                            divAddressSearchCell = domConstruct.create("div", { "class": "esriCTSearchGroupCell" }, divAddressCounty);
                            candidate = candidateName + " (" + candidates[candidateName].length + ")";
                            domConstruct.create("div", { "innerHTML": "+", "class": "esriCTPlusMinus" }, divAddressSearchCell);
                            domConstruct.create("div", { "innerHTML": candidate, "class": "esriCTGroupList" }, divAddressSearchCell);
                            domStyle.set(obj.imgSearchLoader, "display", "none");
                            domStyle.set(obj.close, "display", "block");
                            addrList.push(divAddressSearchCell);
                            this._toggleAddressList(addrList, addrListCount);
                            addrListCount++;
                            listContainer = domConstruct.create("div", { "class": "listContainer esriCTHideAddressList" }, obj.divAddressResults);
                            for (i = 0; i < candidates[candidateName].length; i++) {
                                this._displayValidLocations(candidates[candidateName][i], i, candidates[candidateName], listContainer, obj);
                            }
                        } else {
                            noResultCount++;
                        }
                    }
                }
                if (noResultCount === candidatesCount) {
                    this.mapPoint = null;
                    this._locatorErrBack(obj, true);
                }
            } else {
                this.mapPoint = null;
                this._locatorErrBack(obj, true);
            }
        },

        /**
        * perform search by address if search type is address search
        * @param {array} array of address
        * @param {number} count of address in address list
        * @memberOf widgets/Sitelocator/UnifiedSearch
        */
        _toggleAddressList: function (addressList, idx) {
            on(addressList[idx], "click", function () {
                var listStatusSymbol, outputContainer, plusMinusContainer;
                outputContainer = query(".listContainer", this.parentElement.parentElement)[idx];
                plusMinusContainer = query(".esriCTPlusMinus", this.parentElement.parentElement)[idx];
                if (outputContainer && plusMinusContainer) {
                    if (domClass.contains(outputContainer, "esriCTShowAddressList")) {
                        domClass.toggle(outputContainer, "esriCTShowAddressList");
                        listStatusSymbol = (domAttr.get(plusMinusContainer, "innerHTML") === "+") ? "-" : "+";
                        domAttr.set(plusMinusContainer, "innerHTML", listStatusSymbol);
                        return;
                    }
                    domClass.add(outputContainer, "esriCTShowAddressList");
                    domAttr.set(plusMinusContainer, "innerHTML", "-");
                }
            });
        },

        /**
        * search address on every key press
        * @param {object} evt Keyup event
        * @param {string} obj
        * @memberOf widgets/Sitelocator/UnifiedSearch
        */
        _submitAddress: function (evt, obj) {
            if (evt) {
                /**
                * Enter key immediately starts search
                */
                if (evt.keyCode === keys.ENTER) {
                    this._locateAddress(obj, true);
                    return;
                }

                /**
                * do not perform auto complete search if alphabets,
                * numbers,numpad keys,comma,ctl+v,ctrl +x,delete or
                * backspace is pressed
                */
                if (evt.ctrlKey || evt.altKey ||
                            evt.keyCode === keys.UP_ARROW || evt.keyCode === keys.DOWN_ARROW ||
                            evt.keyCode === keys.LEFT_ARROW || evt.keyCode === keys.RIGHT_ARROW ||
                            evt.keyCode === keys.HOME || evt.keyCode === keys.END ||
                            evt.keyCode === keys.CTRL || evt.keyCode === keys.SHIFT) {
                    evt.cancelBubble = true;
                    evt.stopPropagation();
                    domStyle.set(obj.imgSearchLoader, "display", "none");
                    domStyle.set(obj.close, "display", "block");
                    return;
                }
                // call locator service
                this._locateAddress(obj, false);
            }
        },

        /**
        * perform search by address if search type is address search
        * @param {object} obj contains data for selected workflow
        * @param {object} launchImmediately
        * @memberOf widgets/SiteLocator/UnifiedSearch
        */
        _locateAddress: function (obj, launchImmediately) {
            var searchText = lang.trim(obj.txtAddress.value);
            if (launchImmediately || this.lastSearchString !== searchText) {
                this.lastSearchString = searchText;
                // clear any staged search
                clearTimeout(this.stagedSearch);
                // hide existing results
                domConstruct.empty(obj.divAddressResults);
            }
            // stage a new search, which will launch if no new searches show up before the timeout
            this.stagedSearch = setTimeout(lang.hitch(this, function () {
                var thisSearchTime;
                // replace search type-in box' clear X with a busy cursor
                domStyle.set(obj.imgSearchLoader, "display", "none");
                domStyle.set(obj.close, "display", "block");
                domStyle.set(obj.divAddressScrollContainer, "display", "none");
                domStyle.set(obj.divAddressScrollContent, "display", "none");
                // launch a search after recording when the search began
                this.lastSearchTime = thisSearchTime = (new Date()).getTime();
                if (obj.addressWorkflowCount === 3) {
                    this._standardGeoQuery(obj);
                } else {
                    this._searchLocation(obj, lang.trim(obj.txtAddress.value), thisSearchTime);
                }
            }), (launchImmediately ? 0 : 500));
        },

        /**
        * perform search by address if search type is address search
        * @param {object} candidate contains the address result
        * @param {int} index of address
        * @param {object} candidateName contain the name of result
        * @param {object} listContainer is div which stored address result
        * @param {object} obj contains data for selected workflow
        * @memberOf widgets/SiteLocator/UnifiedSearch
        */
        _displayValidLocations: function (candidate, index, candidateName, listContainer, obj) {
            var candidateAddress, esriCTSearchList, layer;
            esriCTSearchList = domConstruct.create("div", { "class": "esriCTSearchListPanel" }, listContainer);
            candidateAddress = domConstruct.create("div", { "class": "esriCTContentBottomBorder esriCTCursorPointer" }, esriCTSearchList);
            domAttr.set(candidateAddress, "index", index);
            try {
                if (candidate.name) {
                    domAttr.set(candidateAddress, "innerHTML", candidate.name);
                } else {
                    domAttr.set(candidateAddress, "innerHTML", candidate);
                }
                if (candidate.attributes.location) {
                    domAttr.set(candidateAddress, "x", candidate.attributes.location.x);
                    domAttr.set(candidateAddress, "y", candidate.attributes.location.y);
                    domAttr.set(candidateAddress, "address", string.substitute(appGlobals.configData.LocatorSettings.DisplayField, candidate.attributes.attributes));
                }
            } catch (err) {
                alert(sharedNls.errorMessages.falseConfigParams);
            }
            on(candidateAddress, "click", lang.hitch(this, function (evt) {
                var target, isValid;
                topic.publish("showProgressIndicator");
                // check the address entered from communities workflow and perform geoenrichment.
                if (obj.addressWorkflowCount === 3) {
                    domConstruct.empty(obj.divAddressResults);
                    this.txtAddressCommunities.value = candidate.name;
                    appGlobals.shareOptions.arrStrAdderss[obj.addressWorkflowCount] = lang.trim(this.txtAddressCommunities.value);
                    domStyle.set(obj.divAddressScrollContainer, "display", "none");
                    domStyle.set(obj.divAddressScrollContent, "display", "none");
                    this._enrichData(null, obj.addressWorkflowCount, candidate);
                } else {
                    // check the infowindow is visible on map
                    if (this.map.infoWindow) {
                        this.map.infoWindow.hide();
                    }
                    if (obj.addressWorkflowCount === 0 && domClass.contains(this.filterIcon, "esriCTFilterEnabled")) {
                        domClass.add(this.clearFilterBuilding, "esriCTClearFilterIconEnable");
                    } else if (obj.addressWorkflowCount === 1 && domClass.contains(this.filterIconSites, "esriCTFilterEnabled")) {
                        domClass.add(this.clearFilterSites, "esriCTClearFilterIconEnable");
                    } else {
                        if (domClass.contains(this.filterIconBusiness, "esriCTFilterEnabled")) {
                            domClass.add(this.clearFilterBusiness, "esriCTClearFilterIconEnable");
                        }
                    }
                    // validate range filter values in building, sites and business tab and set the default address
                    isValid = this._validateRangeFilterValues();
                    if (isValid) {
                        obj.txtAddress.value = candidateAddress.innerHTML;
                        domAttr.set(obj.txtAddress, "defaultAddress", obj.txtAddress.value);

                        // check the selected value contains sorted strings then set the dropdown value to select for workflows
                        if (this.selectedValue[this.workflowCount] && this.selectBusinessSortForBuilding && this.workflowCount === 0) {
                            this.selectedValue[this.workflowCount] = null;
                            appGlobals.shareOptions.sortingData = null;
                            this.selectBusinessSortForBuilding.set("value", sharedNls.titles.select);
                        } else if (this.selectedValue[this.workflowCount] && this.selectBusinessSortForSites && this.workflowCount === 1) {
                            this.selectedValue[this.workflowCount] = null;
                            appGlobals.shareOptions.sortingData = null;
                            this.selectBusinessSortForSites.set("value", sharedNls.titles.select);
                        } else if (this.selectSortOption && this.totalArray && this.workflowCount === 2) {
                            this.totalArray = [];
                            appGlobals.shareOptions.toFromBussinessFilter = null;
                            this.selectSortOption.set("value", sharedNls.titles.select);
                        }

                    }
                    if (candidate.attributes.location) {
                        target = evt.currentTarget || evt.srcElement;
                        this.mapPoint = new Point(domAttr.get(target, "x"), domAttr.get(target, "y"), this.map.spatialReference);
                        this._locateAddressOnMap(this.mapPoint, obj, isValid);
                    } else {
                        if (candidateName[domAttr.get(candidateAddress, "index", index)]) {
                            layer = candidateName[domAttr.get(candidateAddress, "index", index)].layer;
                            if (!candidate.geometry) {
                                this._getSelectedCandidateGeometry(layer, candidate, obj, isValid);
                            } else {
                                this.mapPoint = new Point(candidate.geometry.x, candidate.geometry.y, this.map.spatialReference);
                                this._locateAddressOnMap(this.mapPoint, obj, isValid);
                            }
                        }
                    }
                }
            }));
        },

        /**
        * fetch geometry of the selected candidate
        * @param {object} layerobject - selected candidate's layer details
        * @param {object} candidate - selected candidate
        * @param {object} obj contains data for selected workflow
        * @param {boolean} isValid - flag to indicate if the applied filter is valid or not
        * @memberOf widgets/SiteLocator/UnifiedSearch
        */
        _getSelectedCandidateGeometry: function (layerobject, candidate, obj, isValid) {
            var queryTask, queryLayer, currentTime;
            // if QueryURL is present for the selected candidate's layer, query the layer with the selected candidates objectid to fetch the candidate geometry
            if (layerobject.QueryURL) {
                currentTime = new Date();
                queryTask = new QueryTask(layerobject.QueryURL);
                queryLayer = new Query();
                queryLayer.where = layerobject.objectIDField + " =" + candidate.attributes[layerobject.objectIDField] + " AND " + currentTime.getTime().toString() + "=" + currentTime.getTime().toString();
                queryLayer.outSpatialReference = this.map.spatialReference;
                queryLayer.returnGeometry = true;
                queryTask.execute(queryLayer, lang.hitch(this, function (featureSet) {
                    this.mapPoint = featureSet.features[0].geometry;
                    this._locateAddressOnMap(this.mapPoint, obj, isValid);
                    topic.publish("hideProgressIndicator");
                }), function (err) {
                    alert(err.message);
                    topic.publish("hideProgressIndicator");
                });
            }
        },

        /**
        * perform search by address if search type is address search
        * @param {object} Map point
        * @param {object} obj contains data for selected workflow
        * @memberOf widgets/SiteLocator/UnifiedSearch
        */
        _locateAddressOnMap: function (mapPoint, obj, isValid) {
            var geoLocationPushpin, locatorMarkupSymbol, graphic;
            // if the applied filter is valid
            if (isValid) {
                if (!this.isSharedExtent) {
                    this.map.centerAt(mapPoint);
                }
                // create pushpin to locate address on map
                geoLocationPushpin = dojoConfig.baseURL + appGlobals.configData.LocatorSettings.DefaultLocatorSymbol;
                locatorMarkupSymbol = new PictureMarkerSymbol(geoLocationPushpin, appGlobals.configData.LocatorSettings.MarkupSymbolSize.width, appGlobals.configData.LocatorSettings.MarkupSymbolSize.height);
                graphic = new Graphic(mapPoint, locatorMarkupSymbol, {}, null);
                // clear all graphics layers, and add pushpin
                this.map.getLayer("esriFeatureGraphicsLayer").clear();
                this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
                if (obj) {
                    obj.lastSearchString = lang.trim(obj.txtAddress.value);
                    appGlobals.shareOptions.arrStrAdderss[this.workflowCount] = obj.lastSearchString;
                }
                // create buffer around the selected address
                this._createBuffer(mapPoint, appGlobals.shareOptions.arrBufferDistance[this.workflowCount], false);
                if (obj) {
                    domConstruct.empty(obj.divAddressResults);
                    domStyle.set(obj.divAddressScrollContainer, "display", "none");
                    domStyle.set(obj.divAddressScrollContent, "display", "none");
                }
            } else {
                obj.txtAddress.value = obj.lastSearchString;
                alert(sharedNls.errorMessages.invalidInput);
                if (this.workflowCount === 0 || this.workflowCount === 1 || this.workflowCount === 2) {
                    this.clearTextValuesOfFilters();
                }
                topic.publish("hideProgressIndicator");
            }
        },

        /**
        * display error message if locator service fails or does not return any results
        * @param {object} obj contains data for selected workflow
        * @param {boolean} showMessage
        * @memberOf widgets/siteLocator/UnifiedSearch
        */
        _locatorErrBack: function (obj, showMessage) {
            var errorAddressCounty, resultDiv;
            domStyle.set(obj.divAddressScrollContainer, "display", "block");
            domStyle.set(obj.divAddressScrollContent, "display", "block");
            domConstruct.empty(obj.divAddressResults);
            domStyle.set(obj.imgSearchLoader, "display", "none");
            domStyle.set(obj.close, "display", "block");
            if (showMessage) {
                errorAddressCounty = domConstruct.create("div", { "class": "esriCTBottomBorder esriCTAddressCounty" }, obj.divAddressResults);
                domAttr.set(errorAddressCounty, "innerHTML", sharedNls.errorMessages.invalidSearch);
                if (this.workflowCount === 0 && this.buildingTabData) {
                    this.buildingTabData = [];
                } else if (this.workflowCount === 1 && this.sitesTabData) {
                    this.sitesTabData = [];
                } else if (this.workflowCount === 2) {
                    resultDiv = query('.esriCTRightPanel');
                    if (this.totalArray) {
                        this.totalArray = [];
                    }
                    if (resultDiv) {
                        domConstruct.empty(resultDiv);
                        domStyle.set(resultDiv, "display", "none");
                    }
                }
            }
        },

        /**
        * clear default value from search textbox
        * @param {object} evt Dblclick event
        * @param {object} obj contains data for selected workflow
        * @memberOf widgets/SiteLocator/UnifiedSearch
        */
        _clearDefaultText: function (evt, obj) {
            var target = window.event ? window.event.srcElement : evt ? evt.target : null;
            if (!target) {
                return;
            }
            target.style.color = "#FFF";
            target.value = '';
            obj.txtAddress.value = "";
            domAttr.set(obj.txtAddress, "defaultAddress", obj.txtAddress.value);
        },

        /**
        * set default value to search textbox
        * @param {object} evt Blur event
        * @param {object} obj contains data for selected workflow
        * @memberOf widgets/SiteLocator/UnifiedSearch
        */
        _replaceDefaultText: function (evt, obj) {
            var target = window.event ? window.event.srcElement : evt ? evt.target : null;
            if (!target) {
                return;
            }
            this._resetTargetValue(target, "defaultAddress", obj);
        },

        /**
        * address result handler for unified search
        * @param {object} Address candidate
        * @param {array} array of address name
        * @param {array} search fields
        * @param {string} address field name
        * @memberOf widgets/SiteLocator/UnifiedSearch
        */
        _addressResult: function (candidates, nameArray, searchFields) {
            var order, j;
            for (order = 0; order < candidates.length; order++) {
                if (candidates[order].attributes[appGlobals.configData.LocatorSettings.AddressMatchScore.Field] > appGlobals.configData.LocatorSettings.AddressMatchScore.Value) {
                    for (j in searchFields) {
                        if (searchFields.hasOwnProperty(j)) {
                            if (candidates[order].attributes[appGlobals.configData.LocatorSettings.LocatorFilterFieldName] === searchFields[j]) {
                                if (nameArray[appGlobals.configData.LocatorSettings.DisplayText].length < appGlobals.configData.LocatorSettings.MaxResults) {
                                    nameArray[appGlobals.configData.LocatorSettings.DisplayText].push({
                                        name: string.substitute(appGlobals.configData.LocatorSettings.DisplayField, candidates[order].attributes),
                                        attributes: candidates[order]
                                    });
                                }
                            }
                        }
                    }
                }
            }
        },

        /**
        * reset target value for unified search
        * @param {object} target
        * @param {object} title
        * @memberOf widgets/SiteLocator/UnifiedSearch
        */
        _resetTargetValue: function (target, title) {
            if (target.value === '' && domAttr.get(target, title)) {
                target.value = target.title;
                if (target.title === "") {
                    target.value = domAttr.get(target, title);
                }
            }
            if (domClass.contains(target, "esriCTColorChange")) {
                domClass.remove(target, "esriCTColorChange");
            }
            domClass.add(target, "esriCTBlurColorChange");
        },

        /**
        * hide text for unified search
        * @param {object} obj contains data for selected workflow
        * @memberOf widgets/SiteLocator/UnifiedSearch
        */
        _hideText: function (obj) {
            obj.txtAddress.value = "";
            domConstruct.empty(obj.divAddressResults);
            domAttr.set(obj.txtAddress, "defaultAddress", obj.txtAddress.value);
            domStyle.set(obj.divAddressScrollContainer, "display", "none");
            domStyle.set(obj.divAddressScrollContent, "display", "none");
        },

        /**
        * standard geometry query using enrichment service
        * @param {object} obj contains data for selected workflow
        * @memberOf widgets/SiteLocator/UnifiedSearch
        */
        _standardGeoQuery: function (obj) {
            var standardGeoQueryURL, standardGeoQueryRequest, arrResult = [];
            domConstruct.empty(this.communityMainDiv);
            domStyle.set(obj.imgSearchLoader, "display", "block");
            domStyle.set(obj.close, "display", "none");
            domAttr.set(obj.txtAddress, "defaultAddress", obj.txtAddress.value);
            standardGeoQueryURL = appGlobals.configData.GeoEnrichmentService + "/StandardGeographyQuery/execute";
            // set standard geographic query  parameter
            standardGeoQueryRequest = esriRequest({
                url: standardGeoQueryURL,
                content: {
                    f: "pjson",
                    inSR: this.map.spatialReference.wkid,
                    outSR: this.map.spatialReference.wkid,
                    geographyQuery: lang.trim(obj.txtAddress.value) + "*",
                    sourceCountry: appGlobals.configData.Workflows[obj.addressWorkflowCount].FilterSettings.StandardGeographyQuery.SourceCountry,
                    featureLimit: appGlobals.configData.Workflows[obj.addressWorkflowCount].FilterSettings.StandardGeographyQuery.FeatureLimit
                },
                handleAs: "json"
            });
            standardGeoQueryRequest.then(lang.hitch(this, function (data) {
                var i;
                arrResult.Address = [];
                for (i = 0; i < data.results[0].value.features.length; i++) {
                    arrResult.Address.push({
                        attributes: data.results[0].value.features[i].attributes,
                        name: data.results[0].value.features[i].attributes.AreaName + ", " + data.results[0].value.features[i].attributes.MajorSubdivisionAbbr
                    });
                }
                this._showLocatedAddress(arrResult, arrResult.Address.length, obj);
            }), function (error) {
                alert(error.message);
                topic.publish("hideProgressIndicator");
                domStyle.set(obj.imgSearchLoader, "display", "none");
                domStyle.set(obj.close, "display", "block");
            });
        }
    });
});
