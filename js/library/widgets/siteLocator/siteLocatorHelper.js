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
    "dojo/dom-construct",
    "dojo/on",
    "dojo/topic",
    "dojo/_base/array",
    "dojo/_base/html",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/query",
    "dojo/dom-class",
    "dojo/_base/Color",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "esri/tasks/GeometryService",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/PictureMarkerSymbol",
    "esri/graphic",
    "esri/layers/GraphicsLayer",
    "esri/tasks/BufferParameters",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "dijit/form/HorizontalSlider",
    "dijit/form/HorizontalRule",
    "../siteLocator/unifiedSearch"

], function (declare, domConstruct, on, topic, array, html, lang, domStyle, domAttr, query, domClass, Color, Query, QueryTask, GeometryService, SimpleLineSymbol, SimpleFillSymbol, SimpleMarkerSymbol, PictureMarkerSymbol, Graphic, GraphicsLayer, BufferParameters, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, sharedNls, HorizontalSlider, HorizontalRule, unifiedSearch) {

    //========================================================================================================================//

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, unifiedSearch], {
        sliderDistance: null,
        selectedValue: {},
        areaSortBuilding: null,
        areaSortSites: null,
        lastGeometry: [null, null, null, null],
        arrGeoenrichData: [null, null, null, null],
        isIndexShared: false,
        _sliderCollection: [],

        /**
        * create horizontal slider for all tab and set minimum maximum value of slider
        * @param container node, horizontal rule node and slider value
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _createHorizontalSlider: function (sliderContainer, horizontalRuleContainer, divSliderValue, tabCount, bufferDistance) {
            var _self, horizontalSlider, sliderId, horizontalRule, sliderInstance = {};
            sliderId = "slider" + domAttr.get(sliderContainer, "data-dojo-attach-point");
            horizontalRule = new HorizontalRule({
                "class": "horizontalRule"
            }, horizontalRuleContainer);
            horizontalRule.domNode.firstChild.style.border = "none";
            horizontalRule.domNode.lastChild.style.border = "none";
            horizontalRule.domNode.lastChild.style.right = "0" + "px";
            if (!bufferDistance) {
                if (appGlobals.configData.DistanceUnitSettings.MinimumValue >= 0) {
                    bufferDistance = appGlobals.configData.DistanceUnitSettings.MinimumValue;
                } else {
                    bufferDistance = 0;
                    appGlobals.configData.DistanceUnitSettings.MinimumValue = bufferDistance;
                }
            }
            // create horizontal slider object and set the slider parameter
            horizontalSlider = new HorizontalSlider({
                intermediateChanges: false,
                "class": "horizontalSlider",
                minimum: appGlobals.configData.DistanceUnitSettings.MinimumValue,
                maximum: appGlobals.configData.DistanceUnitSettings.MaximumValue,
                value: bufferDistance,
                id: sliderId
            }, sliderContainer);
            sliderInstance.id = tabCount;
            sliderInstance.slider = horizontalSlider;
            sliderInstance.divSliderValue = divSliderValue;
            this._sliderCollection.push(sliderInstance);
            horizontalSlider.tabCount = tabCount;
            appGlobals.shareOptions.arrBufferDistance[tabCount] = bufferDistance;
            this.unitValues[tabCount] = this._getDistanceUnit(appGlobals.configData.DistanceUnitSettings.DistanceUnitName);
            if (appGlobals.configData.DistanceUnitSettings.MaximumValue > 0) {
                horizontalRule.domNode.lastChild.innerHTML = appGlobals.configData.DistanceUnitSettings.MaximumValue;
                horizontalSlider.maximum = appGlobals.configData.DistanceUnitSettings.MaximumValue;
            } else {
                horizontalRule.domNode.lastChild.innerHTML = 1000;
                horizontalSlider.maximum = 1000;
            }
            if (appGlobals.configData.DistanceUnitSettings.MinimumValue >= 0) {
                horizontalRule.domNode.firstChild.innerHTML = appGlobals.configData.DistanceUnitSettings.MinimumValue;
            } else {
                horizontalRule.domNode.firstChild.innerHTML = 0;
            }

            domStyle.set(horizontalRule.domNode.lastChild, "text-align", "right");
            domStyle.set(horizontalRule.domNode.lastChild, "width", "100%");
            domStyle.set(horizontalRule.domNode.lastChild, "left", "initial");
            domAttr.set(divSliderValue, "distanceUnit", appGlobals.configData.DistanceUnitSettings.DistanceUnitName.toString());
            domAttr.set(divSliderValue, "innerHTML", horizontalSlider.value.toString() + " " + appGlobals.configData.DistanceUnitSettings.DistanceUnitName);
            _self = this;

            /**
            * call back for slider change event
            * @param {object} slider value
            * @memberOf widgets/siteLocator/siteLocatorHelper
            */
            on(horizontalSlider, "change", function (value) {
                if (Number(value) > Number(horizontalSlider.maximum)) {
                    horizontalSlider.setValue(horizontalSlider.maximum);
                }
                // set change slider value for all workflows
                domAttr.set(divSliderValue, "innerHTML", Math.round(value) + " " + domAttr.get(divSliderValue, "distanceUnit"));
                if (_self.workflowCount === 0 && domClass.contains(_self.filterIcon, "esriCTFilterEnabled")) {
                    domClass.add(_self.clearFilterBuilding, "esriCTClearFilterIconEnable");
                } else if (_self.workflowCount === 1 && domClass.contains(_self.filterIconSites, "esriCTFilterEnabled")) {
                    domClass.add(_self.clearFilterSites, "esriCTClearFilterIconEnable");
                } else if (_self.workflowCount === 2 && domClass.contains(_self.clearFilterBusiness, "esriCTClearFilterIconEnable")) {
                    domClass.add(_self.clearFilterBusiness, "esriCTClearFilterIconEnable");
                }
                setTimeout(function () {
                    if (appGlobals.shareOptions.arrBufferDistance[_self.workflowCount] !== value) {
                        if (!_self.sliderReset) {
                            if (_self.featureGeometry && _self.featureGeometry[_self.workflowCount]) {
                                // call create buffer based on specified geometry
                                _self._createBuffer(_self.featureGeometry[_self.workflowCount], Math.round(value), true);
                                // set the "sorting" drop down value to first index value(Select) for all workflows
                                if (_self.workflowCount === 0 && _self.selectBusinessSortForBuilding) {
                                    appGlobals.shareOptions.sortingData = null;
                                    _self.selectBusinessSortForBuilding.set("value", sharedNls.titles.select);
                                } else if (_self.workflowCount === 1 && _self.selectBusinessSortForSites) {
                                    appGlobals.shareOptions.sortingData = null;
                                    _self.selectBusinessSortForSites.set("value", sharedNls.titles.select);
                                } else if (_self.workflowCount === 2 && _self.selectSortOption) {
                                    appGlobals.shareOptions.sortingData = null;
                                    _self.selectSortOption.set("value", sharedNls.titles.select);
                                } else {
                                    appGlobals.shareOptions.arrBufferDistance[_self.workflowCount] = Math.round(value);
                                }
                            } else {
                                appGlobals.shareOptions.arrBufferDistance[_self.workflowCount] = Math.round(value);
                            }
                        } else {
                            _self.sliderReset = false;
                            topic.publish("hideProgressIndicator");
                        }
                    } else {
                        _self.sliderReset = false;
                    }
                }, 500);
            });
        },

        /**
        * set visibility for enabled/disabled tab{work flow}
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _setTabVisibility: function () {
            var j, countEnabledTab = 0, arrEnabledTab = [];
            // loop all workflows from config file
            for (j = 0; j < appGlobals.configData.Workflows.length; j++) {
                // check visibility of workflows and accordingly display the container
                if (!appGlobals.configData.Workflows[j].Enabled) {
                    switch (appGlobals.configData.Workflows[j].Name) {
                    case appGlobals.configData.Workflows[0].Name:
                        domStyle.set(this.esriCTsearchContainerBuilding, "display", "none");
                        domStyle.set(this.searchContentBuilding, "display", "none");
                        break;
                    case appGlobals.configData.Workflows[1].Name:
                        domStyle.set(this.esriCTsearchContainerSites, "display", "none");
                        domStyle.set(this.searchContentSites, "display", "none");
                        break;
                    case appGlobals.configData.Workflows[2].Name:
                        domStyle.set(this.esriCTsearchContainerBusiness, "display", "none");
                        domStyle.set(this.searchContentBusiness, "display", "none");
                        break;
                    case appGlobals.configData.Workflows[3].Name:
                        domStyle.set(this.esriCTsearchContainerCommunities, "display", "none");
                        domStyle.set(this.searchContentCommunities, "display", "none");
                        break;
                    }
                } else {
                    // check visibility of workflows and push the data(container and content node) in an array
                    switch (appGlobals.configData.Workflows[j].Name) {
                    case appGlobals.configData.Workflows[0].Name:
                        arrEnabledTab.push({ Container: this.esriCTsearchContainerBuilding, Content: this.searchContentBuilding });
                        this._createFilteredFeatureLayer(j);
                        break;
                    case appGlobals.configData.Workflows[1].Name:
                        arrEnabledTab.push({ Container: this.esriCTsearchContainerSites, Content: this.searchContentSites });
                        this._createFilteredFeatureLayer(j);
                        break;
                    case appGlobals.configData.Workflows[2].Name:
                        arrEnabledTab.push({ Container: this.esriCTsearchContainerBusiness, Content: this.searchContentBusiness });
                        break;
                    case appGlobals.configData.Workflows[3].Name:
                        arrEnabledTab.push({ Container: this.esriCTsearchContainerCommunities, Content: this.searchContentCommunities });
                        if (!appGlobals.configData.Workflows[3].EnableSearch) {
                            domStyle.set(this.divAddressSearchCommunities, "display", "none");
                            domStyle.set(this.searchBox, "display", "none");
                        }
                        if (!appGlobals.configData.Workflows[3].EnableDropdown) {
                            domStyle.set(this.divDropDownSearch, "display", "none");
                        }
                        if (!(appGlobals.configData.Workflows[3].EnableSearch || appGlobals.configData.Workflows[3].EnableDropdown)) {
                            domStyle.set(this.esriCTsearchContainerCommunities, "display", "none");
                            domStyle.set(this.searchContentCommunities, "display", "none");
                        }
                        break;
                    }
                    countEnabledTab++;
                }
            }
            if (countEnabledTab === 0) {
                alert(sharedNls.errorMessages.disableTab);
            } else {
                // check the shared URL for "workflowCount" to show selected tab when application is loaded first time while sharing
                if (window.location.toString().split("$workflowCount=").length > 1) {
                    this._showTab(query(".esriCTTab")[window.location.toString().split("$workflowCount=")[1].split("$")[0]], query(".esriCTContentTab")[window.location.toString().split("$workflowCount=")[1].split("$")[0]]);
                } else {
                    // call show tab
                    this._showTab(arrEnabledTab[0].Container, arrEnabledTab[0].Content);
                }
            }
        },

        /**
        * create graphic layer to display results
        * @param {int} tabIndex is workflow index
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _createFilteredFeatureLayer: function (tabIndex) {
            var filteredFeatureLayer, rendererObject = {}, layer;
            //create graphic layer instance and add it to the map
            filteredFeatureLayer = new GraphicsLayer();
            filteredFeatureLayer.id = "filteredFeatureLayer" + tabIndex;
            this.map.addLayer(filteredFeatureLayer);
            layer = this.getCurrentOperationalLayer(tabIndex);
            if (layer) {
                //set the layer renderer for graphics layer according to the respective workflow's layer
                lang.mixin(rendererObject, layer.renderer, layer.webmapRenderer);
                filteredFeatureLayer.setRenderer(rendererObject);
            }
        },

        /**
        * show tab based on selected tab
        * @param {object} node for tab container
        * @param {object} node for tab content
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _showTab: function (tabNode, contentNode) {
            var i;
            // loop all the child element of main container(divDirectionContainer)
            for (i = 0; i < this.divDirectionContainer.children.length; i++) {
                if (contentNode === this.TabContentContainer.children[i]) {
                    domStyle.set(this.TabContentContainer.children[i], "display", "block");
                    this.workflowCount = i;
                    appGlobals.shareOptions.workflowCount = i;
                    //set selected sorting option in appGlobals for selected workflow
                    appGlobals.shareOptions.sortingData = this.selectedValue[this.workflowCount];
                    this.map.graphics.clear();
                    //hide info window
                    topic.publish("hideInfoWindow");
                    this.map.getLayer("esriFeatureGraphicsLayer").clear();
                    this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                    this.map.getLayer("esriBufferGraphicsLayer").clear();
                    if (this.lastGeometry[this.workflowCount]) {
                        this.isSharedExtent = true;
                        this.showBuffer(this.lastGeometry[this.workflowCount]);
                    }
                    if (this.featureGraphics[i]) {
                        this.map.getLayer("esriFeatureGraphicsLayer").add(this.featureGraphics[i]);
                        this.map.setLevel(appGlobals.configData.ZoomLevel);
                        this.map.centerAt(this.featureGraphics[i].geometry);
                        this.map.getLayer("esriFeatureGraphicsLayer").graphics[0].show();
                    } else if (this.lastGeometry[this.workflowCount]) {
                        this.map.setExtent(this.lastGeometry[this.workflowCount][0].getExtent(), true);
                    }
                    if (this.featureGeometry[this.workflowCount]) {
                        this.addPushPin(this.featureGeometry[this.workflowCount]);
                    }
                    if (appGlobals.configData.Workflows[this.workflowCount].SearchSettings) {
                        this.operationalLayer = this.getCurrentOperationalLayer(this.workflowCount);
                    }
                    this._toggleFeatureLayer(i);
                } else {
                    domStyle.set(this.TabContentContainer.children[i], "display", "none");
                }
                if (this.arrTabClass.length !== this.divDirectionContainer.children.length) {
                    this.arrTabClass[i] = this.divDirectionContainer.children[i].className;
                }
                if (tabNode === this.divDirectionContainer.children[i]) {
                    domClass.add(this.divDirectionContainer.children[i], "esriCTsearchContainerSitesSelected", this.divDirectionContainer.children[i].className);
                } else {
                    if (this.arrTabClass.length === this.divDirectionContainer.children.length) {
                        domClass.replace(this.divDirectionContainer.children[i], this.arrTabClass[i], "esriCTsearchContainerSitesSelected");
                    }
                }
            }
        },

        /**
        * set visibility of operational layer and filtered graphics layer according to selected tab
        * @param {int} tabIndex is workflow index
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _toggleFeatureLayer: function (tabIndex) {
            //hide operational layer and graphics layer of workflows except selected workflow
            if (tabIndex === 0) {
                this._setOperationalLayerVisibility(1, false, true);
                this._setFilteredLayerVisibility(1, false);
            } else if (tabIndex === 1) {
                this._setOperationalLayerVisibility(0, false, true);
                this._setFilteredLayerVisibility(0, false);
            } else {
                this._setOperationalLayerVisibility(0, true, false);
                this._setOperationalLayerVisibility(1, true, false);
                this._setFilteredLayerVisibility(0, false);
                this._setFilteredLayerVisibility(1, false);
            }
            //do not display operational layer if graphics layer has filtered graphics
            if (this.lastGeometry[tabIndex]) {
                this._setOperationalLayerVisibility(tabIndex, false, false);
                this._setFilteredLayerVisibility(tabIndex, true);
            } else {
                //display respective operational if filter has not applied and hide graphics layer for filtered features
                this._setOperationalLayerVisibility(tabIndex, true, false);
                this._setFilteredLayerVisibility(tabIndex, false);
            }
        },

        /**
        * set visibility for workflow's layer on map
        * @param {int} tabIndex is workflow index
        * @param {boolean} isVisible flag to set visibility
        * @param {boolean} isHideInfoWindow flag to show/hide infoWindow
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _setOperationalLayerVisibility: function (tabIndex, isVisible, isHideInfoWindow) {
            var layerObject, layer, layerUrl, lastChar, mapLayerUrl, layerUrlIndex, visibleLayers, visibleLayerIndex;
            layerObject = this.getCurrentOperationalLayer(tabIndex);
            if (layerObject) {
                layerObject.hideInfo = isHideInfoWindow;
                layerUrl = layerObject.url;
                layerUrlIndex = layerUrl.split('/');
                layerUrlIndex = layerUrlIndex[layerUrlIndex.length - 1];
                for (layer in this.map._layers) {
                    if (this.map._layers.hasOwnProperty(layer)) {
                        //check layer visibility on current map scale
                        if (this.map._layers[layer].url === layerUrl) {
                            this.map._layers[layer].setVisibility(isVisible);
                        } else if (this.map._layers[layer].visibleLayers) {
                            //check map server layer visibility on current map scale
                            lastChar = this.map._layers[layer].url[this.map._layers[layer].url.length - 1];
                            if (lastChar === "/") {
                                mapLayerUrl = this.map._layers[layer].url + layerUrlIndex;
                            } else {
                                mapLayerUrl = this.map._layers[layer].url + "/" + layerUrlIndex;
                            }
                            if (mapLayerUrl === layerUrl) {
                                visibleLayers = this.map._layers[layer].visibleLayers;
                                visibleLayerIndex = array.indexOf(visibleLayers, parseInt(layerUrlIndex, 10));
                                if (isVisible) {
                                    if (visibleLayerIndex === -1) {
                                        visibleLayers.push(parseInt(layerUrlIndex, 10));
                                    }
                                } else {
                                    if (visibleLayerIndex !== -1) {
                                        visibleLayers.splice(visibleLayerIndex, 1);
                                    }
                                }
                                this.map._layers[layer].setVisibleLayers(visibleLayers);
                            }
                        }
                    }
                }
            }
        },

        /**
        * set visibility for workflow's filtered graphics layer on map
        * @param {int} tabIndex is workflow index
        * @param {boolean} isVisible flag to set visibility
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _setFilteredLayerVisibility: function (tabIndex, isVisible) {
            var filteredFeatureLayer = this.map.getLayer("filteredFeatureLayer" + tabIndex);
            if (filteredFeatureLayer) {
                filteredFeatureLayer.setVisibility(isVisible);
            }
        },

        /**
        * add features on graphics layer to display only filtered features
        * @param {object} features contains query results
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _addFeaturesOnFilteredLayer: function (features) {
            var i, filteredFeatureLayer = this.map.getLayer("filteredFeatureLayer" + this.workflowCount);
            if (filteredFeatureLayer) {
                filteredFeatureLayer.clear();
                //loop through all the resulted features to add them as graphic on graphic layer
                for (i = 0; i < features.length; i++) {
                    filteredFeatureLayer.add(features[i]);
                }
            }
        },

        /**
        * add push pin on map point
        * @param {object} map point for push pin
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        addPushPin: function (mapPoint) {
            var geoLocationPushpin, locatorMarkupSymbol, graphic;
            geoLocationPushpin = dojoConfig.baseURL + appGlobals.configData.LocatorSettings.DefaultLocatorSymbol;
            locatorMarkupSymbol = new PictureMarkerSymbol(geoLocationPushpin, appGlobals.configData.LocatorSettings.MarkupSymbolSize.width, appGlobals.configData.LocatorSettings.MarkupSymbolSize.height);
            graphic = new Graphic(mapPoint, locatorMarkupSymbol, {}, null);
            if (this.workflowCount === 3) {
                this.featureGraphics[this.workflowCount] = graphic;
            }
            this.map.getLayer("esriGraphicsLayerMapSettings").clear();
            this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
        },

        /**
        * creates list of objects to be displayed in pagination
        * @param {array} list of data for a batch
        * @param {object} Nodes to attach display list
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _createDisplayList: function (listData, containerNode) {
            if (listData) {
                var contentNode, attr, i, contentOuter, attchImages, featureInfo, j, k, attachmentImageClickDiv;
                topic.publish("hideProgressIndicator");
                domConstruct.empty(containerNode);
                // loop all the data in list and check null values and replace it with "NA"
                for (i = 0; i < listData.length; i++) {
                    for (attr in listData[i].featureData) {
                        if (listData[i].featureData.hasOwnProperty(attr)) {
                            if (listData[i].featureData[attr] === null || lang.trim(String(listData[i].featureData[attr])) === "") {
                                listData[i].featureData[attr] = appGlobals.configData.ShowNullValueAs;
                            }
                        }
                    }
                }
                if (this.workflowCount === 0) {
                    contentNode = domConstruct.create("div", { "class": "esriCTResultContentBuilding" }, containerNode);
                }
                if (this.workflowCount === 1) {
                    contentNode = domConstruct.create("div", { "class": "esriCTResultContentSites" }, containerNode);
                }
                // loop all the feature data and displayed it in container for specific workflows
                for (i = 0; i < listData.length; i++) {
                    contentOuter = domConstruct.create("div", { "class": "esriCTOuterContent" }, contentNode);
                    domAttr.set(contentOuter, "index", i);
                    // if "hasattachment" tag in layer and show attachment tag in config are true then show the image in pagination panel in building ans sites tab
                    if (this.operationalLayer.hasAttachments && appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.ResultContents.ShowAttachments) {
                        attchImages = domConstruct.create("div", { "class": "esriCTAttchImages" }, contentOuter);
                        attachmentImageClickDiv = domConstruct.create("img", { "class": "esriCTAutoWidth" }, attchImages);
                        on(attachmentImageClickDiv, "load", lang.hitch(this, this._onImageLoad));
                        this._setAttachmentIcon(listData[i], attachmentImageClickDiv, 0);
                        featureInfo = domConstruct.create("div", { "class": "esriCTFeatureInfoAttachment" }, contentOuter);
                        this.own(on(contentOuter, "click", lang.hitch(this, this._getAttchmentImageAndInformation)));

                        for (j = 0; j < appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.ResultContents.DisplayFields.length; j++) {
                            domConstruct.create("div", { "class": "esriCTfeatureField", "innerHTML": appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.ResultContents.DisplayFields[j].DisplayText + " " + listData[i].featureData[appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.ResultContents.DisplayFields[j].FieldName] }, featureInfo);
                        }
                    } else {
                        featureInfo = domConstruct.create("div", { "class": "esriCTFeatureInfo" }, contentOuter);
                        this.own(on(contentOuter, "click", lang.hitch(this, this._getAttchmentImageAndInformation)));
                        for (k = 0; k < appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.ResultContents.DisplayFields.length; k++) {
                            domConstruct.create("div", { "class": "esriCTfeatureField", "innerHTML": appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.ResultContents.DisplayFields[k].DisplayText + " " + listData[i].featureData[appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.ResultContents.DisplayFields[k].FieldName] }, featureInfo);
                        }
                    }
                }
            }
            if (window.location.toString().split("$selectedObjectIndex=").length > 1 && !this.isIndexShared) {
                if (Number(window.location.toString().split("$workflowCount=")[1].split("$")[0]) === appGlobals.shareOptions.workflowCount) {
                    this.isSharedExtent = true;
                    this.isIndexShared = true;
                    this._getAttchmentImageAndInformation(Number(window.location.toString().split("$selectedObjectIndex=")[1].split("$")[0]));
                }
            }
        },

        /**
        * perform query to get geometry and other data based on object selection from display list
        * @param {object} Selected value
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _getAttchmentImageAndInformation: function (value) {
            var index, dataSelected;
            if (isNaN(value)) {
                index = domAttr.get(value.currentTarget, "index").toString();
            } else {
                index = value.toString();
            }
            appGlobals.shareOptions.selectedObjectIndex[this.workflowCount] = index;
            topic.publish("showProgressIndicator");
            if (this.workflowCount === 0) {
                dataSelected = this.buildingTabData[index];
                this._attachmentQuery(dataSelected, this.attachmentOuterDiv, this.mainDivBuilding, this.searchContentBuilding);
            } else if (this.workflowCount === 1) {
                dataSelected = this.sitesTabData[index];
                this._attachmentQuery(dataSelected, this.attachmentOuterDivSites, this.mainDivSites, this.searchContentSites);
            }
        },

        /**
        * perform query to get geometry and layer content based on object selection from display list
        * @param {object} selected value
        * @param {object} data for selected value
        * @param {object} html node for attachment
        * @param {object} html node for main container
        * @param {object} html node search content
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _attachmentQuery: function (dataSelected, attachmentNode, mainDivNode, searchContentNode) {
            var backwardImage, backToResultDiv, arrAttachmentURL = [], backToResult, attachmentDiv, attachmentImageClickDiv, imageCount = 0, prevNextdiv,
                prevdiv, nextdiv, outfields = [], resultSelectionQuerytask, resultSelectQuery, i, j, k, geometryService, params, propertyHeaderInfo,
                attributedata, propertyInfoDiv, attributesInfo;
            domConstruct.empty(attachmentNode);
            domStyle.set(attachmentNode, "display", "block");
            domStyle.set(mainDivNode, "display", "none");
            domConstruct.create("div", { "class": "esriCTAttachmentOuterDiv" }, searchContentNode);
            backToResultDiv = domConstruct.create("div", { "class": "esriCTBackToResultImage" }, attachmentNode);
            backwardImage = domConstruct.create("div", { "class": "esriCTBackwardImage" }, backToResultDiv);
            backToResult = domConstruct.create("div", { "class": "esriCTBackToResult" }, backToResultDiv);
            domAttr.set(backToResult, "innerHTML", sharedNls.titles.result);
            // check if selected index has attachment then create html structure to display image and layer content
            if (dataSelected.attachmentData) {
                attachmentDiv = domConstruct.create("div", { "class": "esriCTAttachmentDiv" }, attachmentNode);
                attachmentImageClickDiv = domConstruct.create("img", {}, attachmentDiv);
                this._setAttachmentIcon(dataSelected, attachmentImageClickDiv, 0);
                // if attachment length is greater than 0 then push the attachment URL into an array
                if (dataSelected.attachmentData.length > 0) {
                    for (k = 0; k < dataSelected.attachmentData.length; k++) {
                        arrAttachmentURL.push(dataSelected.attachmentData[k].url);
                    }
                    // if attachment length is greater than one then display previous and next arrow
                    if (dataSelected.attachmentData.length > 1) {
                        prevNextdiv = domConstruct.create("div", { "class": "esriCTPrevNext" }, attachmentNode);
                        prevdiv = domConstruct.create("div", { "class": "esriCTPrev" }, prevNextdiv);
                        nextdiv = domConstruct.create("div", { "class": "esriCTNext" }, prevNextdiv);

                        this.own(on(prevdiv, "click", lang.hitch(this, function () {
                            imageCount--;
                            if (imageCount < 0) {
                                imageCount = dataSelected.attachmentData.length - 1;
                            }
                            this._setAttachmentIcon(dataSelected, attachmentImageClickDiv, imageCount);
                        })));
                        this.own(on(nextdiv, "click", lang.hitch(this, function () {
                            imageCount++;
                            if (imageCount === dataSelected.attachmentData.length) {
                                imageCount = 0;
                            }
                            this._setAttachmentIcon(dataSelected, attachmentImageClickDiv, imageCount);
                        })));
                    }
                    //attach click event on attachment icon to download the attachment
                    this.own(on(attachmentImageClickDiv, "click", lang.hitch(this, function (evt) {
                        if (dataSelected.attachmentData[imageCount].contentType.indexOf("image") === -1) {
                            window.open(evt.target.alt);
                        }
                    })));
                }
            }
            // call download drop down handler based on tab selection
            this._downloadDropDown(appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.DownloadSettings, attachmentNode);
            resultSelectionQuerytask = new QueryTask(this.operationalLayer.url);
            resultSelectQuery = new Query();
            resultSelectQuery.returnGeometry = true;
            resultSelectQuery.outSpatialReference = this.map.spatialReference;
            resultSelectQuery.objectIds = [dataSelected.featureData[this.operationalLayer.objectIdField]];
            for (i = 0; i < appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields.length; i++) {
                outfields.push(appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields[i].FieldName);
            }
            resultSelectQuery.outFields = outfields;
            resultSelectionQuerytask.execute(resultSelectQuery, lang.hitch(this, function (featureSet) {
                var symbol, graphic, arraProperyDisplayData = [], isGeoenriched = false, enrichIndex;
                // set simpleMarkerSymbol to display selected feature on map
                if (featureSet.features[0].geometry.getExtent()) {
                    symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0, 0.65]), 3), new Color([255, 0, 0, 0.35]));
                    graphic = new Graphic(featureSet.features[0].geometry, symbol, {}, null);
                    graphic.attributes.layerURL = this.operationalLayer.url;
                    if (!this.isSharedExtent) {
                        this.map.setExtent(featureSet.features[0].geometry.getExtent());
                    }
                    this.isSharedExtent = false;
                } else {
                    symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, appGlobals.configData.LocatorRippleSize, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([parseInt(appGlobals.configData.RippleColor.split(",")[0], 10), parseInt(appGlobals.configData.RippleColor.split(",")[1], 10), parseInt(appGlobals.configData.RippleColor.split(",")[2], 10), 0.65]), 4), new Color([0, 0, 0, 0.2]));
                    graphic = new Graphic(featureSet.features[0].geometry, symbol, {}, null);
                    graphic.attributes.layerURL = this.operationalLayer.url;
                    if (!this.isSharedExtent) {
                        this.map.setLevel(appGlobals.configData.ZoomLevel);
                        this.map.centerAt(featureSet.features[0].geometry);
                    }
                    this.isSharedExtent = false;
                }
                this.map.getLayer("esriFeatureGraphicsLayer").clear();
                this.featureGraphics[this.workflowCount] = graphic;
                this.map.getLayer("esriFeatureGraphicsLayer").add(graphic);
                if (this.operationalLayer && this.operationalLayer.visibleAtMapScale) {
                    this.map.getLayer("esriFeatureGraphicsLayer").graphics[0].show();
                } else {
                    this.map.getLayer("esriFeatureGraphicsLayer").graphics[0].hide();
                }
                propertyInfoDiv = domConstruct.create("div", { "class": "esriCTpropertyInfoDiv" }, attachmentNode);
                propertyHeaderInfo = domConstruct.create("div", { "class": "esriCTHeaderInfoDiv" }, propertyInfoDiv);
                domAttr.set(propertyHeaderInfo, "innerHTML", appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.DownloadSettings[0].DisplayOptionTitle);
                // loop all the layer content based on configuration and check if the attribute data is null then replace it with "NA"
                for (j = 0; j < appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields.length; j++) {
                    attributesInfo = featureSet.features[0].attributes[appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields[j].FieldName];
                    if (attributesInfo === null || attributesInfo === "") {
                        attributesInfo = appGlobals.configData.ShowNullValueAs;
                    }
                    attributedata = domConstruct.create("div", { "class": "esriCTSelectedfeatureField" }, propertyInfoDiv);
                    if (isNaN(attributesInfo)) {
                        arraProperyDisplayData.push(appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields[j].DisplayText + attributesInfo);
                        domAttr.set(attributedata, "innerHTML", appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields[j].DisplayText + " " + attributesInfo);
                    } else {
                        if (Number(attributesInfo) % 1 === 0) {
                            arraProperyDisplayData.push(appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields[j].DisplayText + attributesInfo);
                            domAttr.set(attributedata, "innerHTML", appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields[j].DisplayText + " " + attributesInfo);
                        } else {
                            arraProperyDisplayData.push(appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields[j].DisplayText + Number(attributesInfo).toFixed(2));
                            domAttr.set(attributedata, "innerHTML", appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.LayerContents.DisplayFields[j].DisplayText + " " + Number(attributesInfo).toFixed(2));
                        }
                    }
                }
                this.arrReportDataJson[this.workflowCount] = {};
                this.arrReportDataJson[this.workflowCount].reportData = {};
                this.arrReportDataJson[this.workflowCount].reportData[appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.DownloadSettings[0].DisplayOptionTitle.toString()] = arraProperyDisplayData;
                this.arrReportDataJson[this.workflowCount].attachmentData = arrAttachmentURL;
                if (this.arrGeoenrichData[this.workflowCount] !== null) {
                    for (enrichIndex = 0; enrichIndex < this.arrGeoenrichData[this.workflowCount].length; enrichIndex++) {
                        if (this.arrGeoenrichData[this.workflowCount][enrichIndex].ID === dataSelected.featureData[this.operationalLayer.objectIdField]) {
                            this._geoEnrichmentRequestHandler(this.arrGeoenrichData[this.workflowCount][enrichIndex].data, this.arrGeoenrichData[this.workflowCount][enrichIndex].ID);
                            isGeoenriched = true;
                            break;
                        }
                    }
                    if (!isGeoenriched) {
                        this.arrGeoenrichData[this.workflowCount].push({ ID: dataSelected.featureData[this.operationalLayer.objectIdField] });
                    }
                } else {
                    this.arrGeoenrichData[this.workflowCount] = [];
                    this.arrGeoenrichData[this.workflowCount].push({ ID: dataSelected.featureData[[this.operationalLayer.objectIdField]] });
                }
                if (!isGeoenriched) {
                    // set geometry service URL and buffer parameter
                    geometryService = new GeometryService(appGlobals.configData.GeometryService);
                    params = new BufferParameters();
                    params.distances = [appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.GeoenrichmentDistance.BufferDistance];
                    params.bufferSpatialReference = this.map.spatialReference;
                    params.outSpatialReference = this.map.spatialReference;
                    params.geometries = [featureSet.features[0].geometry];
                    params.unit = GeometryService[appGlobals.configData.Workflows[this.workflowCount].InfoPanelSettings.GeoenrichmentDistance.Unit];
                    geometryService.buffer(params, lang.hitch(this, function (geometries) {
                        topic.publish("showProgressIndicator");
                        this._enrichData(geometries, this.workflowCount, null);
                    }), function () {
                        topic.publish("hideProgressIndicator");
                    });
                }
            }));
            // click event of Back To Result text in building and sites tab to get search results
            this.own(on(backToResult, "click", lang.hitch(this, function () {
                this._getBackToTab(attachmentNode, mainDivNode);
            })));
            // click event of Back To Result icon in building and sites tab to get search results
            this.own(on(backwardImage, "click", lang.hitch(this, function () {
                this._getBackToTab(attachmentNode, mainDivNode);
            })));
        },

        /**
        * set attachment icon in result panel
        * @param {object} dataSelected contains attachment data
        * @param {object} attachmentImageClickDiv div node for attachment
        * @param {int} imageCount is the index of selected attachment
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _setAttachmentIcon: function (dataSelected, attachmentImageClickDiv, imageCount) {
            var imagePath = dojoConfig.baseURL + "/js/library/themes/images/not-available.png";
            if (dataSelected.attachmentData && dataSelected.attachmentData[imageCount]) {
                if (dataSelected.attachmentData[imageCount].contentType.indexOf("image") > -1) {
                    domClass.remove(attachmentImageClickDiv, "esriCTDefaultAttachmentIcon");
                    imagePath = dataSelected.attachmentData[imageCount].url;
                    domAttr.set(attachmentImageClickDiv, "alt", imagePath);
                } else {
                    //set default attachment icon
                    imagePath = dojoConfig.baseURL + "/js/library/themes/images/attachment.png";
                    domClass.add(attachmentImageClickDiv, "esriCTDefaultAttachmentIcon");
                    domAttr.set(attachmentImageClickDiv, "alt", dataSelected.attachmentData[imageCount].url);
                }
            }
            domAttr.set(attachmentImageClickDiv, "src", imagePath);
        },

        /**
        * set image dimensions when image gets loaded
        * @param {object} evt 
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _onImageLoad: function (evt) {
            this._setImageDimensions(evt.currentTarget, true);
        },

        /**
        * resize attachment icon
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _resizeImages: function () {
            var images = query('.esriCTAttchImages img');
            array.forEach(images, lang.hitch(this, function (imgModule) {
                this._setImageDimensions(imgModule);
            }));
        },

        /**
        * set height and width of attachment icon
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _setImageDimensions: function (imgModule, isOnLoad) {
            var aspectRatio, newWidth, newHeight, imgWidth, imgContainer = imgModule.parentElement;
            if (isOnLoad && imgModule && imgModule.offsetHeight > 0) {
                //set original dimensions of image as it max dimensions.
                domAttr.set(imgModule, "originalWidth", imgModule.offsetWidth);
                domStyle.set(imgModule, "maxHeight", imgModule.offsetHeight + 'px');
                domStyle.set(imgModule, "maxWidth", imgModule.offsetWidth + 'px');
            }
            imgWidth = parseFloat(domAttr.get(imgModule, "originalWidth"));
            if ((imgWidth > 0 && imgContainer.offsetWidth > 0) && (imgContainer.offsetWidth < imgModule.offsetWidth || imgWidth > imgContainer.offsetWidth)) {
                //change dimensions of image if it is larger/smaller than its parent container.
                //calculate aspect ratio of image.
                aspectRatio = imgModule.offsetWidth / imgModule.offsetHeight;
                //calculate new dimensions according to aspect ratio of image.
                newWidth = imgContainer.offsetWidth - 2;
                newHeight = Math.floor(newWidth / aspectRatio);
                domClass.remove(imgModule, "esriCTAutoWidth");
                //set new dimensions to image.
                domStyle.set(imgModule, "width", newWidth + 'px');
                domStyle.set(imgModule, "height", newHeight + 'px');
            }
        },

        /**
        * back button handler in building and sites tab and displays the pagination panel for same
        * @param {object} attachment div node
        * @param {object} parent div node for attachment
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _getBackToTab: function (attachmentNode, mainDivNode) {
            domStyle.set(attachmentNode, "display", "none");
            domStyle.set(mainDivNode, "display", "block");
            // clear graphic layer and feature graphic and call createDisplayList handler to display pagination panel for selected workflow
            this.map.getLayer("esriFeatureGraphicsLayer").clear();
            this.featureGraphics[this.workflowCount] = null;
            appGlobals.shareOptions.selectedObjectIndex[this.workflowCount] = undefined;
            if (this.workflowCount === 0) {
                this._createDisplayList(this.buildingTabData, this.outerResultContainerBuilding);
            } else if ((this.workflowCount === 1)) {
                this._createDisplayList(this.sitesTabData, this.outerResultContainerSites);
            }
        },

        /**
        * enables and disables search for communities tab
        * @param {object} search check box
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _communitiesSearchRadioButtonHandler: function (rdoCommunitiesAddressSearch) {
            domClass.remove(this.divSearchCommunities, "esriCTDisabledAddressColorChange");
            domClass.remove(this.txtAddressCommunities, "esriCTDisabledAddressColorChange");
            domClass.remove(this.closeCommunities, "esriCTDisabledAddressColorChange");
            domClass.remove(this.clearhideCommunities, "esriCTDisabledAddressColorChange");
            domClass.remove(this.divAddressResultsCommunities, "esriCTDisableSearch");
            this.txtAddressCommunities.disabled = !rdoCommunitiesAddressSearch.checked;
            this.closeCommunities.disabled = !rdoCommunitiesAddressSearch.checked;
            this.esriCTimgLocateCommunities.disabled = !rdoCommunitiesAddressSearch.checked;
            this.divSearchCommunities.disabled = !rdoCommunitiesAddressSearch.checked;
            if (this.comAreaList) {
                this.comAreaList.disabled = rdoCommunitiesAddressSearch.checked;
                this.comAreaList.reset();
            }
            appGlobals.shareOptions.communitySelectionFeature = null;
        },

        /**
        * get operational layer based on tab(work flow) selection
        * @param {number} count of tab(workflow)
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        getCurrentOperationalLayer: function (tabCount) {
            var layer, layerURL, i;
            if (appGlobals.configData.Workflows[tabCount].SearchSettings) {
                layerURL = appGlobals.configData.Workflows[tabCount].SearchSettings[0].QueryURL;
            } else if (appGlobals.configData.Workflows[tabCount].FilterSettings) {
                layerURL = appGlobals.configData.Workflows[tabCount].FilterSettings.FilterLayer && appGlobals.configData.Workflows[tabCount].FilterSettings.FilterLayer.LayerURL;
            }
            if (layerURL) {
                for (i = 0; i < appGlobals.operationalLayers.length; i++) {
                    if (appGlobals.operationalLayers[i].url === layerURL) {
                        layer = appGlobals.operationalLayers[i].layerObject;
                        break;
                    }
                }
            }
            return layer;
        },

        /**
        * clear text field in selected tab
        * @memberOf widgets/siteLocator/siteLocator
        */
        clearTextValuesOfFilters: function () {
            var node;
            for (node in this.filterOptionsValues) {
                if (this.filterOptionsValues.hasOwnProperty(node)) {
                    if (this.filterOptionsValues[node].workflow === this.workflowCount) {
                        if (this.filterOptionsValues[node].txtFrom && this.filterOptionsValues[node].txtTo) {
                            // clear the to and from text box values
                            this.filterOptionsValues[node].txtFrom.value = "";
                            this.filterOptionsValues[node].txtTo.value = "";
                        }
                    }
                }
            }
        },

        /**
        * Show hide widget container
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _showHideInfoRouteContainer: function () {
            if (html.coords(this.applicationHeaderSearchContainer).h > 0) {
                /**
                * when user clicks on share icon in header panel, close the sharing panel if it is open
                */
                domClass.add(this.applicationHeaderSearchContainer, "esriCTZeroHeight");
                if (this.logoContainer) {
                    domClass.remove(this.logoContainer, "esriCTMapLogo");
                }
                domClass.replace(this.domNode, "esriCTHeaderSearch", "esriCTHeaderSearchSelected");
                domClass.replace(this.applicationHeaderSearchContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                topic.publish("setMaxLegendLength");
            } else {
                /**
                * when user clicks on share icon in header panel, open the sharing panel if it is closed
                */
                domClass.remove(this.applicationHeaderSearchContainer, "esriCTZeroHeight");
                if (this.logoContainer) {
                    domClass.add(this.logoContainer, "esriCTMapLogo");
                }
                domClass.replace(this.domNode, "esriCTHeaderSearchSelected", "esriCTHeaderSearch");
                domClass.replace(this.applicationHeaderSearchContainer, "esriCTShowContainerHeight", "esriCTHideContainerHeight");
            }
        },

        /**
        * set default value of locator text box as specified in configuration file
        * @param {array} locator settings specified in configuration file(appGlobals.configData.LocatorSettings.Locators)
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _setDefaultTextboxValue: function (txtAddressParam) {
            var locatorSettings;
            locatorSettings = appGlobals.configData.LocatorSettings;
            domAttr.set(txtAddressParam, "defaultAddress", locatorSettings.LocatorDefaultAddress);
        },

        /**
        * get distance unit based on unit selection
        * @param {string} input distance unit
        * @memberOf widgets/siteLocator/siteLocatorHelper
        */
        _getDistanceUnit: function (strUnit) {
            var sliderUnitValue;
            if (strUnit.toLowerCase() === "miles") {
                sliderUnitValue = "UNIT_STATUTE_MILE";
            } else if (strUnit.toLowerCase() === "feet") {
                sliderUnitValue = "UNIT_FOOT";
            } else if (strUnit.toLowerCase() === "meters") {
                sliderUnitValue = "UNIT_METER";
            } else if (strUnit.toLowerCase() === "kilometers") {
                sliderUnitValue = "UNIT_KILOMETER";
            } else {
                sliderUnitValue = "UNIT_STATUTE_MILE";
            }
            return sliderUnitValue;
        }
    });
});
